"use client";

import { useState, useTransition } from "react";
import { deleteTask, renameTask, updateTaskStatus } from "@/app/(app)/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskStatus } from "@prisma/client";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

const statusItems: { value: TaskStatus; label: string }[] = [
  { value: TaskStatus.BACKLOG, label: "Backlog" },
  { value: TaskStatus.TODO, label: "Todo" },
  { value: TaskStatus.IN_PROGRESS, label: "In progress" },
  { value: TaskStatus.BLOCKED, label: "Blocked" },
  { value: TaskStatus.DONE, label: "Done" },
];

export function TaskActions({
  taskId,
  canEdit,
  canDelete,
}: {
  taskId: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" disabled={pending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Task</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canEdit ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                const next = window.prompt("Rename task:");
                if (!next) return;
                startTransition(async () => {
                  try {
                    await renameTask({ id: taskId, title: next });
                    toast.success("Task renamed");
                    setOpen(false);
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {statusItems.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await updateTaskStatus({ id: taskId, status: s.value });
                      toast.success(`Moved to ${s.label}`);
                      setOpen(false);
                    } catch (e) {
                      toast.error(getErrorMessage(e));
                    }
                  });
                }}
              >
                Move to {s.label}
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <div className="px-2 py-2 text-xs text-muted-foreground">No permission to edit.</div>
        )}

        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (!window.confirm("Delete this task?")) return;
                startTransition(async () => {
                  try {
                    await deleteTask(taskId);
                    toast.success("Task deleted");
                    setOpen(false);
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
