"use client";

import { useState, useTransition } from "react";
import { createMilestone, updateMilestone } from "@/app/(app)/actions/milestones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MilestoneStatus } from "@prisma/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

const statusItems: { value: MilestoneStatus; label: string }[] = [
  { value: MilestoneStatus.PLANNED, label: "Planned" },
  { value: MilestoneStatus.IN_PROGRESS, label: "In progress" },
  { value: MilestoneStatus.DONE, label: "Done" },
];

export function MilestoneDialog({
  projectId,
  trigger,
  initial,
}: {
  projectId: string;
  trigger: React.ReactNode;
  initial?: {
    id: string;
    name: string;
    dueDate: string | null;
    status: MilestoneStatus;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [status, setStatus] = useState<MilestoneStatus>(initial?.status ?? MilestoneStatus.PLANNED);

  function syncFromInitial() {
    setName(initial?.name ?? "");
    setDueDate(initial?.dueDate ?? "");
    setStatus(initial?.status ?? MilestoneStatus.PLANNED);
  }

  const editing = Boolean(initial?.id);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) syncFromInitial();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit milestone" : "New milestone"}</DialogTitle>
          <DialogDescription>Milestones are the executive truth.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input className="rounded-2xl" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" className="rounded-2xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-2xl"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    if (editing) {
                      await updateMilestone({
                        id: initial!.id,
                        projectId,
                        name,
                        dueDate,
                        status,
                      });
                      toast.success("Milestone updated");
                    } else {
                      await createMilestone({ projectId, name, dueDate, status });
                      toast.success("Milestone created");
                    }
                    setOpen(false);
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
