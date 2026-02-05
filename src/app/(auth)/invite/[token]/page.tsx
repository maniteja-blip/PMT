import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { InviteForm } from "@/components/auth/invite-form";

export default async function InvitePage({
  params,
}: {
  params: { token: string } | Promise<{ token: string }>;
}) {
  const { token } = await Promise.resolve(params);
  const invite = await db.invite.findUnique({
    where: { token },
    select: { email: true, expiresAt: true, acceptedAt: true },
  });
  if (!invite) notFound();

  const expired = invite.expiresAt < new Date();
  const used = Boolean(invite.acceptedAt);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] items-center px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Card className="grain surface rounded-3xl border bg-card/80 p-6">
          <div className="font-display text-3xl leading-none">Join PMT</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Create your account for <span className="font-mono">{invite.email}</span>
          </div>

          {expired ? (
            <div className="mt-6 rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
              This invite has expired.
            </div>
          ) : used ? (
            <div className="mt-6 rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
              This invite was already used.
            </div>
          ) : (
            <InviteForm token={token} />
          )}
        </Card>
      </div>
    </div>
  );
}
