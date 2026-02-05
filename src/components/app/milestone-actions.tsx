"use client";

import { useTransition } from "react";
import { deleteMilestone } from "@/app/(app)/actions/milestones";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export function MilestoneDeleteButton({
  id,
  projectId,
}: {
  id: string;
  projectId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      className="h-8 rounded-xl"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete milestone?")) return;
        startTransition(async () => {
          try {
            await deleteMilestone({ id, projectId });
            toast.success("Milestone deleted");
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
