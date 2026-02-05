import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamDialog } from "@/components/app/dialogs/team-dialog";
import { TeamDeleteButton } from "@/components/app/team-delete-button";

export default async function AdminTeamsPage() {
  const teams = await db.team.findMany({
    include: { users: { select: { id: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Admin: Teams"
        subtitle="Teams power filters and rollups."
        actions={<TeamDialog trigger={<Button className="rounded-2xl">New team</Button>} />}
      />

      <Card className="grain surface rounded-3xl border bg-card/80 p-5">
        <div className="grid gap-3">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{t.users.length} people</div>
              </div>
              <div className="flex items-center gap-2">
                <TeamDialog trigger={<Button variant="secondary" className="rounded-2xl">Rename</Button>} initial={{ id: t.id, name: t.name }} />
                <TeamDeleteButton id={t.id} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
