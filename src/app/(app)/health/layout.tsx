import type { Metadata } from "next";

export const metadata: Metadata = { title: "상태" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
