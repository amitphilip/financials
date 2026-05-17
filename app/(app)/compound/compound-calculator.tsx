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

import { calculate, type Frequency } from "./calculations";
import { loadCompound, saveCompound } from "./actions";
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

// ─── constants ───────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1899 },
  (_, i) => CURRENT_YEAR - i
).map((y) => ({ value: String(y), label: String(y) }));

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "none", label: "None" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const STEP_LABELS = ["Investment", "Payments"];

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function freqLabel(f: Frequency) {
  return FREQ_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

// ─── shared UI ───────────────────────────────────────────────────────────────

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
  options,
}: {
  value: number;
  onChange: (y: number) => void;
  options: { value: string; label: string }[];
}) {
  const handleChange = useCallback((v: string) => onChange(Number(v)), [onChange]);
  return (
    <SearchSelect value={String(value)} onChange={handleChange} options={options} placeholder="Year" />
  );
}

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

// ─── completed step summary ───────────────────────────────────────────────────

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

// ─── step 1: investment ───────────────────────────────────────────────────────

type InvestmentForm = {
  initialDepositStr: string;
  startYear: number;
  endYear: number;
  rateStr: string;
};

function StepInvestment({
  data,
  onChange,
  onNext,
}: {
  data: InvestmentForm;
  onChange: (patch: Partial<InvestmentForm>) => void;
  onNext: () => void;
}) {
  const valid =
    parse(data.initialDepositStr) > 0 &&
    parse(data.rateStr) >= 0 &&
    data.startYear < data.endYear;

  const endYearOptions = useMemo(
    () =>
      Array.from(
        { length: 2100 - data.startYear },
        (_, i) => data.startYear + 1 + i
      )
        .reverse()
        .map((y) => ({ value: String(y), label: String(y) })),
    [data.startYear]
  );

  return (
    <div className="grid gap-4">
      <FieldRow label="Initial deposit">
        <CurrencyInput
          value={data.initialDepositStr}
          onChange={(v) => onChange({ initialDepositStr: v })}
          placeholder="10,000"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Start year">
          <YearSelect
            value={data.startYear}
            onChange={(y) => {
              const newEnd = Math.max(data.endYear, y + 1);
              onChange({ startYear: y, endYear: newEnd });
            }}
            options={START_YEAR_OPTIONS}
          />
        </FieldRow>
        <FieldRow label="End year">
          <YearSelect
            value={data.endYear}
            onChange={(y) => onChange({ endYear: y })}
            options={endYearOptions}
          />
        </FieldRow>
      </div>

      <FieldRow label="Avg annual return (%)">
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.1}
            value={data.rateStr}
            onChange={(e) => onChange({ rateStr: e.target.value })}
            placeholder="7"
            className="h-12 pr-7"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            %
          </span>
        </div>
      </FieldRow>

      <Button onClick={onNext} disabled={!valid} size="lg" className="h-12 w-full">
        Next →
      </Button>
    </div>
  );
}

// ─── step 2: payments ────────────────────────────────────────────────────────

type ContributionForm = {
  amountStr: string;
  frequency: Frequency;
};

function StepPayments({
  data,
  onChange,
  onDone,
  onBack,
}: {
  data: ContributionForm;
  onChange: (patch: Partial<ContributionForm>) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-4">
      <FieldRow label="Regular contribution">
        <CurrencyInput
          value={data.amountStr}
          onChange={(v) => onChange({ amountStr: v })}
          placeholder="500"
        />
      </FieldRow>

      <FieldRow label="Frequency">
        <SearchSelect
          value={data.frequency}
          onChange={(v) => onChange({ frequency: v as Frequency })}
          options={FREQ_OPTIONS}
          placeholder="Frequency"
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

const portfolioChartConfig = {
  totalInvested: { label: "Total Invested", color: "var(--chart-2)" },
  growth: { label: "Growth", color: "var(--chart-1)" },
} satisfies ChartConfig;

const gainChartConfig = {
  yoyGain: { label: "Annual Gain", color: "var(--chart-1)" },
} satisfies ChartConfig;

function Results({ result }: { result: ReturnType<typeof calculate> }) {
  const { yearlyData } = result;
  const totalPoints = yearlyData.length;
  const xInterval = totalPoints <= 11 ? 0 : Math.max(1, Math.floor(totalPoints / 10) - 1);

  const statCards = [
    { label: "Final value", value: result.finalValue },
    { label: "Total invested", value: result.totalInvested },
    { label: "Investment growth", value: result.totalGrowth },
  ];

  return (
    <div className="mt-6 grid gap-6">
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
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Return on invested</p>
            <p className="mt-1 text-lg font-semibold text-green-600">
              +{result.growthPct}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Effective CAGR on invested capital</p>
          <p className="mt-1 text-xl font-semibold text-green-600">
            {result.cagrPct}% / yr
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Portfolio growth over time</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ChartContainer config={portfolioChartConfig} className="h-52 w-full">
            <AreaChart data={yearlyData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fillInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="fillGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={xInterval}
              />
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
              <Area
                type="monotone"
                dataKey="totalInvested"
                stackId="1"
                stroke="var(--chart-2)"
                fill="url(#fillInvested)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="growth"
                stackId="1"
                stroke="var(--chart-1)"
                fill="url(#fillGrowth)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {yearlyData.length > 1 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Annual gain</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ChartContainer config={gainChartConfig} className="h-40 w-full">
              <BarChart
                data={yearlyData.slice(1)}
                margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={xInterval}
                />
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
                <Bar dataKey="yoyGain" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

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
                  <th className="px-4 py-2 text-right font-medium">Invested</th>
                  <th className="px-4 py-2 text-right font-medium">Growth</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row) => (
                  <tr key={row.year} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{row.year}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      $<HiddenNumber value={row.portfolioValue} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      $<HiddenNumber value={row.totalInvested} />
                    </td>
                    <td
                      className={[
                        "px-4 py-2.5 text-right tabular-nums",
                        row.growth > 0 ? "text-green-600" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {row.growth >= 0 ? "+" : ""}$
                      <HiddenNumber value={Math.abs(row.growth)} />
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

// ─── main component ───────────────────────────────────────────────────────────

export function CompoundCalculator() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [completedUpTo, setCompletedUpTo] = useState(0);
  const [saving, setSaving] = useState(false);

  const [investment, setInvestment] = useState<InvestmentForm>({
    initialDepositStr: "",
    startYear: CURRENT_YEAR,
    endYear: CURRENT_YEAR + 10,
    rateStr: "7",
  });

  const [contribution, setContribution] = useState<ContributionForm>({
    amountStr: "",
    frequency: "monthly",
  });

  useEffect(() => {
    loadCompound()
      .then((saved) => {
        if (!saved) return;
        setInvestment({
          initialDepositStr: saved.initialDepositStr,
          startYear: saved.startYear,
          endYear: saved.endYear,
          rateStr: saved.rateStr,
        });
        setContribution({
          amountStr: saved.contributionStr,
          frequency: saved.frequency as Frequency,
        });
        setCompletedUpTo(saved.completedUpTo);
        if (saved.completedUpTo >= 1) setCurrentStep(Math.min(saved.completedUpTo, 2) as 1 | 2);
      })
      .catch(() => {});
  }, []);

  function persist(
    inv: InvestmentForm,
    contrib: ContributionForm,
    completed: number
  ) {
    setSaving(true);
    saveCompound({
      initialDepositStr: inv.initialDepositStr,
      startYear: inv.startYear,
      endYear: inv.endYear,
      rateStr: inv.rateStr,
      contributionStr: contrib.amountStr,
      frequency: contrib.frequency,
      completedUpTo: completed,
    }).finally(() => setSaving(false));
  }

  const result = useMemo(() => {
    if (completedUpTo < 2) return null;
    return calculate(
      parse(investment.initialDepositStr),
      investment.startYear,
      investment.endYear,
      parse(investment.rateStr),
      parse(contribution.amountStr),
      contribution.frequency
    );
  }, [completedUpTo, investment, contribution]);

  const investmentSummary =
    completedUpTo >= 1
      ? `$${fmt(parse(investment.initialDepositStr))} · ${investment.startYear}–${investment.endYear} · ${investment.rateStr}% p.a.`
      : "";

  const paymentSummary =
    completedUpTo >= 2
      ? contribution.frequency === "none" || !parse(contribution.amountStr)
        ? "No regular contributions"
        : `$${fmt(parse(contribution.amountStr))} ${freqLabel(contribution.frequency)}`
      : "";

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-3">
      {saving && (
        <p className="mb-2 text-right text-xs text-muted-foreground">Saving…</p>
      )}
      <StepIndicator current={currentStep} completed={completedUpTo} />

      <div className="mt-4 grid gap-3">
        {completedUpTo >= 1 && currentStep !== 1 ? (
          <CompletedStep
            label="Investment"
            summary={investmentSummary}
            onEdit={() => setCurrentStep(1)}
          />
        ) : (
          currentStep === 1 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">Investment details</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StepInvestment
                  data={investment}
                  onChange={(p) => setInvestment((prev) => ({ ...prev, ...p }))}
                  onNext={() => {
                    const next = Math.max(completedUpTo, 1);
                    setCompletedUpTo(next);
                    setCurrentStep(2);
                    persist(investment, contribution, next);
                  }}
                />
              </CardContent>
            </Card>
          )
        )}

        {currentStep > 1 && completedUpTo >= 2 && currentStep !== 2 ? (
          <CompletedStep
            label="Payments"
            summary={paymentSummary}
            onEdit={() => setCurrentStep(2)}
          />
        ) : (
          currentStep === 2 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">Regular contributions</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StepPayments
                  data={contribution}
                  onChange={(p) => setContribution((prev) => ({ ...prev, ...p }))}
                  onDone={() => {
                    setCompletedUpTo(2);
                    persist(investment, contribution, 2);
                  }}
                  onBack={() => setCurrentStep(1)}
                />
              </CardContent>
            </Card>
          )
        )}
      </div>

      {result && <Results result={result} />}
    </div>
  );
}
