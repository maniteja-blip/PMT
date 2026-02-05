import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canDeleteTask, canEditAnyTask, isManagerish } from "@/lib/perm";
import { TaskModal } from "@/components/app/task-modal";
import { TaskDetailClient } from "@/components/app/task-detail-client";

export default async function TaskModalPage({
  params,
}: {
  params: { taskId: string } | Promise<{ taskId: string }>;
}) {
  const { taskId } = await Promise.resolve(params);
  const session = await getSession();
  if (!session) notFound();

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimateHours: true,
      dueDate: true,
      projectId: true,
      assigneeId: true,
      dependenciesTo: {
        include: { fromTask: { select: { id: true, title: true, status: true } } },
      },
      dependenciesFrom: {
        include: { toTask: { select: { id: true, title: true, status: true } } },
      },
    },
  });
  if (!task) notFound();

  const projectOwner = await db.project.findUnique({
    where: { id: task.projectId },
    select: { ownerId: true },
  });

  const [projects, people, comments, activity] = await Promise.all([
    db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.activityEvent.findMany({
      where: { entityType: "TASK", entityId: taskId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const candidates = await db.task.findMany({
    where: { projectId: task.projectId, id: { not: task.id } },
    select: { id: true, title: true, status: true },
    orderBy: [{ status: "asc" }, { title: "asc" }],
    take: 250,
  });

  const canManage = canEditAnyTask(session.role) || projectOwner?.ownerId === session.userId;
  const canEdit = canManage || task.assigneeId === session.userId;
  const canDelete = canDeleteTask(session.role);

  return (
    <TaskModal title={task.title}>
      <TaskDetailClient
        variant="modal"
        task={{
          ...task,
          dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
        }}
        projects={projects}
        people={people}
        candidates={candidates}
        deps={{
          blockedBy: task.dependenciesTo.map((d) => ({
            fromTaskId: d.fromTaskId,
            fromTask: d.fromTask,
          })),
          blocks: task.dependenciesFrom.map((d) => ({
            toTaskId: d.toTaskId,
            toTask: d.toTask,
          })),
        }}
        comments={comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          author: c.author,
        }))}
        activity={activity.map((e) => ({
          id: e.id,
          action: e.action,
          entityType: e.entityType,
          createdAt: e.createdAt.toISOString(),
          metadata: e.metadata,
        }))}
        canAdmin={isManagerish(session.role)}
        currentUserId={session.userId}
        canEdit={canEdit}
        canDelete={canDelete}
        canManage={canManage}
        canEditDependencies
      />
    </TaskModal>
  );
}
