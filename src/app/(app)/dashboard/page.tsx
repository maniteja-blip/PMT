import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HealthStatus, TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [peopleCount, projectCount, openTaskCount] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.task.count({ where: { status: { not: TaskStatus.DONE } } }),
  ]);

  const atRisk = await db.project.count({ where: { health: HealthStatus.AT_RISK } });

  const [teams, dueSoon] = await Promise.all([
    db.team.findMany({
      include: { users: { select: { id: true, weeklyCapacityHours: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    db.task.findMany({
      where: {
        status: { not: TaskStatus.DONE },
        dueDate: { lte: weekAhead },
        assigneeId: { not: null },
      },
      select: { assigneeId: true, estimateHours: true },
    }),
  ]);

  const loadByUser = new Map<string, number>();
  for (const t of dueSoon) {
    if (!t.assigneeId) continue;
    loadByUser.set(t.assigneeId, (loadByUser.get(t.assigneeId) ?? 0) + (t.estimateHours ?? 0));
  }

  const teamRadar = teams.map((team) => {
    const capacity = team.users.reduce((s, u) => s + u.weeklyCapacityHours, 0);
    const load = team.users.reduce((s, u) => s + (loadByUser.get(u.id) ?? 0), 0);
    return { id: team.id, name: team.name, capacity, load };
  });

  const [blockedTasks, overdueTasks] = await Promise.all([
    db.task.findMany({
      where: { status: TaskStatus.BLOCKED },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    db.task.findMany({
      where: { status: { not: TaskStatus.DONE }, dueDate: { lt: new Date() } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Portfolio pulse. Click People to drill down to execution."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">
            People
          </div>
          <div className="mt-2 font-display text-3xl leading-none">{peopleCount}</div>
          <div className="mt-3">
            <Button asChild variant="secondary" className="rounded-2xl">
              <Link href="/people">Open directory</Link>
            </Button>
          </div>
        </Card>

        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">
            Projects
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="font-display text-3xl leading-none">{projectCount}</div>
            {atRisk > 0 ? <Badge variant="destructive">{atRisk} at risk</Badge> : <Badge>on track</Badge>}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Projects page is next; core is People + User Command Center.
          </div>
        </Card>

        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">
            Open Tasks
          </div>
          <div className="mt-2 font-display text-3xl leading-none">{openTaskCount}</div>
          <div className="mt-3 text-sm text-muted-foreground">
            Use the People page to drill into work and progress.
          </div>
        </Card>
      </div>

      <Card className="grain surface rounded-3xl border bg-card/80 p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold">Capacity radar</div>
          <div className="font-mono text-xs text-muted-foreground">due in 7d vs weekly capacity</div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {teamRadar.map((t) => {
            const pct = t.capacity <= 0 ? 0 : t.load / t.capacity;
            const bar = pct < 0.8 ? "bg-chart-2" : pct < 1 ? "bg-chart-4" : "bg-destructive";
            return (
              <div key={t.id} className="rounded-2xl border bg-background/60 p-4">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {t.load.toFixed(1)}h / {t.capacity.toFixed(0)}h
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div className={"h-full rounded-full " + bar} style={{ width: `${Math.min(1, pct) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Blocked right now</div>
            <div className="font-mono text-xs text-muted-foreground">top 6</div>
          </div>
          <div className="mt-4 grid gap-2">
            {blockedTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No blocked tasks.</div>
            ) : (
              blockedTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="rounded-2xl border bg-background/60 px-4 py-3 text-sm hover:bg-background/80"
                >
                  <div className="font-medium">{t.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.project.name}</div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Overdue</div>
            <div className="font-mono text-xs text-muted-foreground">top 6</div>
          </div>
          <div className="mt-4 grid gap-2">
            {overdueTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No overdue tasks.</div>
            ) : (
              overdueTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="rounded-2xl border bg-background/60 px-4 py-3 text-sm hover:bg-background/80"
                >
                  <div className="font-medium">{t.title}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.project.name}</span>
                    <span className="font-mono">{t.dueDate ? t.dueDate.toLocaleDateString() : "-"}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
