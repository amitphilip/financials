import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { listUsers, listPendingInvitations } from "./admin-actions";
import { AdminInviteForm, PendingInvitations, UsersList } from "./admin-ui";

export default async function AdminPage() {
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.publicMetadata as { role?: string } | undefined;
  if (meta?.role !== "admin") redirect("/");

  const [users, invitations] = await Promise.all([
    listUsers(),
    listPendingInvitations(),
  ]);

  return (
    <main className="px-4 pb-12 pt-8">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Admin</h1>
        <div className="grid gap-6">
          <AdminInviteForm />
          <PendingInvitations invitations={invitations} />
          <UsersList users={users} />
        </div>
      </div>
    </main>
  );
}
