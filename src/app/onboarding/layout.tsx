import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { AppNavbar } from "@/components/app-navbar";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] flex flex-col">
      <SystemGrid />
      <AmbientBackground />

      {/* Application chrome — the shared Business OS navbar */}
      <AppNavbar user={session.user} />

      <main className="relative z-10 flex-1 flex flex-col">{children}</main>
    </div>
  );
}
