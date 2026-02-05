"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { createProjectSchema, updateProjectSchema } from "@/lib/validation";
import { ActivityAction, EntityType } from "@prisma/client";
import { canCreateProject, canManageProject } from "@/lib/perm";

function toDateOrNull(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createProject(input: unknown) {
  const session = await requireSession();
  if (!canCreateProject(session.role)) throw new Error("FORBIDDEN");
  const parsed = createProjectSchema.parse(input);

  const project = await db.project.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      ownerId: parsed.ownerId,
      targetDate: toDateOrNull(parsed.targetDate),
    },
    select: { id: true },
  });

  if (session) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.PROJECT,
        entityId: project.id,
        action: ActivityAction.CREATED,
      },
    });
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(input: unknown) {
  const session = await requireSession();
  const parsed = updateProjectSchema.parse(input);

  const existing = await db.project.findUnique({ where: { id: parsed.id }, select: { ownerId: true } });
  if (!existing) throw new Error("NOT_FOUND");
  if (!canManageProject({ role: session.role, userId: session.userId, ownerId: existing.ownerId })) {
    throw new Error("FORBIDDEN");
  }

  await db.project.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      ownerId: parsed.ownerId,
      targetDate: toDateOrNull(parsed.targetDate),
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${parsed.id}`);

  if (session) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.PROJECT,
        entityId: parsed.id,
        action: ActivityAction.UPDATED,
      },
    });
  }
}

export async function deleteProject(projectId: string) {
  const session = await requireSession();
  const existing = await db.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!existing) throw new Error("NOT_FOUND");
  if (!canManageProject({ role: session.role, userId: session.userId, ownerId: existing.ownerId })) {
    throw new Error("FORBIDDEN");
  }
  await db.project.delete({ where: { id: projectId } });

  if (session) {
    await db.activityEvent.create({
      data: {
        actorId: session.userId,
        entityType: EntityType.PROJECT,
        entityId: projectId,
        action: ActivityAction.UPDATED,
        metadata: { deleted: true },
      },
    });
  }

  revalidatePath("/projects");
  redirect("/projects");
}
