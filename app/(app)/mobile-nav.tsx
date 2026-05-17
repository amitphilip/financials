"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BrainCircuit,
  Building2,
  Calculator,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useClerk, SignOutButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/home-equity", icon: Building2, label: "Home Equity" },
  { href: "/sp500", icon: TrendingUp, label: "S&P 500" },
  { href: "/compound", icon: Calculator, label: "Compound" },
  { href: "/advisor", icon: BrainCircuit, label: "Advisor" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { openUserProfile } = useClerk();

  function close() {
    setOpen(false);
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 md:hidden">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />

            {/* Menu card */}
            <motion.div
              className="absolute bottom-16 right-0 w-52 overflow-hidden rounded-2xl border bg-card shadow-2xl"
              initial={{ opacity: 0, y: 12, scale: 0.95, originX: 1, originY: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {navItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                      pathname === item.href
                        ? "bg-primary/8 font-semibold text-primary"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              <div className="mx-4 h-px bg-border" />

              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navItems.length * 0.04 }}
              >
                <Link
                  href="/settings"
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                    pathname === "/settings"
                      ? "bg-primary/8 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  Edit profile
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navItems.length + 1) * 0.04 }}
              >
                <button
                  onClick={() => { openUserProfile({}); close(); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <KeyRound className="h-4 w-4 shrink-0" />
                  Reset password
                </button>
              </motion.div>

              <div className="mx-4 h-px bg-border" />

              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navItems.length + 2) * 0.04 }}
              >
                <SignOutButton>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-sm text-destructive transition-colors hover:bg-destructive/5">
                    <LogOut className="h-4 w-4 shrink-0" />
                    Log out
                  </button>
                </SignOutButton>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.9 }}
        aria-label="Open menu"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
