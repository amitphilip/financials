"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DashboardApp = "own-rent" | "compound-growth";

export const DASHBOARD_STORAGE_NAME = "financials-dashboard-v7";

export type OwnRentInputs = {
  purchasePrice: number;
  purchaseYear: number;
  currentValue: number;
  remainingLoan: number;
  deposit: number;
  interestRate: number;
  renovationsPerYear: number;
  ratesPerYear: number;
  insurancePerYear: number;
  shareReturnRate: number;
  weeklyRent: number;
  agentCostRate: number;
  futureYears: number;
  futureShareReturnRate: number;
  futureWeeklyRent: number;
  futureRentIncreaseRate: number;
  futureHouseGrowthRate: number;
  stageOneComplete: boolean;
  stageTwoComplete: boolean;
  stageThreeComplete: boolean;
  stageFourComplete: boolean;
  stageOneSavedAt: string | null;
  stageTwoSavedAt: string | null;
  stageThreeSavedAt: string | null;
  stageFourSavedAt: string | null;
};

type DashboardState = {
  activeApp: DashboardApp;
  ownRent: OwnRentInputs;
  setActiveApp: (activeApp: DashboardApp) => void;
  updateOwnRent: <Key extends keyof OwnRentInputs>(
    key: Key,
    value: OwnRentInputs[Key],
  ) => void;
  setOwnRentStageComplete: (stage: 1 | 2 | 3 | 4, complete: boolean) => void;
  resetOwnRent: () => void;
};

function envNumber(key: string, fallback: number): number {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export const defaultOwnRentInputs: OwnRentInputs = {
  purchasePrice: envNumber("NEXT_PUBLIC_OWN_RENT_PURCHASE_PRICE", 1000000),
  purchaseYear: envNumber("NEXT_PUBLIC_OWN_RENT_PURCHASE_YEAR", 2020),
  currentValue: envNumber("NEXT_PUBLIC_OWN_RENT_CURRENT_VALUE", 1200000),
  remainingLoan: envNumber("NEXT_PUBLIC_OWN_RENT_REMAINING_LOAN", 800000),
  deposit: envNumber("NEXT_PUBLIC_OWN_RENT_DEPOSIT", 200000),
  interestRate: envNumber("NEXT_PUBLIC_OWN_RENT_INTEREST_RATE", 5),
  renovationsPerYear: envNumber("NEXT_PUBLIC_OWN_RENT_RENOVATIONS_PER_YEAR", 5000),
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

function stageFields(stage: 1 | 2 | 3 | 4) {
  if (stage === 1) {
    return {
      complete: "stageOneComplete",
      savedAt: "stageOneSavedAt",
    } as const;
  }

  if (stage === 2) {
    return {
      complete: "stageTwoComplete",
      savedAt: "stageTwoSavedAt",
    } as const;
  }

  if (stage === 3) {
    return {
      complete: "stageThreeComplete",
      savedAt: "stageThreeSavedAt",
    } as const;
  }

  return {
    complete: "stageFourComplete",
    savedAt: "stageFourSavedAt",
  } as const;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      activeApp: "own-rent",
      ownRent: defaultOwnRentInputs,
      setActiveApp: (activeApp) => set({ activeApp }),
      updateOwnRent: (key, value) =>
        set((state) => ({
          ownRent: {
            ...state.ownRent,
            [key]: value,
          },
        })),
      setOwnRentStageComplete: (stage, complete) =>
        set((state) => {
          const fields = stageFields(stage);

          return {
            ownRent: {
              ...state.ownRent,
              [fields.complete]: complete,
              [fields.savedAt]: complete ? new Date().toISOString() : null,
            },
          };
        }),
      resetOwnRent: () => set({ ownRent: defaultOwnRentInputs }),
    }),
    {
      name: DASHBOARD_STORAGE_NAME,
      skipHydration: true,
      partialize: (state) => ({
        activeApp: state.activeApp,
        ownRent: state.ownRent,
      }),
    },
  ),
);
