import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserDialog } from "@/components/app/dialogs/user-dialog";
import { InviteDialog } from "@/components/app/dialogs/invite-dialog";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(sp.page) || 1);
  const q = typeof sp.q === "string" ? sp.q : "";
  const pageSize = 20;

  const where = {
    OR: q
      ? [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ]
      : undefined,
  };

  const [users, total, teams, invites] = await Promise.all([
    db.user.findMany({
      where,
      include: { team: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.user.count({ where }),
    db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.invite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, token: true, email: true, role: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
        <div className="mb-4 flex items-center gap-2">
          <form className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search users..."
              className="pl-9 rounded-2xl"
            />
          </form>
          <div className="ml-auto text-xs text-muted-foreground">
            {total} users • page {page} of {totalPages}
          </div>
        </div>

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
          {users.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No users found.</div>}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href={`/admin/users?page=${page - 1}${q ? `&q=${q}` : ""}`}
              className={`rounded-2xl border px-3 py-1 text-xs ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-background"}`}
            >
              Prev
            </Link>
            <Link
              href={`/admin/users?page=${page + 1}${q ? `&q=${q}` : ""}`}
              className={`rounded-2xl border px-3 py-1 text-xs ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-background"}`}
            >
              Next
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
