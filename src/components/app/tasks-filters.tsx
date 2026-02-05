"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveTasksView } from "@/app/(app)/actions/views";
import { deleteView } from "@/app/(app)/actions/views";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TaskStatus } from "@prisma/client";

type Option = { value: string; label: string };

const statuses: Option[] = [
  { value: "", label: "All" },
  ...Object.values(TaskStatus).map((s) => ({ value: s, label: s.toLowerCase().replaceAll("_", " ") })),
];

export function TasksFilters({
  projects,
  people,
  savedViews,
}: {
  projects: { id: string; name: string }[];
  people: { id: string; name: string }[];
  savedViews: { id: string; name: string; query: unknown }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const current = useMemo(() => {
    return {
      status: sp.get("status") ?? "",
      projectId: sp.get("projectId") ?? "",
      assigneeId: sp.get("assigneeId") ?? "",
      q: sp.get("q") ?? "",
      view: sp.get("view") ?? "",
    };
  }, [sp]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value || value === "__all__" || value === "__any__") next.delete(key);
    else next.set(key, value);
    next.delete("view"); // manual changes detach from saved view
    router.push(`${pathname}?${next.toString()}`);
  }

  function applyView(viewId: string) {
    if (!viewId || viewId === "__none__") {
      router.push("/tasks");
      return;
    }
    const v = savedViews.find((x) => x.id === viewId);
    if (!v) return;
    const next = new URLSearchParams();
    next.set("view", viewId);

    const query = (v.query ?? {}) as Record<string, unknown>;
    if (typeof query.status === "string") next.set("status", query.status);
    if (typeof query.projectId === "string") next.set("projectId", query.projectId);
    if (typeof query.assigneeId === "string") next.set("assigneeId", query.assigneeId);
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
                  status: current.status || undefined,
                  projectId: current.projectId || undefined,
                  assigneeId: current.assigneeId || undefined,
                  q: current.q || undefined,
                };
                startTransition(async () => {
                  try {
                    await saveTasksView({ name, query });
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
                    router.push("/tasks");
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              Delete view
            </Button>
            <Button
              variant="ghost"
              className="rounded-2xl"
              onClick={() => router.push("/tasks")}
            >
              Clear
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={current.status} onValueChange={(v) => setParam("status", v)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {statuses
                  .filter((s) => s.value)
                  .map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Project</Label>
            <Select value={current.projectId} onValueChange={(v) => setParam("projectId", v)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Assignee</Label>
            <Select value={current.assigneeId} onValueChange={(v) => setParam("assigneeId", v)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Anyone</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Search</Label>
            <Input
              className="rounded-2xl"
              placeholder="title contains..."
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
