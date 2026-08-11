import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, getWorkspaceConfig, resolvePostAuthPath } from "@/lib/onboarding";
import { emptyConfig } from "@/lib/workspace-config";
import { DashboardOverview } from "@/components/dashboard/overview";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Users who never finished onboarding must complete it before the dashboard.
  const state = await getOnboardingState(session.user.id);
  const expected = resolvePostAuthPath(state);
  if (expected !== "/dashboard") {
    redirect(expected);
  }

  // The personalized foundation built by the Workspace Creation Engine.
  const config = (await getWorkspaceConfig(session.user.id)) ?? emptyConfig(state.companyName ?? "");

  return <DashboardOverview config={config} />;
}
