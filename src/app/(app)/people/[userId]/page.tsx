import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { median, formatWeekLabel, startOfWeek } from "@/lib/metrics";
import { CapacityMeter } from "@/components/app/capacity-meter";
import { ThroughputArea } from "@/components/charts/throughput-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskStatus } from "@prisma/client";
import { TaskActions } from "@/components/app/task-actions";
import { getSession } from "@/lib/session";
import { canDeleteTask, canEditAnyTask } from "@/lib/perm";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export default async function PersonPage({
  params,
}: {
  params: { userId: string } | Promise<{ userId: string }>;
}) {
  const { userId } = await Promise.resolve(params);
  const session = await getSession();
  const canDelete = session ? canDeleteTask(session.role) : false;
  const canEditAny = session ? canEditAnyTask(session.role) : false;
  const user = await db.user.findUnique({ where: { id: userId }, include: { team: true } });
  if (!user) notFound();

  const tasks = await db.task.findMany({
    where: { assigneeId: userId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: { project: true },
    take: 75,
  });

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const open = tasks.filter((t) => t.status !== TaskStatus.DONE);
  const blocked = open.filter((t) => t.status === TaskStatus.BLOCKED);
  // const overdue = open.filter((t) => t.dueDate && t.dueDate < now);
  const dueThisWeek = open.filter((t) => t.dueDate && t.dueDate >= now && t.dueDate <= weekAhead);
  const loadHours = dueThisWeek.reduce((sum, t) => sum + (t.estimateHours ?? 0), 0);

  const completed = await db.task.findMany({
    where: { assigneeId: userId, status: TaskStatus.DONE, completedAt: { not: null } },
    select: { completedAt: true, startedAt: true, createdAt: true },
    take: 500,
  });

  const cycleDays = completed
    .map((t) => {
      const start = t.startedAt ?? t.createdAt;
      const end = t.completedAt;
      if (!end) return null;
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0);
  const cycleMedian = median(cycleDays);

  const start = startOfWeek(new Date(now.getTime() - 6 * 7 * 24 * 60 * 60 * 1000));
  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    buckets.set(d.toISOString(), 0);
  }

  for (const t of completed) {
    if (!t.completedAt) continue;
    const w = startOfWeek(t.completedAt).toISOString();
    if (!buckets.has(w)) continue;
    buckets.set(w, (buckets.get(w) ?? 0) + 1);
  }

  const throughputData = Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([iso, done]) => ({ label: formatWeekLabel(new Date(iso)), done }));

  const recentActivity = await db.activityEvent.findMany({
    where: { actorId: userId },
    orderBy: { createdAt: "desc" },
    take: 18,
  });

  return (
    <div className="grid gap-6">
      <Card className="grain surface rounded-3xl border bg-card/80 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-1 ring-border">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-display text-2xl leading-none">{user.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {user.team?.name ?? "No team"} • {user.role.toLowerCase()} • {user.timezone}
              </div>
            </div>
          </div>

          <div className="grid w-full gap-2 md:w-[360px]">
            <CapacityMeter value={loadHours} max={user.weeklyCapacityHours} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">Open</div>
          <div className="mt-2 font-display text-3xl leading-none">{open.length}</div>
        </Card>
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">Due 7d</div>
          <div className="mt-2 font-display text-3xl leading-none">{dueThisWeek.length}</div>
        </Card>
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">Blocked</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="font-display text-3xl leading-none">{blocked.length}</div>
            {blocked.length > 0 ? <Badge variant="destructive">needs help</Badge> : <Badge>clear</Badge>}
          </div>
        </Card>
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">Cycle median</div>
          <div className="mt-2 font-display text-3xl leading-none">
            {cycleMedian === null ? "-" : `${cycleMedian.toFixed(1)}d`}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Throughput</div>
            <div className="font-mono text-xs text-muted-foreground">done tasks / week</div>
          </div>
          <div className="mt-3">
            <ThroughputArea data={throughputData} />
          </div>
        </Card>

        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Recent activity</div>
            <div className="font-mono text-xs text-muted-foreground">audit trail</div>
          </div>
          <div className="mt-3 grid gap-2">
            {recentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              recentActivity.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">
                      <span className="font-medium">{e.action.toLowerCase()}</span> {e.entityType.toLowerCase()}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {e.createdAt.toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {e.entityType}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="grain surface rounded-3xl border bg-card/80 p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold">Work</div>
          <Link href="/people" className="text-xs text-muted-foreground hover:text-foreground">
            back to people
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border bg-background/60">
          <Table>
            <TableHeader>
              <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Est</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="w-[44px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.slice(0, 18).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="max-w-[520px] truncate font-medium">
                  <Link href={`/tasks/${t.id}`} className="hover:underline">
                    {t.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.project.name}</TableCell>
                <TableCell>
                  <Badge variant={t.status === TaskStatus.BLOCKED ? "destructive" : "secondary"}>
                    {t.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{t.estimateHours.toFixed(1)}h</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.dueDate ? t.dueDate.toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <TaskActions
                    taskId={t.id}
                    canDelete={canDelete}
                    canEdit={canEditAny || t.assigneeId === session?.userId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}
