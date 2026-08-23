"use client";

import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { SystemFooter } from "@/components/system-footer";
import { SystemFlow } from "@/components/system-flow";

/**
 * Shared authentication layout.
 *
 * Provides the full-screen Business OS experience:
 * - System grid + ambient background
 * - Desktop: brand zone (55%) + auth panel (45%)
 * - Mobile: auth panel only with compact header/footer
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout relative min-h-screen bg-[var(--bos-bg)] flex flex-col lg:flex-row">
      {/* System Grid — full screen, behind everything */}
      <SystemGrid />

      {/* Ambient Background — subtle motion */}
      <AmbientBackground />

      {/* ── Desktop Brand Zone ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col justify-between p-10 xl:p-14 relative z-10 border-r border-[var(--bos-line)]">
        {/* Top */}
        <div>
          <BusinessOSLogo size="lg" showTagline />
        </div>

        {/* Center — editorial statement + system visualization */}
        <div className="flex-1 flex flex-col justify-center -mt-16">
          <div className="max-w-md">
            <div className="section-number mb-6">
              <span className="opacity-30">—</span> ENTER YOUR OS
            </div>
            <h2 className="text-[44px] xl:text-[52px] font-semibold tracking-tight leading-[1.05] text-[var(--bos-text-primary)]">
              BUSINESS
              <br />
              OPERATIONS
            </h2>
            <div className="flex items-center gap-3 mt-3 mb-8">
              <div className="h-px flex-1 max-w-[80px] bg-[var(--bos-accent)]" />
              <span className="text-[15px] font-medium text-[var(--bos-text-secondary)] tracking-wide">
                CONNECTED.
              </span>
            </div>
            <p className="text-sm text-[var(--bos-text-secondary)] leading-relaxed max-w-xs">
              A structured environment for managing clients, requirements, projects, and delivery.
            </p>
          </div>

          {/* System flow visualization */}
          <div className="mt-12">
            <SystemFlow />
          </div>
        </div>

        {/* Bottom */}
        <SystemFooter />
      </div>

      {/* ── Auth Panel ──────────────────────────────── */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-[var(--bos-line)]">
          <BusinessOSLogo size="sm" />
          <div className="section-number text-[9px]">
            ACCESS <span className="opacity-30">—</span> 01
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden px-6 py-4">
          <SystemFooter />
        </div>
      </main>
    </div>
  );
}