import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, resolvePostAuthPath } from "@/lib/onboarding";
import { Roadmap } from "@/components/onboarding/roadmap";

export default async function OnboardingOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const state = await getOnboardingState(session.user.id);
  // Returning users who already completed the overview move on.
  if (state.overviewComplete) {
    redirect(resolvePostAuthPath(state));
  }

  return <Roadmap user={{ name: session.user.name ?? "there" }} />;
}
