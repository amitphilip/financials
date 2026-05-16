"use client";

import {
  Atom,
  Baby,
  BarChart3,
  Building2,
  Car,
  Coins,
  DollarSign,
  Home,
  Landmark,
  Leaf,
  Rocket,
  Sailboat,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { OrbitingCircles } from "./orbiting-circles";

const inner = [
  { Icon: Home,       label: "Home" },
  { Icon: Car,        label: "Car" },
  { Icon: Sailboat,   label: "Boat" },
  { Icon: Users,      label: "Family" },
  { Icon: Baby,       label: "Baby" },
  { Icon: Rocket,     label: "Space" },
  { Icon: Leaf,       label: "Green energy" },
];

const outer = [
  { Icon: DollarSign,   label: "Dollar" },
  { Icon: Landmark,     label: "Bank" },
  { Icon: Building2,    label: "Corporate" },
  { Icon: Coins,        label: "Gold" },
  { Icon: TrendingUp,   label: "Bull" },
  { Icon: TrendingDown, label: "Bear" },
  { Icon: BarChart3,    label: "Graph" },
  { Icon: Atom,         label: "Nuclear" },
];

function IconChip({ Icon, label }: { Icon: React.ElementType; label: string }) {
  return (
    <div
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border bg-background shadow-sm"
    >
      <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
    </div>
  );
}

export function OrbitingAssets() {
  return (
    <div className="relative flex size-[260px] items-center justify-center">
      {/* inner ring — forward, 7 icons */}
      <OrbitingCircles radius={68} duration={32} iconSize={36} path>
        {inner.map(({ Icon, label }) => (
          <IconChip key={label} Icon={Icon} label={label} />
        ))}
      </OrbitingCircles>

      {/* outer ring — reverse, 8 icons */}
      <OrbitingCircles radius={118} duration={48} iconSize={36} reverse path>
        {outer.map(({ Icon, label }) => (
          <IconChip key={label} Icon={Icon} label={label} />
        ))}
      </OrbitingCircles>
    </div>
  );
}
