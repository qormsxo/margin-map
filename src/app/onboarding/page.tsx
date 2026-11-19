import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "시작하기" };

export default async function OnboardingPage() {
  if (!(await getSession())) redirect("/login?mode=register");

  return <OnboardingForm />;
}
