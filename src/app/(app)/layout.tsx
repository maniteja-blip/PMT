import type { Metadata } from "next";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PMT",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireSession();
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-4 lg:px-6">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <div className="grain surface rounded-3xl border bg-card/75 p-5 shadow-sm backdrop-blur">
            <Topbar />
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
