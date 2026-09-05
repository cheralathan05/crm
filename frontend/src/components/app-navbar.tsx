import { LogOut } from "lucide-react";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth";

/**
 * The Business OS modules — the future application navigation.
 * The modules do not exist yet, so these render as the product's
 * navigation skeleton (non-navigating, marked SOON) rather than
 * dead links that 404.
 */
const MODULES = ["Clients", "Requirements", "Proposals", "Projects", "Tasks", "Delivery"];

interface AppNavbarProps {
  user?: { name?: string | null; email?: string | null };
  /** Real workspace name once onboarding is complete. */
  companyName?: string | null;
  /** Shown in place of the workspace name before one exists. */
  fallbackLabel?: string;
}

/**
 * The single top bar across the authenticated application.
 *
 *   LEFT    logo · workspace name
 *   CENTER  module navigation
 *   RIGHT   system status · user · sign out · theme
 *
 * Sticky, translucent, and responsive: the module row scrolls
 * horizontally on small screens instead of wrapping.
 */
export function AppNavbar({ user, companyName, fallbackLabel = "WORKSPACE SETUP" }: AppNavbarProps) {
  const initials = (user?.name || user?.email || "U")
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/85 backdrop-blur-sm">
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 h-14">
        {/* ── Brand + workspace ─────────────────────── */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <BusinessOSLogo size="md" />
          <span className="hidden sm:block w-px h-5 bg-[var(--bos-line-strong)]" aria-hidden="true" />
          <div className="hidden sm:flex flex-col min-w-0 max-w-[180px]">
            <span className="text-[8px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] leading-none">
              Workspace
            </span>
            <span className="text-[11px] font-medium text-[var(--bos-text-primary)] truncate mt-0.5">
              {companyName ?? fallbackLabel}
            </span>
          </div>
        </div>

        {/* ── Module navigation · desktop ───────────── */}
        <nav aria-label="Modules" className="hidden md:flex items-center gap-0.5 mx-auto">
          {MODULES.map((m) => (
            <span
              key={m}
              className="px-3 py-1.5 rounded-sm text-[9px] font-mono tracking-[0.16em] uppercase text-[var(--bos-text-tertiary)] cursor-default transition-colors hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]"
            >
              {m}
            </span>
          ))}
          <span className="ml-1.5 px-1.5 py-0.5 rounded-[2px] text-[7px] font-mono tracking-[0.18em] uppercase bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]">
            Soon
          </span>
        </nav>

        {/* ── Module navigation · mobile (scrolls) ──── */}
        <nav aria-label="Modules" className="md:hidden flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
          {MODULES.map((m) => (
            <span
              key={m}
              className="shrink-0 px-2 py-1 text-[8px] font-mono tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)] cursor-default"
            >
              {m}
            </span>
          ))}
        </nav>

        {/* ── Right cluster ─────────────────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
          {/* System status */}
          <div className="hidden lg:flex items-center gap-2 text-[9px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)] animate-pulse" />
            <span>System online</span>
          </div>
          <span className="hidden sm:block w-px h-4 bg-[var(--bos-line)]" aria-hidden="true" />

          {/* User */}
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-semibold shrink-0"
              style={{
                color: "var(--bos-accent)",
                background: "var(--bos-accent-subtle)",
                border: "1px solid var(--bos-accent-ring)",
              }}
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="hidden lg:block min-w-0">
              <div className="text-[10px] font-medium text-[var(--bos-text-primary)] truncate max-w-[140px] leading-tight">
                {user?.name ?? "Account"}
              </div>
              <div className="text-[8px] text-[var(--bos-text-tertiary)] truncate max-w-[140px] leading-tight">
                {user?.email}
              </div>
            </div>
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
              aria-label="Sign out"
              className="flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-sm text-[9px] font-mono tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)] transition-colors hover:text-[var(--bos-error)] hover:bg-[var(--bos-overlay)]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
