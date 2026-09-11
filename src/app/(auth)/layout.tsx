"use client";

import { useState, useEffect } from "react";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { SystemFooter } from "@/components/system-footer";
import { SystemFlow } from "@/components/system-flow";
import {
  NoticeBannerBar,
  NoticeBoardWidget,
  NoticeBoardModal,
  NoticeFloatingBeacon,
} from "@/components/notice-board";

/**
 * Shared authentication layout.
 *
 * Provides the full-screen Business OS experience:
 * - Persistent development preview notice banner
 * - Interactive notice board modal & roadmap telemetry
 * - System grid + ambient background
 * - Desktop: brand zone with preview widget + auth panel
 * - Mobile: auth panel with responsive banner & notice beacon
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="auth-layout relative min-h-screen bg-[var(--bos-bg)] flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      {/* ── Persistent Top Notice Bar ──────────────────── */}
      <NoticeBannerBar onOpenModal={() => setModalOpen(true)} />

      <div className="relative flex-1 flex flex-col lg:flex-row overflow-x-hidden min-h-0 w-full">
        {/* System Grid — full screen, behind everything */}
        <SystemGrid />

        {/* Ambient Background — subtle motion */}
        <AmbientBackground />

        {/* ── Desktop Brand Zone ───────────────────────── */}
        <div className="hidden lg:flex lg:w-[54%] xl:w-[56%] flex-col justify-between p-8 xl:p-12 relative z-10 border-r border-[var(--bos-line)] overflow-y-auto">
          {/* Top */}
          <div className="shrink-0 mb-4">
            <BusinessOSLogo size="lg" showTagline />
          </div>

          {/* Center — editorial statement + notice widget + system visualization */}
          <div className="flex-1 flex flex-col justify-center my-2">
            <div className="max-w-md">
              <div className="section-number mb-2">
                <span className="opacity-30">—</span> ENTER YOUR OS
              </div>
              <h2 className="text-[32px] xl:text-[40px] font-semibold tracking-tight leading-[1.08] text-[var(--bos-text-primary)]">
                BUSINESS
                <br />
                OPERATIONS
              </h2>
              <div className="flex items-center gap-3 mt-2 mb-3">
                <div className="h-px flex-1 max-w-[80px] bg-[var(--bos-accent)]" />
                <span className="text-[13px] font-medium text-[var(--bos-text-secondary)] tracking-wide">
                  CONNECTED.
                </span>
              </div>
              <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed max-w-sm">
                A structured environment for managing clients, requirements, projects, and delivery.
              </p>
            </div>

            {/* Development Notice Board Widget with generated visual & telemetry */}
            <NoticeBoardWidget onOpenModal={() => setModalOpen(true)} />

            {/* System flow visualization */}
            <div className="mt-5">
              <SystemFlow />
            </div>
          </div>

          {/* Bottom */}
          <div className="shrink-0 pt-4">
            <SystemFooter />
          </div>
        </div>

        {/* ── Auth Panel ──────────────────────────────── */}
        <main className="flex-1 flex flex-col relative z-10 min-h-0 overflow-y-auto w-full max-w-full overflow-x-hidden">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[var(--bos-line)] shrink-0 bg-[var(--bos-bg)]/80 backdrop-blur-xs">
            <BusinessOSLogo size="sm" />
            <div className="section-number text-[9px]">
              ACCESS <span className="opacity-30">—</span> 01
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 w-full">
            {children}
          </div>

          {/* Mobile footer */}
          <div className="lg:hidden px-4 sm:px-6 py-3 border-t border-[var(--bos-line)] shrink-0 w-full overflow-hidden">
            <SystemFooter />
          </div>
        </main>
      </div>

      {/* ── Interactive Modal ───────────────────────── */}
      <NoticeBoardModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── Corner Floating Beacon ───────────────────── */}
      {!modalOpen && <NoticeFloatingBeacon onOpen={() => setModalOpen(true)} />}
    </div>
  );
}