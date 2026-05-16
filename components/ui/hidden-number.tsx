"use client";

import { type ComponentPropsWithoutRef } from "react";

import { useNumbers } from "@/app/numbers-context";
import { NumberTicker } from "./number-ticker";

type HiddenNumberProps = ComponentPropsWithoutRef<typeof NumberTicker>;

export function HiddenNumber(props: HiddenNumberProps) {
  const { hidden } = useNumbers();

  if (hidden) {
    return (
      <span className={props.className} aria-hidden>
        ••••
      </span>
    );
  }

  return <NumberTicker {...props} />;
}
