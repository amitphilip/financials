"use server";

import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";
import { resolveEffectiveUserId } from "@/app/user-config-actions";

export type SavedSP500 = {
  investment: {
    initialDepositStr: string;
    startYear: number;
    endYear: number;
    rateStr: string;
    aiNote: string;
  };
  contribution: {
    amountStr: string;
    frequency: string;
  };
  completedUpTo: number;
};

async function collection() {
  const client = await clientPromise;
  return client.db("financials").collection("sp500");
}

export async function saveSP500(data: SavedSP500) {
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

export async function loadSP500(): Promise<SavedSP500 | null> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId: ids.effectiveUserId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, ids.effectiveUserId)) as SavedSP500;
}
