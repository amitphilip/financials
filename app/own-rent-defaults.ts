import type { OwnRentInputs } from "./dashboard-store";

function envNumber(key: string, fallback: number): number {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getDefaultOwnRentInputs(): OwnRentInputs {
  return {
    purchasePrice: envNumber("NEXT_PUBLIC_OWN_RENT_PURCHASE_PRICE", 1000000),
    purchaseYear: envNumber("NEXT_PUBLIC_OWN_RENT_PURCHASE_YEAR", 2020),
    currentValue: envNumber("NEXT_PUBLIC_OWN_RENT_CURRENT_VALUE", 1200000),
    remainingLoan: envNumber("NEXT_PUBLIC_OWN_RENT_REMAINING_LOAN", 800000),
    deposit: envNumber("NEXT_PUBLIC_OWN_RENT_DEPOSIT", 200000),
    interestRate: envNumber("NEXT_PUBLIC_OWN_RENT_INTEREST_RATE", 5),
    renovationsPerYear: envNumber(
      "NEXT_PUBLIC_OWN_RENT_RENOVATIONS_PER_YEAR",
      5000,
    ),
    ratesPerYear: envNumber("NEXT_PUBLIC_OWN_RENT_RATES_PER_YEAR", 3600),
    insurancePerYear: envNumber("NEXT_PUBLIC_OWN_RENT_INSURANCE_PER_YEAR", 1500),
    shareReturnRate: envNumber("NEXT_PUBLIC_OWN_RENT_SHARE_RETURN_RATE", 16),
    weeklyRent: envNumber("NEXT_PUBLIC_OWN_RENT_WEEKLY_RENT", 900),
    agentCostRate: envNumber("NEXT_PUBLIC_OWN_RENT_AGENT_COST_RATE", 3.5),
    futureYears: envNumber("NEXT_PUBLIC_OWN_RENT_FUTURE_YEARS", 15),
    futureShareReturnRate: envNumber(
      "NEXT_PUBLIC_OWN_RENT_FUTURE_SHARE_RETURN_RATE",
      7,
    ),
    futureWeeklyRent: envNumber("NEXT_PUBLIC_OWN_RENT_FUTURE_WEEKLY_RENT", 1000),
    futureRentIncreaseRate: envNumber(
      "NEXT_PUBLIC_OWN_RENT_FUTURE_RENT_INCREASE_RATE",
      3,
    ),
    futureHouseGrowthRate: envNumber(
      "NEXT_PUBLIC_OWN_RENT_FUTURE_HOUSE_GROWTH_RATE",
      4.75,
    ),
    stageOneComplete: false,
    stageTwoComplete: false,
    stageThreeComplete: false,
    stageFourComplete: false,
    stageOneSavedAt: null,
    stageTwoSavedAt: null,
    stageThreeSavedAt: null,
    stageFourSavedAt: null,
  };
}
