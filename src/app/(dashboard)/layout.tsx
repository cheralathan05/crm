import { BusinessOSLogo } from "@/components/business-os-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--bos-line)]">
        <BusinessOSLogo size="md" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}