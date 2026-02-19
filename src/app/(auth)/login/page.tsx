import { redirect } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const s = await getSession();
  let currentUser = null;
  if (s) {
    const exists = await db.user.findUnique({ where: { id: s.userId }, select: { email: true } });
    if (exists) currentUser = exists;
  }

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
            {currentUser ? (
              <span>Logged in as <span className="font-medium text-foreground">{currentUser.email}</span>.</span>
            ) : (
              "Sign in to your workspace."
            )}
          </div>

          {currentUser ? (
            <div className="mt-6 mb-4">
              <a
                href="/dashboard"
                className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Go to Dashboard
              </a>
              <div className="mt-2 text-center">
                <a href="/api/auth/logout" className="text-xs text-muted-foreground hover:underline">Or sign out</a>
              </div>
            </div>
          ) : (
            <LoginForm />
          )}

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
