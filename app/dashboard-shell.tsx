"use client";

import type React from "react";
import {
  Building2,
  Home,
  TrendingUp,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  type DashboardApp,
  type OwnRentInputs,
  useDashboardStore,
} from "./dashboard-store";
import { CompoundGrowthCalculator } from "./compound-growth-calculator";
import { OwnVsRentCalculator } from "./own-vs-rent-calculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const apps: Array<{
  id: DashboardApp;
  label: string;
  icon: LucideIcon;
}> = [
  {
    id: "own-rent",
    label: "House Returns",
    icon: Home,
  },
  {
    id: "compound-growth",
    label: "Compound Growth",
    icon: TrendingUp,
  },
];

type DashboardShellProps = {
  initialOwnRentInputs: OwnRentInputs;
};

export function DashboardShell({ initialOwnRentInputs }: DashboardShellProps) {
  const activeApp = useDashboardStore((state) => state.activeApp);
  const setActiveApp = useDashboardStore((state) => state.setActiveApp);
  const selectedApp = apps.some((app) => app.id === activeApp)
    ? activeApp
    : "own-rent";
  const clearCache = () => {
    window.localStorage.clear();
    useDashboardStore.setState({
      activeApp: "own-rent",
      ownRent: initialOwnRentInputs,
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border bg-card px-4 py-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-sm">Financials</p>
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                Planning dashboard
              </h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                Client-side cached calculators for personal finance decisions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="w-fit">
              Saved on this device
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCache}
              className="gap-2"
            >
              <Trash2 className="size-4" aria-hidden={true} />
              Clear cache
            </Button>
          </div>
        </header>

        <Tabs
          value={selectedApp}
          onValueChange={(value) => setActiveApp(value as DashboardApp)}
          className="gap-4"
        >
          <TabsList
            variant="line"
            className="flex h-auto w-full justify-start overflow-x-auto border-b p-0"
          >
            {apps.map((app) => {
              const Icon = app.icon;

              return (
                <TabsTrigger
                  key={app.id}
                  value={app.id}
                  className="h-12 min-w-fit flex-none gap-2 px-3 text-sm sm:px-4"
                >
                  <Icon className="size-4" aria-hidden={true} />
                  {app.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="own-rent" className="mt-0">
            <OwnVsRentCalculator initialInputs={initialOwnRentInputs} />
          </TabsContent>

          <TabsContent value="compound-growth" className="mt-0">
            <CompoundGrowthCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
