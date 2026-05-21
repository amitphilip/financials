"use server";

import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";
import { resolveEffectiveUserId } from "@/app/user-config-actions";

export type SavedKiwisaver = {
  balanceStr: string;
  startYear: number;
  birthYear: number;
  rateStr: string;
  aiNote: string;
  projectionYears: number;
  contributionStr: string;
  contributionFrequency: string;
  completedUpTo: number;
};

async function collection() {
  const client = await clientPromise;
  return client.db("financials").collection("kiwisaver");
}

export async function saveKiwisaver(data: SavedKiwisaver) {
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

export async function loadKiwisaver(): Promise<SavedKiwisaver | null> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId: ids.effectiveUserId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, ids.effectiveUserId)) as SavedKiwisaver;
}
