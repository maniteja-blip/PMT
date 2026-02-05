"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canDeleteTask, canEditAnyTask } from "@/lib/perm";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "@/lib/validation";
import { ActivityAction, EntityType, TaskStatus } from "@prisma/client";

async function hasUnmetDependencies(taskId: string) {
  const deps = await db.taskDependency.findMany({
    where: { toTaskId: taskId },
    include: { fromTask: { select: { status: true } } },
  });
  return deps.some((d) => d.fromTask.status !== TaskStatus.DONE);
}

function toDateOrNull(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createTask(input: unknown) {
  const session = await requireSession();
  const parsed = createTaskSchema.parse(input);

  // Basic referential checks (avoid Prisma throwing cryptic errors).
  const project = await db.project.findUnique({
    where: { id: parsed.projectId },
    select: { id: true },
  });
  if (!project) throw new Error("NOT_FOUND");
  if (parsed.assigneeId) {
    const assignee = await db.user.findUnique({ where: { id: parsed.assigneeId }, select: { id: true } });
    if (!assignee) throw new Error("NOT_FOUND");
  }

  const task = await db.task.create({
    data: {
      title: parsed.title,
      description: parsed.description || null,
      projectId: parsed.projectId,
      assigneeId: parsed.assigneeId || null,
      reporterId: session.userId,
      dueDate: toDateOrNull(parsed.dueDate),
      estimateHours: parsed.estimateHours,
      priority: parsed.priority,
      status: parsed.status,
      startedAt: parsed.status === TaskStatus.IN_PROGRESS ? new Date() : null,
      completedAt: parsed.status === TaskStatus.DONE ? new Date() : null,
    },
    select: { id: true, projectId: true },
  });

  if (session) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.TASK,
        entityId: task.id,
        action: ActivityAction.CREATED,
        metadata: { projectId: task.projectId },
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
  return task;
}

export async function updateTask(input: unknown) {
  const session = await requireSession();
  const parsed = updateTaskSchema.parse(input);

  const before = await db.task.findUnique({
    where: { id: parsed.id },
    select: {
      status: true,
      projectId: true,
      assigneeId: true,
      priority: true,
      project: { select: { ownerId: true } },
    },
  });
  if (!before) throw new Error("NOT_FOUND");

  const canManage = canEditAnyTask(session.role) || before.project.ownerId === session.userId;
  const canEditSelf = before.assigneeId === session.userId;
  if (!canManage && !canEditSelf) {
    throw new Error("FORBIDDEN");
  }

  if (!canManage) {
    // Members can only edit their own task content, not reassign/move/retag.
    if (parsed.projectId !== before.projectId) throw new Error("FORBIDDEN");
    if ((parsed.assigneeId || null) !== (before.assigneeId || null)) throw new Error("FORBIDDEN");
    if (parsed.priority !== before.priority) throw new Error("FORBIDDEN");
  } else {
    // Managers can move/reassign; validate referenced ids.
    const project = await db.project.findUnique({ where: { id: parsed.projectId }, select: { id: true } });
    if (!project) throw new Error("NOT_FOUND");
    if (parsed.assigneeId) {
      const assignee = await db.user.findUnique({ where: { id: parsed.assigneeId }, select: { id: true } });
      if (!assignee) throw new Error("NOT_FOUND");
    }
  }

  const task = await db.task.update({
    where: { id: parsed.id },
    data: {
      title: parsed.title,
      description: parsed.description || null,
      projectId: canManage ? parsed.projectId : undefined,
      assigneeId: canManage ? parsed.assigneeId || null : undefined,
      dueDate: toDateOrNull(parsed.dueDate),
      estimateHours: parsed.estimateHours,
      priority: canManage ? parsed.priority : undefined,
      // Status is handled via updateTaskStatus (dependency constraints). Ignore here.
    },
    select: { projectId: true },
  });

  if (session) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.TASK,
        entityId: parsed.id,
        action: ActivityAction.UPDATED,
        metadata: { before, after: { projectId: task.projectId } },
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/tasks/${parsed.id}`);
}

export async function updateTaskStatus(input: unknown) {
  const session = await requireSession();
  const parsed = updateTaskStatusSchema.parse(input);

  const before = await db.task.findUnique({
    where: { id: parsed.id },
    select: { status: true, projectId: true, assigneeId: true },
  });
  if (!before) throw new Error("NOT_FOUND");
  if (!canEditAnyTask(session.role) && before.assigneeId !== session.userId) {
    throw new Error("FORBIDDEN");
  }

  if (parsed.status !== TaskStatus.DONE && parsed.status !== TaskStatus.BLOCKED) {
    const unmet = await hasUnmetDependencies(parsed.id);
    if (unmet) {
      throw new Error("Task has unmet dependencies. Clear them or mark them done.");
    }
  }

  const task = await db.task.update({
    where: { id: parsed.id },
    data: {
      status: parsed.status,
      startedAt:
        parsed.status === TaskStatus.IN_PROGRESS ? new Date() : undefined,
      completedAt: parsed.status === TaskStatus.DONE ? new Date() : null,
    },
    select: { projectId: true },
  });

  if (session && before?.status && before.status !== parsed.status) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.TASK,
        entityId: parsed.id,
        action: ActivityAction.STATUS_CHANGED,
        metadata: { from: before.status, to: parsed.status },
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/tasks/${parsed.id}`);
}

export async function deleteTask(taskId: string) {
  const session = await requireSession();
  if (!canDeleteTask(session.role)) throw new Error("FORBIDDEN");
  const task = await db.task.delete({ where: { id: taskId }, select: { projectId: true } });

  if (session) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.TASK,
        entityId: taskId,
        action: ActivityAction.UPDATED,
        metadata: { deleted: true },
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
}

export async function renameTask(input: unknown) {
  const session = await requireSession();
  const x = input as { id?: unknown; title?: unknown };
  const id = typeof x.id === "string" ? x.id : "";
  const title = typeof x.title === "string" ? x.title.trim() : "";
  if (!id || title.length < 2) throw new Error("Invalid task title");

  const before = await db.task.findUnique({ where: { id }, select: { assigneeId: true } });
  if (!before) throw new Error("NOT_FOUND");
  if (!canEditAnyTask(session.role) && before.assigneeId !== session.userId) {
    throw new Error("FORBIDDEN");
  }

  const task = await db.task.update({ where: { id }, data: { title }, select: { projectId: true } });

  if (session) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.TASK,
        entityId: id,
        action: ActivityAction.UPDATED,
        metadata: { title },
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/tasks/${id}`);
}
