"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Check, Pencil } from "lucide-react";

import {
  calculate,
  type CostsData,
  type LoanData,
  type PropertyData,
} from "./calculations";
import { loadHomeEquity, saveHomeEquity } from "./actions";
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

// ─── helpers ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i);
const YEAR_OPTIONS = YEARS.map((y) => ({ value: String(y), label: String(y) }));
const LOAN_TERMS = Array.from({ length: 30 }, (_, i) => i + 1);
const LOAN_TERM_OPTIONS = LOAN_TERMS.map((t) => ({
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

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function parse(s: string) {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

// ─── small shared UI pieces ──────────────────────────────────────────────────

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

// ─── generic searchable combobox ─────────────────────────────────────────────

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
      onValueChange={(v) => { if (v !== null) onChange(v as string); }}
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

function YearSelect({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (y: number) => void;
  min?: number;
  max?: number;
}) {
  const options = useMemo(
    () =>
      min === undefined && max === undefined
        ? YEAR_OPTIONS
        : YEAR_OPTIONS.filter(
            ({ value: v }) => {
              const y = Number(v);
              return (min === undefined || y >= min) && (max === undefined || y <= max);
            }
          ),
    [min, max]
  );
  const handleChange = useCallback((v: string) => onChange(Number(v)), [onChange]);
  return (
    <SearchSelect
      value={String(value)}
      onChange={handleChange}
      options={options}
      placeholder="Year"
    />
  );
}

// ─── stepper indicator ───────────────────────────────────────────────────────

const STEP_LABELS = ["Property", "Loan", "Costs"];

function StepIndicator({
  current,
  completed,
}: {
  current: number;
  completed: number;
}) {
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
                  "mb-5 h-px w-10 transition-colors",
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

// ─── step 1: property ────────────────────────────────────────────────────────

function StepProperty({
  data,
  onChange,
  onNext,
}: {
  data: PropertyData & { purchasePriceStr: string; currentValueStr: string };
  onChange: (patch: Partial<typeof data>) => void;
  onNext: () => void;
}) {
  const valid =
    parse(data.purchasePriceStr) > 0 &&
    parse(data.currentValueStr) > 0 &&
    data.currentYear >= data.purchaseYear;

  return (
    <div className="grid gap-4">
      <FieldRow label="House nickname">
        <Input
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. The Family Home"
          className="h-12"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Purchased in">
          <YearSelect
            value={data.purchaseYear}
            onChange={(y) => onChange({ purchaseYear: y })}
            max={data.currentYear}
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
          <YearSelect
            value={data.currentYear}
            onChange={(y) => onChange({ currentYear: y })}
            min={data.purchaseYear}
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

// ─── step 2: loan ────────────────────────────────────────────────────────────

function StepLoan({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: { originalStr: string; balanceStr: string; rateStr: string; termYears: number };
  onChange: (patch: Partial<typeof data>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const valid = parse(data.rateStr) >= 0 && data.termYears > 0;
  return (
    <div className="grid gap-4">
      <FieldRow label="Original loan amount">
        <CurrencyInput
          value={data.originalStr}
          onChange={(v) => onChange({ originalStr: v })}
          placeholder="400,000"
        />
      </FieldRow>

      <FieldRow label="Current outstanding balance">
        <CurrencyInput
          value={data.balanceStr}
          onChange={(v) => onChange({ balanceStr: v })}
          placeholder="350,000"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Avg interest rate (%)">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={30}
              step={0.01}
              value={data.rateStr}
              onChange={(e) => onChange({ rateStr: e.target.value })}
              placeholder="5.5"
              className="h-12 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
        </FieldRow>
        <FieldRow label="Loan term (years)">
          <SearchSelect
            value={String(data.termYears)}
            onChange={(v) => onChange({ termYears: Number(v) })}
            options={LOAN_TERM_OPTIONS}
            placeholder="Term"
          />
        </FieldRow>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="h-12 flex-1">
          ← Back
        </Button>
        <Button onClick={onNext} disabled={!valid} size="lg" className="h-12 flex-1">
          Next →
        </Button>
      </div>
    </div>
  );
}

// ─── step 3: costs ───────────────────────────────────────────────────────────

function StepCosts({
  data,
  onChange,
  onDone,
  onBack,
}: {
  data: {
    insuranceStr: string;
    ratesAmountStr: string;
    ratesFrequency: CostsData["ratesFrequency"];
    renovationsStr: string;
  };
  onChange: (patch: Partial<typeof data>) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-4">
      <FieldRow label="Building insurance (per year)">
        <CurrencyInput
          value={data.insuranceStr}
          onChange={(v) => onChange({ insuranceStr: v })}
          placeholder="1,500"
        />
      </FieldRow>

      <FieldRow label="Rates & fixed fees">
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput
            value={data.ratesAmountStr}
            onChange={(v) => onChange({ ratesAmountStr: v })}
            placeholder="500"
          />
          <SearchSelect
            value={data.ratesFrequency}
            onChange={(v) => onChange({ ratesFrequency: v as CostsData["ratesFrequency"] })}
            options={FREQ_OPTIONS}
            placeholder="Frequency"
          />
        </div>
      </FieldRow>

      <FieldRow label="Total renovations (since purchase)">
        <CurrencyInput
          value={data.renovationsStr}
          onChange={(v) => onChange({ renovationsStr: v })}
          placeholder="20,000"
        />
      </FieldRow>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="h-12 flex-1">
          ← Back
        </Button>
        <Button onClick={onDone} size="lg" className="h-12 flex-1">
          Calculate
        </Button>
      </div>
    </div>
  );
}

// ─── results ─────────────────────────────────────────────────────────────────

const valueChartConfig = {
  propertyValue: { label: "Property Value", color: "var(--chart-1)" },
  equity: { label: "Equity", color: "var(--chart-2)" },
} satisfies ChartConfig;

const interestChartConfig = {
  interestPaid: { label: "Interest Paid", color: "var(--chart-3)" },
} satisfies ChartConfig;

function Results({ result }: { result: ReturnType<typeof calculate> }) {
  const { yearlyData } = result;

  const statCards = [
    { label: "Current equity", value: result.currentEquity },
    { label: "Total growth", value: result.totalDollarGrowth },
    { label: "Interest paid", value: result.totalInterestPaid },
    { label: "Monthly repayment", value: result.monthlyPayment },
  ];

  const growthCards = [
    { label: "Overall growth", value: `${result.overallGrowthPct}%` },
    { label: "CAGR", value: `${result.cagrPct}%` },
  ];

  return (
    <div className="mt-6 grid gap-6">
      {/* key metrics */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ label, value }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                $<HiddenNumber value={value} />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {growthCards.map(({ label, value }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* property value chart */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Property value & equity</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ChartContainer config={valueChartConfig} className="h-48 w-full">
            <AreaChart data={yearlyData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(v) => `$${fmt(Number(v))}`}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="propertyValue"
                stroke="var(--chart-1)"
                fill="url(#fillValue)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="var(--chart-2)"
                fill="url(#fillEquity)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* interest paid chart */}
      {yearlyData.some((r) => r.interestPaid > 0) && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Interest paid per year</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ChartContainer config={interestChartConfig} className="h-40 w-full">
              <BarChart
                data={yearlyData.filter((r) => r.interestPaid > 0)}
                margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(v) => `$${fmt(Number(v))}`} />
                  }
                />
                <Bar dataKey="interestPaid" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* weekly rent equivalent */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Weekly rent equivalent</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Mortgage only</p>
              <p className="text-xs text-muted-foreground">Principal + interest repayment</p>
            </div>
            <p className="text-xl font-semibold tabular-nums">
              $<HiddenNumber value={result.weeklyMortgageOnly} />/wk
            </p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">All-in cost</p>
              <p className="text-xs text-muted-foreground">Mortgage + rates + insurance + renos</p>
            </div>
            <p className="text-xl font-semibold tabular-nums">
              $<HiddenNumber value={result.weeklyAllCosts} />/wk
            </p>
          </div>
        </CardContent>
      </Card>

      {/* yoy table */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Year-by-year breakdown</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Year</th>
                  <th className="px-4 py-2 text-right font-medium">Value</th>
                  <th className="px-4 py-2 text-right font-medium">YoY</th>
                  <th className="px-4 py-2 text-right font-medium">Interest</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row) => (
                  <tr key={row.year} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{row.year}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      $<HiddenNumber value={row.propertyValue} />
                    </td>
                    <td
                      className={[
                        "px-4 py-2.5 text-right tabular-nums",
                        row.yoyGrowthPct > 0 ? "text-green-600" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {row.yoyGrowthPct > 0 ? "+" : ""}
                      {row.yoyGrowthPct}%
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.interestPaid > 0 ? (
                        <>
                          $<HiddenNumber value={row.interestPaid} />
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── completed step summary ───────────────────────────────────────────────────

function CompletedStep({
  step,
  label,
  summary,
  onEdit,
}: {
  step: number;
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

// ─── main component ───────────────────────────────────────────────────────────

type PropertyForm = PropertyData & { purchasePriceStr: string; currentValueStr: string };
type LoanForm = { originalStr: string; balanceStr: string; rateStr: string; termYears: number };
type CostsForm = {
  insuranceStr: string;
  ratesAmountStr: string;
  ratesFrequency: CostsData["ratesFrequency"];
  renovationsStr: string;
};

export function HomeEquityCalculator() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [completedUpTo, setCompletedUpTo] = useState(0);
  const [saving, setSaving] = useState(false);

  const [property, setProperty] = useState<PropertyForm>({
    name: "",
    purchaseYear: 2020,
    purchasePriceStr: "",
    currentYear: CURRENT_YEAR,
    currentValueStr: "",
    purchasePrice: 0,
    currentValue: 0,
  });

  const [loan, setLoan] = useState<LoanForm>({
    originalStr: "",
    balanceStr: "",
    rateStr: "",
    termYears: 30,
  });

  const [costs, setCosts] = useState<CostsForm>({
    insuranceStr: "",
    ratesAmountStr: "",
    ratesFrequency: "quarterly",
    renovationsStr: "",
  });

  // Load saved data on mount
  useEffect(() => {
    loadHomeEquity().then((saved) => {
      if (!saved) return;
      setProperty((p) => ({ ...p, ...saved.property }));
      setLoan((l) => ({ ...l, ...saved.loan }));
      setCosts((c) => ({ ...c, ...saved.costs as CostsForm }));
      setCompletedUpTo(saved.completedUpTo);
      setCurrentStep(saved.completedUpTo >= 1 ? Math.min(saved.completedUpTo, 3) as 1 | 2 | 3 : 1);
    }).catch(() => {});
  }, []);

  function persist(
    nextProperty: PropertyForm,
    nextLoan: LoanForm,
    nextCosts: CostsForm,
    nextCompleted: number
  ) {
    setSaving(true);
    saveHomeEquity({
      property: nextProperty,
      loan: nextLoan,
      costs: nextCosts,
      completedUpTo: nextCompleted,
    }).finally(() => setSaving(false));
  }

  const result = useMemo(() => {
    if (completedUpTo < 3) return null;
    return calculate(
      {
        name: property.name,
        purchaseYear: property.purchaseYear,
        purchasePrice: parse(property.purchasePriceStr),
        currentYear: property.currentYear,
        currentValue: parse(property.currentValueStr),
      },
      {
        originalAmount: parse(loan.originalStr),
        currentBalance: parse(loan.balanceStr),
        interestRate: parse(loan.rateStr),
        termYears: loan.termYears,
      },
      {
        annualInsurance: parse(costs.insuranceStr),
        ratesAmount: parse(costs.ratesAmountStr),
        ratesFrequency: costs.ratesFrequency,
        totalRenovations: parse(costs.renovationsStr),
      }
    );
  }, [completedUpTo, property, loan, costs]);

  const propertySummary =
    completedUpTo >= 1
      ? `${property.name || "Property"} · $${fmt(parse(property.purchasePriceStr))} → $${fmt(parse(property.currentValueStr))}`
      : "";
  const loanSummary =
    completedUpTo >= 2
      ? `$${fmt(parse(loan.originalStr))} @ ${loan.rateStr}% · ${loan.termYears}yr`
      : "";
  const costsSummary =
    completedUpTo >= 3
      ? `Insurance $${fmt(parse(costs.insuranceStr))}/yr · Rates $${fmt(parse(costs.ratesAmountStr))} ${costs.ratesFrequency}`
      : "";

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-3">
      {saving && (
        <p className="mb-2 text-right text-xs text-muted-foreground">Saving…</p>
      )}
      <StepIndicator current={currentStep} completed={completedUpTo} />

      <div className="mt-4 grid gap-3">
        {/* Step 1 */}
        {completedUpTo >= 1 && currentStep !== 1 ? (
          <CompletedStep
            step={1}
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
                  onNext={() => {
                    const next = Math.max(completedUpTo, 1);
                    setCompletedUpTo(next);
                    setCurrentStep(2);
                    persist(property, loan, costs, next);
                  }}
                />
              </CardContent>
            </Card>
          )
        )}

        {/* Step 2 */}
        {currentStep > 1 && completedUpTo >= 2 && currentStep !== 2 ? (
          <CompletedStep
            step={2}
            label="Loan"
            summary={loanSummary}
            onEdit={() => setCurrentStep(2)}
          />
        ) : (
          currentStep === 2 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">Loan details</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StepLoan
                  data={loan}
                  onChange={(p) => setLoan((prev) => ({ ...prev, ...p }))}
                  onNext={() => {
                    const next = Math.max(completedUpTo, 2);
                    setCompletedUpTo(next);
                    setCurrentStep(3);
                    persist(property, loan, costs, next);
                  }}
                  onBack={() => setCurrentStep(1)}
                />
              </CardContent>
            </Card>
          )
        )}

        {/* Step 3 */}
        {currentStep > 2 && completedUpTo >= 3 && currentStep !== 3 ? (
          <CompletedStep
            step={3}
            label="Costs"
            summary={costsSummary}
            onEdit={() => setCurrentStep(3)}
          />
        ) : (
          currentStep === 3 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">Ongoing costs</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StepCosts
                  data={costs}
                  onChange={(p) => setCosts((prev) => ({ ...prev, ...p }))}
                  onDone={() => {
                    setCompletedUpTo(3);
                    persist(property, loan, costs, 3);
                    setCurrentStep(3);
                  }}
                  onBack={() => setCurrentStep(2)}
                />
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Results */}
      {result && <Results result={result} />}
    </div>
  );
}
