import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { CreateTaskDialog } from "@/components/app/dialogs/create-task-dialog";
import { PriorityPill, StatusPill } from "@/components/app/pills";
import { TaskActions } from "@/components/app/task-actions";
import { TasksFilters } from "@/components/app/tasks-filters";
import { getSession } from "@/lib/session";
import { canDeleteTask, canEditAnyTask } from "@/lib/perm";
import { Card } from "@/components/ui/card";
import { OpenTaskFromQuery } from "@/components/app/open-task-from-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskStatus } from "@prisma/client";

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const pageSize = 50;
  const status = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const projectId = Array.isArray(sp.projectId) ? sp.projectId[0] : sp.projectId;
  const assigneeId = Array.isArray(sp.assigneeId) ? sp.assigneeId[0] : sp.assigneeId;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const viewId = Array.isArray(sp.view) ? sp.view[0] : sp.view;

  const session = await getSession();
  const canDelete = session ? canDeleteTask(session.role) : false;
  const canEditAny = session ? canEditAnyTask(session.role) : false;

  const [projects, people, savedViews] = await Promise.all([
    db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    session
      ? db.savedView.findMany({
          where: { ownerId: session.userId, kind: "TASKS" },
          select: { id: true, name: true, query: true },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const view = viewId ? savedViews.find((v) => v.id === viewId) : null;
  const viewQuery = (view?.query ?? {}) as Record<string, unknown>;
  const effectiveStatus = typeof viewQuery.status === "string" ? viewQuery.status : status;
  const effectiveProjectId = typeof viewQuery.projectId === "string" ? viewQuery.projectId : projectId;
  const effectiveAssigneeId = typeof viewQuery.assigneeId === "string" ? viewQuery.assigneeId : assigneeId;
  const effectiveQ = typeof viewQuery.q === "string" ? viewQuery.q : q;

  const tasks = await db.task.findMany({
    where: {
      ...(effectiveStatus && effectiveStatus in TaskStatus
        ? { status: effectiveStatus as TaskStatus }
        : {}),
      ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}),
      ...(effectiveAssigneeId ? { assigneeId: effectiveAssigneeId } : {}),
      ...(effectiveQ ? { title: { contains: effectiveQ } } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  const total = await db.task.count({
    where: {
      ...(effectiveStatus && effectiveStatus in TaskStatus
        ? { status: effectiveStatus as TaskStatus }
        : {}),
      ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}),
      ...(effectiveAssigneeId ? { assigneeId: effectiveAssigneeId } : {}),
      ...(effectiveQ ? { title: { contains: effectiveQ } } : {}),
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function withPage(n: number) {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = Array.isArray(v) ? v[0] : v;
      if (!val) continue;
      if (k === "page") continue;
      next.set(k, String(val));
    }
    if (n > 1) next.set("page", String(n));
    const s = next.toString();
    return s ? `/tasks?${s}` : "/tasks";
  }

  return (
    <div className="grid gap-6">
      <OpenTaskFromQuery />
      <PageHeader
        title="Tasks"
        subtitle="A sharp task list with ruthless clarity."
        actions={<CreateTaskDialog projects={projects} people={people} />}
      />

      <TasksFilters projects={projects} people={people} savedViews={savedViews} />

      <Card className="grain surface rounded-3xl border bg-card/80 p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b bg-background/40 px-5 py-3">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">
            {total} tasks • page {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/tasks" className="hover:text-foreground">
              Clear filters
            </Link>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead className="text-right">Est</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="w-[44px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="max-w-[520px] truncate font-medium">
                  <Link href={`/tasks/${t.id}`} className="hover:underline" scroll={false}>
                    {t.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.project.name}</TableCell>
                <TableCell>
                  <StatusPill status={t.status} />
                </TableCell>
                <TableCell>
                  <PriorityPill priority={t.priority} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.assignee?.name ?? "Unassigned"}
                </TableCell>
                <TableCell className="text-right font-mono">{t.estimateHours.toFixed(1)}h</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.dueDate ? t.dueDate.toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <TaskActions
                    taskId={t.id}
                    canDelete={canDelete}
                    canEdit={canEditAny || t.assignee?.id === session?.userId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between gap-2 border-t bg-background/40 px-5 py-3">
          <div className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}
          </div>
          <div className="flex items-center gap-2">
            <Link
              className={`rounded-2xl border px-3 py-1 text-xs ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-background"}`}
              href={withPage(page - 1)}
              scroll={false}
            >
              Prev
            </Link>
            <Link
              className={`rounded-2xl border px-3 py-1 text-xs ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-background"}`}
              href={withPage(page + 1)}
              scroll={false}
            >
              Next
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
