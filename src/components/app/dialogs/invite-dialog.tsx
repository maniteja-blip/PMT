"use client";

import { useState, useTransition } from "react";
import { createInvite, revokeInvite } from "@/app/(app)/actions/admin";
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

export function InviteDialog({
  trigger,
  teams,
  invites,
}: {
  trigger: React.ReactNode;
  teams: { id: string; name: string }[];
  invites: {
    id: string;
    token: string;
    email: string;
    role: Role;
    expiresAt: string;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.MEMBER);
  const [teamId, setTeamId] = useState("__none__");
  const [expiresInDays, setExpiresInDays] = useState("7");
  // window.location.origin used only when clicking copy/create.

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            Generates an invite link. Share it privately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input className="rounded-2xl" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Expires (days)</Label>
              <Input className="rounded-2xl" inputMode="numeric" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" className="rounded-2xl" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              className="rounded-2xl"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const res = await createInvite({
                      email,
                      role,
                      teamId: teamId === "__none__" ? "" : teamId,
                      expiresInDays: Number(expiresInDays || 7),
                      weeklyCapacityHours: 35,
                      timezone: "America/New_York",
                    });
                    const link = `${window.location.origin}/invite/${res.token}`;
                    await navigator.clipboard.writeText(link);
                    toast.success("Invite link copied");
                    setEmail("");
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              Create invite
            </Button>
          </div>

          <div className="rounded-2xl border bg-background/60 p-4">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground">Pending invites</div>
            <div className="mt-3 grid gap-2">
              {invites.length === 0 ? (
                <div className="text-sm text-muted-foreground">No pending invites.</div>
              ) : (
                invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/40 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{i.email}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {i.role.toLowerCase()} • expires {new Date(i.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="h-8 rounded-xl"
                        onClick={async () => {
                          const link = `${window.location.origin}/invite/${i.token}`;
                          await navigator.clipboard.writeText(link);
                          toast.success("Invite link copied");
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-8 rounded-xl"
                        onClick={() => {
                          if (!window.confirm("Revoke invite?") ) return;
                          startTransition(async () => {
                            try {
                              await revokeInvite(i.id);
                              toast.success("Invite revoked");
                            } catch (e) {
                              toast.error(getErrorMessage(e));
                            }
                          });
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Invites are sensitive; share links privately.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
