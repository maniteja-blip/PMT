"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Prisma, ViewKind } from "@prisma/client";

export async function saveTasksView({
  name,
  query,
}: {
  name: string;
  query: Record<string, unknown>;
}) {
  const s = await requireSession();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("View name too short");

  await db.savedView.create({
    data: {
      ownerId: s.userId,
      kind: ViewKind.TASKS,
      name: trimmed,
      query: query as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/tasks");
}

export async function saveProjectsView({
  name,
  query,
}: {
  name: string;
  query: Record<string, unknown>;
}) {
  const s = await requireSession();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("View name too short");

  await db.savedView.create({
    data: {
      ownerId: s.userId,
      kind: ViewKind.PROJECTS,
      name: trimmed,
      query: query as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/projects");
}

export async function savePeopleView({
  name,
  query,
}: {
  name: string;
  query: Record<string, unknown>;
}) {
  const s = await requireSession();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("View name too short");

  await db.savedView.create({
    data: {
      ownerId: s.userId,
      kind: ViewKind.PEOPLE,
      name: trimmed,
      query: query as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/people");
}

export async function deleteView(viewId: string) {
  const s = await requireSession();

  await db.savedView.deleteMany({ where: { id: viewId, ownerId: s.userId } });
  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/people");
}
