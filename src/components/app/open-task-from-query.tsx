"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function OpenTaskFromQuery() {
  const router = useRouter();
  const sp = useSearchParams();
  const open = sp.get("open");

  useEffect(() => {
    if (!open) return;
    router.replace("/tasks");
    router.push(`/tasks/${open}`, { scroll: false });
  }, [open, router]);

  return null;
}
