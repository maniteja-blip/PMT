"use client";

import { useTransition } from "react";
import { deleteTeam } from "@/app/(app)/actions/admin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export function TeamDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      className="rounded-2xl"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete team? Users will be detached.")) return;
        startTransition(async () => {
          try {
            await deleteTeam(id);
            toast.success("Team deleted");
          } catch (e) {
            toast.error(getErrorMessage(e));
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
