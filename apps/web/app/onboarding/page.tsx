import { redirect } from "next/navigation";

import { OnboardingScreen } from "@/features/auth/screen/onboarding";
import { getServerAuthState } from "@/lib/server-session";

export default async function OnboardingPage() {
  const authState = await getServerAuthState();

  if (authState === null) {
    redirect("/auth");
  }

  if (authState.hasOrganizationAccess) {
    redirect("/dashboard");
  }

  return <OnboardingScreen />;
}
