import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, getSession, clearSession } from "@/lib/session";

export async function requireSession() {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");

  const exists = await db.user.findUnique({
    where: { id: s.userId },
    select: { id: true },
  });

  if (!exists) {
    // Handles stale sessions (eg. DB reset) and deleted users.
    throw new Error("UNAUTHORIZED");
  }

  return s;
}

export async function loginWithPassword(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });

  if (!user?.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return { id: user.id };
}

export async function logout() {
  await clearSession();
}
