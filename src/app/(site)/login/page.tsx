import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

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
