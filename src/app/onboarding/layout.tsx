import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { ThemeToggle } from "@/components/theme-toggle";

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

      {/* Application chrome */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b border-[var(--bos-line)]">
        <BusinessOSLogo size="md" />
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-[0.14em] text-[var(--bos-text-tertiary)] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)]" />
            <span>System online</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">{children}</main>
    </div>
  );
}
