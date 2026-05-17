"use server";

import { auth } from "@clerk/nextjs/server";
import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";

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

export async function loadKiwisaver(): Promise<SavedKiwisaver | null> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, userId)) as SavedKiwisaver;
}
