import { auth } from "@/lib/auth";
import { getWorkspaceConfig } from "@/lib/onboarding";
import { emptyConfig } from "@/lib/workspace-config";
import { DashboardOverview } from "@/components/dashboard/overview";

export default async function DashboardPage() {
  const session = await auth();

  // Layout + proxy guarantee authentication and onboarding state.
  const config =
    (await getWorkspaceConfig(session?.user?.id ?? "")) ?? emptyConfig();

  return <DashboardOverview config={config} />;
}
