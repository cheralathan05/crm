"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  AlertTriangle,
  Radio,
  Sparkles,
  Activity,
  Terminal,
  ExternalLink,
  ChevronRight,
  X,
  Layers,
  Cpu,
  CheckCircle2,
  Wrench,
  RefreshCw,
  ShieldAlert,
  Calendar,
  Zap,
} from "lucide-react";

/**
 * Top announcement banner for active development preview.
 */
export function NoticeBannerBar({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <aside
      aria-label="Development status announcement"
      className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-cyan-500/10 border-b border-amber-500/30 px-3 py-1.5 sm:py-2 text-xs relative z-50 backdrop-blur-md shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 text-[var(--bos-text-primary)]">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-[9px] sm:text-[10px] font-bold tracking-wider uppercase border border-amber-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Preview
          </span>
          <span className="font-medium text-[11px] sm:text-xs truncate">
            <strong className="text-amber-700 dark:text-amber-300 font-semibold">NOT FINAL:</strong>{" "}
            <span className="hidden sm:inline">This CRM instance is under continuous deployment & feature iteration.</span>
            <span className="sm:hidden">Under continuous live development.</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline decoration-amber-500/40 hover:decoration-amber-400 transition-colors cursor-pointer shrink-0"
        >
          <span className="hidden sm:inline">Open Notice Board</span>
          <span className="sm:hidden">Roadmap</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}

/**
 * Embedded Notice Card for the desktop Brand Zone.
 */
export function NoticeBoardWidget({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section aria-label="Development status widget" className="mt-6 w-full max-w-lg rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-black/40 to-black/60 backdrop-blur-xl p-4 shadow-xl relative overflow-hidden group">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/25 transition-all duration-700" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header with status badge */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold flex items-center gap-1.5">
              <span>Notice Board</span>
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              <span>Phase: Alpha / Beta 2.1</span>
            </div>
            <h4 className="text-xs font-semibold text-[var(--bos-text-primary)]">
              Under Active Development
            </h4>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/90 border border-white/15">
          v0.9.8 Preview
        </span>
      </div>

      {/* Hero Visual Thumbnail */}
      <div
        onClick={onOpenModal}
        className="relative w-full h-28 rounded-lg overflow-hidden border border-white/15 cursor-pointer mb-3 group/thumb"
      >
        <Image
          src="/development_notice_banner.jpg"
          alt="Business OS Active Development Notice"
          fill
          className="object-cover group-hover/thumb:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2.5">
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-mono text-cyan-300 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Click to view active milestones & telemetry</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
              EXPAND ↗
            </span>
          </div>
        </div>
      </div>

      {/* Key notices list */}
      <div className="space-y-1.5 text-[11px] text-[var(--bos-text-secondary)] relative z-10">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-[var(--bos-text-primary)]">Continuous Deployment:</strong> Live schema updates & API synchronization are running.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-[var(--bos-text-primary)]">Staging Environment:</strong> Mock accounts and data may be refreshed during test passes.
          </span>
        </div>
      </div>

      {/* Footer trigger */}
      <button
        type="button"
        onClick={onOpenModal}
        className="mt-3 w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <span>View Full Development Notice & Roadmap</span>
        <ChevronRight className="w-3 h-3" />
      </button>
    </section>
  );
}

/**
 * Full interactive Notice Board Modal dialog.
 */
export function NoticeBoardModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem("bos_notice_dismissed", "true");
      } catch {}
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
            className="relative w-full max-w-2xl bg-[#0e1017] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[88dvh]"
          >
            {/* Top Glow bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-cyan-400 shrink-0" />

            {/* Header Image with HUD Overlays */}
            <div className="relative w-full h-28 sm:h-52 shrink-0 bg-black overflow-hidden border-b border-white/10">
              <Image
                src="/development_notice_banner.jpg"
                alt="Development Preview Banner"
                fill
                priority
                className="object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-[#0e1017]/40 to-transparent" />

              {/* Close button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/20 transition-all flex items-center justify-center cursor-pointer z-30"
                aria-label="Close notice board"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Live badges over banner */}
              <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 z-10 max-w-[calc(100%-48px)] flex-wrap">
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-pulse" />
                  PREVIEW BUILD
                </span>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono backdrop-blur-md">
                  RENDER STAGING
                </span>
              </div>

              <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3 sm:left-4 sm:right-4 z-10">
                <h3 className="text-base sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Business OS CRM</span>
                  <span className="text-[10px] sm:text-xs font-mono font-normal px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    v0.9.8_DevPreview
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-amber-300/90 font-medium mt-0.5 truncate">
                  Under Active Construction & Continual Refinement
                </p>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-sm text-slate-300 flex-1 min-h-0">
              {/* Important Announcement Box */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 sm:p-4 relative overflow-hidden">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-amber-300">
                      Please Note: This is NOT the Final Release
                    </h4>
                    <p className="text-[11.5px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                      You are accessing a live public deployment of our working codebase.
                      We are rapidly testing architecture updates, new UI layouts, role-based workflows, and real-time backend integrations. Features may change and demo sessions are subject to periodic updates.
                    </p>
                  </div>
                </div>
              </div>

              {/* Telemetry / Live Status Matrix */}
              <div>
                <h5 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Current Deployment Telemetry</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">STATUS</div>
                    <div className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live / Active
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">TARGET</div>
                    <div className="text-cyan-300 font-semibold mt-0.5 break-words">Next.js 16 Fullstack</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">DATABASE</div>
                    <div className="text-amber-300 font-semibold mt-0.5 break-words">Prisma 7 + SQLite</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">BACKEND ENGINE</div>
                    <div className="text-purple-300 font-semibold mt-0.5 break-words">Control Plane Ready</div>
                  </div>
                </div>
              </div>

              {/* What is being updated right now */}
              <div>
                <h5 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
                  <span>Active Roadmap & Current Sprints</span>
                </h5>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-2.5 sm:gap-3">
                    <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Multi-Service Separation & Node Control Plane
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Transitioning background workers, health monitoring, and control plane engines to dedicated independent services.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-2.5 sm:gap-3">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Discovery, Requirements & Proposal Automation
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Polishing collaborative client proposals, automated PDF exports, milestone billing, and real-time task breakdowns.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-start gap-2.5 sm:gap-3">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Employee Portal & Work Execution Graph
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Interactive task boards, blocker escalation, deliverable approvals, and team workspace synchronizations.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-5 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none w-full sm:w-auto">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-white/10 accent-amber-500 text-amber-500 cursor-pointer"
                />
                <span className="text-[11px] sm:text-xs">Don't show automatically on this device</span>
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-center"
                >
                  ✓ Understood — Continue
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Floating corner beacon so users can re-open the notice board anytime (desktop/tablet).
 */
export function NoticeFloatingBeacon({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 hidden sm:inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full bg-[#0e1017]/90 border border-amber-500/40 text-amber-300 shadow-xl backdrop-blur-md hover:border-amber-400 hover:bg-[#0e1017] transition-all group cursor-pointer"
      title="View Active Development Notice"
    >
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-ping" />
      <span className="text-[10px] sm:text-[11px] font-mono font-medium tracking-wide">
        Preview Notice
      </span>
      <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
        v0.9.8
      </span>
    </button>
  );
}

/**
 * Complete Development Notice System Controller.
 * Provides the Banner Bar, Widget, Modal, and Floating Beacon with localStorage sync.
 */
export function DevelopmentNoticeSystem({
  showWidget = false,
}: {
  showWidget?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <NoticeBannerBar onOpenModal={() => setModalOpen(true)} />
      {showWidget && <NoticeBoardWidget onOpenModal={() => setModalOpen(true)} />}
      <NoticeBoardModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      {!modalOpen && <NoticeFloatingBeacon onOpen={() => setModalOpen(true)} />}
    </>
  );
}
