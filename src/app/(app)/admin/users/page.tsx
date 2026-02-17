import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";

export const dynamic = "force-dynamic";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserDialog } from "@/components/app/dialogs/user-dialog";
import { InviteDialog } from "@/components/app/dialogs/invite-dialog";

export default async function AdminUsersPage() {
  const [users, teams, invites] = await Promise.all([
    db.user.findMany({
      include: { team: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.invite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, token: true, email: true, role: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Admin: Users"
        subtitle="Create users, assign roles, set capacity."
        actions={
          <>
            <InviteDialog
              trigger={<Button variant="secondary" className="rounded-2xl">Invite</Button>}
              teams={teams}
              invites={invites.map((i) => ({
                id: i.id,
                token: i.token,
                email: i.email,
                role: i.role,
                expiresAt: i.expiresAt.toISOString(),
              }))}
            />
            <UserDialog trigger={<Button className="rounded-2xl">New user</Button>} teams={teams} />
          </>
        }
      />

      <Card className="grain surface rounded-3xl border bg-card/80 p-5">
        <div className="grid gap-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{u.name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {u.email} • {u.role.toLowerCase()} • {u.team?.name ?? "No team"} • {u.weeklyCapacityHours}h
                </div>
              </div>
              <UserDialog
                trigger={<Button variant="secondary" className="rounded-2xl">Edit</Button>}
                teams={teams}
                initial={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  teamId: u.teamId,
                  weeklyCapacityHours: u.weeklyCapacityHours,
                  timezone: u.timezone,
                }}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
