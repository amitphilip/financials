"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Info, Pencil, Users } from "lucide-react";

import {
  KIWI_RATES,
  type KiwiRate,
  type IncomeResult,
  calculateIncome,
  TAX_BRACKET_DISPLAY,
} from "./calculations";
import { HiddenNumber } from "@/components/ui/hidden-number";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// ─── sub-components ───────────────────────────────────────────────────────────

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
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
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

function RateSelector({
  value,
  onChange,
}: {
  value: KiwiRate;
  onChange: (r: KiwiRate) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {KIWI_RATES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={[
            "h-10 min-w-14 rounded-lg border px-3 text-sm font-medium transition-colors",
            value === r
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
          ].join(" ")}
        >
          {r}%
        </button>
      ))}
    </div>
  );
}

function DeductionRow({
  label,
  amount,
  sub,
  info,
}: {
  label: string;
  amount: number;
  sub?: string;
  info?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>{label}</span>
        {sub && <span className="text-xs">({sub})</span>}
        {info && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3 cursor-help opacity-50" />
              </TooltipTrigger>
              <TooltipContent className="max-w-50 text-xs">{info}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="tabular-nums text-foreground">
        −<span>$</span>
        <HiddenNumber value={amount}/>
      </span>
    </div>
  );
}

function TakeHomeGrid({ result }: { result: IncomeResult }) {
  const rows: { label: string; value: number }[] = [
    { label: "Weekly", value: result.weekly },
    { label: "Fortnightly", value: result.fortnightly },
    { label: "Monthly", value: result.monthly },
    { label: "Yearly", value: result.net },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
            <span className="text-muted-foreground text-sm">$</span>
            <HiddenNumber value={value}/>
          </p>
        </div>
      ))}
    </div>
  );
}

function ResultCard({
  label,
  result,
  kiwiRate,
}: {
  label: string;
  result: IncomeResult;
  kiwiRate: KiwiRate;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{label}</CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {result.effectiveTaxRate}% effective tax
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Gross <span className="text-foreground font-medium">$<HiddenNumber value={result.gross}/></span> / year
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <TakeHomeGrid result={result} />

        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Deductions breakdown</span>
          {showBreakdown ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {showBreakdown && (
          <div className="rounded-xl border bg-muted/20 px-3 py-1 divide-y">
            <DeductionRow label="PAYE income tax" amount={result.paye} />
            <DeductionRow
              label="ACC earners' levy"
              amount={result.acc}
              sub="1.67%"
              info="ACC earners' levy 2025–2026. Capped at $142,283 of income."
            />
            <DeductionRow
              label="KiwiSaver"
              amount={result.kiwiEmployee}
              sub={`${kiwiRate}% employee`}
            />
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">
                Employer KiwiSaver{" "}
                <span className="text-xs">(3% — not deducted)</span>
              </span>
              <span className="tabular-nums text-green-600">
                +<span>$</span>
                <HiddenNumber value={result.kiwiEmployer}/>
              </span>
            </div>
            <div className="flex items-center justify-between py-2 text-sm font-medium">
              <span>Take-home</span>
              <span className="tabular-nums">
                <span>$</span>
                <HiddenNumber value={result.net}/>
                <span className="text-xs text-muted-foreground font-normal"> /yr</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── person input step ────────────────────────────────────────────────────────

type PersonState = {
  salary: string;
  kiwiRate: KiwiRate;
  confirmed: boolean;
  include: boolean;
};

const DEFAULT_PERSON: PersonState = {
  salary: "",
  kiwiRate: 3,
  confirmed: false,
  include: true,
};

const PersonForm = memo(function PersonForm({
  label,
  state,
  onChange,
  onConfirm,
  onEdit,
  onSkip,
  showSkip,
}: {
  label: string;
  state: PersonState;
  onChange: (patch: Partial<PersonState>) => void;
  onConfirm: () => void;
  onEdit: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}) {
  const salary = parse(state.salary);
  const canConfirm = salary > 0;

  if (state.confirmed) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium tabular-nums">
            <span>$</span>
            <HiddenNumber value={salary}/>
            <span className="text-muted-foreground font-normal"> · KiwiSaver {state.kiwiRate}%</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="size-4" />
        </button>
      </div>
    );
  }

  if (!state.include) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
        <p className="text-xs text-muted-foreground">{label} — skipped</p>
        <button
          type="button"
          onClick={() => onChange({ include: true })}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Add
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-background p-4 space-y-4">
      <p className="text-sm font-medium">{label}</p>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Annual gross salary</Label>
        <CurrencyInput
          value={state.salary}
          onChange={(v) => onChange({ salary: v })}
          placeholder="80000"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          KiwiSaver contribution <span className="text-muted-foreground/60">(IRD min 3%)</span>
        </Label>
        <RateSelector
          value={state.kiwiRate}
          onChange={(r) => onChange({ kiwiRate: r })}
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onConfirm}
          disabled={!canConfirm}
          className="h-11 flex-1"
        >
          <Check className="size-4" />
          Confirm
        </Button>
        {showSkip && onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="h-11 text-muted-foreground"
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  );
});

// ─── tax bracket table ────────────────────────────────────────────────────────

function TaxBracketTable() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>NZ tax brackets 2025–2026</span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <div className="border-t px-4 pb-3">
          <div className="divide-y">
            {TAX_BRACKET_DISPLAY.map(({ label, rate }) => (
              <div key={label} className="flex justify-between py-2 text-xs">
                <span className="text-muted-foreground tabular-nums">{label}</span>
                <span className="font-medium tabular-nums">{rate}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Plus ACC earners' levy 1.67% (capped at $142,283).
            KiwiSaver deducted before take-home; employer adds 3% on top.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── combined household card ──────────────────────────────────────────────────

function HouseholdCard({ results }: { results: IncomeResult[] }) {
  const combined = useMemo(() => {
    const net = results.reduce((s, r) => s + r.net, 0);
    return {
      net,
      weekly: Math.round(net / 52),
      fortnightly: Math.round(net / 26),
      monthly: Math.round(net / 12),
    };
  }, [results]);

  const rows: { label: string; value: number }[] = [
    { label: "Weekly", value: combined.weekly },
    { label: "Fortnightly", value: combined.fortnightly },
    { label: "Monthly", value: combined.monthly },
    { label: "Yearly", value: combined.net },
  ];

  return (
    <Card className="rounded-2xl shadow-md border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Combined household</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
                <span className="text-muted-foreground text-sm">$</span>
                <HiddenNumber value={value}/>
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function IncomeCalculator() {
  const [you, setYou] = useState<PersonState>(DEFAULT_PERSON);
  const [partner, setPartner] = useState<PersonState>({ ...DEFAULT_PERSON, include: false });

  const patchYou = useCallback((patch: Partial<PersonState>) => {
    setYou((p) => ({ ...p, ...patch }));
  }, []);

  const patchPartner = useCallback((patch: Partial<PersonState>) => {
    setPartner((p) => ({ ...p, ...patch }));
  }, []);

  const youResult = useMemo(
    () => you.confirmed ? calculateIncome(parse(you.salary), you.kiwiRate) : null,
    [you.confirmed, you.salary, you.kiwiRate]
  );

  const partnerResult = useMemo(
    () => partner.confirmed ? calculateIncome(parse(partner.salary), partner.kiwiRate) : null,
    [partner.confirmed, partner.salary, partner.kiwiRate]
  );

  const allResults = useMemo(
    () => [youResult, partnerResult].filter(Boolean) as IncomeResult[],
    [youResult, partnerResult]
  );

  const showPartnerStep = you.confirmed;

  return (
    <div className="space-y-4">
      <TaxBracketTable />

      <PersonForm
        label="Your income"
        state={you}
        onChange={patchYou}
        onConfirm={() => patchYou({ confirmed: true })}
        onEdit={() => patchYou({ confirmed: false })}
      />

      {showPartnerStep && (
        <PersonForm
          label="Partner's income"
          state={partner}
          onChange={patchPartner}
          onConfirm={() => patchPartner({ confirmed: true })}
          onEdit={() => patchPartner({ confirmed: false })}
          onSkip={() => patchPartner({ include: false, confirmed: false })}
          showSkip={partner.include && !partner.confirmed}
        />
      )}

      {youResult && (
        <ResultCard
          label="Your take-home"
          result={youResult}
          kiwiRate={you.kiwiRate}
        />
      )}

      {partnerResult && (
        <ResultCard
          label="Partner's take-home"
          result={partnerResult}
          kiwiRate={partner.kiwiRate}
        />
      )}

      {allResults.length === 2 && (
        <HouseholdCard results={allResults} />
      )}
    </div>
  );
}
