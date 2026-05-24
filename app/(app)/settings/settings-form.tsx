"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Database, Loader2, Mail, Pencil, XCircle } from "lucide-react";

import { invitePartner, saveUserConfig, type UserConfig } from "@/app/user-config-actions";
import { checkDbConnection } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Props = {
  config: UserConfig;
};

export function SettingsForm({ config }: Props) {
  const router = useRouter();

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(config.name);
  const [partnerName, setPartnerName] = useState(config.partnerName);
  const [savingProfile, setSavingProfile] = useState(false);

  // DB connection check
  type DbStatus = { ok: true; latencyMs: number } | { ok: false; error: string } | null;
  const [dbStatus, setDbStatus] = useState<DbStatus>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  async function handleCheckDb() {
    setCheckingDb(true);
    setDbStatus(null);
    const result = await checkDbConnection();
    setDbStatus(result);
    setCheckingDb(false);
  }

  // Partner invite
  const [partnerEmail, setPartnerEmail] = useState(config.partnerEmail ?? "");
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    await saveUserConfig({
      ...config,
      name: name.trim(),
      partnerName: partnerName.trim(),
    });
    setSavingProfile(false);
    setEditingProfile(false);
    router.refresh();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await invitePartner(partnerEmail.trim());
      setInviteSent(true);
      router.refresh();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invitation."
      );
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* ── Profile ── */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
          <CardTitle className="text-base font-semibold">Profile</CardTitle>
          {!editingProfile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setEditingProfile(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-5 pb-6">
          {editingProfile ? (
            <form onSubmit={handleSaveProfile} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="h-12"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partnerName" className="text-xs text-muted-foreground">
                  Partner&apos;s name
                </Label>
                <Input
                  id="partnerName"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="h-12"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 flex-1"
                  disabled={!name.trim() || savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => {
                    setName(config.name);
                    setPartnerName(config.partnerName);
                    setEditingProfile(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Your name</dt>
                <dd className="font-medium">{config.name}</dd>
              </div>
              {config.partnerName && (
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">Partner&apos;s name</dt>
                  <dd className="font-medium">{config.partnerName}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* ── Partner access ── */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base font-semibold">Partner access</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invite your partner so they can log in and view the same household finances.
            They will receive an email with a link to create their account.
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="px-5 pb-6 pt-5">
          {inviteSent ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
              <CheckCircle2 className="size-5 shrink-0 text-green-600" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Invitation sent to <span className="font-medium">{partnerEmail}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="partnerEmail" className="text-xs text-muted-foreground">
                  Partner&apos;s email
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="partnerEmail"
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="e.g. sarah@example.com"
                    required
                    className="h-12 flex-1"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 gap-2 whitespace-nowrap"
                    disabled={!partnerEmail.trim() || inviting}
                  >
                    <Mail className="size-4" />
                    {inviting ? "Sending..." : "Send invite"}
                  </Button>
                </div>
                {config.partnerEmail && !inviteSent && (
                  <p className="text-xs text-muted-foreground">
                    Previously invited: {config.partnerEmail}
                  </p>
                )}
              </div>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
      {/* ── System ── */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base font-semibold">System</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-6 grid gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              <span className="text-sm">Database connection</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleCheckDb}
              disabled={checkingDb}
            >
              {checkingDb ? (
                <><Loader2 className="size-3.5 animate-spin mr-1.5" />Checking…</>
              ) : (
                "Check"
              )}
            </Button>
          </div>
          {dbStatus !== null && (
            dbStatus.ok ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
                <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                <p className="text-xs text-green-700 dark:text-green-400">
                  Connected <span className="tabular-nums ml-1 opacity-70">{dbStatus.latencyMs}ms</span>
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <XCircle className="size-4 shrink-0 text-destructive mt-0.5" />
                <p className="text-xs text-destructive break-all">{dbStatus.error}</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
