import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CommandK } from "@/components/app/command-k";
import { UserMenu } from "@/components/app/user-menu";
import { getSession } from "@/lib/session";
import { Users } from "lucide-react";

export function Topbar() {
  async function logoutAction() {
    "use server";
    const { logout } = await import("@/lib/auth");
    const { redirect } = await import("next/navigation");
    await logout();
    redirect("/login");
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="font-display text-xl leading-none">PMT</div>
        <div className="text-xs text-muted-foreground">portfolio + people + momentum</div>
      </div>

      <div className="flex items-center gap-2">
        <CommandK />
        <Button variant="secondary" className="gap-2 rounded-2xl" asChild>
          <Link href="/people">
            <Users className="h-4 w-4" />
            People
          </Link>
        </Button>
        <AuthSlot logoutAction={logoutAction} />
      </div>
    </div>
  );
}

async function AuthSlot({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const s = await getSession();
  if (!s) return null;
  return <UserMenu user={{ name: s.name, email: s.email, role: s.role }} onLogout={logoutAction} />;
}
