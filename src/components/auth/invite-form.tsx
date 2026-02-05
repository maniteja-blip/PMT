"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/app/(auth)/invite/[token]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, { error: "" });

  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="rounded-2xl" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required className="rounded-2xl" />
        <div className="text-xs text-muted-foreground">Minimum 6 characters.</div>
      </div>
      {state.error ? <div className="text-sm text-destructive">{state.error}</div> : null}
      <Button className="rounded-2xl" disabled={pending}>
        {pending ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
