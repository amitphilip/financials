import { redirect } from "next/navigation";

import { loadUserConfig } from "../user-config-actions";
import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const config = await loadUserConfig();
  if (!config) redirect("/onboarding");

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
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
