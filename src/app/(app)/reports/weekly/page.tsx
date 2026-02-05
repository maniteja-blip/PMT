import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isManagerish } from "@/lib/perm";
import { ReportViewer } from "@/components/app/report-viewer";
import { TaskStatus } from "@prisma/client";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export default async function WeeklyReportPage() {
  const session = await getSession();
  if (!session) {
    return <div className="text-sm text-muted-foreground">Unauthorized.</div>;
  }
  if (!isManagerish(session.role)) {
    return <div className="text-sm text-muted-foreground">Forbidden (manager/admin only).</div>;
  }

  const since = daysAgo(7);
  const [projects, done, blocked, overdue, people] = await Promise.all([
    db.project.findMany({ select: { id: true, name: true, health: true } }),
    db.task.findMany({
      where: { status: TaskStatus.DONE, completedAt: { gte: since } },
      include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
      take: 40,
    }),
    db.task.findMany({
      where: { status: TaskStatus.BLOCKED },
      include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    db.task.findMany({
      where: { status: { not: TaskStatus.DONE }, dueDate: { lt: new Date() } },
      include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.user.findMany({ select: { id: true, name: true, weeklyCapacityHours: true } }),
  ]);

  const dueSoon = await db.task.findMany({
    where: {
      status: { not: TaskStatus.DONE },
      dueDate: { lte: daysAgo(-7) },
      assigneeId: { not: null },
    },
    select: { assigneeId: true, estimateHours: true },
  });
  const loadByUser = new Map<string, number>();
  for (const t of dueSoon) {
    if (!t.assigneeId) continue;
    loadByUser.set(t.assigneeId, (loadByUser.get(t.assigneeId) ?? 0) + (t.estimateHours ?? 0));
  }
  const overloaded = people
    .map((p) => ({
      name: p.name,
      load: loadByUser.get(p.id) ?? 0,
      cap: p.weeklyCapacityHours,
    }))
    .filter((x) => x.load > x.cap)
    .sort((a, b) => b.load - b.cap - (a.load - a.cap))
    .slice(0, 8);

  const onTrack = projects.filter((p) => p.health === "ON_TRACK").length;
  const atRisk = projects.filter((p) => p.health === "AT_RISK").length;
  const offTrack = projects.filter((p) => p.health === "OFF_TRACK").length;

  const lines: string[] = [];
  lines.push(`# Weekly Exec Report`);
  lines.push("");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push(`## Portfolio`);
  lines.push(`- Projects: ${projects.length} (on track ${onTrack}, at risk ${atRisk}, off track ${offTrack})`);
  lines.push(`- Shipped tasks (7d): ${done.length}`);
  lines.push(`- Blocked tasks: ${blocked.length}`);
  lines.push(`- Overdue tasks: ${overdue.length}`);
  lines.push("");

  lines.push(`## Wins (Last 7 Days)`);
  for (const t of done.slice(0, 12)) {
    lines.push(`- ${t.title} — ${t.project.name}${t.assignee?.name ? ` (by ${t.assignee.name})` : ""}`);
  }
  if (done.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push(`## Top Risks`);
  lines.push(`### Blocked`);
  for (const t of blocked.slice(0, 10)) {
    lines.push(`- ${t.title} — ${t.project.name}${t.assignee?.name ? ` (owner ${t.assignee.name})` : ""}`);
  }
  if (blocked.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push(`### Overdue`);
  for (const t of overdue.slice(0, 10)) {
    lines.push(
      `- ${t.title} — ${t.project.name}${t.dueDate ? ` (due ${t.dueDate.toLocaleDateString()})` : ""}`,
    );
  }
  if (overdue.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push(`## Capacity Pressure (Due in 7d)`);
  for (const p of overloaded) {
    lines.push(`- ${p.name}: ${p.load.toFixed(1)}h / ${p.cap.toFixed(0)}h`);
  }
  if (overloaded.length === 0) lines.push("- (none)");

  const content = lines.join("\n");

  return <ReportViewer title="Weekly Exec Report" content={content} />;
}
