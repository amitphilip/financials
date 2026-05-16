"use server";

import { auth } from "@clerk/nextjs/server";
import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";

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

export async function loadSP500(): Promise<SavedSP500 | null> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId });

  if (!doc?.payload) return null;
  return JSON.parse(decrypt(doc.payload as string, userId)) as SavedSP500;
}
