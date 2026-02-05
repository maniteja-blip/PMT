"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, FileText, LayoutDashboard, ListTodo, Shield, Users } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/people", label: "People", icon: Users },
  { href: "/projects", label: "Projects", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/reports/weekly", label: "Reports", icon: FileText },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[280px] shrink-0 lg:block">
      <div className="sticky top-0 h-dvh p-4">
        <div className="grain surface h-full rounded-3xl border bg-card/80 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex flex-col">
              <div className="font-display text-lg leading-none">PMT</div>
              <div className="text-xs text-muted-foreground">single org control room</div>
            </div>
          </div>

          <div className="px-3 pt-4">
            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors " +
                      (active
                        ? "bg-accent text-foreground"
                        : "text-foreground/80 hover:bg-accent hover:text-foreground")
                    }
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground/5 text-foreground/70 group-hover:bg-foreground/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="px-5 pt-6">
            <div className="rounded-2xl border bg-background/60 p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                Today
              </div>
              <div className="mt-2 text-sm text-foreground/80">
                Seeded demo data; wire auth next.
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
