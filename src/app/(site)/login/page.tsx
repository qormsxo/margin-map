import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "로그인 · 무료로 시작하기",
  description: "MarginMap에 로그인하거나 무료로 가입하고 메뉴별 원가와 남는 돈을 확인하세요.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;

  // Already signed in: there is nothing to do here.
  if (await getSession()) redirect("/dashboard");

  return <LoginForm initialMode={mode === "register" ? "register" : "login"} />;
}
