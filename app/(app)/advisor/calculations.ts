import { calculate as calcHomeEquity } from "../home-equity/calculations";
import type { PropertyData, LoanData, CostsData } from "../home-equity/calculations";

export type RentInputs = {
  weeklyRentAtPurchase: number;
  annualRentIncrease: number; // percentage, e.g. 3
  sp500Rate: number;          // percentage, e.g. 10.5
};

export type AdvisorYearlyRow = {
  year: number;
  propertyValue: number;
  equity: number;
  weeklyRent: number;
  investmentPortfolio: number;
};

export type BuyVsRentResult = {
  yearlyData: AdvisorYearlyRow[];
  property: Pick<PropertyData, "name" | "purchaseYear" | "purchasePrice" | "currentYear" | "currentValue">;
  downPayment: number;
  yearsAnalyzed: number;
  // Buying
  buyerFinalEquity: number;
  buyerTotalInterestPaid: number;
  buyerTotalOngoingCosts: number;
  buyerMonthlyAllIn: number;
  // Renting
  renterFinalPortfolio: number;
  renterTotalRentPaid: number;
  renterMonthlyAtEnd: number;
  // Verdict
  winner: "buying" | "renting" | "neutral";
  winnerDiff: number;
};

const freqToAnnual: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function calculateBuyVsRent(
  property: PropertyData,
  loan: LoanData,
  costs: CostsData,
  rent: RentInputs
): BuyVsRentResult {
  const homeResult = calcHomeEquity(property, loan, costs);
  const { monthlyPayment, yearlyData: heRows } = homeResult;

  const downPayment = Math.max(property.purchasePrice - loan.originalAmount, 0);

  const annualRates = costs.ratesAmount * (freqToAnnual[costs.ratesFrequency] ?? 12);
  const yearsOwned = Math.max(property.currentYear - property.purchaseYear, 1);
  const annualOngoingCosts =
    costs.annualInsurance + annualRates + costs.totalRenovations / yearsOwned;

  const monthlyBuyerAllIn = monthlyPayment + annualOngoingCosts / 12;

  // Renter pays weekly rent at purchase time, converted to monthly
  const monthlyRentAtPurchase = (rent.weeklyRentAtPurchase * 52) / 12;

  const sp500MonthlyRate = rent.sp500Rate / 100 / 12;
  const years = property.currentYear - property.purchaseYear;

  let investmentPortfolio = downPayment;
  let totalRentPaid = 0;
  let totalInterestPaid = 0;
  let totalOngoingCostsPaid = 0;

  const yearlyData: AdvisorYearlyRow[] = [];

  // Year 0: purchase year — both start equal
  yearlyData.push({
    year: property.purchaseYear,
    propertyValue: heRows[0].propertyValue,
    equity: heRows[0].equity,
    weeklyRent: Math.round(rent.weeklyRentAtPurchase),
    investmentPortfolio: Math.round(investmentPortfolio),
  });

  let lastWeeklyRent = rent.weeklyRentAtPurchase;

  for (let y = 1; y <= years; y++) {
    const heRow = heRows[y];

    totalInterestPaid += heRow.interestPaid;
    totalOngoingCostsPaid += annualOngoingCosts;

    // Rent increases each year from the start of tenancy
    const monthlyRentThisYear =
      monthlyRentAtPurchase * Math.pow(1 + rent.annualRentIncrease / 100, y - 1);
    lastWeeklyRent = (monthlyRentThisYear * 12) / 52;
    totalRentPaid += monthlyRentThisYear * 12;

    // Renter invests the monthly cost difference when buyer all-in > rent
    const monthlyContrib = Math.max(0, monthlyBuyerAllIn - monthlyRentThisYear);

    if (sp500MonthlyRate === 0) {
      investmentPortfolio += monthlyContrib * 12;
    } else {
      investmentPortfolio =
        investmentPortfolio * Math.pow(1 + sp500MonthlyRate, 12) +
        monthlyContrib * ((Math.pow(1 + sp500MonthlyRate, 12) - 1) / sp500MonthlyRate);
    }

    yearlyData.push({
      year: property.purchaseYear + y,
      propertyValue: heRow.propertyValue,
      equity: heRow.equity,
      weeklyRent: Math.round(lastWeeklyRent),
      investmentPortfolio: Math.round(investmentPortfolio),
    });
  }

  const last = yearlyData[yearlyData.length - 1];
  const diff = last.equity - last.investmentPortfolio;
  const threshold = Math.max(last.equity, last.investmentPortfolio) * 0.05;

  return {
    yearlyData,
    property,
    downPayment: Math.round(downPayment),
    yearsAnalyzed: years,
    buyerFinalEquity: last.equity,
    buyerTotalInterestPaid: Math.round(totalInterestPaid),
    buyerTotalOngoingCosts: Math.round(totalOngoingCostsPaid),
    buyerMonthlyAllIn: Math.round(monthlyBuyerAllIn),
    renterFinalPortfolio: Math.round(investmentPortfolio),
    renterTotalRentPaid: Math.round(totalRentPaid),
    renterMonthlyAtEnd: Math.round(lastWeeklyRent * 52 / 12),
    winner: Math.abs(diff) < threshold ? "neutral" : diff > 0 ? "buying" : "renting",
    winnerDiff: Math.round(Math.abs(diff)),
  };
}
