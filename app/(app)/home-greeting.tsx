"use client";

import { OrbitingAssets } from "@/components/ui/orbiting-assets";
import { TextAnimate } from "@/components/ui/text-animate";

export function HomeGreeting({ greeting }: { greeting: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <OrbitingAssets />
      <div className="flex flex-col items-center gap-1">
        <TextAnimate
          as="p"
          animation="blurIn"
          by="word"
          once
          className="text-sm text-muted-foreground"
        >
          Welcome back,
        </TextAnimate>
        <TextAnimate
          as="h1"
          animation="blurIn"
          by="word"
          delay={0.15}
          once
          className="text-3xl font-semibold tracking-tight"
        >
          {greeting}
        </TextAnimate>
      </div>
    </div>
  );
}
