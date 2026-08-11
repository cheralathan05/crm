import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState } from "@/lib/onboarding";
import { WorkspaceSetup } from "@/components/onboarding/workspace-setup";

export default async function OnboardingCompanyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const state = await getOnboardingState(session.user.id);
  // The overview must be completed before the workspace can be set up.
  if (!state.overviewComplete) {
    redirect("/onboarding/overview");
  }
  // Workspace already configured — go straight to the dashboard.
  if (state.companyName) {
    redirect("/dashboard");
  }

  return <WorkspaceSetup prefill={session.user.companyName ?? ""} />;
}
