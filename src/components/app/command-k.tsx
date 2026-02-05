"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchEntities } from "@/app/(app)/actions/search";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";

export function CommandK() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchEntities>>>(
    { people: [], projects: [], tasks: [] },
  );

  const hint = useMemo(() => (typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchEntities(q);
        setResults(r);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2 rounded-2xl">
          <Search className="h-4 w-4" />
          Search
          <span className="ml-2 rounded-lg border bg-background/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {hint}+K
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Command</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4">
          <Command className="rounded-2xl border">
            <CommandInput
              placeholder="Search people, projects, tasks..."
              value={q}
              onValueChange={setQ}
            />
            <CommandList>
              <CommandEmpty>{pending ? "Searching..." : "No results."}</CommandEmpty>

              <CommandGroup heading="Navigate">
                <CommandItem onSelect={() => go("/dashboard")}>Dashboard</CommandItem>
                <CommandItem onSelect={() => go("/people")}>People</CommandItem>
                <CommandItem onSelect={() => go("/projects")}>Projects</CommandItem>
                <CommandItem onSelect={() => go("/tasks")}>Tasks</CommandItem>
                <CommandItem onSelect={() => go("/reports/weekly")}>Weekly report</CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="People">
                {results.people.map((p) => (
                  <CommandItem key={p.id} onSelect={() => go(`/people/${p.id}`)}>
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="Projects">
                {results.projects.map((p) => (
                  <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)}>
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="Tasks">
                {results.tasks.map((t) => (
                  <CommandItem key={t.id} onSelect={() => go(`/projects/${t.projectId}`)}>
                    {t.title}
                  </CommandItem>
                ))}
              </CommandGroup>

              <div className="px-4 py-3 text-xs text-muted-foreground">
                Tip: type 2+ chars. Tasks open their project page for now.
              </div>
            </CommandList>
          </Command>
          <div className="mt-3 text-xs text-muted-foreground">
            You can also press <span className="font-mono">{hint}+K</span> anywhere.
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Quick links: <Link href="/people" className="underline">People</Link> •{" "}
            <Link href="/projects" className="underline">Projects</Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
