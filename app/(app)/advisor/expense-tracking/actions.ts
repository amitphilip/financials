"use server";

import clientPromise from "@/lib/mongodb";
import { encrypt, decrypt } from "@/lib/encrypt";
import { resolveEffectiveUserId } from "@/app/user-config-actions";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  rawDescription: string;
  amount: number;
  category: string;
  isTransfer: boolean;
  sourceFileId: string;
};

export type FileRecord = {
  fileId: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  dateFrom: string;
  dateTo: string;
  accountInfo: string;
};

export type SavedExpenseTracking = {
  files: FileRecord[];
  transactions: Transaction[];
};

async function collection() {
  const client = await clientPromise;
  return client.db("financials").collection("expense_tracking");
}

export async function loadExpenseTracking(): Promise<SavedExpenseTracking | null> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  const doc = await col.findOne({ userId: ids.effectiveUserId });
  if (!doc?.payload) return null;

  const parsed = JSON.parse(decrypt(doc.payload as string, ids.effectiveUserId));
  return parsed as SavedExpenseTracking;
}

export async function saveExpenseTracking(data: SavedExpenseTracking): Promise<void> {
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

export async function deleteExpenseFile(fileId: string): Promise<void> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const existing = await loadExpenseTracking();
  if (!existing) return;

  const updated: SavedExpenseTracking = {
    files: existing.files.filter((f) => f.fileId !== fileId),
    transactions: existing.transactions.filter((t) => t.sourceFileId !== fileId),
  };

  await saveExpenseTracking(updated);
}
