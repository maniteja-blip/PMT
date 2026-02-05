"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteView, savePeopleView } from "@/app/(app)/actions/views";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function PeopleFilters({
  teams,
  savedViews,
}: {
  teams: { id: string; name: string }[];
  savedViews: { id: string; name: string; query: unknown }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const current = useMemo(() => {
    return {
      teamId: sp.get("teamId") ?? "",
      role: sp.get("role") ?? "",
      overloaded: sp.get("overloaded") ?? "",
      q: sp.get("q") ?? "",
      view: sp.get("view") ?? "",
    };
  }, [sp]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value || value === "__all__") next.delete(key);
    else next.set(key, value);
    next.delete("view");
    router.push(`${pathname}?${next.toString()}`);
  }

  function applyView(viewId: string) {
    if (!viewId || viewId === "__none__") {
      router.push("/people");
      return;
    }
    const v = savedViews.find((x) => x.id === viewId);
    if (!v) return;
    const next = new URLSearchParams();
    next.set("view", viewId);

    const query = (v.query ?? {}) as Record<string, unknown>;
    if (typeof query.teamId === "string") next.set("teamId", query.teamId);
    if (typeof query.role === "string") next.set("role", query.role);
    if (typeof query.overloaded === "boolean") next.set("overloaded", String(query.overloaded));
    if (typeof query.q === "string") next.set("q", query.q);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="rounded-3xl border bg-background/50 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="grid gap-2">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground">Saved views</div>
            <Select value={current.view} onValueChange={applyView}>
              <SelectTrigger className="w-[260px] rounded-2xl">
                <SelectValue placeholder="Pick a saved view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {savedViews.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-2xl"
              disabled={pending}
              onClick={() => {
                const name = window.prompt("Save view as:");
                if (!name) return;
                const query = {
                  teamId: current.teamId || undefined,
                  role: current.role || undefined,
                  overloaded: current.overloaded === "true" ? true : current.overloaded === "false" ? false : undefined,
                  q: current.q || undefined,
                };
                startTransition(async () => {
                  try {
                    await savePeopleView({ name, query });
                    toast.success("Saved view created");
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              Save view
            </Button>
            <Button
              variant="secondary"
              className="rounded-2xl"
              disabled={pending || !current.view}
              onClick={() => {
                if (!current.view) return;
                if (!window.confirm("Delete this saved view?")) return;
                startTransition(async () => {
                  try {
                    await deleteView(current.view);
                    toast.success("View deleted");
                    router.push("/people");
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              Delete view
            </Button>
            <Button variant="ghost" className="rounded-2xl" onClick={() => router.push("/people")}>
              Clear
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label>Team</Label>
            <Select value={current.teamId} onValueChange={(v) => setParam("teamId", v)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={current.role} onValueChange={(v) => setParam("role", v)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="ADMIN">admin</SelectItem>
                <SelectItem value="MANAGER">manager</SelectItem>
                <SelectItem value="MEMBER">member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Overloaded</Label>
            <Select value={current.overloaded} onValueChange={(v) => setParam("overloaded", v)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="true">yes</SelectItem>
                <SelectItem value="false">no</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Search</Label>
            <Input
              className="rounded-2xl"
              placeholder="name contains..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setParam("q", q);
              }}
            />
            <div className="text-xs text-muted-foreground">Press Enter to apply.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
