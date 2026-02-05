"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ActivityAction, EntityType } from "@prisma/client";
import { canEditAnyTask } from "@/lib/perm";

export async function addComment({
  taskId,
  body,
}: {
  taskId: string;
  body: string;
}) {
  const s = await requireSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, assigneeId: true, project: { select: { ownerId: true } } },
  });
  if (!task) throw new Error("NOT_FOUND");
  const canComment =
    canEditAnyTask(s.role) || task.assigneeId === s.userId || task.project.ownerId === s.userId;
  if (!canComment) throw new Error("FORBIDDEN");

  const text = body.trim();
  if (text.length < 1) throw new Error("Empty comment");
  if (text.length > 2000) throw new Error("Comment too long");

  const comment = await db.comment.create({
    data: {
      taskId,
      authorId: s.userId,
      body: text,
    },
    select: { id: true },
  });

  await db.activityEvent.create({
    data: {
      actorId: s.userId,
      entityType: EntityType.COMMENT,
      entityId: comment.id,
      action: ActivityAction.COMMENTED,
      metadata: { taskId },
    },
  });

  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteComment({
  commentId,
  taskId,
}: {
  commentId: string;
  taskId: string;
}) {
  const s = await requireSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, assigneeId: true, project: { select: { ownerId: true } } },
  });
  if (!task) throw new Error("NOT_FOUND");

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });
  if (!comment) return;

  const canDelete =
    comment.authorId === s.userId || canEditAnyTask(s.role) || task.project.ownerId === s.userId;
  if (!canDelete) {
    throw new Error("FORBIDDEN");
  }

  await db.comment.delete({ where: { id: commentId } });
  revalidatePath(`/tasks/${taskId}`);
}
