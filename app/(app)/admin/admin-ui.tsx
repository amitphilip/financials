"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  adminInviteUser,
  adminRevokeInvitation,
  type InvitationRow,
  type UserRow,
} from "./admin-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// ── Invite form ───────────────────────────────────────────────────────────────

export function AdminInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await adminInviteUser(email.trim());
        setSent(true);
        setEmail("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send invite.");
      }
    });
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold">Invite new user</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sends a Clerk magic-link invitation. The recipient creates their own account.
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="px-5 pb-6 pt-5">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
            placeholder="user@example.com"
            required
            className="h-12 flex-1"
          />
          <Button type="submit" size="lg" className="h-12" disabled={pending}>
            {pending ? "Sending..." : "Send invite"}
          </Button>
        </form>
        {sent && (
          <p className="mt-3 text-sm text-green-600">Invitation sent.</p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

// ── Pending invitations ───────────────────────────────────────────────────────

export function PendingInvitations({
  invitations,
}: {
  invitations: InvitationRow[];
}) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      await adminRevokeInvitation(id);
      router.refresh();
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold">
          Pending invitations
          {invitations.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {invitations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="px-5 pb-6 pt-4">
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <ul className="grid gap-3">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
              >
                <div className="grid gap-0.5 min-w-0">
                  <span className="truncate text-sm font-medium">
                    {inv.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Invited {new Date(inv.createdAt).toLocaleDateString("en-AU")}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={revoking === inv.id}
                  onClick={() => handleRevoke(inv.id)}
                  aria-label="Revoke invitation"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Users list ────────────────────────────────────────────────────────────────

const roleLabel: Record<UserRow["role"], string> = {
  admin: "Admin",
  partner: "Partner",
  primary: "Primary",
};

const roleVariant: Record<
  UserRow["role"],
  "default" | "secondary" | "outline"
> = {
  admin: "default",
  partner: "secondary",
  primary: "outline",
};

export function UsersList({ users }: { users: UserRow[] }) {
  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold">
          Users
          <Badge variant="secondary" className="ml-2">
            {users.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="px-5 pb-6 pt-4">
        <ul className="grid gap-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <div className="grid gap-0.5 min-w-0">
                <span className="truncate text-sm font-medium">{u.email}</span>
                <div className="flex items-center gap-2">
                  {(u.firstName || u.lastName) && (
                    <span className="text-xs text-muted-foreground">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(u.createdAt).toLocaleDateString("en-AU")}
                  </span>
                </div>
                {!u.hasConfig && u.role !== "partner" && (
                  <span className="text-xs text-amber-600">No config set up</span>
                )}
              </div>
              <Badge variant={roleVariant[u.role]}>{roleLabel[u.role]}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
