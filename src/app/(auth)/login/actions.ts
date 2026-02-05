"use server";

import { redirect } from "next/navigation";
import { loginWithPassword } from "@/lib/auth";

export async function loginAction(
  _prev: { error: string },
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const ok = await loginWithPassword(email, password);
  if (!ok) return { error: "Invalid email or password" };
  redirect("/dashboard");
}
