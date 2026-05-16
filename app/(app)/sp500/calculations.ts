export type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly" | "none";

export type InvestmentData = {
  initialDeposit: number;
  startYear: number;
  endYear: number;
  annualRate: number;
};

export type ContributionData = {
  amount: number;
  frequency: Frequency;
};

export type YearlySnapshot = {
  year: number;
  portfolioValue: number;
  totalInvested: number;
  growth: number;
  yoyGain: number;
};

export type CalculationResult = {
  finalValue: number;
  totalInvested: number;
  totalGrowth: number;
  growthPct: number;
  cagrPct: number;
  yearlyData: YearlySnapshot[];
};

function frequencyToMonthly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case "weekly":      return (amount * 52) / 12;
    case "fortnightly": return (amount * 26) / 12;
    case "monthly":     return amount;
    case "quarterly":   return amount / 3;
    case "yearly":      return amount / 12;
    case "none":        return 0;
  }
}

export function calculate(
  investment: InvestmentData,
  contribution: ContributionData
): CalculationResult {
  const years = Math.max(0, investment.endYear - investment.startYear);
  const r = investment.annualRate / 100 / 12; // monthly rate
  const pmt = frequencyToMonthly(contribution.amount, contribution.frequency);

  const yearlyData: YearlySnapshot[] = [];

  yearlyData.push({
    year: investment.startYear,
    portfolioValue: Math.round(investment.initialDeposit),
    totalInvested: Math.round(investment.initialDeposit),
    growth: 0,
    yoyGain: 0,
  });

  for (let y = 1; y <= years; y++) {
    const prev = yearlyData[y - 1];
    const annualContrib = pmt * 12;

    let newValue: number;
    if (r === 0) {
      newValue = prev.portfolioValue + annualContrib;
    } else {
      // FV of current portfolio + FV of monthly contributions this year (end-of-period)
      newValue =
        prev.portfolioValue * Math.pow(1 + r, 12) +
        pmt * ((Math.pow(1 + r, 12) - 1) / r);
    }

    const newTotalInvested = prev.totalInvested + annualContrib;
    const portfolioValue = Math.round(newValue);
    const totalInvested = Math.round(newTotalInvested);

    yearlyData.push({
      year: investment.startYear + y,
      portfolioValue,
      totalInvested,
      growth: portfolioValue - totalInvested,
      yoyGain: portfolioValue - prev.portfolioValue,
    });
  }

  const last = yearlyData[yearlyData.length - 1];
  const totalGrowth = last.portfolioValue - last.totalInvested;
  const growthPct =
    last.totalInvested > 0
      ? Math.round((totalGrowth / last.totalInvested) * 1000) / 10
      : 0;
  // Effective CAGR on total invested capital
  const cagrPct =
    years > 0 && last.totalInvested > 0
      ? Math.round(
          (Math.pow(last.portfolioValue / last.totalInvested, 1 / years) - 1) *
            10000
        ) / 100
      : 0;

  return {
    finalValue: last.portfolioValue,
    totalInvested: last.totalInvested,
    totalGrowth,
    growthPct,
    cagrPct,
    yearlyData,
  };
}
