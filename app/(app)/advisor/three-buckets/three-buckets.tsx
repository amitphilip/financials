"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { AlertCircle, Check, ChevronDown, ChevronUp, Pencil } from "lucide-react";

import { loadThreeBuckets, saveThreeBuckets } from "./actions";
import {
  calculateIncome,
  KIWI_RATES,
  type KiwiRate,
} from "../../income/calculations";
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
];

const INV_FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const FREQ_PERIODS: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  yearly: 1,
};

const BUCKET_COLORS = ["var(--chart-3)", "var(--chart-1)", "var(--chart-2)"] as const;

const STEP_LABELS = ["Income", "Wealth"];

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
  return FREQ_OPTIONS.find((o) => o.value === f)?.label?.toLowerCase() ?? "period";
}

function computeMortgageRepayment(balance: number, termYears: number, annualRate: number) {
  if (balance <= 0 || termYears <= 0) return { monthly: 0, principal: 0, interest: 0 };
  if (annualRate === 0) {
    const monthly = balance / (termYears * 12);
    return { monthly, principal: monthly, interest: 0 };
  }
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  const monthly = (balance * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const interest = balance * r;
  return { monthly, principal: monthly - interest, interest };
}

// ─── types ────────────────────────────────────────────────────────────────────

type PersonIncome = {
  grossStr: string;
  kiwiRate: KiwiRate;
  employmentType: "paye" | "self_employed";
  taxPctStr: string;
  confirmed: boolean;
  included: boolean;
};

type IncomeForm = {
  you: PersonIncome;
  partner: PersonIncome;
  frequency: string;
};

type WealthForm = {
  mortgageBalanceStr: string;
  mortgageTermStr: string;
  mortgageRateStr: string;
  investmentAmountStr: string;
  investmentFrequency: string;
};

// ─── defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PERSON: PersonIncome = {
  grossStr: "",
  kiwiRate: 3.5,
  employmentType: "paye",
  taxPctStr: "28",
  confirmed: false,
  included: true,
};

const DEFAULT_INCOME: IncomeForm = {
  you: { ...DEFAULT_PERSON },
  partner: { ...DEFAULT_PERSON, included: false },
  frequency: "fortnightly",
};

const DEFAULT_WEALTH: WealthForm = {
  mortgageBalanceStr: "",
  mortgageTermStr: "",
  mortgageRateStr: "",
  investmentAmountStr: "",
  investmentFrequency: "monthly",
};

// ─── shared UI ────────────────────────────────────────────────────────────────

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function CurrencyInput({ value, onChange, placeholder = "0" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
      <Input type="number" inputMode="decimal" min={0} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 pl-7" />
    </div>
  );
}

function PercentInput({ value, onChange, placeholder = "0" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Input type="number" inputMode="decimal" min={0} max={100} step={0.1} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 pr-7" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
    </div>
  );
}

const SearchSelect = memo(function SearchSelect({ value, onChange, options, placeholder = "Select…" }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <Combobox value={value} onValueChange={(v) => { if (v !== null) onChange(v as string); }}>
      <ComboboxInput placeholder={placeholder} className="h-12 w-full" showTrigger showClear={false} />
      <ComboboxContent>
        <ComboboxEmpty>No results</ComboboxEmpty>
        <ComboboxList>
          {options.map((o) => <ComboboxItem key={o.value} value={o.value}>{o.label}</ComboboxItem>)}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
});

function EmploymentToggle({ value, onChange }: { value: "paye" | "self_employed"; onChange: (v: "paye" | "self_employed") => void }) {
  return (
    <div className="flex gap-2">
      {[{ value: "paye" as const, label: "PAYE" }, { value: "self_employed" as const, label: "Self-employed" }].map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={["h-10 flex-1 rounded-lg border px-3 text-sm font-medium transition-colors",
            value === opt.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
          ].join(" ")}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function KiwiRateSelector({ value, onChange }: { value: KiwiRate; onChange: (r: KiwiRate) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {KIWI_RATES.map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)}
          className={["h-10 min-w-14 rounded-lg border px-3 text-sm font-medium transition-colors",
            value === r ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
          ].join(" ")}>
          {r}%
        </button>
      ))}
    </div>
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
              <div className={["flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done ? "bg-primary text-primary-foreground" : active ? "border-2 border-primary text-primary" : "border-2 border-muted text-muted-foreground",
              ].join(" ")}>
                {done && step < current ? <Check className="size-4" /> : step}
              </div>
              <span className={["text-xs", active ? "font-medium text-foreground" : "text-muted-foreground"].join(" ")}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={["mb-5 h-px w-12 transition-colors", step < current ? "bg-primary" : "bg-muted"].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompletedStep({ label, summary, onEdit }: { label: string; summary: string; onEdit: () => void }) {
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

// ─── person income card ───────────────────────────────────────────────────────

function PersonIncomeCard({ label, data, onChange, onConfirm, onEdit, onSkip, showSkip }: {
  label: string;
  data: PersonIncome;
  onChange: (patch: Partial<PersonIncome>) => void;
  onConfirm: () => void;
  onEdit: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}) {
  if (data.confirmed) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium tabular-nums">
            $<HiddenNumber value={parse(data.grossStr)} /> gross
            {data.employmentType === "paye" && ` · KiwiSaver ${data.kiwiRate}%`}
            {data.employmentType === "self_employed" && ` · Tax ${data.taxPctStr}%`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit} className="size-9 shrink-0">
          <Pencil className="size-4" />
        </Button>
      </div>
    );
  }

  if (!data.included) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
        <p className="text-xs text-muted-foreground">{label} — not included</p>
        <button type="button" onClick={() => onChange({ included: true })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Add
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-background p-4 grid gap-4">
      <p className="text-sm font-semibold">{label}</p>

      <FieldRow label="Employment type">
        <EmploymentToggle value={data.employmentType} onChange={(v) => onChange({ employmentType: v })} />
      </FieldRow>

      <FieldRow label="Annual gross salary">
        <CurrencyInput value={data.grossStr} onChange={(v) => onChange({ grossStr: v })} placeholder="80,000" />
      </FieldRow>

      {data.employmentType === "paye" ? (
        <FieldRow label="KiwiSaver rate">
          <KiwiRateSelector value={data.kiwiRate} onChange={(r) => onChange({ kiwiRate: r })} />
        </FieldRow>
      ) : (
        <FieldRow label="Tax provision" hint="Set aside this % of gross for provisional tax, GST, and ACC.">
          <PercentInput value={data.taxPctStr} onChange={(v) => onChange({ taxPctStr: v })} placeholder="28" />
        </FieldRow>
      )}

      <div className="flex gap-2">
        <Button onClick={onConfirm} disabled={parse(data.grossStr) <= 0} className="h-11 flex-1">
          <Check className="size-4 mr-1" /> Confirm
        </Button>
        {showSkip && onSkip && (
          <Button variant="ghost" onClick={onSkip} className="h-11 text-muted-foreground">Skip</Button>
        )}
      </div>
    </div>
  );
}

// ─── step 1: income ───────────────────────────────────────────────────────────

function StepIncome({ data, onChange, onNext }: {
  data: IncomeForm;
  onChange: (patch: Partial<IncomeForm>) => void;
  onNext: () => void;
}) {
  const valid = data.you.confirmed && data.frequency !== "";

  const householdPreview = useMemo(() => {
    if (!data.you.confirmed) return null;
    let totalGross = parse(data.you.grossStr);
    let totalTax = 0;
    let totalKiwi = 0;
    let totalNet = 0;

    function add(p: PersonIncome) {
      const g = parse(p.grossStr);
      if (!p.included || g <= 0) return;
      if (p.employmentType === "paye") {
        const r = calculateIncome(g, p.kiwiRate);
        totalTax += r.paye + r.acc;
        totalKiwi += r.kiwiEmployee;
        totalNet += r.net;
      } else {
        const tax = Math.round(g * parse(p.taxPctStr) / 100);
        totalTax += tax;
        totalNet += g - tax;
      }
    }

    add(data.you);
    if (data.partner.confirmed) {
      totalGross += parse(data.partner.grossStr);
      add(data.partner);
    }

    return { totalGross, totalTax, totalKiwi, totalNet };
  }, [data.you, data.partner]);

  return (
    <div className="grid gap-4">
      <PersonIncomeCard
        label="Your income"
        data={data.you}
        onChange={(patch) => onChange({ you: { ...data.you, ...patch } })}
        onConfirm={() => onChange({ you: { ...data.you, confirmed: true } })}
        onEdit={() => onChange({ you: { ...data.you, confirmed: false } })}
      />

      {data.you.confirmed && (
        <PersonIncomeCard
          label="Partner's income"
          data={data.partner}
          onChange={(patch) => onChange({ partner: { ...data.partner, ...patch } })}
          onConfirm={() => onChange({ partner: { ...data.partner, confirmed: true } })}
          onEdit={() => onChange({ partner: { ...data.partner, confirmed: false } })}
          onSkip={() => onChange({ partner: { ...data.partner, included: false, confirmed: false } })}
          showSkip={data.partner.included && !data.partner.confirmed}
        />
      )}

      {data.you.confirmed && (
        <FieldRow label="Household budget frequency">
          <SearchSelect value={data.frequency} onChange={(v) => onChange({ frequency: v })} options={FREQ_OPTIONS} placeholder="Select frequency" />
        </FieldRow>
      )}

      {householdPreview && (data.partner.confirmed || !data.partner.included) && (
        <div className="rounded-xl border bg-muted/30 px-3 py-3 grid gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {data.partner.confirmed ? "Combined household" : "Your income"}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Gross (yr)</p>
              <p className="font-semibold tabular-nums mt-0.5">$<HiddenNumber value={householdPreview.totalGross} /></p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax (yr)</p>
              <p className="font-semibold tabular-nums mt-0.5">$<HiddenNumber value={householdPreview.totalTax} /></p>
            </div>
            {householdPreview.totalKiwi > 0 && (
              <div>
                <p className="text-muted-foreground">KiwiSaver (yr)</p>
                <p className="font-semibold tabular-nums mt-0.5">$<HiddenNumber value={householdPreview.totalKiwi} /></p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Take-home (yr)</p>
              <p className="font-semibold tabular-nums mt-0.5">$<HiddenNumber value={householdPreview.totalNet} /></p>
            </div>
          </div>
        </div>
      )}

      <Button onClick={onNext} disabled={!valid} size="lg" className="h-12 w-full">
        Next →
      </Button>
    </div>
  );
}

// ─── step 2: wealth commitments ───────────────────────────────────────────────

function StepWealth({ data, onChange, onDone, onBack, kiwiAnnual, frequency }: {
  data: WealthForm;
  onChange: (patch: Partial<WealthForm>) => void;
  onDone: () => void;
  onBack: () => void;
  kiwiAnnual: number;
  frequency: string;
}) {
  const periods = FREQ_PERIODS[frequency] ?? 26;
  const freqStr = freqLabel(frequency);

  const mortgage = useMemo(() => {
    const balance = parse(data.mortgageBalanceStr);
    const term = parse(data.mortgageTermStr);
    const rate = parse(data.mortgageRateStr);
    if (balance <= 0 || term <= 0) return null;
    return computeMortgageRepayment(balance, term, rate);
  }, [data.mortgageBalanceStr, data.mortgageTermStr, data.mortgageRateStr]);

  return (
    <div className="grid gap-5">
      {kiwiAnnual > 0 && (
        <div className="rounded-xl border bg-muted/20 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KiwiSaver (from income)</p>
          <p className="mt-1 text-sm font-medium tabular-nums">
            $<HiddenNumber value={Math.round(kiwiAnnual / periods)} />/{freqStr} · $<HiddenNumber value={Math.round(kiwiAnnual)} />/yr
          </p>
        </div>
      )}

      <div className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mortgage</p>
        <FieldRow label="Remaining balance">
          <CurrencyInput value={data.mortgageBalanceStr} onChange={(v) => onChange({ mortgageBalanceStr: v })} placeholder="450,000" />
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Remaining term">
            <div className="relative">
              <Input type="number" inputMode="numeric" min={1} max={40} value={data.mortgageTermStr} onChange={(e) => onChange({ mortgageTermStr: e.target.value })} placeholder="25" className="h-12 pr-10" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">yrs</span>
            </div>
          </FieldRow>
          <FieldRow label="Interest rate">
            <PercentInput value={data.mortgageRateStr} onChange={(v) => onChange({ mortgageRateStr: v })} placeholder="6.5" />
          </FieldRow>
        </div>
        {mortgage && (
          <div className="rounded-xl border bg-muted/20 px-3 py-2.5 grid gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repayment per {freqStr}</span>
              <span className="font-semibold tabular-nums">$<HiddenNumber value={Math.round(mortgage.monthly * 12 / periods)} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Principal (wealth building)</span>
              <span className="tabular-nums text-green-600">$<HiddenNumber value={Math.round(mortgage.principal * 12 / periods)} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interest (cost of borrowing)</span>
              <span className="tabular-nums">$<HiddenNumber value={Math.round(mortgage.interest * 12 / periods)} /></span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional investments</p>
        <p className="text-xs text-muted-foreground -mt-1">Shares, index funds, savings accounts, extra mortgage payments, or any other regular wealth contribution.</p>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Amount">
            <CurrencyInput value={data.investmentAmountStr} onChange={(v) => onChange({ investmentAmountStr: v })} placeholder="200" />
          </FieldRow>
          <FieldRow label="Frequency">
            <SearchSelect value={data.investmentFrequency} onChange={(v) => onChange({ investmentFrequency: v })} options={INV_FREQ_OPTIONS} placeholder="Frequency" />
          </FieldRow>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="h-12 flex-1">← Back</Button>
        <Button onClick={onDone} size="lg" className="h-12 flex-1">Calculate</Button>
      </div>
    </div>
  );
}

// ─── calculations ─────────────────────────────────────────────────────────────

type BucketResult = {
  gross: number;
  hasPartner: boolean;
  annualPaye: number;
  annualAcc: number;
  annualTax: number;
  annualKiwi: number;
  annualMortgage: number;
  mortgagePrincipalAnnual: number;
  mortgageInterestAnnual: number;
  annualInvestments: number;
  annualWealth: number;
  annualNet: number;
  annualLiving: number;
  perPeriodTax: number;
  perPeriodWealth: number;
  perPeriodLiving: number;
  taxPct: number;
  wealthPct: number;
  livingPct: number;
  isLivingNegative: boolean;
  frequency: string;
};

function computePerson(p: PersonIncome): { paye: number; acc: number; kiwi: number; net: number } {
  const gross = parse(p.grossStr);
  if (!p.included || gross <= 0) return { paye: 0, acc: 0, kiwi: 0, net: 0 };
  if (p.employmentType === "paye") {
    const r = calculateIncome(gross, p.kiwiRate);
    return { paye: r.paye, acc: r.acc, kiwi: r.kiwiEmployee, net: r.net };
  }
  const tax = Math.round(gross * parse(p.taxPctStr) / 100);
  return { paye: tax, acc: 0, kiwi: 0, net: gross - tax };
}

function computeAll(income: IncomeForm, wealth: WealthForm): BucketResult | null {
  const youGross = parse(income.you.grossStr);
  if (youGross <= 0) return null;

  const periods = FREQ_PERIODS[income.frequency] ?? 26;

  const you = computePerson(income.you);
  const partner = computePerson(income.partner);

  const gross = youGross + (income.partner.included ? parse(income.partner.grossStr) : 0);
  const annualPaye = you.paye + partner.paye;
  const annualAcc = you.acc + partner.acc;
  const annualTax = annualPaye + annualAcc;
  const annualKiwi = you.kiwi + partner.kiwi;
  const annualNet = you.net + partner.net;

  const { monthly, principal, interest } = computeMortgageRepayment(
    parse(wealth.mortgageBalanceStr),
    parse(wealth.mortgageTermStr),
    parse(wealth.mortgageRateStr),
  );
  const annualMortgage = monthly * 12;

  const invPeriods = FREQ_PERIODS[wealth.investmentFrequency] ?? 12;
  const annualInvestments = parse(wealth.investmentAmountStr) * invPeriods;

  const annualWealth = annualKiwi + annualMortgage + annualInvestments;
  const annualLiving = annualNet - annualMortgage - annualInvestments;

  const pctOf = (n: number) => gross > 0 ? Math.round((n / gross) * 100) : 0;

  return {
    gross,
    hasPartner: income.partner.included && income.partner.confirmed,
    annualPaye, annualAcc, annualTax,
    annualKiwi, annualMortgage,
    mortgagePrincipalAnnual: principal * 12,
    mortgageInterestAnnual: interest * 12,
    annualInvestments, annualWealth,
    annualNet, annualLiving,
    perPeriodTax: annualTax / periods,
    perPeriodWealth: annualWealth / periods,
    perPeriodLiving: annualLiving / periods,
    taxPct: pctOf(annualTax),
    wealthPct: pctOf(annualWealth),
    livingPct: pctOf(annualLiving),
    isLivingNegative: annualLiving < 0,
    frequency: income.frequency,
  };
}

// ─── results ─────────────────────────────────────────────────────────────────

const bucketChartConfig = { amount: { label: "Annual" } } satisfies ChartConfig;

function Results({ result }: { result: BucketResult }) {
  const [surplusOpen, setSurplusOpen] = useState(false);
  const freqStr = freqLabel(result.frequency);
  const periods = FREQ_PERIODS[result.frequency] ?? 26;

  const chartData = [
    { name: "Tax", amount: Math.round(result.annualTax) },
    { name: "Wealth", amount: Math.round(result.annualWealth) },
    { name: "Living", amount: Math.round(Math.max(0, result.annualLiving)) },
  ];

  return (
    <div className="mt-6 grid gap-4">
      {/* Split bar */}
      <div className="grid gap-2">
        <div className="flex h-6 overflow-hidden rounded-xl">
          {result.taxPct > 0 && <div style={{ width: `${result.taxPct}%` }} className="bg-chart-3" />}
          {result.wealthPct > 0 && <div style={{ width: `${result.wealthPct}%` }} className="bg-chart-1" />}
          {result.livingPct > 0 && <div style={{ flex: 1 }} className="bg-chart-2" />}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-chart-3" />Tax {result.taxPct}%</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-chart-1" />Wealth {result.wealthPct}%</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-chart-2" />Living {result.livingPct}%</span>
        </div>
      </div>

      {result.isLivingNegative && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs text-muted-foreground">Wealth commitments exceed take-home income. Reduce mortgage or investment contributions, or increase income.</p>
        </div>
      )}

      {/* Tax bucket */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-chart-3" />
              <p className="text-sm font-semibold">Tax bucket</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{result.taxPct}% of gross</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Per {freqStr}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums">$<HiddenNumber value={Math.round(result.perPeriodTax)} /></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per year</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums">$<HiddenNumber value={Math.round(result.annualTax)} /></p>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/20 px-3 py-2 grid gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PAYE income tax{result.hasPartner && " (combined)"}</span>
              <span className="tabular-nums">$<HiddenNumber value={Math.round(result.annualPaye)} /></span>
            </div>
            {result.annualAcc > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ACC earners&apos; levy (1.67%)</span>
                <span className="tabular-nums">$<HiddenNumber value={Math.round(result.annualAcc)} /></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wealth bucket */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-chart-1" />
              <p className="text-sm font-semibold">Wealth bucket</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{result.wealthPct}% of gross</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Per {freqStr}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums">$<HiddenNumber value={Math.round(result.perPeriodWealth)} /></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per year</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums">$<HiddenNumber value={Math.round(result.annualWealth)} /></p>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/20 px-3 py-2 grid gap-1 text-xs">
            {result.annualKiwi > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">KiwiSaver{result.hasPartner && " (combined)"}</span>
                <span className="tabular-nums text-green-600">$<HiddenNumber value={Math.round(result.annualKiwi)} /></span>
              </div>
            )}
            {result.annualMortgage > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mortgage repayment</span>
                  <span className="tabular-nums">$<HiddenNumber value={Math.round(result.annualMortgage)} /></span>
                </div>
                <div className="flex justify-between pl-3">
                  <span className="text-muted-foreground">of which principal</span>
                  <span className="tabular-nums text-green-600">$<HiddenNumber value={Math.round(result.mortgagePrincipalAnnual)} /></span>
                </div>
                <div className="flex justify-between pl-3">
                  <span className="text-muted-foreground">of which interest</span>
                  <span className="tabular-nums">$<HiddenNumber value={Math.round(result.mortgageInterestAnnual)} /></span>
                </div>
              </>
            )}
            {result.annualInvestments > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Other investments</span>
                <span className="tabular-nums text-green-600">$<HiddenNumber value={Math.round(result.annualInvestments)} /></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Living bucket */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-chart-2" />
              <p className="text-sm font-semibold">Living expenses bucket</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{result.livingPct}% of gross</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Per {freqStr}</p>
              <p className={["mt-0.5 text-base font-semibold tabular-nums", result.isLivingNegative ? "text-destructive" : ""].join(" ")}>
                $<HiddenNumber value={Math.round(Math.abs(result.perPeriodLiving))} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per year</p>
              <p className={["mt-0.5 text-base font-semibold tabular-nums", result.isLivingNegative ? "text-destructive" : ""].join(" ")}>
                $<HiddenNumber value={Math.round(Math.abs(result.annualLiving))} />
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/20 px-3 py-2 grid gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Take-home{result.hasPartner && " (combined)"}</span>
              <span className="tabular-nums">$<HiddenNumber value={Math.round(result.annualNet)} /></span>
            </div>
            {result.annualMortgage > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Less mortgage repayment</span>
                <span className="tabular-nums">−$<HiddenNumber value={Math.round(result.annualMortgage)} /></span>
              </div>
            )}
            {result.annualInvestments > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Less other investments</span>
                <span className="tabular-nums">−$<HiddenNumber value={Math.round(result.annualInvestments)} /></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Annual allocation</CardTitle>
          <p className="text-xs text-muted-foreground">
            {result.hasPartner ? "Combined household gross" : "Gross"}: $<HiddenNumber value={Math.round(result.gross)} /> / year
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ChartContainer config={bucketChartConfig} className="h-44 w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `$${fmt(Number(v))}`} />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={BUCKET_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Surpluses & deficits */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="pb-0 pt-4">
          <button onClick={() => setSurplusOpen((o) => !o)} className="flex w-full items-center justify-between">
            <CardTitle className="text-sm font-semibold">Handling surpluses &amp; deficits</CardTitle>
            {surplusOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>
          {!surplusOpen && <p className="mt-1 text-xs text-muted-foreground">What to do when a bucket ends the month over or under.</p>}
        </CardHeader>
        {surplusOpen && (
          <CardContent className="pb-4 pt-3">
            <div className="grid gap-2">
              {SURPLUS_ROWS.map(({ bucket, action }) => (
                <div key={bucket} className="rounded-xl border bg-muted/20 px-3 py-2.5">
                  <p className="text-xs font-semibold">{bucket}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Buffer note */}
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
  const [income, setIncome] = useState<IncomeForm>(DEFAULT_INCOME);
  const [wealth, setWealth] = useState<WealthForm>(DEFAULT_WEALTH);

  useEffect(() => {
    loadThreeBuckets().then((saved) => {
      if (!saved) return;
      setIncome({
        you: {
          grossStr: saved.grossStr,
          kiwiRate: (saved.kiwiRate as KiwiRate) ?? 3.5,
          employmentType: (saved.employmentType as "paye" | "self_employed") ?? "paye",
          taxPctStr: saved.taxPctStr ?? "28",
          confirmed: true,
          included: true,
        },
        partner: {
          grossStr: saved.partnerGrossStr ?? "",
          kiwiRate: (saved.partnerKiwiRate as KiwiRate) ?? 3.5,
          employmentType: (saved.partnerEmploymentType as "paye" | "self_employed") ?? "paye",
          taxPctStr: saved.partnerTaxPctStr ?? "28",
          confirmed: saved.partnerConfirmed ?? false,
          included: saved.partnerIncluded ?? false,
        },
        frequency: saved.frequency,
      });
      setWealth({
        mortgageBalanceStr: saved.mortgageBalanceStr ?? "",
        mortgageTermStr: saved.mortgageTermStr ?? "",
        mortgageRateStr: saved.mortgageRateStr ?? "",
        investmentAmountStr: saved.investmentAmountStr ?? "",
        investmentFrequency: saved.investmentFrequency ?? "monthly",
      });
      setCompletedUpTo(saved.completedUpTo);
      if (saved.completedUpTo >= 1) setStep(2);
    });
  }, []);

  function persist(completed: number, i = income, w = wealth) {
    saveThreeBuckets({
      grossStr: i.you.grossStr,
      kiwiRate: i.you.kiwiRate,
      employmentType: i.you.employmentType,
      taxPctStr: i.you.taxPctStr,
      partnerIncluded: i.partner.included,
      partnerConfirmed: i.partner.confirmed,
      partnerGrossStr: i.partner.grossStr,
      partnerKiwiRate: i.partner.kiwiRate,
      partnerEmploymentType: i.partner.employmentType,
      partnerTaxPctStr: i.partner.taxPctStr,
      frequency: i.frequency,
      mortgageBalanceStr: w.mortgageBalanceStr,
      mortgageTermStr: w.mortgageTermStr,
      mortgageRateStr: w.mortgageRateStr,
      investmentAmountStr: w.investmentAmountStr,
      investmentFrequency: w.investmentFrequency,
      completedUpTo: completed,
    });
  }

  const kiwiAnnual = useMemo(() => {
    let kiwi = 0;
    const youGross = parse(income.you.grossStr);
    if (income.you.employmentType === "paye" && youGross > 0) {
      kiwi += calculateIncome(youGross, income.you.kiwiRate).kiwiEmployee;
    }
    const partnerGross = parse(income.partner.grossStr);
    if (income.partner.included && income.partner.confirmed && income.partner.employmentType === "paye" && partnerGross > 0) {
      kiwi += calculateIncome(partnerGross, income.partner.kiwiRate).kiwiEmployee;
    }
    return kiwi;
  }, [income]);

  const result = useMemo(() => {
    if (completedUpTo < 2) return null;
    return computeAll(income, wealth);
  }, [income, wealth, completedUpTo]);

  const youGross = parse(income.you.grossStr);
  const partnerGross = income.partner.confirmed ? parse(income.partner.grossStr) : 0;
  const incomeSummary =
    completedUpTo >= 1
      ? partnerGross > 0
        ? `$${fmt(youGross)} + $${fmt(partnerGross)} gross · ${income.frequency}`
        : `$${fmt(youGross)} gross · ${income.you.kiwiRate}% KiwiSaver · ${income.frequency}`
      : "";

  const wealthSummary =
    completedUpTo >= 2
      ? [
          parse(wealth.mortgageBalanceStr) > 0 && `mortgage $${fmt(parse(wealth.mortgageBalanceStr))}`,
          parse(wealth.investmentAmountStr) > 0 && `+$${fmt(parse(wealth.investmentAmountStr))} investments`,
        ].filter(Boolean).join(" · ") || "No commitments entered"
      : "";

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">
      <StepIndicator current={step} completed={completedUpTo} />

      <div className="mt-4 grid gap-3">
        {step === 1 ? (
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Household income</CardTitle>
            </CardHeader>
            <CardContent>
              <StepIncome
                data={income}
                onChange={(patch) => setIncome((p) => ({ ...p, ...patch }))}
                onNext={() => {
                  const next = Math.max(completedUpTo, 1);
                  setCompletedUpTo(next);
                  setStep(2);
                  persist(next);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          completedUpTo >= 1 && (
            <CompletedStep label="Household income" summary={incomeSummary} onEdit={() => setStep(1)} />
          )
        )}

        {step === 2 && completedUpTo >= 1 ? (
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Wealth commitments</CardTitle>
            </CardHeader>
            <CardContent>
              <StepWealth
                data={wealth}
                onChange={(patch) => setWealth((p) => ({ ...p, ...patch }))}
                onDone={() => {
                  const next = Math.max(completedUpTo, 2);
                  setCompletedUpTo(next);
                  persist(next);
                }}
                onBack={() => setStep(1)}
                kiwiAnnual={kiwiAnnual}
                frequency={income.frequency}
              />
            </CardContent>
          </Card>
        ) : (
          step > 2 && completedUpTo >= 2 && (
            <CompletedStep label="Wealth commitments" summary={wealthSummary} onEdit={() => setStep(2)} />
          )
        )}
      </div>

      {result && <Results result={result} />}
    </div>
  );
}
