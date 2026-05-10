"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

import {
  DASHBOARD_STORAGE_NAME,
  type OwnRentInputs,
  useDashboardStore,
} from "./dashboard-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type NumericInputProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
};

type YearlyReturn = {
  year: number;
  annualReturn: number;
};

type StageKey = "stage-1" | "stage-2" | "stage-3" | "stage-4" | "final";

type HouseReturnResult = {
  yearsHeld: number;
  purchaseLoan: number;
  principalPaidTotal: number;
  annualPrincipalPaid: number;
  weeklyPrincipalPaid: number;
  weeklyInterest: number;
  weeklyOwnershipCosts: number;
  stageOneEquivalentRent: number;
  stageTwoEquivalentRent: number;
  currentEquity: number;
  propertyGain: number;
  propertyGrowthRate: number;
  equityGainOnDeposit: number;
  estimatedInterest: number;
  renovationsTotal: number;
  ratesTotal: number;
  insuranceTotal: number;
  totalCosts: number;
  actualNetGain: number;
  actualAnnualReturn: number;
  yearlyReturns: YearlyReturn[];
};

type SharesAlternativeResult = {
  weeklyRentGap: number;
  annualRentGapContribution: number;
  portfolioValue: number;
  rentTotal: number;
  netPosition: number;
  gainAfterRent: number;
  annualReturn: number;
  houseAdvantage: number;
};

type FutureScenarioResult = {
  agentCost: number;
  saleProceedsToday: number;
  sellAndInvestPortfolio: number;
  futureRentTotal: number;
  sellRentNetPosition: number;
  holdHouseFutureValue: number;
  holdHouseEquity: number;
  holdAdvantage: number;
  houseDoubleYears: number | null;
};

const CURRENT_YEAR = new Date().getFullYear();

const currencyFormatter = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-NZ", {
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-NZ", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

type OwnVsRentCalculatorProps = {
  initialInputs: OwnRentInputs;
};

export function OwnVsRentCalculator({ initialInputs }: OwnVsRentCalculatorProps) {
  const storeInputs = useDashboardStore((state) => state.ownRent);
  const updateOwnRent = useDashboardStore((state) => state.updateOwnRent);
  const setOwnRentStageComplete = useDashboardStore(
    (state) => state.setOwnRentStageComplete,
  );
  const [isStoreReady, setIsStoreReady] = React.useState(false);
  const inputs = isStoreReady ? storeInputs : initialInputs;
  const resetOwnRent = React.useCallback(() => {
    useDashboardStore.setState({ ownRent: initialInputs });
  }, [initialInputs]);
  const rawResult = calculateHouseReturns(inputs, {
    includeHouse: true,
    includeActuals: true,
  });
  const rawSharesResult = calculateSharesAlternative(inputs, rawResult);
  const finalResult = calculateHouseReturns(inputs, {
    includeHouse: inputs.stageOneComplete,
    includeActuals: inputs.stageTwoComplete,
  });
  const finalSharesResult = calculateSharesAlternative(inputs, finalResult);
  const houseVsSharesLabel =
    finalSharesResult.houseAdvantage >= 0
      ? "House ahead vs shares"
      : "House behind vs shares";
  const houseVsSharesValue = formatCurrency(
    Math.abs(finalSharesResult.houseAdvantage),
  );
  const futureScenario = calculateFutureScenario(inputs);
  React.useEffect(() => {
    let isActive = true;
    const hasStoredDashboard =
      window.localStorage.getItem(DASHBOARD_STORAGE_NAME) !== null;

    void Promise.resolve(useDashboardStore.persist.rehydrate()).then(() => {
      if (!isActive) {
        return;
      }

      if (!hasStoredDashboard) {
        useDashboardStore.setState({ ownRent: initialInputs });
      }

      setIsStoreReady(true);
    });

    return () => {
      isActive = false;
    };
  }, [initialInputs]);
  const [openStages, setOpenStages] = React.useState<Record<StageKey, boolean>>({
    "stage-1": true,
    "stage-2": true,
    "stage-3": true,
    "stage-4": true,
    final: true,
  });
  const setStageOpen = (stage: StageKey, open: boolean) => {
    setOpenStages((current) => ({
      ...current,
      [stage]: open,
    }));
  };

  return (
    <div className="grid gap-4">
      <Card className="rounded-lg">
        <CardContent className="divide-y p-0">
          <StagePanel
            open={openStages["stage-1"]}
            enabled={inputs.stageOneComplete}
            label="Stage 1"
            title="House"
            meta={
              inputs.stageOneComplete
                ? `Included from ${formatSavedTime(inputs.stageOneSavedAt)}`
                : "Inputs stay editable; toggle includes them in final"
            }
            onOpenChange={(open) => setStageOpen("stage-1", open)}
            onEnabledChange={(enabled) => setOwnRentStageComplete(1, enabled)}
          >
                <div className="grid gap-5 sm:grid-cols-2">
                  <NumericInput
                    label="Bought price"
                    value={inputs.purchasePrice}
                    min={0}
                    step={10000}
                    prefix="$"
                    onChange={(value) => updateOwnRent("purchasePrice", value)}
                  />
                  <NumericInput
                    label="Bought year"
                    value={inputs.purchaseYear}
                    min={1980}
                    max={CURRENT_YEAR}
                    step={1}
                    onChange={(value) =>
                      updateOwnRent("purchaseYear", Math.round(value))
                    }
                  />
                  <NumericInput
                    label="Today's value"
                    value={inputs.currentValue}
                    min={0}
                    step={10000}
                    prefix="$"
                    onChange={(value) => updateOwnRent("currentValue", value)}
                  />
                  <NumericInput
                    label="Remaining loan"
                    value={inputs.remainingLoan}
                    min={0}
                    step={5000}
                    prefix="$"
                    onChange={(value) => updateOwnRent("remainingLoan", value)}
                  />
                  <NumericInput
                    label="Deposit"
                    value={inputs.deposit}
                    min={0}
                    step={5000}
                    prefix="$"
                    onChange={(value) => updateOwnRent("deposit", value)}
                  />
                </div>
                <StageInsight>
                  <p>
                    Stage 1 looks only at the house and loan. The equivalent
                    rent here is the principal paid down each week, before
                    interest and ownership costs.
                  </p>
                  <InsightMetrics>
                    <MiniStat
                      label="Equivalent rent"
                      value={`${formatCurrency(rawResult.stageOneEquivalentRent)} / wk`}
                    />
                    <MiniStat
                      label="Value gain"
                      value={formatCurrency(rawResult.propertyGain)}
                    />
                    <MiniStat
                      label="Yearly growth"
                      value={formatPercent(rawResult.propertyGrowthRate)}
                    />
                    <MiniStat
                      label="Current equity"
                      value={formatCurrency(rawResult.currentEquity)}
                    />
                  </InsightMetrics>
                </StageInsight>
          </StagePanel>

          <StagePanel
            open={openStages["stage-2"]}
            enabled={inputs.stageTwoComplete}
            label="Stage 2"
            title="House actuals"
            meta={
              inputs.stageTwoComplete
                ? `Included from ${formatSavedTime(inputs.stageTwoSavedAt)}`
                : "Inputs stay editable; toggle subtracts costs in final"
            }
            onOpenChange={(open) => setStageOpen("stage-2", open)}
            onEnabledChange={(enabled) => setOwnRentStageComplete(2, enabled)}
          >
                <div className="grid gap-5 sm:grid-cols-2">
                  <NumericInput
                    label="Interest rate (quarterly comp.)"
                    value={inputs.interestRate}
                    min={0}
                    max={12}
                    step={0.1}
                    suffix="%"
                    onChange={(value) => updateOwnRent("interestRate", value)}
                  />
                  <NumericInput
                    label="Renovations and fixes"
                    value={inputs.renovationsPerYear}
                    min={0}
                    step={500}
                    prefix="$"
                    suffix="/yr"
                    onChange={(value) => updateOwnRent("renovationsPerYear", value)}
                  />
                  <NumericInput
                    label="Rates"
                    value={inputs.ratesPerYear}
                    min={0}
                    step={100}
                    prefix="$"
                    suffix="/yr"
                    onChange={(value) => updateOwnRent("ratesPerYear", value)}
                  />
                  <NumericInput
                    label="Insurance"
                    value={inputs.insurancePerYear}
                    min={0}
                    step={100}
                    prefix="$"
                    suffix="/yr"
                    onChange={(value) => updateOwnRent("insurancePerYear", value)}
                  />
                </div>
                <StageInsight>
                  <p>
                    Stage 2 adds the real carrying costs of owning. The
                    equivalent rent becomes principal paid down plus interest,
                    rates, insurance, renovations, and fixes.
                  </p>
                  <p className="mt-2">
                    From an operations point of view, the unrecovered cost is
                    interest plus ownership costs:{" "}
                    <NumberText tone="cost">
                      {formatCurrency(
                        rawResult.weeklyInterest + rawResult.weeklyOwnershipCosts,
                      )}
                    </NumberText>{" "}
                    per week. That is the amount you could have spent on rent
                    without reducing your equity.
                  </p>
                  <InsightMetrics>
                    <MiniStat
                      label="Equivalent rent"
                      value={`${formatCurrency(rawResult.stageTwoEquivalentRent)} / wk`}
                    />
                    <MiniStat
                      label="Interest"
                      value={`${formatCurrency(rawResult.weeklyInterest)} / wk`}
                    />
                    <MiniStat
                      label="Interest + costs"
                      value={`${formatCurrency(
                        rawResult.weeklyInterest + rawResult.weeklyOwnershipCosts,
                      )} / wk`}
                    />
                    <MiniStat
                      label="Interest total"
                      value={formatCurrency(rawResult.estimatedInterest)}
                    />
                    <MiniStat
                      label="Fixes total"
                      value={formatCurrency(rawResult.renovationsTotal)}
                    />
                    <MiniStat
                      label="Rates total"
                      value={formatCurrency(rawResult.ratesTotal)}
                    />
                    <MiniStat
                      label="Insurance total"
                      value={formatCurrency(rawResult.insuranceTotal)}
                    />
                  </InsightMetrics>
                </StageInsight>
          </StagePanel>

          <StagePanel
            open={openStages["stage-3"]}
            enabled={inputs.stageThreeComplete}
            label="Stage 3"
            title="Shares and rent"
            meta={
              inputs.stageThreeComplete
                ? `Included from ${formatSavedTime(inputs.stageThreeSavedAt)}`
                : "Toggle to compare shares against house equity"
            }
            onOpenChange={(open) => setStageOpen("stage-3", open)}
            onEnabledChange={(enabled) => setOwnRentStageComplete(3, enabled)}
          >
            <StageInsight>
              <p>
                This stage asks: what if the deposit went into shares instead of
                the house, and you rented? It starts by investing the same{" "}
                <NumberText>{formatCurrency(inputs.deposit)}</NumberText> deposit.
              </p>
              <p className="mt-2">
                Then it compares your ownership-equivalent weekly cost{" "}
                <NumberText>
                  {formatCurrency(rawResult.stageTwoEquivalentRent)}
                </NumberText>{" "}
                with actual rent{" "}
                <NumberText tone="cost">{formatCurrency(inputs.weeklyRent)}</NumberText>
                . The gap is{" "}
                <NumberText value={rawSharesResult.weeklyRentGap}>
                  {formatCurrency(rawSharesResult.weeklyRentGap)}
                </NumberText>{" "}
                per week, which becomes{" "}
                <NumberText>{formatCurrency(rawSharesResult.annualRentGapContribution)}</NumberText>{" "}
                invested into shares across the year.
              </p>
              <InsightMetrics>
                <MiniStat
                  label="Rent gap invested yearly"
                  value={formatCurrency(rawSharesResult.annualRentGapContribution)}
                />
                <MiniStat
                  label="Weekly rent gap"
                  value={`${formatCurrency(rawSharesResult.weeklyRentGap)} / wk`}
                />
                <MiniStat
                  label="Shares value"
                  value={formatCurrency(rawSharesResult.portfolioValue)}
                />
                <MiniStat
                  label="Rent paid"
                  value={formatCurrency(rawSharesResult.rentTotal)}
                />
                <MiniStat
                  label="House equity"
                  value={formatCurrency(rawResult.currentEquity)}
                />
              </InsightMetrics>
            </StageInsight>
            <div className="grid gap-5 sm:grid-cols-2">
              <NumericInput
                label="S&P 500 avg (monthly comp.)"
                value={inputs.shareReturnRate}
                min={0}
                max={30}
                step={0.5}
                suffix="%"
                onChange={(value) => updateOwnRent("shareReturnRate", value)}
              />
              <NumericInput
                label="Weekly rent"
                value={inputs.weeklyRent}
                min={0}
                step={25}
                prefix="$"
                onChange={(value) => updateOwnRent("weeklyRent", value)}
              />
            </div>
          </StagePanel>

          <StagePanel
            open={openStages["stage-4"]}
            enabled={inputs.stageFourComplete}
            label="Stage 4"
            title="Future: sell or hold"
            meta={
              inputs.stageFourComplete
                ? `Included from ${formatSavedTime(inputs.stageFourSavedAt)}`
                : "Compare selling today and renting against holding the house"
            }
            onOpenChange={(open) => setStageOpen("stage-4", open)}
            onEnabledChange={(enabled) => setOwnRentStageComplete(4, enabled)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <NumericInput
                label="Agent cost"
                value={inputs.agentCostRate}
                min={0}
                max={8}
                step={0.1}
                suffix="%"
                onChange={(value) => updateOwnRent("agentCostRate", value)}
              />
              <NumericInput
                label="Years ahead"
                value={inputs.futureYears}
                min={1}
                max={40}
                step={1}
                suffix="yrs"
                onChange={(value) => updateOwnRent("futureYears", Math.round(value))}
              />
              <NumericInput
                label="Future S&P avg (monthly comp.)"
                value={inputs.futureShareReturnRate}
                min={0}
                max={20}
                step={0.5}
                suffix="%"
                onChange={(value) => updateOwnRent("futureShareReturnRate", value)}
              />
              <NumericInput
                label="Future rent"
                value={inputs.futureWeeklyRent}
                min={0}
                step={25}
                prefix="$"
                suffix="/wk"
                onChange={(value) => updateOwnRent("futureWeeklyRent", value)}
              />
              <NumericInput
                label="Rent increase (quarterly comp.)"
                value={inputs.futureRentIncreaseRate}
                min={0}
                max={10}
                step={0.25}
                suffix="%"
                onChange={(value) => updateOwnRent("futureRentIncreaseRate", value)}
              />
              <NumericInput
                label="House growth (quarterly comp.)"
                value={inputs.futureHouseGrowthRate}
                min={0}
                max={12}
                step={0.25}
                suffix="%/yr"
                onChange={(value) => updateOwnRent("futureHouseGrowthRate", value)}
              />
            </div>
            <StageInsight>
              <p>
                Stage 4 looks forward from today. It compares selling now,
                investing the remaining equity, and renting against holding the
                house for the selected future period. The house value is grown
                quarterly using the house growth rate.
              </p>
              <InsightMetrics>
                <MiniStat
                  label="Sell proceeds today"
                  value={formatCurrency(futureScenario.saleProceedsToday)}
                />
                <MiniStat
                  label="Shares after rent"
                  value={formatCurrency(futureScenario.sellRentNetPosition)}
                />
                <MiniStat
                  label="Hold house equity"
                  value={formatCurrency(futureScenario.holdHouseEquity)}
                />
                <MiniStat
                  label="House future value"
                  value={formatCurrency(futureScenario.holdHouseFutureValue)}
                />
                <MiniStat
                  label="Doubles in"
                  value={
                    futureScenario.houseDoubleYears
                      ? `${numberFormatter.format(futureScenario.houseDoubleYears)} yrs`
                      : "Never"
                  }
                />
                <MiniStat
                  label="Hold advantage"
                  value={formatCurrency(futureScenario.holdAdvantage)}
                />
              </InsightMetrics>
            </StageInsight>
          </StagePanel>

          <StagePanel
            open={openStages.final}
            label="Final"
            title="What this means"
            meta={
              inputs.stageOneComplete
                ? inputs.stageThreeComplete
                  ? inputs.stageFourComplete
                    ? "Current return plus future sell-or-hold scenario"
                    : "House return compared with shares and rent"
                  : inputs.stageTwoComplete
                    ? "House return after actuals"
                    : "House return before actual costs"
                : "Turn on Stage 1 to include the house"
            }
            onOpenChange={(open) => setStageOpen("final", open)}
          >
                {inputs.stageOneComplete ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FinalNumber
                        label="House annual return"
                        value={formatPercent(finalResult.actualAnnualReturn)}
                        positive={finalResult.actualAnnualReturn >= 0}
                        hint="Annualized return on your original deposit"
                      />
                      <FinalNumber
                        label="House net gain"
                        value={formatCurrency(finalResult.actualNetGain)}
                        positive={finalResult.actualNetGain >= 0}
                        hint="Current equity minus deposit and ownership costs"
                      />
                      <FinalNumber
                        label={
                          inputs.stageTwoComplete
                            ? "Ownership costs included"
                            : "Ownership costs ignored"
                        }
                        value={formatCurrency(finalResult.totalCosts)}
                        positive={false}
                        neutral
                        hint="Interest, rates, insurance, and renovations"
                      />
                      {inputs.stageThreeComplete ? (
                        <>
                          <FinalNumber
                            label="Shares net after rent"
                            value={formatCurrency(finalSharesResult.netPosition)}
                            positive={finalSharesResult.netPosition >= inputs.deposit}
                            hint="Share portfolio value minus total rent paid"
                          />
                          <FinalNumber
                            label={houseVsSharesLabel}
                            value={houseVsSharesValue}
                            positive={finalSharesResult.houseAdvantage >= 0}
                            hint="Difference between house net outcome and shares net outcome"
                          />
                          <FinalNumber
                            label="Shares annual (after rent)"
                            value={formatPercent(finalSharesResult.annualReturn)}
                            positive={finalSharesResult.annualReturn >= 0}
                            hint="Annualized return versus initial deposit"
                          />
                        </>
                      ) : null}
                      {inputs.stageFourComplete ? (
                        <>
                          <FinalNumber
                            label="Sell + rent"
                            value={formatCurrency(futureScenario.sellRentNetPosition)}
                            positive={futureScenario.sellRentNetPosition >= 0}
                          />
                          <FinalNumber
                            label="Hold equity"
                            value={formatCurrency(futureScenario.holdHouseEquity)}
                            positive={futureScenario.holdHouseEquity >= 0}
                          />
                          <FinalNumber
                            label="Hold vs sell"
                            value={formatCurrency(futureScenario.holdAdvantage)}
                            positive={futureScenario.holdAdvantage >= 0}
                          />
                        </>
                      ) : null}
                    </div>
                    <PlainEnglishSummary
                      inputs={inputs}
                      houseResult={finalResult}
                      sharesResult={
                        inputs.stageThreeComplete ? finalSharesResult : null
                      }
                      futureScenario={
                        inputs.stageFourComplete ? futureScenario : null
                      }
                    />
                    <YearlyStrip rows={finalResult.yearlyReturns} />
                  </>
                ) : (
                  <div className="rounded-lg border bg-secondary/40 p-4 text-sm text-muted-foreground">
                    Turn on Stage 1 to let the house figures affect the final return.
                  </div>
                )}
          </StagePanel>
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={resetOwnRent}
        className="w-full gap-2 sm:w-fit"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}

function StagePanel({
  open,
  enabled,
  label,
  title,
  meta,
  children,
  onOpenChange,
  onEnabledChange,
}: {
  open: boolean;
  enabled?: boolean;
  label: string;
  title: string;
  meta: string;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  onEnabledChange?: (enabled: boolean) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="px-4 sm:px-5">
      <div className="flex items-start gap-3 py-4">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-w-0 flex-1 justify-between rounded-lg px-3 py-3 text-left hover:bg-secondary/70"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <Badge variant={enabled ? "default" : "secondary"} className="w-fit">
                {enabled ? "Included" : label}
              </Badge>
              <span className="text-sm font-semibold">{title}</span>
              <span className="whitespace-normal text-xs text-muted-foreground">
                {meta}
              </span>
            </div>
            {open ? (
              <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            )}
          </Button>
        </CollapsibleTrigger>
        {onEnabledChange ? (
          <div className="flex shrink-0 flex-col items-end gap-1 pt-3">
            <Switch
              checked={enabled}
              onCheckedChange={onEnabledChange}
              aria-label={`${label} included in final`}
            />
            <span className="text-[11px] text-muted-foreground">Include</span>
          </div>
        ) : null}
      </div>
      <CollapsibleContent className="pb-5">
        <div>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NumericInput({
  label,
  value,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  onChange,
}: NumericInputProps) {
  const inputId = `house-return-${label.toLowerCase().replaceAll(" ", "-")}`;
  const sliderMax = max ?? Math.max(value * 2, min + step * 20);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId}>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {prefix}
          {numberFormatter.format(value)}
          {suffix}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {prefix ? <span className="text-sm text-muted-foreground">{prefix}</span> : null}
        <Input
          id={inputId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(sanitizeNumber(event.currentTarget.value, value))}
          className="h-10"
        />
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
      <Slider
        value={[clamp(value, min, sliderMax)]}
        min={min}
        max={sliderMax}
        step={step}
        onValueChange={([nextValue]) => onChange(nextValue ?? value)}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function StageInsight({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 space-y-4 rounded-lg border bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  );
}

function InsightMetrics({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

function FinalNumber({
  label,
  value,
  positive,
  hint,
  neutral = false,
}: {
  label: string;
  value: string;
  positive: boolean;
  hint?: string;
  neutral?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-secondary/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      <p
        className={`mt-2 text-2xl font-semibold tracking-normal ${
          neutral ? "" : positive ? "text-primary" : "text-destructive"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function YearlyStrip({ rows }: { rows: YearlyReturn[] }) {
  const recentRows = rows.slice(-6);

  return (
    <div className="mt-5 grid gap-2">
      <p className="text-xs text-muted-foreground">Recent yearly return</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {recentRows.map((row) => (
          <div key={row.year} className="flex justify-between rounded-lg border px-3 py-2">
            <span className="text-xs text-muted-foreground">{row.year}</span>
            <span
              className={`text-xs font-medium ${
                row.annualReturn >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {formatPercent(row.annualReturn)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlainEnglishSummary({
  inputs,
  houseResult,
  sharesResult,
  futureScenario,
}: {
  inputs: OwnRentInputs;
  houseResult: HouseReturnResult;
  sharesResult: SharesAlternativeResult | null;
  futureScenario: FutureScenarioResult | null;
}) {
  const houseNetPosition = inputs.deposit + houseResult.actualNetGain;
  const comparisonWinner =
    sharesResult && houseResult.actualNetGain >= sharesResult.gainAfterRent
      ? "house ownership"
      : "share investing while renting";

  return (
    <div className="mt-5 space-y-3 rounded-lg border bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
      <SummarySection title="1. Your house now">
        You started with a <NumberText>{formatCurrency(inputs.deposit)}</NumberText>{" "}
        deposit. The house is now worth{" "}
        <NumberText>{formatCurrency(inputs.currentValue)}</NumberText> and the
        remaining loan is{" "}
        <NumberText>{formatCurrency(inputs.remainingLoan)}</NumberText>, so your
        current equity is{" "}
        <NumberText>{formatCurrency(houseResult.currentEquity)}</NumberText>.
        That is{" "}
        <NumberText value={houseResult.equityGainOnDeposit}>
          {formatCurrency(houseResult.equityGainOnDeposit)}
        </NumberText>{" "}
        more than your original deposit.
      </SummarySection>

      <SummarySection title="2. Actual ownership costs">
        {houseResult.totalCosts > 0 ? (
          <>
            You then subtract{" "}
            <NumberText tone="cost">
              {formatCurrency(houseResult.totalCosts)}
            </NumberText>{" "}
            of costs:{" "}
            <NumberText tone="cost">
              {formatCurrency(houseResult.estimatedInterest)}
            </NumberText>{" "}
            interest,{" "}
            <NumberText tone="cost">
              {formatCurrency(houseResult.renovationsTotal)}
            </NumberText>{" "}
            renovations and fixes,{" "}
            <NumberText tone="cost">
              {formatCurrency(houseResult.ratesTotal)}
            </NumberText>{" "}
            rates, and{" "}
            <NumberText tone="cost">
              {formatCurrency(houseResult.insuranceTotal)}
            </NumberText>{" "}
            insurance. After that, the house result is{" "}
            <NumberText value={houseResult.actualNetGain}>
              {formatCurrency(houseResult.actualNetGain)}
            </NumberText>{" "}
            over <NumberText>{houseResult.yearsHeld}</NumberText> years, or{" "}
            <NumberText value={houseResult.actualAnnualReturn}>
              {formatPercent(houseResult.actualAnnualReturn)}
            </NumberText>{" "}
            per year.
          </>
        ) : (
          <>
            Ownership costs are off, so this is before interest, rates,
            insurance, renovations, and fixes.
          </>
        )}
      </SummarySection>

      <SummarySection title="3. Shares instead of owning">
        {sharesResult ? (
          <>
            House ownership leaves your net position at{" "}
            <NumberText value={houseNetPosition}>
              {formatCurrency(houseNetPosition)}
            </NumberText>
            : current equity of{" "}
            <NumberText>{formatCurrency(houseResult.currentEquity)}</NumberText>{" "}
            minus ownership costs of{" "}
            <NumberText tone="cost">{formatCurrency(houseResult.totalCosts)}</NumberText>
            . The share path starts with the same{" "}
            <NumberText>{formatCurrency(inputs.deposit)}</NumberText> deposit,
            then invests the weekly ownership-versus-rent gap of{" "}
            <NumberText value={sharesResult.weeklyRentGap}>
              {formatCurrency(sharesResult.weeklyRentGap)}
            </NumberText>{" "}
            into shares while paying rent. At{" "}
            <NumberText value={inputs.shareReturnRate}>
              {formatPercent(inputs.shareReturnRate / 100)}
            </NumberText>
            , compounded monthly with monthly contributions, the share portfolio
            grows to{" "}
            <NumberText value={sharesResult.portfolioValue - inputs.deposit}>
              {formatCurrency(sharesResult.portfolioValue)}
            </NumberText>
            . After paying rent of{" "}
            <NumberText tone="cost">{formatCurrency(sharesResult.rentTotal)}</NumberText>
            , the share path leaves your net position at{" "}
            <NumberText value={sharesResult.netPosition - inputs.deposit}>
              {formatCurrency(sharesResult.netPosition)}
            </NumberText>
            . For this scenario, {comparisonWinner} is better by{" "}
            <NumberText value={Math.abs(sharesResult.houseAdvantage)}>
              {formatCurrency(Math.abs(sharesResult.houseAdvantage))}
            </NumberText>
            .
          </>
        ) : (
          <>
            Turn on Stage 3 to compare the house against investing the deposit
            and weekly rent gap into shares while renting.
          </>
        )}
      </SummarySection>

      {futureScenario ? (
        <SummarySection title="4. If you sell today and rent">
          If you sold today, agent cost at{" "}
          <NumberText tone="cost">{formatPercent(inputs.agentCostRate / 100)}</NumberText>{" "}
          would be{" "}
          <NumberText tone="cost">{formatCurrency(futureScenario.agentCost)}</NumberText>
          , leaving{" "}
          <NumberText>{formatCurrency(futureScenario.saleProceedsToday)}</NumberText>{" "}
          after clearing the loan. If that was invested for{" "}
          <NumberText>{inputs.futureYears}</NumberText> years at{" "}
          <NumberText value={inputs.futureShareReturnRate}>
            {formatPercent(inputs.futureShareReturnRate / 100)}
          </NumberText>{" "}
          compounded monthly and you rented from{" "}
          <NumberText tone="cost">{formatCurrency(inputs.futureWeeklyRent)}</NumberText>{" "}
          per week with{" "}
          <NumberText tone="cost">
            {formatPercent(inputs.futureRentIncreaseRate / 100)}
          </NumberText>{" "}
          rent increases compounded quarterly, the shares-after-rent position is{" "}
          <NumberText value={futureScenario.sellRentNetPosition}>
            {formatCurrency(futureScenario.sellRentNetPosition)}
          </NumberText>
          . If you hold and the house grows at{" "}
          <NumberText value={inputs.futureHouseGrowthRate}>
            {formatPercent(inputs.futureHouseGrowthRate / 100)}
          </NumberText>{" "}
          per year compounded quarterly, it becomes{" "}
          <NumberText value={futureScenario.holdHouseFutureValue - inputs.currentValue}>
            {formatCurrency(futureScenario.holdHouseFutureValue)}
          </NumberText>
          {futureScenario.houseDoubleYears
            ? `, and that growth rate doubles value in about ${numberFormatter.format(
                futureScenario.houseDoubleYears,
              )} years`
            : ", and at that growth rate it does not double"}
          . Estimated equity is{" "}
          <NumberText value={futureScenario.holdHouseEquity}>
            {formatCurrency(futureScenario.holdHouseEquity)}
          </NumberText>
          . Holding is{" "}
          <NumberText value={futureScenario.holdAdvantage}>
            {formatCurrency(futureScenario.holdAdvantage)}
          </NumberText>{" "}
          {futureScenario.holdAdvantage >= 0 ? "ahead" : "behind"}.
        </SummarySection>
      ) : null}
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold text-foreground">{title}</h3>
      <p>{children}</p>
    </section>
  );
}

function NumberText({
  children,
  value,
  tone = "neutral",
}: {
  children: React.ReactNode;
  value?: number;
  tone?: "neutral" | "cost";
}) {
  const toneClass =
    tone === "cost"
      ? "text-destructive"
      : value === undefined
        ? "text-foreground"
        : value >= 0
          ? "text-primary"
          : "text-destructive";

  return <strong className={`font-semibold ${toneClass}`}>{children}</strong>;
}

function calculateHouseReturns(
  inputs: OwnRentInputs,
  options: { includeHouse: boolean; includeActuals: boolean },
): HouseReturnResult {
  const yearsHeld = Math.max(CURRENT_YEAR - inputs.purchaseYear, 1);
  const purchaseLoan = Math.max(inputs.purchasePrice - inputs.deposit, 0);
  const principalPaidTotal = Math.max(purchaseLoan - inputs.remainingLoan, 0);
  const annualPrincipalPaid = principalPaidTotal / yearsHeld;
  const weeklyPrincipalPaid = annualPrincipalPaid / 52;
  const currentEquity = Math.max(inputs.currentValue - inputs.remainingLoan, 0);
  const propertyGain = inputs.currentValue - inputs.purchasePrice;
  const propertyGrowthRate = cagr(inputs.currentValue, inputs.purchasePrice, yearsHeld);
  const equityGainOnDeposit = options.includeHouse ? currentEquity - inputs.deposit : 0;
  const averageLoan = (purchaseLoan + inputs.remainingLoan) / 2;
  const estimatedInterest = options.includeActuals
    ? averageLoan * (compoundedGrowthFactor(inputs.interestRate, yearsHeld) - 1)
    : 0;
  const renovationsTotal = options.includeActuals ? inputs.renovationsPerYear * yearsHeld : 0;
  const ratesTotal = options.includeActuals ? inputs.ratesPerYear * yearsHeld : 0;
  const insuranceTotal = options.includeActuals ? inputs.insurancePerYear * yearsHeld : 0;
  const totalCosts = estimatedInterest + renovationsTotal + ratesTotal + insuranceTotal;
  const weeklyInterest = estimatedInterest / yearsHeld / 52;
  const weeklyOwnershipCosts =
    (renovationsTotal + ratesTotal + insuranceTotal) / yearsHeld / 52;
  const stageOneEquivalentRent = weeklyPrincipalPaid;
  const stageTwoEquivalentRent =
    weeklyPrincipalPaid + weeklyInterest + weeklyOwnershipCosts;
  const actualNetGain = equityGainOnDeposit - totalCosts;
  const actualAnnualReturn =
    inputs.deposit > 0 && options.includeHouse
      ? cagr(inputs.deposit + actualNetGain, inputs.deposit, yearsHeld)
      : 0;

  return {
    yearsHeld,
    purchaseLoan,
    principalPaidTotal,
    annualPrincipalPaid,
    weeklyPrincipalPaid,
    weeklyInterest,
    weeklyOwnershipCosts,
    stageOneEquivalentRent,
    stageTwoEquivalentRent,
    currentEquity,
    propertyGain,
    propertyGrowthRate,
    equityGainOnDeposit,
    estimatedInterest,
    renovationsTotal,
    ratesTotal,
    insuranceTotal,
    totalCosts,
    actualNetGain,
    actualAnnualReturn,
    yearlyReturns: calculateYearlyReturns(inputs, yearsHeld, purchaseLoan, options),
  };
}

function calculateSharesAlternative(
  inputs: OwnRentInputs,
  houseResult: HouseReturnResult,
): SharesAlternativeResult {
  const weeklyRentGap = Math.max(houseResult.stageTwoEquivalentRent - inputs.weeklyRent, 0);
  const annualRentGapContribution = weeklyRentGap * 52;
  const portfolioValue = futureValueWithAnnualContributions(
    inputs.deposit,
    annualRentGapContribution,
    inputs.shareReturnRate,
    houseResult.yearsHeld,
  );
  const rentTotal = inputs.weeklyRent * 52 * houseResult.yearsHeld;
  const netPosition = portfolioValue - rentTotal;
  const gainAfterRent = netPosition - inputs.deposit;
  const annualReturn =
    inputs.deposit > 0
      ? cagr(netPosition, inputs.deposit, houseResult.yearsHeld)
      : 0;
  const houseFinalPosition = inputs.deposit + houseResult.actualNetGain;

  return {
    weeklyRentGap,
    annualRentGapContribution,
    portfolioValue,
    rentTotal,
    netPosition,
    gainAfterRent,
    annualReturn,
    houseAdvantage: houseFinalPosition - netPosition,
  };
}

function calculateFutureScenario(inputs: OwnRentInputs): FutureScenarioResult {
  const agentCost = inputs.currentValue * (inputs.agentCostRate / 100);
  const saleProceedsToday = Math.max(
    inputs.currentValue - agentCost - inputs.remainingLoan,
    0,
  );
  const sellAndInvestPortfolio = futureValueWithAnnualContributions(
    saleProceedsToday,
    0,
    inputs.futureShareReturnRate,
    inputs.futureYears,
  );
  const futureRentTotal = calculateGrowingAnnualCost(
    inputs.futureWeeklyRent * 52,
    inputs.futureRentIncreaseRate,
    inputs.futureYears,
  );
  const sellRentNetPosition = sellAndInvestPortfolio - futureRentTotal;
  const holdHouseFutureValue =
    inputs.currentValue *
    compoundedGrowthFactor(inputs.futureHouseGrowthRate, inputs.futureYears);
  const holdHouseEquity = holdHouseFutureValue - inputs.remainingLoan;
  const houseDoubleYears = yearsToDouble(inputs.futureHouseGrowthRate);

  return {
    agentCost,
    saleProceedsToday,
    sellAndInvestPortfolio,
    futureRentTotal,
    sellRentNetPosition,
    holdHouseFutureValue,
    holdHouseEquity,
    holdAdvantage: holdHouseEquity - sellRentNetPosition,
    houseDoubleYears,
  };
}

function yearsToDouble(annualGrowthRate: number): number | null {
  if (annualGrowthRate <= 0) {
    return null;
  }

  return Math.log(2) / (4 * Math.log(1 + annualGrowthRate / 100 / 4));
}

function futureValueWithAnnualContributions(
  initialValue: number,
  annualContribution: number,
  annualReturn: number,
  years: number,
): number {
  const monthlyContribution = annualContribution / 12;
  const monthlyReturn = annualReturn / 100 / 12;
  let value = initialValue;

  for (let month = 0; month < years * 12; month += 1) {
    value = value * (1 + monthlyReturn) + monthlyContribution;
  }

  return value;
}

function calculateGrowingAnnualCost(
  startingAnnualCost: number,
  annualIncrease: number,
  years: number,
): number {
  const startingQuarterlyCost = startingAnnualCost / 4;

  return Array.from({ length: years * 4 }).reduce<number>((total, _, quarterIndex) => {
    return (
      total +
      startingQuarterlyCost * compoundedGrowthFactor(annualIncrease, quarterIndex / 4)
    );
  }, 0);
}

function compoundedGrowthFactor(annualRate: number, years: number): number {
  return (1 + annualRate / 100 / 4) ** (years * 4);
}

function calculateYearlyReturns(
  inputs: OwnRentInputs,
  yearsHeld: number,
  purchaseLoan: number,
  options: { includeHouse: boolean; includeActuals: boolean },
): YearlyReturn[] {
  return Array.from({ length: yearsHeld }, (_, index) => {
    const elapsedYears = index + 1;
    const progress = elapsedYears / yearsHeld;
    const value =
      inputs.purchasePrice + (inputs.currentValue - inputs.purchasePrice) * progress;
    const loan = purchaseLoan + (inputs.remainingLoan - purchaseLoan) * progress;
    const equity = Math.max(value - loan, 0);
    const averageLoanAtYear = (purchaseLoan + loan) / 2;
    const cumulativeCosts = options.includeActuals
      ? averageLoanAtYear *
          (compoundedGrowthFactor(inputs.interestRate, elapsedYears) - 1) +
        (inputs.renovationsPerYear + inputs.ratesPerYear + inputs.insurancePerYear) *
          elapsedYears
      : 0;
    const netGain = options.includeHouse ? equity - inputs.deposit - cumulativeCosts : 0;

    return {
      year: inputs.purchaseYear + elapsedYears,
      annualReturn: cagr(inputs.deposit + netGain, inputs.deposit, elapsedYears),
    };
  });
}

function cagr(finalValue: number, initialValue: number, years: number): number {
  if (initialValue <= 0 || years <= 0) {
    return 0;
  }

  if (finalValue <= 0) {
    return -1;
  }

  return (finalValue / initialValue) ** (1 / years) - 1;
}

function sanitizeNumber(value: string, fallback: number): number {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(Math.round(value));
}

function formatPercent(value: number): string {
  return `${percentFormatter.format(value * 100)}%`;
}

function formatSavedTime(value: string | null): string {
  if (!value) {
    return "now";
  }

  return new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
