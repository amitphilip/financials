import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { loadUserConfig } from "@/app/user-config-actions";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  // Already configured — skip onboarding
  const config = await loadUserConfig();
  if (config) redirect("/");

  const user = await currentUser();
  const defaultName = user?.firstName ?? user?.username ?? "";

  return <OnboardingForm defaultName={defaultName} />;
}
