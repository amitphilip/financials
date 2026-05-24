"use server";

import clientPromise from "@/lib/mongodb";

export async function checkDbConnection(): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }> {
  const start = Date.now();
  try {
    const client = await clientPromise;
    await client.db("financials").command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Surface only the first sentence — full stack is too noisy for UI
    return { ok: false, error: msg.split("\n")[0] };
  }
}
