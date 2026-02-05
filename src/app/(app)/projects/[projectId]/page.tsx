import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { HealthPill, PriorityPill, StatusPill } from "@/components/app/pills";
import { CreateTaskDialog } from "@/components/app/dialogs/create-task-dialog";
import { TaskActions } from "@/components/app/task-actions";
import { DependencyGraph } from "@/components/charts/dependency-graph";
import { MilestoneDialog } from "@/components/app/dialogs/milestone-dialog";
import { MilestoneDeleteButton } from "@/components/app/milestone-actions";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { getSession } from "@/lib/session";
import { canDeleteTask, canEditAnyTask } from "@/lib/perm";
import { unblockSuggestion } from "@/lib/deps";
import { canManageProject } from "@/lib/perm";
import { Button } from "@/components/ui/button";
import { ProjectSettingsSheet } from "@/components/app/project-settings-sheet";

const columns: { status: TaskStatus; title: string }[] = [
  { status: TaskStatus.TODO, title: "Todo" },
  { status: TaskStatus.IN_PROGRESS, title: "In progress" },
  { status: TaskStatus.BLOCKED, title: "Blocked" },
  { status: TaskStatus.DONE, title: "Done" },
];

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string } | Promise<{ projectId: string }>;
}) {
  const { projectId } = await Promise.resolve(params);
  const session = await getSession();
  const canDelete = session ? canDeleteTask(session.role) : false;
  const canEditAny = session ? canEditAnyTask(session.role) : false;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true } },
      milestones: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!project) notFound();

  const canManage = session
    ? canManageProject({ role: session.role, userId: session.userId, ownerId: project.ownerId })
    : false;

  const [tasks, people, projects, owners] = await Promise.all([
    db.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
        dependenciesTo: {
          select: {
            fromTaskId: true,
            fromTask: {
              select: {
                id: true,
                title: true,
                status: true,
                dueDate: true,
                priority: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const byStatus = new Map<TaskStatus, typeof tasks>();
  for (const c of columns) byStatus.set(c.status, []);
  for (const t of tasks) {
    const arr = byStatus.get(t.status) ?? [];
    arr.push(t);
    byStatus.set(t.status, arr);
  }

  const now = new Date();
  const overdue = tasks.filter((t) => t.status !== TaskStatus.DONE && t.dueDate && t.dueDate < now);
  const blockedByDeps = tasks
    .filter((t) => t.status !== TaskStatus.DONE)
    .map((t) => {
      const unmet = t.dependenciesTo.filter((d) => d.fromTask.status !== TaskStatus.DONE);
      return { task: t, unmet };
    })
    .filter((x) => x.unmet.length > 0)
    .sort((a, b) => b.unmet.length - a.unmet.length)
    .slice(0, 8);

  const nodes = new Map(
    tasks.map((t) => [
      t.id,
      {
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
        priority: t.priority,
      },
    ]),
  );

  const depsIndex = new Map<string, string[]>();
  const graphEdges: { from: string; to: string }[] = [];
  for (const t of tasks) {
    for (const d of t.dependenciesTo) {
      const list = depsIndex.get(t.id) ?? [];
      list.push(d.fromTaskId);
      depsIndex.set(t.id, list);
      graphEdges.push({ from: d.fromTaskId, to: t.id });
    }
  }

  const unblock = blockedByDeps.map(({ task, unmet }) => {
    const s = unblockSuggestion(task.id, nodes, depsIndex);
    return { task, unmetCount: unmet.length, suggestion: s };
  });

  const outDegree = new Map<string, number>();
  for (const e of graphEdges) {
    outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
  }

  function prio(p: TaskPriority) {
    if (p === TaskPriority.URGENT) return 4;
    if (p === TaskPriority.HIGH) return 3;
    if (p === TaskPriority.MEDIUM) return 2;
    return 1;
  }

  const critical = tasks
    .filter((t) => t.status !== TaskStatus.DONE)
    .map((t) => {
      const unmet = t.dependenciesTo.filter((d) => d.fromTask.status !== TaskStatus.DONE).length;
      const blocks = outDegree.get(t.id) ?? 0;
      const overdue = t.dueDate ? t.dueDate < now : false;
      const dueSoon = t.dueDate ? t.dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : false;
      const score = prio(t.priority) * 10 + unmet * 12 + blocks * 3 + (overdue ? 30 : 0) + (dueSoon ? 12 : 0);
      return { task: t, unmet, blocks, overdue, dueSoon, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={project.name}
        subtitle={`Owner: ${project.owner.name}${project.targetDate ? ` • Target ${project.targetDate.toLocaleDateString()}` : ""}`}
        actions={
          <>
            <HealthPill health={project.health} />
            {canManage ? (
              <ProjectSettingsSheet
                project={{
                  id: project.id,
                  name: project.name,
                  description: project.description ?? null,
                  ownerId: project.ownerId,
                  targetDate: project.targetDate ? project.targetDate.toISOString().slice(0, 10) : null,
                }}
                owners={owners}
              />
            ) : null}
            <CreateTaskDialog projects={projects} people={people} defaultProjectId={project.id} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="grain surface rounded-3xl border bg-card/80 p-5 lg:col-span-2">
          <div className="text-sm font-semibold">Execution board</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Fast status changes, visible blocked work, no hiding.
          </div>
          <Separator className="my-4" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((c) => {
              const list = byStatus.get(c.status) ?? [];
              return (
                <div key={c.status} className="min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {c.title}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {list.length}
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {list.slice(0, 8).map((t) => (
                      <div
                        key={t.id}
                        className="rounded-2xl border bg-background/60 p-3"
                      >
                        {(() => {
                          const unmet = t.dependenciesTo.filter(
                            (d) => d.fromTask.status !== TaskStatus.DONE,
                          ).length;
                          return unmet > 0 ? (
                            <div className="mb-2 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[10px] text-destructive">
                              blocked by {unmet}
                            </div>
                          ) : null;
                        })()}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <a href={`/tasks/${t.id}`} className="truncate text-sm font-medium hover:underline">
                              {t.title}
                            </a>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <StatusPill status={t.status} />
                              <PriorityPill priority={t.priority} />
                            </div>
                          </div>
                          <TaskActions
                            taskId={t.id}
                            canDelete={canDelete}
                            canEdit={canEditAny || t.assignee?.id === session?.userId}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="truncate">
                            {t.assignee?.name ?? "Unassigned"}
                          </div>
                          <div className="font-mono">{t.estimateHours.toFixed(1)}h</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-sm font-semibold">Milestones</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Keep these few and sharp.
          </div>
          <Separator className="my-4" />
          {canManage ? (
            <div className="mb-3">
              <MilestoneDialog
                projectId={project.id}
                trigger={<Button className="rounded-2xl">New milestone</Button>}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            {project.milestones.length === 0 ? (
              <div className="text-sm text-muted-foreground">No milestones yet.</div>
            ) : (
              project.milestones.map((m) => (
                <div key={m.id} className="rounded-2xl border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {m.dueDate ? m.dueDate.toLocaleDateString() : "No date"} • {m.status.toLowerCase()}
                      </div>
                    </div>
                    {canManage ? (
                      <div className="flex items-center gap-2">
                        <MilestoneDialog
                          projectId={project.id}
                          initial={{
                            id: m.id,
                            name: m.name,
                            dueDate: m.dueDate ? m.dueDate.toISOString().slice(0, 10) : null,
                            status: m.status,
                          }}
                          trigger={<Button variant="secondary" className="h-8 rounded-xl">Edit</Button>}
                        />
                        <MilestoneDeleteButton id={m.id} projectId={project.id} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Risk radar</div>
            <div className="font-mono text-xs text-muted-foreground">what can break next</div>
          </div>
          <Separator className="my-4" />

          <div className="grid gap-3">
            <div className="rounded-2xl border bg-background/60 p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Overdue</div>
              <div className="mt-2 text-sm">
                {overdue.length === 0 ? (
                  <span className="text-muted-foreground">No overdue tasks.</span>
                ) : (
                  <span className="font-medium">{overdue.length} tasks overdue</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Blocked by dependencies</div>
              <div className="mt-2 grid gap-2">
                {unblock.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No dependency blocks detected.</div>
                ) : (
                  unblock.map(({ task, unmetCount, suggestion }) => (
                    <div key={task.id} className="rounded-2xl border bg-background/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <a className="truncate text-sm font-medium hover:underline" href={`/tasks/${task.id}`}>
                            {task.title}
                          </a>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            blocked by {unmetCount} task{unmetCount === 1 ? "" : "s"}
                            {suggestion.next ? (
                              <>
                                {" • next unblock: "}
                                <a className="underline" href={`/tasks?open=${suggestion.next.id}`}>
                                  {suggestion.next.title}
                                </a>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">{task.estimateHours.toFixed(1)}h</div>
                      </div>
                      {suggestion.chain.length > 1 ? (
                        <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                          chain: {suggestion.chain.map((x) => x.title.slice(0, 14)).join(" -> ")}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Dependency map</div>
            <div className="font-mono text-xs text-muted-foreground">edges (from -&gt; to)</div>
          </div>
          <Separator className="my-4" />
          {graphEdges.length === 0 ? (
            <div className="text-sm text-muted-foreground">No dependencies in this project yet.</div>
          ) : (
            <DependencyGraph
              nodes={tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))}
              edges={graphEdges}
            />
          )}
        </Card>
      </div>

      <Card className="grain surface rounded-3xl border bg-card/80 p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold">Critical path score</div>
          <div className="font-mono text-xs text-muted-foreground">priority + deps + due + blast radius</div>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-2 md:grid-cols-2">
          {critical.map((x) => (
            <div key={x.task.id} className="rounded-2xl border bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={`/tasks/${x.task.id}`} className="truncate text-sm font-medium hover:underline">
                    {x.task.title}
                  </a>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={x.task.status} />
                    <PriorityPill priority={x.task.priority} />
                    {x.unmet > 0 ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[10px] text-destructive">
                        unmet {x.unmet}
                      </span>
                    ) : null}
                    {x.blocks > 0 ? (
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        blocks {x.blocks}
                      </span>
                    ) : null}
                    {x.overdue ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[10px] text-destructive">
                        overdue
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-muted-foreground">score</div>
                  <div className="font-display text-2xl leading-none">{x.score}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{x.task.assignee?.name ?? "Unassigned"}</span>
                <span className="font-mono">{x.task.dueDate ? x.task.dueDate.toLocaleDateString() : "-"}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
