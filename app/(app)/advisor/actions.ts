"use server";

import { auth } from "@clerk/nextjs/server";

import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const payload = encrypt(JSON.stringify(data), userId);
  const col = await collection();

  await col.updateOne(
    { userId },
    { $set: { userId, payload, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function loadAdvisor(): Promise<SavedAdvisor | null> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, userId)) as SavedAdvisor;
}
