"use client";

import { useState, useTransition } from "react";
import { updateProject } from "@/app/(app)/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export function ProjectSettingsSheet({
  project,
  owners,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    targetDate: string | null;
  };
  owners: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [ownerId, setOwnerId] = useState(project.ownerId);
  const [targetDate, setTargetDate] = useState(project.targetDate ?? "");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="rounded-2xl">
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Project settings</SheetTitle>
          <SheetDescription>Edit name, owner, and target date.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea className="rounded-2xl" value={description} onChange={(e) => setDescription(e.target.value)} disabled={pending} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Target date</Label>
              <Input className="rounded-2xl" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} disabled={pending} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" className="rounded-2xl" onClick={() => setOpen(false)} disabled={pending}>
              Close
            </Button>
            <Button
              className="rounded-2xl"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await updateProject({
                      id: project.id,
                      name,
                      description,
                      ownerId,
                      targetDate,
                    });
                    toast.success("Project updated");
                    setOpen(false);
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
