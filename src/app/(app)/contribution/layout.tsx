import type { Metadata } from "next";

export const metadata: Metadata = { title: "이번 달 이익" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
