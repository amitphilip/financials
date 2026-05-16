"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  Check,
  Download,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";

import { calculateBuyVsRent, type BuyVsRentResult } from "../calculations";
import { loadAdvisor, saveAdvisor, type SavedAdvisor } from "../actions";
import { loadHomeEquity } from "../../home-equity/actions";
import type { CostsData } from "../../home-equity/calculations";
import type { AdvisorReport, AdvisorRequestBody } from "@/app/api/advisor/route";
import { HiddenNumber } from "@/components/ui/hidden-number";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

// ─── constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i).map(
  (y) => ({ value: String(y), label: String(y) })
);
const LOAN_TERM_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1).map((t) => ({
  value: String(t),
  label: `${t} year${t === 1 ? "" : "s"}`,
}));
const FREQ_OPTIONS: { value: CostsData["ratesFrequency"]; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const STEP_LABELS = ["Property", "Loan & Costs", "Rent"];

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function parse(s: string) {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function yAxisFmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
}

// ─── shared form UI ───────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        $
      </span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 pl-7"
      />
    </div>
  );
}

const SearchSelect = memo(function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Combobox
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v as string);
      }}
    >
      <ComboboxInput
        placeholder={placeholder}
        className="h-12 w-full"
        showTrigger
        showClear={false}
      />
      <ComboboxContent>
        <ComboboxEmpty>No results</ComboboxEmpty>
        <ComboboxList>
          {options.map((o) => (
            <ComboboxItem key={o.value} value={o.value}>
              {o.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
});

// ─── step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, completed }: { current: number; completed: number }) {
  return (
    <div className="flex items-center justify-center gap-0 pb-2">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = step <= completed;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "border-2 border-primary text-primary"
                      : "border-2 border-muted text-muted-foreground",
                ].join(" ")}
              >
                {done && step < current ? <Check className="size-4" /> : step}
              </div>
              <span
                className={[
                  "text-xs",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={[
                  "mb-5 h-px w-8 transition-colors",
                  step < current ? "bg-primary" : "bg-muted",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── completed step row ───────────────────────────────────────────────────────

function CompletedStep({
  label,
  summary,
  onEdit,
}: {
  label: string;
  summary: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{summary}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} className="size-9 shrink-0">
        <Pencil className="size-4" />
      </Button>
    </div>
  );
}

// ─── step 1: property ─────────────────────────────────────────────────────────

type PropertyForm = {
  name: string;
  purchaseYear: number;
  purchasePriceStr: string;
  currentYear: number;
  currentValueStr: string;
};

function StepProperty({
  data,
  onChange,
  onNext,
  hasHomeEquityData,
  onLoadFromCalculator,
}: {
  data: PropertyForm;
  onChange: (patch: Partial<PropertyForm>) => void;
  onNext: () => void;
  hasHomeEquityData: boolean;
  onLoadFromCalculator: () => void;
}) {
  const valid =
    parse(data.purchasePriceStr) > 0 &&
    parse(data.currentValueStr) > 0 &&
    data.currentYear >= data.purchaseYear;

  return (
    <div className="grid gap-4">
      {hasHomeEquityData && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit h-8 gap-1.5 text-xs"
          onClick={onLoadFromCalculator}
        >
          <Download className="h-3.5 w-3.5" />
          Load from Home Equity calculator
        </Button>
      )}

      <FieldRow label="Property nickname">
        <Input
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. The Family Home"
          className="h-12"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Purchased in">
          <SearchSelect
            value={String(data.purchaseYear)}
            onChange={(v) => onChange({ purchaseYear: Number(v) })}
            options={YEAR_OPTIONS.filter(({ value: y }) => Number(y) <= data.currentYear)}
            placeholder="Year"
          />
        </FieldRow>
        <FieldRow label="Purchase price">
          <CurrencyInput
            value={data.purchasePriceStr}
            onChange={(v) => onChange({ purchasePriceStr: v })}
            placeholder="500,000"
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Value as of">
          <SearchSelect
            value={String(data.currentYear)}
            onChange={(v) => onChange({ currentYear: Number(v) })}
            options={YEAR_OPTIONS.filter(({ value: y }) => Number(y) >= data.purchaseYear)}
            placeholder="Year"
          />
        </FieldRow>
        <FieldRow label="Current value">
          <CurrencyInput
            value={data.currentValueStr}
            onChange={(v) => onChange({ currentValueStr: v })}
            placeholder="750,000"
          />
        </FieldRow>
      </div>

      <Button onClick={onNext} disabled={!valid} size="lg" className="h-12 w-full">
        Next →
      </Button>
    </div>
  );
}

// ─── step 2: loan & costs ─────────────────────────────────────────────────────

type LoanCostsForm = {
  originalLoanStr: string;
  currentBalanceStr: string;
  interestRateStr: string;
  termYears: number;
  insuranceStr: string;
  ratesAmountStr: string;
  ratesFrequency: CostsData["ratesFrequency"];
  renovationsStr: string;
};

function StepLoanCosts({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: LoanCostsForm;
  onChange: (patch: Partial<LoanCostsForm>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const valid = parse(data.interestRateStr) >= 0 && data.termYears > 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Loan
        </p>
      </div>

      <FieldRow label="Original loan amount">
        <CurrencyInput
          value={data.originalLoanStr}
          onChange={(v) => onChange({ originalLoanStr: v })}
          placeholder="400,000"
        />
      </FieldRow>

      <FieldRow label="Current outstanding balance">
        <CurrencyInput
          value={data.currentBalanceStr}
          onChange={(v) => onChange({ currentBalanceStr: v })}
          placeholder="350,000"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Interest rate (%)">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={30}
              step={0.01}
              value={data.interestRateStr}
              onChange={(e) => onChange({ interestRateStr: e.target.value })}
              placeholder="5.5"
              className="h-12 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
        </FieldRow>
        <FieldRow label="Loan term">
          <SearchSelect
            value={String(data.termYears)}
            onChange={(v) => onChange({ termYears: Number(v) })}
            options={LOAN_TERM_OPTIONS}
            placeholder="Term"
          />
        </FieldRow>
      </div>

      <div className="h-px bg-border" />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Ongoing costs (optional)
      </p>

      <FieldRow label="Annual building insurance">
        <CurrencyInput
          value={data.insuranceStr}
          onChange={(v) => onChange({ insuranceStr: v })}
          placeholder="1,500"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Council rates">
          <CurrencyInput
            value={data.ratesAmountStr}
            onChange={(v) => onChange({ ratesAmountStr: v })}
            placeholder="400"
          />
        </FieldRow>
        <FieldRow label="Frequency">
          <SearchSelect
            value={data.ratesFrequency}
            onChange={(v) => onChange({ ratesFrequency: v as CostsData["ratesFrequency"] })}
            options={FREQ_OPTIONS}
          />
        </FieldRow>
      </div>

      <FieldRow label="Total renovations to date">
        <CurrencyInput
          value={data.renovationsStr}
          onChange={(v) => onChange({ renovationsStr: v })}
          placeholder="0"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onBack} className="h-12">
          ← Back
        </Button>
        <Button onClick={onNext} disabled={!valid} className="h-12">
          Next →
        </Button>
      </div>
    </div>
  );
}

// ─── step 3: rent scenario ────────────────────────────────────────────────────

type RentForm = {
  weeklyRentStr: string;
  rentIncreaseStr: string;
  sp500RateStr: string;
  sp500Note: string;
};

function StepRent({
  data,
  onChange,
  onNext,
  onBack,
  purchaseYear,
  currentYear,
}: {
  data: RentForm;
  onChange: (patch: Partial<RentForm>) => void;
  onNext: () => void;
  onBack: () => void;
  purchaseYear: number;
  currentYear: number;
}) {
  const [fetchingRate, setFetchingRate] = useState(false);

  const valid = parse(data.weeklyRentStr) > 0 && parse(data.sp500RateStr) > 0;

  async function handleFetchRate() {
    setFetchingRate(true);
    try {
      const res = await fetch(
        `/api/sp500-rate?startYear=${purchaseYear}&endYear=${currentYear}`
      );
      const d = await res.json();
      if (d.rate) {
        onChange({ sp500RateStr: String(d.rate), sp500Note: d.note ?? "" });
      }
    } finally {
      setFetchingRate(false);
    }
  }

  return (
    <div className="grid gap-4">
      <FieldRow label={`Weekly rent in ${purchaseYear} for an equivalent property`}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={data.weeklyRentStr}
            onChange={(e) => onChange({ weeklyRentStr: e.target.value })}
            placeholder="600"
            className="h-12 pl-7"
          />
        </div>
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Annual rent increase">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={20}
              step={0.1}
              value={data.rentIncreaseStr}
              onChange={(e) => onChange({ rentIncreaseStr: e.target.value })}
              placeholder="3"
              className="h-12 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
        </FieldRow>
        <FieldRow label="S&P 500 return">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={50}
              step={0.1}
              value={data.sp500RateStr}
              onChange={(e) => onChange({ sp500RateStr: e.target.value })}
              placeholder="10.5"
              className="h-12 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
        </FieldRow>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-fit h-8 gap-1.5 text-xs"
        onClick={handleFetchRate}
        disabled={fetchingRate}
      >
        {fetchingRate ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Fetch historical rate ({purchaseYear}–{currentYear})
      </Button>

      {data.sp500Note && (
        <p className="text-xs text-muted-foreground rounded-lg border px-3 py-2">
          {data.sp500Note}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onBack} className="h-12">
          ← Back
        </Button>
        <Button onClick={onNext} disabled={!valid} className="h-12">
          Run analysis
        </Button>
      </div>
    </div>
  );
}

// ─── chart ────────────────────────────────────────────────────────────────────

const chartConfig = {
  equity: { label: "Buying (Equity)", color: "var(--chart-1)" },
  investmentPortfolio: { label: "Renting (Portfolio)", color: "var(--chart-2)" },
} satisfies ChartConfig;

// ─── metric card ──────────────────────────────────────────────────────────────

function Metric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums font-semibold">
        <span>$</span>
        <HiddenNumber value={value} />
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── results ─────────────────────────────────────────────────────────────────

function Results({
  calcResult,
  report,
  analysisLoading,
  analysisError,
  rentIncreaseStr,
}: {
  calcResult: BuyVsRentResult;
  report: AdvisorReport | null;
  analysisLoading: boolean;
  analysisError: string | null;
  rentIncreaseStr: string;
}) {
  return (
    <div className="grid gap-4 mt-2">
      {/* Verdict banner */}
      <div
        className={[
          "rounded-2xl border px-4 py-4 shadow-sm",
          calcResult.winner === "buying"
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
            : calcResult.winner === "renting"
              ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
              : "border-border bg-muted/30",
        ].join(" ")}
      >
        {report ? (
          <div className="grid gap-1">
            <p className="text-sm font-semibold">{report.verdict}</p>
            <p className="text-xs text-muted-foreground">{report.summary}</p>
          </div>
        ) : analysisLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Generating AI analysis…</span>
          </div>
        ) : (
          <p className="text-sm font-semibold">
            {calcResult.winner === "buying"
              ? `Buying comes out ahead by $${fmt(calcResult.winnerDiff)}`
              : calcResult.winner === "renting"
                ? `Renting + investing comes out ahead by $${fmt(calcResult.winnerDiff)}`
                : "Both paths produce similar outcomes"}
          </p>
        )}
      </div>

      {/* Side-by-side metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Buying
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Metric label="Final equity" value={calcResult.buyerFinalEquity} />
            <Metric label="Interest paid" value={calcResult.buyerTotalInterestPaid} />
            <Metric label="Ongoing costs" value={calcResult.buyerTotalOngoingCosts} />
            <Metric label="Monthly all-in" value={calcResult.buyerMonthlyAllIn} sub="mortgage + costs" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Renting
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Metric label="Final portfolio" value={calcResult.renterFinalPortfolio} />
            <Metric label="Total rent paid" value={calcResult.renterTotalRentPaid} />
            <Metric label="Down payment invested" value={calcResult.downPayment} />
            <Metric
              label="Monthly rent at end"
              value={calcResult.renterMonthlyAtEnd}
              sub={`${parse(rentIncreaseStr)}% annual rises`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Equity vs Portfolio over time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <AreaChart
              data={calcResult.yearlyData}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                style={{ fontSize: 10 }}
                interval={Math.max(0, Math.floor(calcResult.yearlyData.length / 6) - 1)}
              />
              <YAxis
                tickFormatter={yAxisFmt}
                tickLine={false}
                axisLine={false}
                width={52}
                style={{ fontSize: 10 }}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => `$${fmt(v as number)}`} />}
              />
              <Area
                dataKey="equity"
                type="monotone"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#gradEq)"
                dot={false}
              />
              <Area
                dataKey="investmentPortfolio"
                type="monotone"
                stroke="var(--chart-2)"
                strokeWidth={2}
                fill="url(#gradPort)"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* AI error */}
      {analysisError && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs text-muted-foreground">{analysisError}</p>
        </div>
      )}

      {/* AI report */}
      {report && (
        <>
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Key insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {report.insights.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Buying strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {report.buyingHighlights.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Renting strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {report.rentingHighlights.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {report.recommendation}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

const EMPTY_PROPERTY: PropertyForm = {
  name: "",
  purchaseYear: 2020,
  purchasePriceStr: "",
  currentYear: CURRENT_YEAR,
  currentValueStr: "",
};

const EMPTY_LOAN_COSTS: LoanCostsForm = {
  originalLoanStr: "",
  currentBalanceStr: "",
  interestRateStr: "",
  termYears: 30,
  insuranceStr: "",
  ratesAmountStr: "",
  ratesFrequency: "quarterly",
  renovationsStr: "",
};

const EMPTY_RENT: RentForm = {
  weeklyRentStr: "",
  rentIncreaseStr: "3",
  sp500RateStr: "10.5",
  sp500Note: "",
};

export function BuyVsRentAdvisor() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [completedUpTo, setCompletedUpTo] = useState(0);
  const [hasHomeEquityData, setHasHomeEquityData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [property, setProperty] = useState<PropertyForm>(EMPTY_PROPERTY);
  const [loanCosts, setLoanCosts] = useState<LoanCostsForm>(EMPTY_LOAN_COSTS);
  const [rent, setRent] = useState<RentForm>(EMPTY_RENT);

  const [calcResult, setCalcResult] = useState<BuyVsRentResult | null>(null);
  const [report, setReport] = useState<AdvisorReport | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Load saved data on mount
  useEffect(() => {
    Promise.all([loadAdvisor(), loadHomeEquity()])
      .then(([advisor, homeEquity]) => {
        setHasHomeEquityData(!!homeEquity);
        if (advisor) {
          setProperty({
            name: advisor.propertyName,
            purchaseYear: advisor.purchaseYear,
            purchasePriceStr: advisor.purchasePriceStr,
            currentYear: advisor.currentYear,
            currentValueStr: advisor.currentValueStr,
          });
          setLoanCosts({
            originalLoanStr: advisor.originalLoanStr,
            currentBalanceStr: advisor.currentBalanceStr,
            interestRateStr: advisor.interestRateStr,
            termYears: advisor.termYears,
            insuranceStr: advisor.insuranceStr,
            ratesAmountStr: advisor.ratesAmountStr,
            ratesFrequency: advisor.ratesFrequency as CostsData["ratesFrequency"],
            renovationsStr: advisor.renovationsStr,
          });
          setRent({
            weeklyRentStr: advisor.weeklyRentStr,
            rentIncreaseStr: advisor.rentIncreaseStr,
            sp500RateStr: advisor.sp500RateStr,
            sp500Note: advisor.sp500Note,
          });
          const completed = advisor.completedUpTo;
          setCompletedUpTo(completed);
          if (completed >= 3) {
            setCurrentStep(3);
          } else {
            setCurrentStep((Math.min(completed + 1, 3)) as 1 | 2 | 3);
          }
        }
      })
      .catch(() => {});
  }, []);

  function buildSaved(completed: number): SavedAdvisor {
    return {
      propertyName: property.name,
      purchaseYear: property.purchaseYear,
      purchasePriceStr: property.purchasePriceStr,
      currentYear: property.currentYear,
      currentValueStr: property.currentValueStr,
      originalLoanStr: loanCosts.originalLoanStr,
      currentBalanceStr: loanCosts.currentBalanceStr,
      interestRateStr: loanCosts.interestRateStr,
      termYears: loanCosts.termYears,
      insuranceStr: loanCosts.insuranceStr,
      ratesAmountStr: loanCosts.ratesAmountStr,
      ratesFrequency: loanCosts.ratesFrequency,
      renovationsStr: loanCosts.renovationsStr,
      weeklyRentStr: rent.weeklyRentStr,
      rentIncreaseStr: rent.rentIncreaseStr,
      sp500RateStr: rent.sp500RateStr,
      sp500Note: rent.sp500Note,
      completedUpTo: completed,
    };
  }

  function persist(completed: number) {
    setSaving(true);
    saveAdvisor(buildSaved(completed)).finally(() => setSaving(false));
  }

  const handleLoadFromCalculator = useCallback(() => {
    loadHomeEquity().then((saved) => {
      if (!saved) return;
      setProperty({
        name: saved.property.name,
        purchaseYear: saved.property.purchaseYear,
        purchasePriceStr: saved.property.purchasePriceStr,
        currentYear: saved.property.currentYear,
        currentValueStr: saved.property.currentValueStr,
      });
      setLoanCosts((prev) => ({
        ...prev,
        originalLoanStr: saved.loan.originalStr,
        currentBalanceStr: saved.loan.balanceStr,
        interestRateStr: saved.loan.rateStr,
        termYears: saved.loan.termYears,
        insuranceStr: saved.costs.insuranceStr,
        ratesAmountStr: saved.costs.ratesAmountStr,
        ratesFrequency: (saved.costs.ratesFrequency as CostsData["ratesFrequency"]) || "quarterly",
        renovationsStr: saved.costs.renovationsStr,
      }));
    });
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    setReport(null);
    setCalcResult(null);

    const propertyData = {
      name: property.name,
      purchaseYear: property.purchaseYear,
      purchasePrice: parse(property.purchasePriceStr),
      currentYear: property.currentYear,
      currentValue: parse(property.currentValueStr),
    };
    const loanData = {
      originalAmount: parse(loanCosts.originalLoanStr),
      currentBalance: parse(loanCosts.currentBalanceStr),
      interestRate: parse(loanCosts.interestRateStr),
      termYears: loanCosts.termYears,
    };
    const costsData = {
      annualInsurance: parse(loanCosts.insuranceStr),
      ratesAmount: parse(loanCosts.ratesAmountStr),
      ratesFrequency: loanCosts.ratesFrequency,
      totalRenovations: parse(loanCosts.renovationsStr),
    };
    const rentData = {
      weeklyRentAtPurchase: parse(rent.weeklyRentStr),
      annualRentIncrease: parse(rent.rentIncreaseStr),
      sp500Rate: parse(rent.sp500RateStr),
    };

    const result = calculateBuyVsRent(propertyData, loanData, costsData, rentData);
    setCalcResult(result);

    const body: AdvisorRequestBody = {
      propertyName: propertyData.name,
      purchaseYear: propertyData.purchaseYear,
      currentYear: propertyData.currentYear,
      purchasePrice: propertyData.purchasePrice,
      currentValue: propertyData.currentValue,
      originalLoan: loanData.originalAmount,
      interestRate: loanData.interestRate,
      termYears: loanData.termYears,
      downPayment: result.downPayment,
      yearsAnalyzed: result.yearsAnalyzed,
      buyerFinalEquity: result.buyerFinalEquity,
      buyerTotalInterestPaid: result.buyerTotalInterestPaid,
      buyerTotalOngoingCosts: result.buyerTotalOngoingCosts,
      buyerMonthlyAllIn: result.buyerMonthlyAllIn,
      weeklyRentAtPurchase: rentData.weeklyRentAtPurchase,
      annualRentIncrease: rentData.annualRentIncrease,
      sp500Rate: rentData.sp500Rate,
      renterFinalPortfolio: result.renterFinalPortfolio,
      renterTotalRentPaid: result.renterTotalRentPaid,
      renterMonthlyAtEnd: result.renterMonthlyAtEnd,
      winner: result.winner,
      winnerDiff: result.winnerDiff,
    };

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setReport(await res.json());
    } catch {
      setAnalysisError(
        "Could not generate AI analysis. The numbers above are still accurate."
      );
    } finally {
      setAnalysisLoading(false);
    }
  }, [property, loanCosts, rent]);

  // Summaries for completed steps
  const propertySummary =
    completedUpTo >= 1
      ? `${property.name || "Property"} · $${fmt(parse(property.purchasePriceStr))} → $${fmt(parse(property.currentValueStr))}`
      : "";
  const loanSummary =
    completedUpTo >= 2
      ? `$${fmt(parse(loanCosts.originalLoanStr))} at ${loanCosts.interestRateStr}% · ${loanCosts.termYears}yr`
      : "";
  const rentSummary =
    completedUpTo >= 3
      ? `$${fmt(parse(rent.weeklyRentStr))}/wk · ${rent.rentIncreaseStr}% rises · S&P 500 ${rent.sp500RateStr}%`
      : "";

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-3">
      {saving && (
        <p className="mb-2 text-right text-xs text-muted-foreground">Saving…</p>
      )}

      <StepIndicator current={currentStep} completed={completedUpTo} />

      <div className="mt-4 grid gap-3">
        {/* Step 1: Property */}
        {completedUpTo >= 1 && currentStep !== 1 ? (
          <CompletedStep
            label="Property"
            summary={propertySummary}
            onEdit={() => setCurrentStep(1)}
          />
        ) : (
          currentStep === 1 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">Property details</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StepProperty
                  data={property}
                  onChange={(p) => setProperty((prev) => ({ ...prev, ...p }))}
                  hasHomeEquityData={hasHomeEquityData}
                  onLoadFromCalculator={handleLoadFromCalculator}
                  onNext={() => {
                    const next = Math.max(completedUpTo, 1);
                    setCompletedUpTo(next);
                    setCurrentStep(2);
                    persist(next);
                  }}
                />
              </CardContent>
            </Card>
          )
        )}

        {/* Step 2: Loan & Costs */}
        {currentStep > 1 && completedUpTo >= 2 && currentStep !== 2 ? (
          <CompletedStep
            label="Loan & Costs"
            summary={loanSummary}
            onEdit={() => setCurrentStep(2)}
          />
        ) : (
          currentStep === 2 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">Loan & ongoing costs</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StepLoanCosts
                  data={loanCosts}
                  onChange={(p) => setLoanCosts((prev) => ({ ...prev, ...p }))}
                  onNext={() => {
                    const next = Math.max(completedUpTo, 2);
                    setCompletedUpTo(next);
                    setCurrentStep(3);
                    persist(next);
                  }}
                  onBack={() => setCurrentStep(1)}
                />
              </CardContent>
            </Card>
          )
        )}

        {/* Step 3: Rent scenario */}
        {currentStep > 2 && completedUpTo >= 3 && currentStep !== 3 ? (
          <CompletedStep
            label="Rent scenario"
            summary={rentSummary}
            onEdit={() => setCurrentStep(3)}
          />
        ) : (
          currentStep === 3 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">Rent scenario</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StepRent
                  data={rent}
                  onChange={(p) => {
                    const updated = { ...rent, ...p };
                    setRent(updated);
                  }}
                  purchaseYear={property.purchaseYear}
                  currentYear={property.currentYear}
                  onNext={() => {
                    const next = Math.max(completedUpTo, 3);
                    setCompletedUpTo(next);
                    persist(next);
                    handleRunAnalysis();
                  }}
                  onBack={() => setCurrentStep(2)}
                />
              </CardContent>
            </Card>
          )
        )}

        {/* Re-run button when all steps complete and viewing summaries */}
        {completedUpTo >= 3 && currentStep === 3 && !calcResult && !analysisLoading && (
          <Button className="h-12" onClick={handleRunAnalysis} disabled={analysisLoading}>
            Run analysis
          </Button>
        )}

        {/* Results */}
        {(calcResult || analysisLoading) && (
          <Results
            calcResult={calcResult!}
            report={report}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
            rentIncreaseStr={rent.rentIncreaseStr}
          />
        )}
      </div>
    </div>
  );
}
