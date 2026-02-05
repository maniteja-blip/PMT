"use client";

import { useTransition } from "react";
import { deleteProject } from "@/app/(app)/actions/projects";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export function ProjectActions({
  projectId,
  canDelete,
}: {
  projectId: string;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" disabled={pending} data-testid="project-actions-trigger">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Project</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canDelete ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              if (!window.confirm("Delete this project? This will delete its tasks.")) return;
              startTransition(async () => {
                try {
                  await deleteProject(projectId);
                  toast.success("Project deleted");
                } catch (e) {
                  toast.error(getErrorMessage(e));
                }
              });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        ) : (
          <div className="px-2 py-2 text-xs text-muted-foreground">No permission.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
