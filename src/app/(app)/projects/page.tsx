import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canCreateProject, canDeleteProject } from "@/lib/perm";
import { HealthStatus, Prisma } from "@prisma/client";
import { PageHeader } from "@/components/app/page-header";
import { HealthPill } from "@/components/app/pills";
import { CreateProjectDialog } from "@/components/app/dialogs/create-project-dialog";
import { ProjectActions } from "@/components/app/project-actions";
import { ProjectsFilters } from "@/components/app/projects-filters";
import { Card } from "@/components/ui/card";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const canCreate = session ? canCreateProject(session.role) : false;
  const canDelete = session ? canDeleteProject(session.role) : false;

  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const pageSize = 24;
  const health = Array.isArray(sp.health) ? sp.health[0] : sp.health;
  const ownerId = Array.isArray(sp.ownerId) ? sp.ownerId[0] : sp.ownerId;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const viewId = Array.isArray(sp.view) ? sp.view[0] : sp.view;

  const owners = await db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const savedViews = session
    ? await db.savedView.findMany({
      where: { ownerId: session.userId, kind: "PROJECTS" },
      select: { id: true, name: true, query: true },
      orderBy: { updatedAt: "desc" },
    })
    : [];

  const view = viewId ? savedViews.find((v) => v.id === viewId) : null;
  const viewQuery = (view?.query ?? {}) as Record<string, unknown>;
  const effectiveHealth = typeof viewQuery.health === "string" ? viewQuery.health : health;
  const effectiveOwnerId = typeof viewQuery.ownerId === "string" ? viewQuery.ownerId : ownerId;
  const effectiveQ = typeof viewQuery.q === "string" ? viewQuery.q : q;

  type ProjectWithRelations = Prisma.ProjectGetPayload<{
    include: {
      owner: { select: { id: true; name: true } };
      _count: { select: { tasks: true } };
    };
  }>;

  let projects: ProjectWithRelations[] = [];
  let total = 0;

  try {
    const where = {
      ...(effectiveHealth && Object.values(HealthStatus).includes(effectiveHealth as HealthStatus)
        ? { health: effectiveHealth as HealthStatus }
        : {}),
      ...(effectiveOwnerId ? { ownerId: effectiveOwnerId } : {}),
      ...(effectiveQ ? { name: { contains: effectiveQ } } : {}),
    };

    [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: [{ health: "asc" }, { updatedAt: "desc" }],
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.project.count({ where }),
    ]);
  } catch (error) {
    console.error("Error fetching projects:", error);
    // Return empty state or could throw/return error component
    projects = [];
    total = 0;
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
    return s ? `/projects?${s}` : "/projects";
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Projects"
        subtitle="Portfolio health, milestones, and execution pressure."
        actions={canCreate ? <CreateProjectDialog owners={owners} /> : null}
      />

      <ProjectsFilters owners={owners} savedViews={savedViews} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} className="grain surface rounded-3xl border bg-card/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/projects/${p.id}`} className="truncate font-medium hover:underline">
                  {p.name}
                </Link>
                <div className="mt-1 text-xs text-muted-foreground">Owner: {p.owner.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <HealthPill health={p.health} />
                <ProjectActions projectId={p.id} canDelete={canDelete} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="font-mono text-xs text-muted-foreground">{p._count.tasks} tasks</div>
              <div className="text-xs text-muted-foreground">
                {p.targetDate ? `Target ${p.targetDate.toLocaleDateString()}` : "No target"}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {total} projects • page {page} / {totalPages}
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
