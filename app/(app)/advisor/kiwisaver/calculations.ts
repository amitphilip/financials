export type KiwiFrequency = "weekly" | "fortnightly" | "monthly" | "yearly" | "none";

export type KiwiYearlySnapshot = {
  year: number;
  portfolioValue: number;
  totalContributed: number;
  growth: number;
  yoyGain: number;
};

export type RetirementMilestone = {
  age: number;
  year: number;
  balance: number;
  roughMonthlyOver20yrs: number;
};

export type KiwiProjectionResult = {
  finalValue: number;
  totalContributed: number;
  totalGrowth: number;
  growthPct: number;
  cagrPct: number;
  yearlyData: KiwiYearlySnapshot[];
  age65: RetirementMilestone | null;
  age67: RetirementMilestone | null;
};

function freqToAnnual(amount: number, freq: KiwiFrequency): number {
  switch (freq) {
    case "weekly":      return amount * 52;
    case "fortnightly": return amount * 26;
    case "monthly":     return amount * 12;
    case "yearly":      return amount;
    case "none":        return 0;
  }
}

function milestoneFromData(
  age: number,
  birthYear: number,
  yearlyData: KiwiYearlySnapshot[]
): RetirementMilestone | null {
  const targetYear = birthYear + age;
  const snapshot = yearlyData.find((r) => r.year === targetYear);
  if (!snapshot) return null;
  return {
    age,
    year: targetYear,
    balance: snapshot.portfolioValue,
    roughMonthlyOver20yrs: Math.round(snapshot.portfolioValue / (20 * 12)),
  };
}

export function calculateKiwisaver(
  currentBalance: number,
  annualRate: number,
  projectionYears: number,
  contributionAmount: number,
  contributionFrequency: KiwiFrequency,
  birthYear?: number
): KiwiProjectionResult {
  const r = annualRate / 100;
  const annualContrib = freqToAnnual(contributionAmount, contributionFrequency);
  const startYear = new Date().getFullYear();

  const yearlyData: KiwiYearlySnapshot[] = [];

  yearlyData.push({
    year: startYear,
    portfolioValue: Math.round(currentBalance),
    totalContributed: Math.round(currentBalance),
    growth: 0,
    yoyGain: 0,
  });

  for (let y = 1; y <= projectionYears; y++) {
    const prev = yearlyData[y - 1];

    const newValue = r === 0
      ? prev.portfolioValue + annualContrib
      : prev.portfolioValue * (1 + r) + annualContrib;

    const portfolioValue = Math.round(newValue);
    const totalContributed = Math.round(prev.totalContributed + annualContrib);

    yearlyData.push({
      year: startYear + y,
      portfolioValue,
      totalContributed,
      growth: portfolioValue - totalContributed,
      yoyGain: portfolioValue - prev.portfolioValue,
    });
  }

  const last = yearlyData[yearlyData.length - 1];
  const totalGrowth = last.portfolioValue - last.totalContributed;
  const growthPct =
    last.totalContributed > 0
      ? Math.round((totalGrowth / last.totalContributed) * 1000) / 10
      : 0;
  const cagrPct =
    projectionYears > 0 && currentBalance > 0
      ? Math.round(
          ((Math.pow(last.portfolioValue / currentBalance, 1 / projectionYears) - 1) * 100) * 10
        ) / 10
      : 0;

  const age65 = birthYear ? milestoneFromData(65, birthYear, yearlyData) : null;
  const age67 = birthYear ? milestoneFromData(67, birthYear, yearlyData) : null;

  return {
    finalValue: last.portfolioValue,
    totalContributed: last.totalContributed,
    totalGrowth,
    growthPct,
    cagrPct,
    yearlyData,
    age65,
    age67,
  };
}
