import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, getWorkspaceConfig, resolvePostAuthPath } from "@/lib/onboarding";
import { WorkspaceSetupController } from "@/components/workspace-setup/controller";

export default async function OnboardingWorkspacePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const state = await getOnboardingState(session.user.id);
  const expected = resolvePostAuthPath(state);
  if (expected !== "/onboarding/workspace") {
    redirect(expected);
  }

  // Resume: the last autosaved configuration (null on first visit).
  const saved = await getWorkspaceConfig(session.user.id);

  return (
    <WorkspaceSetupController
      user={{
        name: session.user.name ?? "there",
        email: session.user.email ?? "",
      }}
      initialConfig={saved}
      prefillCompany={session.user.companyName ?? ""}
    />
  );
}
