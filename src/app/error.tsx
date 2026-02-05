"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] items-center px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Card className="grain surface rounded-3xl border bg-card/80 p-6">
          <div className="font-display text-3xl leading-none">Something broke</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Try again. If it keeps happening, check server logs.
          </div>
          <pre className="mt-4 overflow-auto rounded-2xl border bg-background/60 p-4 text-xs">
{error.message}
          </pre>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button className="rounded-2xl" onClick={() => reset()}>
              Retry
            </Button>
            <Button variant="secondary" className="rounded-2xl" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" className="rounded-2xl" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
