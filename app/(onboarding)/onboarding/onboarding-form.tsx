"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { saveUserConfig } from "@/app/user-config-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrbitingAssets } from "@/components/ui/orbiting-assets";
import { TextAnimate } from "@/components/ui/text-animate";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await saveUserConfig({
      name: name.trim(),
      partnerName: partnerName.trim(),
      partnerEmail: partnerEmail.trim() || undefined,
    });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-8">
      <OrbitingAssets />
      <Card className="w-full max-w-sm rounded-2xl shadow-md">
        <CardHeader className="pb-4 pt-8 text-center">
          <TextAnimate
            as="h1"
            animation="blurIn"
            by="word"
            once
            className="text-2xl font-semibold tracking-tight"
          >
            Welcome to Financials
          </TextAnimate>
          <TextAnimate
            as="p"
            animation="blurIn"
            by="word"
            delay={0.2}
            once
            className="mt-2 text-sm text-muted-foreground"
          >
            Let us personalise your experience before we begin.
          </TextAnimate>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amit"
                required
                autoFocus
                className="h-12"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partner">
                Partner&apos;s name{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="partner"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="e.g. Sarah"
                className="h-12"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partnerEmail">
                Partner&apos;s email{" "}
                <span className="text-xs text-muted-foreground">(optional — to invite later)</span>
              </Label>
              <Input
                id="partnerEmail"
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="e.g. sarah@example.com"
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base"
              disabled={!name.trim() || saving}
            >
              {saving ? "Saving..." : "Get started"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
