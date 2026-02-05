import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";

export default function AdminHome() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Admin" subtitle="Org configuration." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-sm font-semibold">People</div>
          <div className="mt-2 text-sm text-muted-foreground">Create users, set roles, capacity, and teams.</div>
          <div className="mt-4">
            <Link className="text-sm underline" href="/admin/users">
              Manage users
            </Link>
          </div>
        </Card>
        <Card className="grain surface rounded-3xl border bg-card/80 p-5">
          <div className="text-sm font-semibold">Teams</div>
          <div className="mt-2 text-sm text-muted-foreground">Create and rename teams.</div>
          <div className="mt-4">
            <Link className="text-sm underline" href="/admin/teams">
              Manage teams
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
