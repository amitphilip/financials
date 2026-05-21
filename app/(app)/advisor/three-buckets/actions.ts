"use server";

import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";
import { resolveEffectiveUserId } from "@/app/user-config-actions";

export type SavedThreeBuckets = {
  // You
  grossStr: string;
  kiwiRate: number;
  employmentType: string;
  taxPctStr: string;
  // Partner (optional)
  partnerIncluded: boolean;
  partnerConfirmed: boolean;
  partnerGrossStr: string;
  partnerKiwiRate: number;
  partnerEmploymentType: string;
  partnerTaxPctStr: string;
  // Shared
  frequency: string;
  // Wealth
  mortgageBalanceStr: string;
  mortgageTermStr: string;
  mortgageRateStr: string;
  investmentAmountStr: string;
  investmentFrequency: string;
  completedUpTo: number;
};

async function collection() {
  const client = await clientPromise;
  return client.db("financials").collection("three_buckets");
}

export async function saveThreeBuckets(data: SavedThreeBuckets) {
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

export async function loadThreeBuckets(): Promise<SavedThreeBuckets | null> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId: ids.effectiveUserId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, ids.effectiveUserId)) as SavedThreeBuckets;
}
