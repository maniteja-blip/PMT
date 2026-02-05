"use client";

import { useState, useTransition } from "react";
import { createTeam, renameTeam } from "@/app/(app)/actions/admin";
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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export function TeamDialog({
  trigger,
  initial,
}: {
  trigger: React.ReactNode;
  initial?: { id: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");

  function syncFromInitial() {
    setName(initial?.name ?? "");
  }

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
          <DialogTitle>{editing ? "Rename team" : "New team"}</DialogTitle>
          <DialogDescription>Teams power filters and capacity rollups.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} />
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
                      await renameTeam({ id: initial!.id, name });
                      toast.success("Team updated");
                    } else {
                      await createTeam({ name });
                      toast.success("Team created");
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
