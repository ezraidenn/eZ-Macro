"use client";

import { ThemeProvider } from "next-themes";
import { StoreHydrator } from "@/components/store-hydrator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <StoreHydrator />
      {children}
    </ThemeProvider>
  );
}
