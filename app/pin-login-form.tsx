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
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm rounded-2xl shadow-md">
        <CardHeader className="pb-4 pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <LockKeyhole className="size-7" aria-hidden={true} />
            </div>
            <CardTitle className="text-xl">Enter PIN</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form action={loginWithPin} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="pin" className="text-sm font-medium">
                PIN
              </Label>
              <Input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                required
                className="h-12 text-center text-lg tracking-widest"
              />
            </div>
            {error ? (
              <p className="text-center text-sm text-destructive">
                {error === "missing"
                  ? "Set AUTH_PIN in the environment before signing in."
                  : "Incorrect PIN. Please try again."}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="h-12 w-full text-base">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
