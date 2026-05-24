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

// Each uploaded file is stored as its own document:
// { userId, fileId, payload: encrypt({ file: FileRecord, transactions: Transaction[] }) }
// This makes addExpenseData an atomic insertOne — no read-modify-write, no race condition.

export async function loadExpenseTracking(): Promise<SavedExpenseTracking | null> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  const docs = await col.find({ userId: ids.effectiveUserId }).toArray();
  if (docs.length === 0) return null;

  const files: FileRecord[] = [];
  const transactions: Transaction[] = [];

  for (const doc of docs) {
    if (!doc.payload) continue;
    try {
      const { file, transactions: txs } = JSON.parse(
        decrypt(doc.payload as string, ids.effectiveUserId)
      ) as { file: FileRecord; transactions: Transaction[] };
      files.push(file);
      transactions.push(...txs);
    } catch {
      // Skip corrupted documents rather than failing the whole load
    }
  }

  return files.length > 0 ? { files, transactions } : null;
}

export async function addExpenseData(
  fileRecord: FileRecord,
  newTransactions: Transaction[]
): Promise<void> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const payload = encrypt(
    JSON.stringify({ file: fileRecord, transactions: newTransactions }),
    ids.effectiveUserId
  );
  const col = await collection();
  await col.insertOne({
    userId: ids.effectiveUserId,
    fileId: fileRecord.fileId,
    payload,
    uploadedAt: new Date(),
  });
}

export async function deleteExpenseFile(fileId: string): Promise<void> {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const col = await collection();
  await col.deleteOne({ userId: ids.effectiveUserId, fileId });
}
