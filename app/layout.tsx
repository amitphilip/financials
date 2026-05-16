import type { Metadata } from "next";

import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { NumbersProvider } from "./numbers-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  title: "Financials",
  description: "Personal finance dashboards and calculators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={cn("font-mono", jetbrainsMono.variable)}>
        <body className="min-h-screen antialiased">
          <NumbersProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </NumbersProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
