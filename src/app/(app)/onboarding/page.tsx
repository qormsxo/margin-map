import { redirect } from "next/navigation";
import { getActiveSession } from "@/server/store-service";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "시작하기" };

export default async function OnboardingPage() {
  if (!(await getActiveSession())) redirect("/login?mode=register");

  return <OnboardingForm />;
}
