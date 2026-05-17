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
import { Check, Info, Loader2, Pencil, Sparkles, X } from "lucide-react";

import { calculateKiwisaver, type KiwiFrequency } from "./calculations";
import { loadKiwisaver, saveKiwisaver } from "./actions";
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
  { length: CURRENT_YEAR - 1999 },
  (_, i) => CURRENT_YEAR - 1 - i
).map((y) => ({ value: String(y), label: String(y) }));

const BIRTH_YEAR_OPTIONS = Array.from(
  { length: 2005 - 1940 + 1 },
  (_, i) => 2005 - i
).map((y) => ({ value: String(y), label: String(y) }));

const FREQ_OPTIONS: { value: KiwiFrequency; label: string }[] = [
  { value: "none", label: "None" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const PROJECTION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40].map((y) => ({
  value: String(y),
  label: `${y} years`,
}));

const STEP_LABELS = ["Balance & Rate", "Projection"];

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

function freqLabel(f: KiwiFrequency) {
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
    <SearchSelect
      value={String(value)}
      onChange={handleChange}
      options={options}
      placeholder="Year"
    />
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

// ─── step 1: balance & rate ───────────────────────────────────────────────────

type BalanceForm = {
  balanceStr: string;
  startYear: number;
  birthYear: number;
  rateStr: string;
  aiNote: string;
};

function StepBalance({
  data,
  onChange,
  onNext,
}: {
  data: BalanceForm;
  onChange: (patch: Partial<BalanceForm>) => void;
  onNext: () => void;
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  const valid = parse(data.balanceStr) >= 0 && parse(data.rateStr) >= 0;

  async function fetchAIRate() {
    setAiLoading(true);
    setAiError("");
    setNoteOpen(false);
    try {
      const params = new URLSearchParams({ startYear: String(data.startYear) });
      if (data.birthYear) params.set("birthYear", String(data.birthYear));
      const res = await fetch(`/api/kiwisaver-rate?${params}`);
      const json = await res.json();
      if (!res.ok || !json.rate) throw new Error(json.error ?? "Unknown error");
      onChange({ rateStr: String(json.rate), aiNote: json.note ?? "" });
      setNoteOpen(true);
    } catch {
      setAiError("Could not fetch rate. Please enter manually.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <FieldRow label="Current KiwiSaver balance">
        <CurrencyInput
          value={data.balanceStr}
          onChange={(v) => onChange({ balanceStr: v })}
          placeholder="25,000"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Year you started">
          <YearSelect
            value={data.startYear}
            onChange={(y) => onChange({ startYear: y, rateStr: "", aiNote: "" })}
            options={START_YEAR_OPTIONS}
          />
        </FieldRow>
        <FieldRow label="Birth year">
          <YearSelect
            value={data.birthYear}
            onChange={(y) => onChange({ birthYear: y, rateStr: "", aiNote: "" })}
            options={BIRTH_YEAR_OPTIONS}
          />
        </FieldRow>
      </div>

      <FieldRow label="High growth fund avg return (%)">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={60}
              step={0.1}
              value={data.rateStr}
              onChange={(e) => {
                onChange({ rateStr: e.target.value, aiNote: "" });
                setNoteOpen(false);
              }}
              placeholder="11"
              className="h-12 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0"
            onClick={fetchAIRate}
            disabled={aiLoading}
            title="Fetch NZ KiwiSaver high growth avg return with AI"
          >
            {aiLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </Button>
        </div>

        {data.aiNote && noteOpen && (
          <div className="relative rounded-xl border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-foreground">
            <button
              onClick={() => setNoteOpen(false)}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
            <span className="mr-1 inline-flex items-center gap-1 font-medium">
              <Sparkles className="size-3" /> AI
            </span>
            {data.aiNote}
          </div>
        )}
        {data.aiNote && !noteOpen && (
          <button
            onClick={() => setNoteOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Info className="size-3" />
            AI-sourced rate — tap to see details
          </button>
        )}
        {aiError && <p className="text-xs text-destructive">{aiError}</p>}
      </FieldRow>

      <Button onClick={onNext} disabled={!valid} size="lg" className="h-12 w-full">
        Next →
      </Button>
    </div>
  );
}

// ─── step 2: projection ───────────────────────────────────────────────────────

type ProjectionForm = {
  projectionYears: number;
  contributionStr: string;
  contributionFrequency: KiwiFrequency;
};

function StepProjection({
  data,
  onChange,
  onDone,
  onBack,
}: {
  data: ProjectionForm;
  onChange: (patch: Partial<ProjectionForm>) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-4">
      <FieldRow label="Project ahead">
        <SearchSelect
          value={String(data.projectionYears)}
          onChange={(v) => onChange({ projectionYears: Number(v) })}
          options={PROJECTION_OPTIONS}
          placeholder="Years ahead"
        />
      </FieldRow>

      <FieldRow label="Regular contribution (optional)">
        <CurrencyInput
          value={data.contributionStr}
          onChange={(v) => onChange({ contributionStr: v })}
          placeholder="200"
        />
      </FieldRow>

      <FieldRow label="Contribution frequency">
        <SearchSelect
          value={data.contributionFrequency}
          onChange={(v) => onChange({ contributionFrequency: v as KiwiFrequency })}
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
  totalContributed: { label: "Total Contributed", color: "var(--chart-2)" },
  growth: { label: "Growth", color: "var(--chart-1)" },
} satisfies ChartConfig;

const gainChartConfig = {
  yoyGain: { label: "Annual Gain", color: "var(--chart-1)" },
} satisfies ChartConfig;

function Results({ result }: { result: ReturnType<typeof calculateKiwisaver> }) {
  const { yearlyData } = result;
  const totalPoints = yearlyData.length;
  const xInterval = totalPoints <= 11 ? 0 : Math.max(1, Math.floor(totalPoints / 10) - 1);

  const hasRetirement = result.age65 || result.age67;

  return (
    <div className="mt-6 grid gap-6">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Projected balance", value: result.finalValue },
          { label: "Total contributed", value: result.totalContributed },
          { label: "Investment growth", value: result.totalGrowth },
        ].map(({ label, value }) => (
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
            <p className="text-xs text-muted-foreground">Return on contributed</p>
            <p className="mt-1 text-lg font-semibold text-green-600">
              +{result.growthPct}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Effective CAGR on contributed capital</p>
          <p className="mt-1 text-xl font-semibold text-green-600">
            {result.cagrPct}% / yr
          </p>
        </CardContent>
      </Card>

      {/* retirement milestones */}
      {hasRetirement && (
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Retirement milestones</CardTitle>
            <p className="text-xs text-muted-foreground">
              Projected balance when you can access KiwiSaver — rough monthly income assumes 20-year drawdown
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 pb-4">
            {[result.age65, result.age67]
              .filter(Boolean)
              .map((m) => m && (
                <div key={m.age} className="rounded-xl border bg-muted/30 p-3 grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Age {m.age} · {m.year}</span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      {m.age === 65 ? "NZ eligibility" : "Common target"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance (estate value)</p>
                      <p className="text-base font-semibold tabular-nums">
                        $<HiddenNumber value={m.balance} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rough monthly over 20 yrs</p>
                      <p className="text-base font-semibold tabular-nums text-green-600">
                        $<HiddenNumber value={m.roughMonthlyOver20yrs} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">KiwiSaver projected growth</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ChartContainer config={portfolioChartConfig} className="h-52 w-full">
            <AreaChart data={yearlyData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="kiwiContribGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="kiwiGrowthGrad" x1="0" y1="0" x2="0" y2="1">
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
                content={<ChartTooltipContent formatter={(v) => `$${fmt(Number(v))}`} />}
              />
              <Area
                type="monotone"
                dataKey="totalContributed"
                stackId="1"
                stroke="var(--chart-2)"
                fill="url(#kiwiContribGrad)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="growth"
                stackId="1"
                stroke="var(--chart-1)"
                fill="url(#kiwiGrowthGrad)"
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
            <CardTitle className="text-sm font-semibold">Annual portfolio gain</CardTitle>
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
                  content={<ChartTooltipContent formatter={(v) => `$${fmt(Number(v))}`} />}
                />
                <Bar dataKey="yoyGain" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── main calculator ──────────────────────────────────────────────────────────

export function KiwisaverCalculator() {
  const [step, setStep] = useState(1);
  const [completedUpTo, setCompletedUpTo] = useState(0);

  const [balance, setBalance] = useState<BalanceForm>({
    balanceStr: "",
    startYear: CURRENT_YEAR - 5,
    birthYear: CURRENT_YEAR - 35,
    rateStr: "",
    aiNote: "",
  });

  const [projection, setProjection] = useState<ProjectionForm>({
    projectionYears: 20,
    contributionStr: "",
    contributionFrequency: "none",
  });

  // Load saved state on mount
  useEffect(() => {
    loadKiwisaver().then((saved) => {
      if (!saved) return;
      setBalance({
        balanceStr: saved.balanceStr,
        startYear: saved.startYear,
        birthYear: saved.birthYear ?? CURRENT_YEAR - 35,
        rateStr: saved.rateStr,
        aiNote: saved.aiNote,
      });
      setProjection({
        projectionYears: saved.projectionYears,
        contributionStr: saved.contributionStr,
        contributionFrequency: saved.contributionFrequency as KiwiFrequency,
      });
      setCompletedUpTo(saved.completedUpTo);
      if (saved.completedUpTo >= 2) setStep(2);
    });
  }, []);

  function handleBalanceDone() {
    const next = Math.max(completedUpTo, 1);
    setCompletedUpTo(next);
    setStep(2);
    saveKiwisaver({
      ...balance,
      projectionYears: projection.projectionYears,
      contributionStr: projection.contributionStr,
      contributionFrequency: projection.contributionFrequency,
      completedUpTo: next,
    });
  }

  function handleProjectionDone() {
    const next = Math.max(completedUpTo, 2);
    setCompletedUpTo(next);
    saveKiwisaver({
      ...balance,
      projectionYears: projection.projectionYears,
      contributionStr: projection.contributionStr,
      contributionFrequency: projection.contributionFrequency,
      completedUpTo: next,
    });
  }

  const result = useMemo(() => {
    if (completedUpTo < 2) return null;
    const bal = parse(balance.balanceStr);
    const rate = parse(balance.rateStr);
    const contrib = parse(projection.contributionStr);
    if (bal < 0 || rate < 0 || projection.projectionYears < 1) return null;
    return calculateKiwisaver(
      bal, rate, projection.projectionYears, contrib,
      projection.contributionFrequency,
      balance.birthYear || undefined
    );
  }, [balance, projection, completedUpTo]);

  const balanceSummary = `$${fmt(parse(balance.balanceStr))} · ${balance.rateStr}% p.a. · born ${balance.birthYear}`;
  const projectionSummary =
    projection.projectionYears +
    " yrs" +
    (parse(projection.contributionStr) > 0
      ? ` · $${fmt(parse(projection.contributionStr))} ${freqLabel(projection.contributionFrequency).toLowerCase()}`
      : "");

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">
      <StepIndicator current={step} completed={completedUpTo} />

      <div className="mt-4 grid gap-3">
        {/* Step 1 */}
        {step === 1 ? (
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Balance &amp; Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <StepBalance
                data={balance}
                onChange={(patch) => setBalance((p) => ({ ...p, ...patch }))}
                onNext={handleBalanceDone}
              />
            </CardContent>
          </Card>
        ) : (
          completedUpTo >= 1 && (
            <CompletedStep
              label="Balance &amp; Rate"
              summary={balanceSummary}
              onEdit={() => setStep(1)}
            />
          )
        )}

        {/* Step 2 */}
        {step === 2 && completedUpTo >= 1 ? (
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Forward Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <StepProjection
                data={projection}
                onChange={(patch) => setProjection((p) => ({ ...p, ...patch }))}
                onDone={handleProjectionDone}
                onBack={() => setStep(1)}
              />
            </CardContent>
          </Card>
        ) : (
          step > 2 &&
          completedUpTo >= 2 && (
            <CompletedStep
              label="Forward Projection"
              summary={projectionSummary}
              onEdit={() => setStep(2)}
            />
          )
        )}
      </div>

      {result && <Results result={result} />}
    </div>
  );
}
