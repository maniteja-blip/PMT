import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isManagerish } from "@/lib/perm";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!isManagerish(s.role)) redirect("/dashboard");
  return children;
}
