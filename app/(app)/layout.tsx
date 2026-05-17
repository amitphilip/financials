import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { loadUserConfig } from "../user-config-actions";
import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const config = await loadUserConfig();
  if (!config) redirect("/onboarding");

  const { sessionClaims } = await auth();
  const meta = sessionClaims?.publicMetadata as { role?: string } | undefined;
  const isAdmin = meta?.role === "admin";

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset>
        {/* Extra bottom padding on mobile so FAB doesn't cover content */}
        <div className="pb-24 md:pb-0">
          {children}
        </div>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}
