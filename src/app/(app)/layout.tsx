import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

// Everything here is behind login: keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
