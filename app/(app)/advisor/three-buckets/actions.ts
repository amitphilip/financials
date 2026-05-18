"use server";

import { auth } from "@clerk/nextjs/server";
import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";

export type SavedThreeBuckets = {
  incomeStr: string;
  frequency: string;
  employmentType: string;
  taxPctStr: string;
  wealthPctStr: string;
  completedUpTo: number;
};

async function collection() {
  const client = await clientPromise;
  return client.db("financials").collection("three_buckets");
}

export async function saveThreeBuckets(data: SavedThreeBuckets) {
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

export async function loadThreeBuckets(): Promise<SavedThreeBuckets | null> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, userId)) as SavedThreeBuckets;
}
