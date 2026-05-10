"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GrowthRow = {
  year: number;
  startingAmount: number;
  contributions: number;
  interestEarned: number;
  endingAmount: number;
};

type PaymentFrequency = "monthly" | "fortnightly" | "yearly";

const paymentFrequencies: Array<{
  label: string;
  value: PaymentFrequency;
}> = [
  {
    label: "Monthly",
    value: "monthly",
  },
  {
    label: "Fortnightly",
    value: "fortnightly",
  },
  {
    label: "Yearly",
    value: "yearly",
  },
];

const daysPerYear = 365;
const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const monthStartDays = daysPerMonth.reduce<number[]>((starts, days) => {
  starts.push((starts.at(-1) ?? 0) + days);

  return starts;
}, [0]);
const monthEndDays = monthStartDays.slice(1);

const currencyFormatter = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-NZ", {
  maximumFractionDigits: 2,
});

const chartConfig = {
  endingAmount: {
    label: "Balance",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function CompoundGrowthCalculator() {
  const [startingAmount, setStartingAmount] = React.useState(100000);
  const [interestRate, setInterestRate] = React.useState(7);
  const [paymentAmount, setPaymentAmount] = React.useState(500);
  const [paymentFrequency, setPaymentFrequency] =
    React.useState<PaymentFrequency>("monthly");
  const [years, setYears] = React.useState(30);
  const rows = React.useMemo(
    () =>
      calculateGrowthRows(
        startingAmount,
        interestRate,
        paymentAmount,
        paymentFrequency,
        years,
      ),
    [startingAmount, interestRate, paymentAmount, paymentFrequency, years],
  );
  const finalBalance = rows.at(-1)?.endingAmount ?? startingAmount;
  const totalContributions = rows.reduce((total, row) => total + row.contributions, 0);
  const totalInterest = finalBalance - startingAmount - totalContributions;
  const chartRows = [
    {
      year: 0,
      endingAmount: startingAmount,
    },
    ...rows.map((row) => ({
      year: row.year,
      endingAmount: row.endingAmount,
    })),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Compound growth</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <GrowthInput
            label="Starting amount"
            value={startingAmount}
            min={0}
            step={1000}
            prefix="$"
            onChange={setStartingAmount}
          />
          <GrowthInput
            label="Interest rate (daily calc, monthly paid)"
            value={interestRate}
            min={0}
            max={30}
            step={0.25}
            suffix="%"
            onChange={setInterestRate}
          />
          <GrowthInput
            label="Payment amount"
            value={paymentAmount}
            min={0}
            step={100}
            prefix="$"
            onChange={setPaymentAmount}
          />
          <PaymentFrequencySelect
            value={paymentFrequency}
            onChange={setPaymentFrequency}
          />
          <GrowthInput
            label="Years"
            value={years}
            min={1}
            max={50}
            step={1}
            onChange={(value) => setYears(Math.round(value))}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Final balance" value={formatCurrency(finalBalance)} />
            <SummaryMetric
              label="Contributions"
              value={formatCurrency(totalContributions)}
            />
            <SummaryMetric
              label="Interest earned"
              value={formatCurrency(totalInterest)}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Interest is calculated daily on the running balance and credited
            monthly, matching common savings-account treatment.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Growth chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-64 w-full">
              <AreaChart data={chartRows} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  label={{ value: "Year", position: "insideBottom", offset: -4 }}
                />
                <YAxis
                  width={72}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => compactCurrency(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `Year ${label}`}
                      formatter={(value) =>
                        typeof value === "number"
                          ? formatCurrency(value)
                          : String(value)
                      }
                    />
                  }
                />
                <Area
                  dataKey="endingAmount"
                  type="monotone"
                  fill="var(--color-endingAmount)"
                  fillOpacity={0.18}
                  stroke="var(--color-endingAmount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Yearly table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Starting</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Ending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.startingAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.contributions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.interestEarned)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.endingAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PaymentFrequencySelect({
  value,
  onChange,
}: {
  value: PaymentFrequency;
  onChange: (value: PaymentFrequency) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="compound-growth-payment-frequency">Payment frequency</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as PaymentFrequency)}>
        <SelectTrigger id="compound-growth-payment-frequency" className="h-10 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentFrequencies.map((frequency) => (
            <SelectItem key={frequency.value} value={frequency.value}>
              {frequency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GrowthInput({
  label,
  value,
  min,
  max,
  step,
  prefix,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const inputId = `compound-growth-${label.toLowerCase().replaceAll(" ", "-")}`;
  const sliderMax = max ?? Math.max(value * 2, min + step * 50);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId}>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {prefix}
          {suffix === "%"
            ? percentFormatter.format(value)
            : value.toLocaleString("en-NZ")}
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
          onChange={(event) =>
            onChange(
              clamp(
                sanitizeNumber(event.currentTarget.value, value),
                min,
                max ?? Number.MAX_SAFE_INTEGER,
              ),
            )
          }
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-secondary/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function calculateGrowthRows(
  startingAmount: number,
  interestRate: number,
  paymentAmount: number,
  paymentFrequency: PaymentFrequency,
  years: number,
): GrowthRow[] {
  const dailyRate = interestRate / 100 / daysPerYear;
  let currentAmount = startingAmount;
  let accruedMonthlyInterest = 0;

  return Array.from({ length: years }, (_, index) => {
    const startingYearAmount = currentAmount;
    let yearlyContributions = 0;
    let yearlyInterest = 0;

    for (let dayOfYear = 0; dayOfYear < daysPerYear; dayOfYear += 1) {
      if (isPaymentDay(paymentFrequency, index, dayOfYear)) {
        currentAmount += paymentAmount;
        yearlyContributions += paymentAmount;
      }

      const dailyInterest = currentAmount * dailyRate;
      accruedMonthlyInterest += dailyInterest;
      yearlyInterest += dailyInterest;

      if (monthEndDays.includes(dayOfYear + 1)) {
        currentAmount += accruedMonthlyInterest;
        accruedMonthlyInterest = 0;
      }
    }

    const row = {
      year: index + 1,
      startingAmount: startingYearAmount,
      contributions: yearlyContributions,
      interestEarned: yearlyInterest,
      endingAmount: currentAmount,
    };

    return row;
  });
}

function isPaymentDay(
  frequency: PaymentFrequency,
  yearIndex: number,
  dayOfYear: number,
) {
  if (frequency === "monthly") {
    return monthStartDays.includes(dayOfYear);
  }

  if (frequency === "fortnightly") {
    return (yearIndex * daysPerYear + dayOfYear) % 14 === 0;
  }

  return dayOfYear === 0;
}

function sanitizeNumber(rawValue: string, fallback: number) {
  const parsed = Number(rawValue);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function compactCurrency(value: number) {
  if (Math.abs(value) >= 1000000) {
    return `$${Math.round(value / 1000000)}m`;
  }

  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }

  return formatCurrency(value);
}
