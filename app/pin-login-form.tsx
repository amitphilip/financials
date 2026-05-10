import { LockKeyhole } from "lucide-react";

import { loginWithPin } from "./auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PinLoginFormProps = {
  error?: "invalid" | "missing";
};

export function PinLoginForm({ error }: PinLoginFormProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LockKeyhole className="size-5" aria-hidden={true} />
            </div>
            <CardTitle>Enter PIN</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form action={loginWithPin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                required
                className="h-10"
              />
            </div>
            {error ? (
              <p className="text-xs text-destructive">
                {error === "missing"
                  ? "Set AUTH_PIN in the environment before signing in."
                  : "That PIN did not match."}
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
