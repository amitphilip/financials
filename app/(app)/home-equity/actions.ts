"use server";

import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";
import { resolveEffectiveUserId } from "@/app/user-config-actions";

export type SavedHomeEquity = {
  property: {
    name: string;
    purchaseYear: number;
    purchasePriceStr: string;
    currentYear: number;
    currentValueStr: string;
  };
  loan: {
    originalStr: string;
    balanceStr: string;
    rateStr: string;
    termYears: number;
  };
  costs: {
    insuranceStr: string;
    ratesAmountStr: string;
    ratesFrequency: string;
    renovationsStr: string;
  };
  completedUpTo: number;
};

async function collection() {
  const client = await clientPromise;
  return client.db("financials").collection("home_equity");
}

export async function saveHomeEquity(data: SavedHomeEquity) {
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

export async function loadHomeEquity(): Promise<SavedHomeEquity | null> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId: ids.effectiveUserId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, ids.effectiveUserId)) as SavedHomeEquity;
}
