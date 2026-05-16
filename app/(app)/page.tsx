import { BrainCircuit, Building2, ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";

import { loadUserConfig } from "../user-config-actions";
import { HomeGreeting } from "./home-greeting";

export default async function HomePage() {
  const config = await loadUserConfig();
  const greeting = config?.partnerName
    ? `${config.name} & ${config.partnerName}`
    : (config?.name ?? "there");

  return (
    <main className="px-4 pb-12 pt-8">
      <div className="mx-auto w-full max-w-sm">
        <HomeGreeting greeting={greeting} />

        <div className="mt-10 grid gap-6">

          {/* ── Calculators ── */}
          <section className="grid gap-3">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Calculators
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/home-equity" className="group">
                <div className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 shadow-md transition-colors group-hover:bg-muted/40">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Home Equity</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Track your property growth and equity
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/sp500" className="group">
                <div className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 shadow-md transition-colors group-hover:bg-muted/40">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">S&P 500</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Project your investment portfolio
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* ── Financial Advisor ── */}
          <section className="grid gap-3">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Financial Advisor
            </p>
            <Link href="/advisor" className="group">
              <div className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-4 shadow-md transition-colors group-hover:bg-muted/40">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Get advice</p>
                  <p className="text-xs text-muted-foreground">
                    AI analysis across your financial data
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          </section>

        </div>
      </div>
    </main>
  );
}
