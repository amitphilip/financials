"use client";

import { Eye, EyeOff } from "lucide-react";

import { useNumbers } from "./numbers-context";
import { Button } from "@/components/ui/button";

export function HideNumbersToggle() {
  const { hidden, toggle } = useNumbers();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="size-10 rounded-full"
      aria-label={hidden ? "Show numbers" : "Hide numbers"}
    >
      {hidden ? (
        <EyeOff className="size-5 text-muted-foreground" />
      ) : (
        <Eye className="size-5 text-muted-foreground" />
      )}
    </Button>
  );
}
