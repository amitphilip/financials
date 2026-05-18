"use client";

import Link from "next/link";
import { Building2, ChevronRight, Clock, Layers, PiggyBank, TrendingUp } from "lucide-react";

import { AnimatedList } from "@/components/ui/animated-list";
import { TextAnimate } from "@/components/ui/text-animate";
import { cn } from "@/lib/utils";

type Advisor = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
};

// AnimatedList stacks newest-first (last child → top).
// Pass coming-soon items first so available advisors land at top.
const ADVISORS: Advisor[] = [
  {
    id: "retirement",
    title: "Retirement Planning",
    description: "Project your super and investment portfolio across different contribution scenarios.",
    icon: <Clock className="h-5 w-5" />,
    href: "#",
    available: false,
  },
  {
    id: "portfolio",
    title: "Investment Allocation",
    description: "Compare risk-adjusted returns across property, equities, and cash.",
    icon: <TrendingUp className="h-5 w-5" />,
    href: "#",
    available: false,
  },
  {
    id: "three-buckets",
    title: "Three-Bucket Budgeting",
    description:
      "Split income on payday into tax, wealth, and living expenses buckets. Enter your income and set allocation percentages to see your per-period and annual breakdown.",
    icon: <Layers className="h-5 w-5" />,
    href: "/advisor/three-buckets",
    available: true,
  },
  {
    id: "buy-vs-rent",
    title: "House Ownership vs Rent",
    description:
      "Compare the long-term wealth outcome of buying a home versus renting and investing the difference in the S&P 500.",
    icon: <Building2 className="h-5 w-5" />,
    href: "/advisor/buy-vs-rent",
    available: true,
  },
  {
    id: "kiwisaver",
    title: "KiwiSaver Projection",
    description:
      "Enter your current balance, fetch the AI-sourced high growth fund average return, and project your KiwiSaver forward.",
    icon: <PiggyBank className="h-5 w-5" />,
    href: "/advisor/kiwisaver",
    available: true,
  },
];

function AdvisorCard({ advisor }: { advisor: Advisor }) {
  const inner = (
    <div
      className={cn(
        "flex items-start gap-4 rounded-2xl border bg-card px-4 py-4 shadow-md transition-colors",
        advisor.available
          ? "cursor-pointer hover:bg-muted/40"
          : "cursor-default opacity-60"
      )}
    >
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        {advisor.icon}
      </div>
      <div className="min-w-0 flex-1 grid gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold leading-snug">{advisor.title}</span>
          {advisor.available ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Available
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {advisor.description}
        </p>
      </div>
      {advisor.available && (
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );

  if (advisor.available) {
    return <Link href={advisor.href}>{inner}</Link>;
  }
  return inner;
}

export function AdvisorLanding() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-8">
      <div className="mb-8 text-center">
        <TextAnimate
          animation="blurIn"
          by="word"
          once
          className="text-2xl font-semibold tracking-tight"
        >
          Financial Advisor
        </TextAnimate>
        <TextAnimate
          animation="blurIn"
          by="word"
          once
          delay={0.15}
          className="mt-1 text-sm text-muted-foreground"
        >
          Choose an analysis to run
        </TextAnimate>
      </div>
      <AnimatedList delay={180} className="w-full gap-3">
        {ADVISORS.map((advisor) => (
          <AdvisorCard key={advisor.id} advisor={advisor} />
        ))}
      </AnimatedList>
    </div>
  );
}
