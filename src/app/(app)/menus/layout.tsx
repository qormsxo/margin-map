import type { Metadata } from "next";

export const metadata: Metadata = { title: "메뉴·레시피" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
