import type { Metadata } from "next";

export const metadata: Metadata = { title: "고정비" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
