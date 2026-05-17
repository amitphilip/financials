"use client";

import { Banknote, BrainCircuit, Building2, Calculator, KeyRound, LayoutDashboard, LogOut, PiggyBank, Settings, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useClerk, SignOutButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/home-equity", icon: Building2, label: "Home Equity" },
  { href: "/sp500", icon: TrendingUp, label: "S&P 500" },
  { href: "/compound", icon: Calculator, label: "Compound" },
  { href: "/income", icon: Banknote, label: "Income" },
];

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { openUserProfile } = useClerk();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, icon: Icon, label }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === href}
                    tooltip={label}
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin"}
                    tooltip="Admin"
                  >
                    <Link href="/admin">
                      <ShieldCheck />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Advisor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/advisor"}
                  tooltip="Advisor"
                >
                  <Link href="/advisor">
                    <BrainCircuit />
                    <span>Advisor</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/advisor/kiwisaver"}
                  tooltip="KiwiSaver"
                >
                  <Link href="/advisor/kiwisaver">
                    <PiggyBank />
                    <span>KiwiSaver</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/settings"}
              tooltip="Edit profile"
            >
              <Link href="/settings">
                <Settings />
                <span>Edit profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Reset password"
              className="text-muted-foreground"
              onClick={() => openUserProfile({ appearance: {} })}
            >
              <KeyRound />
              <span>Reset password</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SignOutButton>
              <SidebarMenuButton
                tooltip="Log out"
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </SignOutButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
