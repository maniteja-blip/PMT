"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageProject } from "@/lib/perm";
import { MilestoneStatus } from "@prisma/client";
import { z } from "zod";

const createMilestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(2).max(200),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.nativeEnum(MilestoneStatus).optional().default(MilestoneStatus.PLANNED),
});

const updateMilestoneSchema = createMilestoneSchema.extend({
  id: z.string().min(1),
});

function toDateOrNull(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function assertCanManage(projectId: string) {
  const s = await requireSession();

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) throw new Error("NOT_FOUND");

  if (!canManageProject({ role: s.role, userId: s.userId, ownerId: project.ownerId })) {
    throw new Error("FORBIDDEN");
  }

  return { s, project };
}

export async function createMilestone(input: unknown) {
  const parsed = createMilestoneSchema.parse(input);
  const { project } = await assertCanManage(parsed.projectId);

  await db.milestone.create({
    data: {
      projectId: project.id,
      name: parsed.name,
      dueDate: toDateOrNull(parsed.dueDate),
      status: parsed.status,
    },
  });

  revalidatePath(`/projects/${project.id}`);
}

export async function updateMilestone(input: unknown) {
  const parsed = updateMilestoneSchema.parse(input);
  const { project } = await assertCanManage(parsed.projectId);

  await db.milestone.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      dueDate: toDateOrNull(parsed.dueDate),
      status: parsed.status,
    },
  });

  revalidatePath(`/projects/${project.id}`);
}

export async function deleteMilestone({
  id,
  projectId,
}: {
  id: string;
  projectId: string;
}) {
  const { project } = await assertCanManage(projectId);
  await db.milestone.delete({ where: { id } });
  revalidatePath(`/projects/${project.id}`);
}
