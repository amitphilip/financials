export type PropertyData = {
  name: string;
  purchaseYear: number;
  purchasePrice: number;
  currentYear: number;
  currentValue: number;
};

export type LoanData = {
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  termYears: number;
};

export type CostsData = {
  annualInsurance: number;
  ratesAmount: number;
  ratesFrequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";
  totalRenovations: number;
};

export type YearlyRow = {
  year: number;
  propertyValue: number;
  yoyGrowthPct: number;
  interestPaid: number;
  principalPaid: number;
  loanBalance: number;
  equity: number;
};

export type Result = {
  yearlyData: YearlyRow[];
  overallGrowthPct: number;
  totalDollarGrowth: number;
  cagrPct: number;
  totalInterestPaid: number;
  currentEquity: number;
  monthlyPayment: number;
  weeklyMortgageOnly: number;
  weeklyAllCosts: number;
  annualOngoingCosts: number;
};

const freqToAnnual: Record<CostsData["ratesFrequency"], number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function calculate(
  property: PropertyData,
  loan: LoanData,
  costs: CostsData
): Result {
  const yearsOwned = Math.max(property.currentYear - property.purchaseYear, 1);

  // CAGR
  const cagr =
    yearsOwned > 0
      ? Math.pow(property.currentValue / property.purchasePrice, 1 / yearsOwned) - 1
      : 0;

  // Monthly payment (standard amortisation)
  const monthlyRate = loan.interestRate / 100 / 12;
  const totalMonths = loan.termYears * 12;
  const monthlyPayment =
    loan.originalAmount > 0 && monthlyRate > 0
      ? (loan.originalAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : loan.originalAmount > 0
        ? loan.originalAmount / totalMonths
        : 0;

  // Build year-by-year data
  const yearlyData: YearlyRow[] = [];
  let balance = loan.originalAmount;

  const years = property.currentYear - property.purchaseYear;

  for (let y = 0; y <= years; y++) {
    const year = property.purchaseYear + y;

    const propertyValue =
      y === 0
        ? property.purchasePrice
        : y === years
          ? property.currentValue
          : Math.round(property.purchasePrice * Math.pow(1 + cagr, y));

    const prevValue =
      y === 0
        ? property.purchasePrice
        : Math.round(property.purchasePrice * Math.pow(1 + cagr, y - 1));

    const yoyGrowthPct =
      y === 0 ? 0 : Math.round(((propertyValue - prevValue) / prevValue) * 1000) / 10;

    let yearInterest = 0;
    let yearPrincipal = 0;

    if (y > 0 && balance > 0) {
      for (let m = 0; m < 12; m++) {
        if (balance <= 0) break;
        const interest = balance * monthlyRate;
        const principal = Math.min(monthlyPayment - interest, balance);
        yearInterest += interest;
        yearPrincipal += principal;
        balance = Math.max(balance - principal, 0);
      }
    }

    yearlyData.push({
      year,
      propertyValue: Math.round(propertyValue),
      yoyGrowthPct,
      interestPaid: Math.round(yearInterest),
      principalPaid: Math.round(yearPrincipal),
      loanBalance: Math.round(balance),
      equity: Math.round(propertyValue - balance),
    });
  }

  const totalInterestPaid = yearlyData.reduce((s, r) => s + r.interestPaid, 0);
  const overallGrowthPct =
    Math.round(
      ((property.currentValue - property.purchasePrice) / property.purchasePrice) * 1000
    ) / 10;
  const totalDollarGrowth = property.currentValue - property.purchasePrice;

  const annualRates = costs.ratesAmount * freqToAnnual[costs.ratesFrequency];
  const annualOngoingCosts =
    costs.annualInsurance + annualRates + costs.totalRenovations / yearsOwned;

  const weeklyMortgageOnly = Math.round((monthlyPayment * 12) / 52);
  const weeklyAllCosts = Math.round((monthlyPayment * 12 + annualOngoingCosts) / 52);

  const currentBalance = loan.currentBalance > 0 ? loan.currentBalance : balance;
  const currentEquity = property.currentValue - currentBalance;

  return {
    yearlyData,
    overallGrowthPct,
    totalDollarGrowth: Math.round(totalDollarGrowth),
    cagrPct: Math.round(cagr * 1000) / 10,
    totalInterestPaid: Math.round(totalInterestPaid),
    currentEquity: Math.round(currentEquity),
    monthlyPayment: Math.round(monthlyPayment),
    weeklyMortgageOnly,
    weeklyAllCosts,
    annualOngoingCosts: Math.round(annualOngoingCosts),
  };
}
