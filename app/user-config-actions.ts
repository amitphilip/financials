"use server";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

import { decrypt, encrypt } from "@/lib/encrypt";
import clientPromise from "@/lib/mongodb";

export type UserConfig = {
  name: string;
  partnerName: string;
  partnerEmail?: string;
};

async function col() {
  const client = await clientPromise;
  return client.db("financials").collection("user_config");
}

/**
 * Resolves the "effective" userId to use for data access.
 * If the signed-in user is a partner (publicMetadata.partnerOf is set),
 * their data lives under the primary user's document.
 */
async function resolveEffectiveUserId(): Promise<{
  userId: string;
  effectiveUserId: string;
} | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const meta = sessionClaims?.publicMetadata as
    | { role?: string; partnerOf?: string }
    | undefined;
  const effectiveUserId = meta?.partnerOf ?? userId;

  return { userId, effectiveUserId };
}

// cache() deduplicates this call within a single server render cycle
// so layout + page can both call it without a double round-trip.
export const loadUserConfig = cache(async (): Promise<UserConfig | null> => {
  const ids = await resolveEffectiveUserId();
  if (!ids) return null;

  const collection = await col();
  const doc = await collection.findOne({ userId: ids.effectiveUserId });
  if (!doc?.payload) return null;

  return JSON.parse(
    decrypt(doc.payload as string, ids.effectiveUserId)
  ) as UserConfig;
});

export async function saveUserConfig(config: UserConfig) {
  const ids = await resolveEffectiveUserId();
  if (!ids) throw new Error("Unauthorized");

  const payload = encrypt(JSON.stringify(config), ids.effectiveUserId);
  const collection = await col();

  await collection.updateOne(
    { userId: ids.effectiveUserId },
    { $set: { userId: ids.effectiveUserId, payload, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function invitePartner(email: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const appUrl = `${proto}://${host}`;

  const client = await clerkClient();
  await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${appUrl}/`,
    publicMetadata: { role: "partner", partnerOf: userId },
    ignoreExisting: true,
  });

  // Persist partner email in primary user's config
  const config = await loadUserConfig();
  if (config) {
    await saveUserConfig({ ...config, partnerEmail: email });
  }
}
