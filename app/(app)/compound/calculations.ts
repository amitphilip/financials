export type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly" | "none";

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

function frequencyToAnnual(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case "weekly":      return amount * 52;
    case "fortnightly": return amount * 26;
    case "monthly":     return amount * 12;
    case "quarterly":   return amount * 4;
    case "yearly":      return amount;
    case "none":        return 0;
  }
}

export function calculate(
  initialDeposit: number,
  startYear: number,
  endYear: number,
  annualRate: number,
  contributionAmount: number,
  contributionFrequency: Frequency
): CalculationResult {
  const years = Math.max(0, endYear - startYear);
  const r = annualRate / 100;
  const annualContrib = frequencyToAnnual(contributionAmount, contributionFrequency);

  const yearlyData: YearlySnapshot[] = [];

  yearlyData.push({
    year: startYear,
    portfolioValue: Math.round(initialDeposit),
    totalInvested: Math.round(initialDeposit),
    growth: 0,
    yoyGain: 0,
  });

  for (let y = 1; y <= years; y++) {
    const prev = yearlyData[y - 1];

    // Annual compounding: grow existing balance, then add contributions at end of year
    const newValue = r === 0
      ? prev.portfolioValue + annualContrib
      : prev.portfolioValue * (1 + r) + annualContrib;

    const portfolioValue = Math.round(newValue);
    const totalInvested = Math.round(prev.totalInvested + annualContrib);

    yearlyData.push({
      year: startYear + y,
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
  const cagrPct =
    years > 0 && last.totalInvested > 0
      ? Math.round(
          (Math.pow(last.portfolioValue / last.totalInvested, 1 / years) - 1) * 10000
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
