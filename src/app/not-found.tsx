import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] items-center px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <Card className="grain surface rounded-3xl border bg-card/80 p-6">
          <div className="font-display text-3xl leading-none">Not found</div>
          <div className="mt-2 text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </div>
          <div className="mt-6 flex items-center gap-2">
            <Button asChild className="rounded-2xl">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-2xl">
              <Link href="/tasks">Open tasks</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
