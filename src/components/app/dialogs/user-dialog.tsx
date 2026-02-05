"use client";

import { useState, useTransition } from "react";
import { createUser, resetUserPassword, updateUser } from "@/app/(app)/actions/admin";
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
import { Role } from "@prisma/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export function UserDialog({
  trigger,
  teams,
  initial,
}: {
  trigger: React.ReactNode;
  teams: { id: string; name: string }[];
  initial?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    teamId: string | null;
    weeklyCapacityHours: number;
    timezone: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const editing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? Role.MEMBER);
  const [teamId, setTeamId] = useState(initial?.teamId ?? "__none__");
  const [weeklyCapacityHours, setWeeklyCapacityHours] = useState(
    String(initial?.weeklyCapacityHours ?? 35),
  );
  const [timezone, setTimezone] = useState(initial?.timezone ?? "America/New_York");
  const [password, setPassword] = useState("");

  function syncFromInitial() {
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setRole(initial?.role ?? Role.MEMBER);
    setTeamId(initial?.teamId ?? "__none__");
    setWeeklyCapacityHours(String(initial?.weeklyCapacityHours ?? 35));
    setTimezone(initial?.timezone ?? "America/New_York");
    setPassword("");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>Single org. Keep roles intentional.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input className="rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input className="rounded-2xl" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.ADMIN}>admin</SelectItem>
                  <SelectItem value={Role.MANAGER}>manager</SelectItem>
                  <SelectItem value={Role.MEMBER}>member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Capacity (hours)</Label>
              <Input
                className="rounded-2xl"
                inputMode="decimal"
                value={weeklyCapacityHours}
                onChange={(e) => setWeeklyCapacityHours(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Timezone</Label>
            <Input className="rounded-2xl" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>

          {!editing ? (
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input className="rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="text-xs text-muted-foreground">Set an initial password.</div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Reset password</Label>
              <div className="flex gap-2">
                <Input className="rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  disabled={pending || password.trim().length < 4}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await resetUserPassword({ id: initial!.id, password });
                        toast.success("Password reset");
                        setPassword("");
                      } catch (e) {
                        toast.error(getErrorMessage(e));
                      }
                    });
                  }}
                >
                  Reset
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Reset does not log them out.</div>
            </div>
          )}

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
                    const payload = {
                      name,
                      email,
                      role,
                      teamId: teamId === "__none__" ? "" : teamId,
                      weeklyCapacityHours: Number(weeklyCapacityHours || 0),
                      timezone,
                    };
                    if (editing) {
                      await updateUser({ id: initial!.id, ...payload });
                      toast.success("User updated");
                    } else {
                      await createUser({ ...payload, password });
                      toast.success("User created");
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
