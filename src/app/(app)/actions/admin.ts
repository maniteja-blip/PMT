"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isManagerish } from "@/lib/perm";
import { Role } from "@prisma/client";
import crypto from "crypto";

function requireAdmin() {
  return requireSession().then((s) => {
    if (!isManagerish(s.role)) throw new Error("FORBIDDEN");
    return s;
  });
}

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  role: z.nativeEnum(Role),
  teamId: z.string().optional().or(z.literal("")),
  weeklyCapacityHours: z.number().min(0).max(80),
  timezone: z.string().trim().min(2).max(64),
  password: z.string().min(4).max(200),
});

const updateUserSchema = createUserSchema.omit({ password: true }).extend({
  id: z.string().min(1),
});

export async function createUser(input: unknown) {
  await requireAdmin();
  const parsed = createUserSchema.parse(input);
  const passwordHash = await bcrypt.hash(parsed.password, 10);

  await db.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      teamId: parsed.teamId || null,
      weeklyCapacityHours: parsed.weeklyCapacityHours,
      timezone: parsed.timezone,
      passwordHash,
    },
  });

  revalidatePath("/admin/users");
}

export async function updateUser(input: unknown) {
  await requireAdmin();
  const parsed = updateUserSchema.parse(input);

  await db.user.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      teamId: parsed.teamId || null,
      weeklyCapacityHours: parsed.weeklyCapacityHours,
      timezone: parsed.timezone,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/people");
}

export async function resetUserPassword({
  id,
  password,
}: {
  id: string;
  password: string;
}) {
  await requireAdmin();
  if (password.trim().length < 4) throw new Error("Password too short");
  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.update({ where: { id }, data: { passwordHash } });
  revalidatePath("/admin/users");
}

const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function createTeam(input: unknown) {
  await requireAdmin();
  const parsed = createTeamSchema.parse(input);
  await db.team.create({ data: { name: parsed.name } });
  revalidatePath("/admin/teams");
  revalidatePath("/people");
}

export async function renameTeam({ id, name }: { id: string; name: string }) {
  await requireAdmin();
  const parsed = createTeamSchema.parse({ name });
  await db.team.update({ where: { id }, data: { name: parsed.name } });
  revalidatePath("/admin/teams");
  revalidatePath("/people");
}

export async function deleteTeam(id: string) {
  await requireAdmin();
  // Detach users to avoid FK issues.
  await db.user.updateMany({ where: { teamId: id }, data: { teamId: null } });
  await db.team.delete({ where: { id } });
  revalidatePath("/admin/teams");
  revalidatePath("/people");
}

const createInviteSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.nativeEnum(Role),
  teamId: z.string().optional().or(z.literal("")),
  weeklyCapacityHours: z.number().min(0).max(80).default(35),
  timezone: z.string().trim().min(2).max(64).default("America/New_York"),
  expiresInDays: z.number().min(1).max(30).default(7),
});

export async function createInvite(input: unknown) {
  await requireAdmin();
  const parsed = createInviteSchema.parse(input);

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000);

  const invite = await db.invite.create({
    data: {
      token,
      email: parsed.email,
      role: parsed.role,
      teamId: parsed.teamId || null,
      weeklyCapacityHours: parsed.weeklyCapacityHours,
      timezone: parsed.timezone,
      expiresAt,
    },
    select: { token: true },
  });

  revalidatePath("/admin/users");
  return { token: invite.token };
}

export async function revokeInvite(id: string) {
  await requireAdmin();
  await db.invite.delete({ where: { id } });
  revalidatePath("/admin/users");
}
