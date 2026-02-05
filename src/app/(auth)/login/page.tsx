import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect("/dashboard");

  const showDemo = process.env.NODE_ENV !== "production";
  const demoUsers = showDemo
    ? await db.user.findMany({
        select: { email: true, role: true },
        orderBy: { role: "asc" },
        take: 4,
      })
    : [];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] items-center px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Card className="grain surface rounded-3xl border bg-card/80 p-6">
          <div className="font-display text-3xl leading-none">PMT</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Sign in to your workspace.
          </div>

          <LoginForm />

          {showDemo ? (
            <div className="mt-5 rounded-2xl border bg-background/60 p-4 text-xs text-muted-foreground">
              Dev hint: seeded users share password <span className="font-mono">pmt</span>.
              <div className="mt-2">Demo accounts:</div>
              <div className="mt-2 grid gap-1 font-mono">
                {demoUsers.map((u) => (
                  <div key={u.email}>
                    {u.email} ({u.role.toLowerCase()})
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
