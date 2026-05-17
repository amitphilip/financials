"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

import clientPromise from "@/lib/mongodb";

async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const meta = sessionClaims?.publicMetadata as { role?: string } | undefined;
  if (meta?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

export type UserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: number;
  role: "admin" | "partner" | "primary";
  partnerOf: string | null;
  hasConfig: boolean;
};

export type InvitationRow = {
  id: string;
  email: string;
  createdAt: number;
  status: string;
};

export async function listUsers(): Promise<UserRow[]> {
  await requireAdmin();

  const client = await clerkClient();
  const { data: clerkUsers } = await client.users.getUserList({ limit: 200 });

  // Find which userIds have a config doc in MongoDB
  const mongo = await clientPromise;
  const col = mongo.db("financials").collection("user_config");
  const userIds = clerkUsers.map((u) => u.id);
  const docs = await col.find({ userId: { $in: userIds } }).toArray();
  const configSet = new Set(docs.map((d) => d.userId as string));

  return clerkUsers.map((u) => {
    const meta = (u.publicMetadata ?? {}) as {
      role?: string;
      partnerOf?: string;
    };
    return {
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      role:
        meta.role === "admin"
          ? "admin"
          : meta.role === "partner"
            ? "partner"
            : "primary",
      partnerOf: meta.partnerOf ?? null,
      hasConfig: configSet.has(u.id),
    };
  });
}

export async function listPendingInvitations(): Promise<InvitationRow[]> {
  await requireAdmin();

  const client = await clerkClient();
  const { data } = await client.invitations.getInvitationList({
    status: "pending",
    limit: 200,
  });

  return data.map((inv) => ({
    id: inv.id,
    email: inv.emailAddress,
    createdAt: inv.createdAt,
    status: inv.status,
  }));
}

export async function adminInviteUser(email: string) {
  await requireAdmin();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const client = await clerkClient();
  await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${appUrl}/`,
    ignoreExisting: true,
    // No partnerOf — this creates a primary account
  });
}

export async function adminRevokeInvitation(invitationId: string) {
  await requireAdmin();
  const client = await clerkClient();
  await client.invitations.revokeInvitation(invitationId);
}
