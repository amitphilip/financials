"use server";

import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";
import { resolveEffectiveUserId } from "@/app/user-config-actions";

export type SavedAdvisor = {
  // Step 1: Property
  propertyName: string;
  purchaseYear: number;
  purchasePriceStr: string;
  currentYear: number;
  currentValueStr: string;
  // Step 2: Loan & Costs
  originalLoanStr: string;
  currentBalanceStr: string;
  interestRateStr: string;
  termYears: number;
  insuranceStr: string;
  ratesAmountStr: string;
  ratesFrequency: string;
  renovationsStr: string;
  // Step 3: Rent scenario
  weeklyRentStr: string;
  rentIncreaseStr: string;
  sp500RateStr: string;
  sp500Note: string;
  // Progress
  completedUpTo: number;
};

async function collection() {
  const client = await clientPromise;
  return client.db("financials").collection("advisor");
}

export async function saveAdvisor(data: SavedAdvisor) {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const payload = encrypt(JSON.stringify(data), ids.effectiveUserId);
  const col = await collection();

  await col.updateOne(
    { userId: ids.effectiveUserId },
    { $set: { userId: ids.effectiveUserId, payload, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function loadAdvisor(): Promise<SavedAdvisor | null> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId: ids.effectiveUserId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, ids.effectiveUserId)) as SavedAdvisor;
}
