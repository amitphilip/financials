"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { Check, ChevronDown, ChevronUp, Pencil } from "lucide-react";

import { loadThreeBuckets, saveThreeBuckets } from "./actions";
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

const FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const EMP_OPTIONS = [
  { value: "paye", label: "PAYE employee" },
  { value: "self_employed", label: "Self-employed / contractor" },
  { value: "mixed", label: "Mixed income" },
];

const FREQ_PERIODS: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  yearly: 1,
};

const EMP_SUGGESTIONS: Record<string, { tax: number; wealth: number }> = {
  paye: { tax: 2, wealth: 30 },
  self_employed: { tax: 27, wealth: 25 },
  mixed: { tax: 15, wealth: 27 },
};

const BUCKET_COLORS = ["var(--chart-3)", "var(--chart-1)", "var(--chart-2)"];

const STEP_LABELS = ["Income", "Bucket Split"];

const SURPLUS_ROWS = [
  { bucket: "Tax surplus", action: "Sweep to wealth after year-end square-up. Hold one quarter as a provisional tax buffer." },
  { bucket: "Tax deficit", action: "Increase the percentage next cycle. Never plug the gap from wealth." },
  { bucket: "Wealth surplus", action: "Offset mortgage, lump-sum into investments, or hold for a larger planned move." },
  { bucket: "Wealth deficit", action: "Dial the target down to a number you will consistently hit. Consistency compounds." },
  { bucket: "Expenses surplus", action: "Sweep to wealth at month-end. Visibility breeds spending — remove the temptation." },
  { bucket: "Expenses deficit", action: "Diagnose, don't patch. Repeated shortfalls usually mean the percentages are wrong." },
];

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

function freqLabel(f: string) {
  return FREQ_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

function empLabel(e: string) {
  return EMP_OPTIONS.find((o) => o.value === e)?.label ?? e;
}

// ─── shared UI ────────────────────────────────────────────────────────────────

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

function PercentInput({
  value,
  onChange,
  placeholder = "0",
  disabled = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="h-12 pr-7"
        disabled={disabled}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        %
      </span>
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
                  "mb-5 h-px w-12 transition-colors",
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

// ─── step 1: income ───────────────────────────────────────────────────────────

type IncomeForm = {
  incomeStr: string;
  frequency: string;
  employmentType: string;
};

function StepIncome({
  data,
  onChange,
  onNext,
}: {
  data: IncomeForm;
  onChange: (patch: Partial<IncomeForm>) => void;
  onNext: () => void;
}) {
  const valid = parse(data.incomeStr) > 0 && data.frequency !== "" && data.employmentType !== "";

  const freqLabelShort = FREQ_OPTIONS.find((o) => o.value === data.frequency)?.label.toLowerCase() ?? "period";

  return (
    <div className="grid gap-4">
      <FieldRow label={`Income per ${freqLabelShort} (take-home for PAYE, gross for self-employed)`}>
        <CurrencyInput
          value={data.incomeStr}
          onChange={(v) => onChange({ incomeStr: v })}
          placeholder="5,000"
        />
      </FieldRow>

      <FieldRow label="Pay frequency">
        <SearchSelect
          value={data.frequency}
          onChange={(v) => onChange({ frequency: v })}
          options={FREQ_OPTIONS}
          placeholder="Select frequency"
        />
      </FieldRow>

      <FieldRow label="Employment type">
        <SearchSelect
          value={data.employmentType}
          onChange={(v) => onChange({ employmentType: v })}
          options={EMP_OPTIONS}
          placeholder="Select type"
        />
      </FieldRow>

      <Button onClick={onNext} disabled={!valid} size="lg" className="h-12 w-full">
        Next →
      </Button>
    </div>
  );
}

// ─── step 2: bucket split ─────────────────────────────────────────────────────

type BucketsForm = {
  taxPctStr: string;
  wealthPctStr: string;
};

function StepBuckets({
  data,
  onChange,
  onDone,
  onBack,
}: {
  data: BucketsForm;
  onChange: (patch: Partial<BucketsForm>) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const taxPct = parse(data.taxPctStr);
  const wealthPct = parse(data.wealthPctStr);
  const livingPct = Math.max(0, 100 - taxPct - wealthPct);
  const overAllocated = taxPct + wealthPct > 100;
  const valid = !overAllocated && taxPct + wealthPct <= 100 && parse(data.taxPctStr) >= 0 && parse(data.wealthPctStr) >= 0;

  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Set your target allocation. The living expenses bucket is the remainder.
        These are starting points — adjust to fit your situation.
      </p>

      <FieldRow label="Tax bucket (%)">
        <PercentInput
          value={data.taxPctStr}
          onChange={(v) => onChange({ taxPctStr: v })}
          placeholder="2"
        />
      </FieldRow>

      <FieldRow label="Wealth bucket (%)">
        <PercentInput
          value={data.wealthPctStr}
          onChange={(v) => onChange({ wealthPctStr: v })}
          placeholder="30"
        />
      </FieldRow>

      <FieldRow label="Living expenses (%)">
        <PercentInput
          value={String(livingPct)}
          placeholder="68"
          disabled
        />
      </FieldRow>

      {overAllocated && (
        <p className="text-xs text-destructive">
          Tax + Wealth exceeds 100%. Reduce one to continue.
        </p>
      )}

      {/* Visual split preview */}
      {!overAllocated && (taxPct > 0 || wealthPct > 0) && (
        <div className="grid gap-2">
          <div className="flex h-6 overflow-hidden rounded-xl">
            {taxPct > 0 && (
              <div
                style={{ width: `${taxPct}%` }}
                className="bg-[var(--chart-3)] transition-all"
              />
            )}
            {wealthPct > 0 && (
              <div
                style={{ width: `${wealthPct}%` }}
                className="bg-[var(--chart-1)] transition-all"
              />
            )}
            {livingPct > 0 && (
              <div
                style={{ flex: 1 }}
                className="bg-[var(--chart-2)] transition-all"
              />
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--chart-3)]" />
              Tax {taxPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--chart-1)]" />
              Wealth {wealthPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--chart-2)]" />
              Living {livingPct}%
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="h-12 flex-1">
          ← Back
        </Button>
        <Button onClick={onDone} disabled={!valid} size="lg" className="h-12 flex-1">
          Calculate
        </Button>
      </div>
    </div>
  );
}

// ─── calculations ─────────────────────────────────────────────────────────────

type BucketResult = {
  taxPct: number;
  wealthPct: number;
  livingPct: number;
  perPeriodTax: number;
  perPeriodWealth: number;
  perPeriodLiving: number;
  annualTax: number;
  annualWealth: number;
  annualLiving: number;
  annualTotal: number;
  perPeriod: number;
  frequency: string;
};

function computeBuckets(income: IncomeForm, buckets: BucketsForm): BucketResult {
  const taxPct = parse(buckets.taxPctStr);
  const wealthPct = parse(buckets.wealthPctStr);
  const livingPct = Math.max(0, 100 - taxPct - wealthPct);
  const perPeriod = parse(income.incomeStr);
  const periods = FREQ_PERIODS[income.frequency] ?? 12;
  const annual = perPeriod * periods;

  return {
    taxPct,
    wealthPct,
    livingPct,
    perPeriodTax: perPeriod * taxPct / 100,
    perPeriodWealth: perPeriod * wealthPct / 100,
    perPeriodLiving: perPeriod * livingPct / 100,
    annualTax: annual * taxPct / 100,
    annualWealth: annual * wealthPct / 100,
    annualLiving: annual * livingPct / 100,
    annualTotal: annual,
    perPeriod,
    frequency: income.frequency,
  };
}

// ─── results ─────────────────────────────────────────────────────────────────

const bucketChartConfig = {
  amount: { label: "Annual amount" },
} satisfies ChartConfig;

const BUCKETS_META = [
  { key: "tax" as const, label: "Tax", colorIdx: 0 },
  { key: "wealth" as const, label: "Wealth", colorIdx: 1 },
  { key: "living" as const, label: "Living expenses", colorIdx: 2 },
];

function Results({ result, frequency }: { result: BucketResult; frequency: string }) {
  const [surplusOpen, setSurplusOpen] = useState(false);

  const chartData = [
    { name: "Tax", amount: result.annualTax },
    { name: "Wealth", amount: result.annualWealth },
    { name: "Living", amount: result.annualLiving },
  ];

  const freqLabelShort = FREQ_OPTIONS.find((o) => o.value === frequency)?.label ?? "period";

  const bucketAmounts = {
    tax: { pct: result.taxPct, perPeriod: result.perPeriodTax, annual: result.annualTax },
    wealth: { pct: result.wealthPct, perPeriod: result.perPeriodWealth, annual: result.annualWealth },
    living: { pct: result.livingPct, perPeriod: result.perPeriodLiving, annual: result.annualLiving },
  };

  return (
    <div className="mt-6 grid gap-4">
      {/* Percentage split bar */}
      <div className="grid gap-2">
        <div className="flex h-6 overflow-hidden rounded-xl">
          {result.taxPct > 0 && (
            <div style={{ width: `${result.taxPct}%` }} className="bg-[var(--chart-3)]" />
          )}
          {result.wealthPct > 0 && (
            <div style={{ width: `${result.wealthPct}%` }} className="bg-[var(--chart-1)]" />
          )}
          {result.livingPct > 0 && (
            <div style={{ flex: 1 }} className="bg-[var(--chart-2)]" />
          )}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-[var(--chart-3)]" />
            Tax {result.taxPct}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-[var(--chart-1)]" />
            Wealth {result.wealthPct}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-[var(--chart-2)]" />
            Living {result.livingPct}%
          </span>
        </div>
      </div>

      {/* Bucket cards */}
      <div className="grid gap-3">
        {BUCKETS_META.map(({ key, label, colorIdx }) => {
          const { pct, perPeriod, annual } = bucketAmounts[key];
          return (
            <Card key={key} className="rounded-2xl shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: BUCKET_COLORS[colorIdx] }}
                    />
                    <p className="text-sm font-semibold">{label}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {pct}%
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Per {freqLabelShort.toLowerCase()}</p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums">
                      $<HiddenNumber value={Math.round(perPeriod)} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Per year</p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums">
                      $<HiddenNumber value={Math.round(annual)} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Annual breakdown chart */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Annual allocation</CardTitle>
          <p className="text-xs text-muted-foreground">
            Total income: $<HiddenNumber value={Math.round(result.annualTotal)} /> / year
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ChartContainer config={bucketChartConfig} className="h-44 w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => `$${fmt(Number(v))}`} />}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Surpluses & deficits */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="pb-0 pt-4">
          <button
            onClick={() => setSurplusOpen((o) => !o)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle className="text-sm font-semibold">Handling surpluses &amp; deficits</CardTitle>
            {surplusOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>
          {!surplusOpen && (
            <p className="mt-1 text-xs text-muted-foreground">
              What to do when a bucket ends the month over or under.
            </p>
          )}
        </CardHeader>
        {surplusOpen && (
          <CardContent className="pb-4 pt-3">
            <div className="grid gap-3">
              {SURPLUS_ROWS.map(({ bucket, action }) => (
                <div key={bucket} className="rounded-xl border bg-muted/20 px-3 py-3">
                  <p className="text-xs font-semibold">{bucket}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{action}</p>
                </div>
              ))}
              <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-3">
                <p className="text-xs font-semibold">General principle</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Surpluses sweep upward toward wealth. Deficits get diagnosed, not papered over with transfers from another bucket.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sinking fund note */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <p className="text-xs font-semibold">Buffer sub-bucket</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Keep one month of expenses inside the living bucket as a buffer. For irregular but predictable costs — insurance premiums, vehicle registration, annual subscriptions, holidays — a small monthly sinking fund transfer prevents these from looking like emergencies when they arrive.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ThreeBuckets() {
  const [step, setStep] = useState<1 | 2>(1);
  const [completedUpTo, setCompletedUpTo] = useState(0);

  const [income, setIncome] = useState<IncomeForm>({
    incomeStr: "",
    frequency: "fortnightly",
    employmentType: "paye",
  });

  const [buckets, setBuckets] = useState<BucketsForm>({
    taxPctStr: "2",
    wealthPctStr: "30",
  });

  useEffect(() => {
    loadThreeBuckets().then((saved) => {
      if (!saved) return;
      setIncome({
        incomeStr: saved.incomeStr,
        frequency: saved.frequency,
        employmentType: saved.employmentType,
      });
      setBuckets({
        taxPctStr: saved.taxPctStr,
        wealthPctStr: saved.wealthPctStr,
      });
      setCompletedUpTo(saved.completedUpTo);
      if (saved.completedUpTo >= 1) setStep(2);
    });
  }, []);

  function persist(completed: number, b = buckets) {
    saveThreeBuckets({
      incomeStr: income.incomeStr,
      frequency: income.frequency,
      employmentType: income.employmentType,
      taxPctStr: b.taxPctStr,
      wealthPctStr: b.wealthPctStr,
      completedUpTo: completed,
    });
  }

  function handleIncomeDone() {
    const next = Math.max(completedUpTo, 1);
    setCompletedUpTo(next);
    setStep(2);

    // Apply employment-type suggestions on first progression to step 2
    if (completedUpTo < 1) {
      const suggestion = EMP_SUGGESTIONS[income.employmentType] ?? { tax: 2, wealth: 30 };
      const newBuckets = {
        taxPctStr: String(suggestion.tax),
        wealthPctStr: String(suggestion.wealth),
      };
      setBuckets(newBuckets);
      persist(next, newBuckets);
    } else {
      persist(next);
    }
  }

  function handleBucketsDone() {
    const next = Math.max(completedUpTo, 2);
    setCompletedUpTo(next);
    persist(next);
  }

  const result = useMemo(() => {
    if (completedUpTo < 2) return null;
    return computeBuckets(income, buckets);
  }, [income, buckets, completedUpTo]);

  const incomeSummary =
    completedUpTo >= 1
      ? `$${fmt(parse(income.incomeStr))} ${freqLabel(income.frequency).toLowerCase()} · ${empLabel(income.employmentType)}`
      : "";

  const bucketSummary =
    completedUpTo >= 2
      ? `Tax ${parse(buckets.taxPctStr)}% · Wealth ${parse(buckets.wealthPctStr)}% · Living ${Math.max(0, 100 - parse(buckets.taxPctStr) - parse(buckets.wealthPctStr))}%`
      : "";

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">
      <StepIndicator current={step} completed={completedUpTo} />

      <div className="mt-4 grid gap-3">
        {/* Step 1 */}
        {step === 1 ? (
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Your income</CardTitle>
            </CardHeader>
            <CardContent>
              <StepIncome
                data={income}
                onChange={(patch) => setIncome((p) => ({ ...p, ...patch }))}
                onNext={handleIncomeDone}
              />
            </CardContent>
          </Card>
        ) : (
          completedUpTo >= 1 && (
            <CompletedStep
              label="Income"
              summary={incomeSummary}
              onEdit={() => setStep(1)}
            />
          )
        )}

        {/* Step 2 */}
        {step === 2 && completedUpTo >= 1 ? (
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Bucket percentages</CardTitle>
            </CardHeader>
            <CardContent>
              <StepBuckets
                data={buckets}
                onChange={(patch) => setBuckets((p) => ({ ...p, ...patch }))}
                onDone={handleBucketsDone}
                onBack={() => setStep(1)}
              />
            </CardContent>
          </Card>
        ) : (
          step > 2 &&
          completedUpTo >= 2 && (
            <CompletedStep
              label="Bucket Split"
              summary={bucketSummary}
              onEdit={() => setStep(2)}
            />
          )
        )}
      </div>

      {result && <Results result={result} frequency={income.frequency} />}
    </div>
  );
}
