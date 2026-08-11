import { auth } from "@/lib/auth";
import { getOnboardingState } from "@/lib/onboarding";
import { AppNavbar } from "@/components/app-navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const state = session?.user?.id ? await getOnboardingState(session.user.id) : null;

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col">
      <AppNavbar user={session?.user ?? undefined} companyName={state?.companyName ?? null} />

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
