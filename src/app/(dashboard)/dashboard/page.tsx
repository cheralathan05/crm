import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getOnboardingState, resolvePostAuthPath } from "@/lib/onboarding";
import { BusinessOSMark } from "@/components/business-os-mark";

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

  const user = session.user;
  const companyName = state.companyName ?? user.companyName;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--bos-accent-subtle)] flex items-center justify-center">
            <BusinessOSMark size="xl" className="text-[var(--bos-accent)]" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {companyName ? `${companyName} workspace` : "Workspace ready"}
        </h1>
        <p className="text-sm text-[var(--bos-text-secondary)] mb-8">
          Signed in as <span className="font-medium text-[var(--bos-text-primary)]">{user.email}</span>
          {companyName && (
            <> · {companyName}</>
          )}
        </p>

        {/* Dashboard placeholder grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <div className="rounded-sm border border-[var(--bos-line)] p-4 text-left">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] mb-1">
              Clients
            </div>
            <div className="text-2xl font-semibold tracking-tight">—</div>
          </div>
          <div className="rounded-sm border border-[var(--bos-line)] p-4 text-left">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] mb-1">
              Projects
            </div>
            <div className="text-2xl font-semibold tracking-tight">—</div>
          </div>
          <div className="rounded-sm border border-[var(--bos-line)] p-4 text-left">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] mb-1">
              Tasks
            </div>
            <div className="text-2xl font-semibold tracking-tight">—</div>
          </div>
          <div className="rounded-sm border border-[var(--bos-line)] p-4 text-left">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] mb-1">
              Deliveries
            </div>
            <div className="text-2xl font-semibold tracking-tight">—</div>
          </div>
        </div>

        <div className="text-[11px] text-[var(--bos-text-tertiary)] mb-8 border-t border-[var(--bos-line)] pt-6">
          The full dashboard is under development.
        </div>

        {/* Sign out */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="bos-link text-xs"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
