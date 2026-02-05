import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { CreateTaskDialog } from "@/components/app/dialogs/create-task-dialog";
import { PeopleFilters } from "@/components/app/people-filters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CapacityMeter } from "@/components/app/capacity-meter";
import { TaskStatus } from "@prisma/client";
import { getSession } from "@/lib/session";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const pageSize = 24;
  const teamId = Array.isArray(sp.teamId) ? sp.teamId[0] : sp.teamId;
  const role = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  const overloaded = Array.isArray(sp.overloaded) ? sp.overloaded[0] : sp.overloaded;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const viewId = Array.isArray(sp.view) ? sp.view[0] : sp.view;

  const [users, projects, people, teams, savedViews] = await Promise.all([
    db.user.findMany({
      orderBy: { name: "asc" },
      include: { team: true },
    }),
    db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    session
      ? db.savedView.findMany({
          where: { ownerId: session.userId, kind: "PEOPLE" },
          select: { id: true, name: true, query: true },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const view = viewId ? savedViews.find((v) => v.id === viewId) : null;
  const viewQuery = (view?.query ?? {}) as Record<string, unknown>;
  const effectiveTeamId = typeof viewQuery.teamId === "string" ? viewQuery.teamId : teamId;
  const effectiveRole = typeof viewQuery.role === "string" ? viewQuery.role : role;
  const effectiveQ = typeof viewQuery.q === "string" ? viewQuery.q : q;
  const effectiveOverloaded =
    typeof viewQuery.overloaded === "boolean"
      ? String(viewQuery.overloaded)
      : overloaded;

  const loadByAssignee = await db.task.groupBy({
    by: ["assigneeId"],
    where: {
      assigneeId: { not: null },
      status: { not: TaskStatus.DONE },
      dueDate: { lte: weekAhead },
    },
    _sum: { estimateHours: true },
    _count: { _all: true },
  });

  const openByAssignee = await db.task.groupBy({
    by: ["assigneeId"],
    where: { assigneeId: { not: null }, status: { not: TaskStatus.DONE } },
    _count: { _all: true },
  });

  const loadMap = new Map(
    loadByAssignee.map((x) => [x.assigneeId!, { hours: x._sum.estimateHours ?? 0, tasks: x._count._all }]),
  );
  const openMap = new Map(openByAssignee.map((x) => [x.assigneeId!, x._count._all]));

  const filtered = users.filter((u) => {
    if (effectiveTeamId && u.teamId !== effectiveTeamId) return false;
    if (effectiveRole && u.role !== effectiveRole) return false;
    if (effectiveQ && !u.name.toLowerCase().includes(String(effectiveQ).toLowerCase())) return false;

    if (effectiveOverloaded === "true" || effectiveOverloaded === "false") {
      const load = loadMap.get(u.id)?.hours ?? 0;
      const isOver = load > u.weeklyCapacityHours;
      if (effectiveOverloaded === "true" && !isOver) return false;
      if (effectiveOverloaded === "false" && isOver) return false;
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function withPage(n: number) {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = Array.isArray(v) ? v[0] : v;
      if (!val) continue;
      if (k === "page") continue;
      next.set(k, String(val));
    }
    if (n > 1) next.set("page", String(n));
    const s = next.toString();
    return s ? `/people?${s}` : "/people";
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="People"
        subtitle="Click any person for their command center: work, progress, and pressure."
        actions={<CreateTaskDialog projects={projects} people={people} />}
      />

      <PeopleFilters teams={teams} savedViews={savedViews} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((u) => {
          const load = loadMap.get(u.id)?.hours ?? 0;
          const open = openMap.get(u.id) ?? 0;
          const overloaded = load > u.weeklyCapacityHours;
          return (
            <Link key={u.id} href={`/people/${u.id}`} className="group">
              <Card className="grain surface rounded-3xl border bg-card/80 p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-1 ring-border">
                      <AvatarImage src={u.avatarUrl ?? undefined} alt={u.name} />
                      <AvatarFallback>{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium leading-none">{u.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {u.team?.name ?? "No team"} • {u.role.toLowerCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {overloaded ? (
                      <Badge variant="destructive">overloaded</Badge>
                    ) : (
                      <Badge variant="secondary">on track</Badge>
                    )}
                    <div className="font-mono text-xs text-muted-foreground">
                      {open} open
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <CapacityMeter value={load} max={u.weeklyCapacityHours} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {total} people • page {page} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Link
            className={`rounded-2xl border px-3 py-1 text-xs ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-background"}`}
            href={withPage(page - 1)}
          >
            Prev
          </Link>
          <Link
            className={`rounded-2xl border px-3 py-1 text-xs ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-background"}`}
            href={withPage(page + 1)}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
