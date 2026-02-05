"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function searchEntities(q: string) {
  await requireSession();

  const query = q.trim();
  if (query.length < 2) return { people: [], projects: [], tasks: [] };

  const [people, projects, tasks] = await Promise.all([
    db.user.findMany({
      where: { name: { contains: query } },
      select: { id: true, name: true },
      take: 6,
    }),
    db.project.findMany({
      where: { name: { contains: query } },
      select: { id: true, name: true },
      take: 6,
    }),
    db.task.findMany({
      where: { title: { contains: query } },
      select: { id: true, title: true, projectId: true },
      take: 8,
    }),
  ]);

  return { people, projects, tasks };
}
