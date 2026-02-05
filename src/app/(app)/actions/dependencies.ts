"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ActivityAction, EntityType, TaskStatus } from "@prisma/client";

async function loadTaskWithSession(taskId: string) {
  const session = await requireSession();
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, status: true },
  });
  if (!task) throw new Error("NOT_FOUND");
  return { session, task };
}

async function hasUnmetDependencies(taskId: string) {
  const deps = await db.taskDependency.findMany({
    where: { toTaskId: taskId },
    include: { fromTask: { select: { status: true } } },
  });
  return deps.some((d) => d.fromTask.status !== TaskStatus.DONE);
}

async function wouldCreateCycle({
  projectId,
  fromTaskId,
  toTaskId,
}: {
  projectId: string;
  fromTaskId: string;
  toTaskId: string;
}) {
  // Edge direction is fromTaskId -> toTaskId.
  // A cycle occurs if toTaskId can already reach fromTaskId.
  const edges = await db.taskDependency.findMany({
    where: { toTask: { projectId } },
    select: { fromTaskId: true, toTaskId: true },
  });

  const out = new Map<string, string[]>();
  for (const e of edges) {
    const list = out.get(e.fromTaskId) ?? [];
    list.push(e.toTaskId);
    out.set(e.fromTaskId, list);
  }

  const q: string[] = [toTaskId];
  const seen = new Set<string>();
  while (q.length) {
    const cur = q.shift()!;
    if (cur === fromTaskId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of out.get(cur) ?? []) q.push(nxt);
  }

  return false;
}

export async function addDependency({
  toTaskId,
  fromTaskId,
}: {
  toTaskId: string;
  fromTaskId: string;
}) {
  if (!toTaskId || !fromTaskId) throw new Error("Invalid dependency");
  if (toTaskId === fromTaskId) throw new Error("A task cannot depend on itself");

  // Dependencies are editable by any authenticated user.
  const { session, task: toTask } = await loadTaskWithSession(toTaskId);

  const fromTask = await db.task.findUnique({
    where: { id: fromTaskId },
    select: { id: true, projectId: true, status: true },
  });
  if (!fromTask) throw new Error("NOT_FOUND");
  if (fromTask.projectId !== toTask.projectId) {
    throw new Error("Dependencies must be within the same project");
  }

  const cycle = await wouldCreateCycle({
    projectId: toTask.projectId,
    fromTaskId,
    toTaskId,
  });
  if (cycle) {
    throw new Error("This dependency would create a cycle");
  }

  await db.taskDependency
    .create({ data: { toTaskId, fromTaskId } })
    .catch(() => undefined);

  // Auto-block if newly unmet.
  if (toTask.status !== TaskStatus.DONE && fromTask.status !== TaskStatus.DONE) {
    await db.task.update({
      where: { id: toTaskId },
      data: { status: TaskStatus.BLOCKED, completedAt: null },
    });
  }

  await db.activityEvent.create({
    data: {
      actorId: session.userId,
      entityType: EntityType.TASK,
      entityId: toTaskId,
      action: ActivityAction.UPDATED,
      metadata: { dependency: "added", fromTaskId },
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${toTaskId}`);
  revalidatePath(`/projects/${toTask.projectId}`);
}

export async function removeDependency({
  toTaskId,
  fromTaskId,
}: {
  toTaskId: string;
  fromTaskId: string;
}) {
  if (!toTaskId || !fromTaskId) throw new Error("Invalid dependency");
  const { session, task: toTask } = await loadTaskWithSession(toTaskId);

  await db.taskDependency.deleteMany({ where: { toTaskId, fromTaskId } });

  // Auto-unblock when last unmet dependency removed.
  if (toTask.status === TaskStatus.BLOCKED) {
    const stillUnmet = await hasUnmetDependencies(toTaskId);
    if (!stillUnmet) {
      await db.task.update({
        where: { id: toTaskId },
        data: { status: TaskStatus.TODO },
      });
    }
  }

  await db.activityEvent.create({
    data: {
      actorId: session.userId,
      entityType: EntityType.TASK,
      entityId: toTaskId,
      action: ActivityAction.UPDATED,
      metadata: { dependency: "removed", fromTaskId },
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${toTaskId}`);
  revalidatePath(`/projects/${toTask.projectId}`);
}
