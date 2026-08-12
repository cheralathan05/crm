import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, resolvePostAuthPath } from "@/lib/onboarding";
import { getSidebarData } from "@/lib/sidebar-data";
import { AppShell } from "@/components/sidebar/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Authentication is enforced here (and in the proxy) — the sidebar and
  // every module page underneath this layout are protected.
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Workspace membership: users who never finished onboarding must complete
  // it before any dashboard module is reachable.
  const state = await getOnboardingState(session.user.id);
  const expected = resolvePostAuthPath(state);
  if (expected !== "/dashboard") {
    redirect(expected);
  }

  // Real sidebar data: user, workspace name, counts, integration state.
  const sidebar = await getSidebarData(session.user.id);

  return (
    <AppShell
      user={sidebar.user}
      role={sidebar.role}
      companyName={sidebar.companyName}
      counts={sidebar.counts}
      githubConnected={sidebar.githubConnected}
    >
      {children}
    </AppShell>
  );
}
