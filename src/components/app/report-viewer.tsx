"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportViewer({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-2xl">{title}</div>
        <Button
          className="rounded-2xl"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 900);
          }}
        >
          {copied ? "Copied" : "Copy markdown"}
        </Button>
      </div>

      <pre className="grain surface overflow-auto rounded-3xl border bg-card/80 p-5 text-sm leading-6">
{content}
      </pre>
    </div>
  );
}
