"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string().min(8),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(6).max(200),
});

export async function acceptInviteAction(
  _prev: { error: string },
  formData: FormData,
) {
  const parsed = acceptSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) return { error: "Invalid input" };

  const invite = await db.invite.findUnique({ where: { token: parsed.data.token } });
  if (!invite) return { error: "Invite not found" };
  if (invite.acceptedAt) return { error: "Invite already used" };
  if (invite.expiresAt < new Date()) return { error: "Invite expired" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: invite.email.toLowerCase(),
      role: invite.role,
      teamId: invite.teamId,
      timezone: invite.timezone,
      weeklyCapacityHours: invite.weeklyCapacityHours,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await db.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  redirect("/dashboard");
}
