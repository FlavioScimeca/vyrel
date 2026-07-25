"use client";

import { Toaster, TooltipProvider } from "@vyrel/shared/components";
import { ThemeProvider } from "@/components/theme-provider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}
