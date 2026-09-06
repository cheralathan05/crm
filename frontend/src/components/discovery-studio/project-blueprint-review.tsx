"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Building2,
  Compass,
  Layers,
  FileCheck2,
  AlertCircle,
  Ban,
  Activity,
  Code2,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoverySessionDto } from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   REVIEW MODE — PROJECT BLUEPRINT (Screens 51, 52, 54, 55, 56, 57)
   Executive Blueprint View + AI Quality Check + Formal Client Approval Ceremony.
   ──────────────────────────────────────────────────────────────────────────── */

interface ProjectBlueprintReviewProps {
  session: DiscoverySessionDto;
  onBackToDiscovery: () => void;
  onApprove: (approverName: string, approverEmail?: string) => Promise<void>;
  isApproving: boolean;
}

export function ProjectBlueprintReview({
  session,
  onBackToDiscovery,
  onApprove,
  isApproving,
}: ProjectBlueprintReviewProps) {
  const { model } = session;
  const [approverName, setApproverName] = useState(session.approverName || session.companyName || "");
  const [approverEmail, setApproverEmail] = useState("");
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);

  const isLocked = session.isLocked;

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approverName.trim() || !confirmedCheckbox || isApproving) return;
    await onApprove(approverName.trim(), approverEmail.trim() || undefined);
  };

  return (
    <div className="w-full min-h-full bg-[var(--bos-bg)] flex flex-col">
      {/* Top Banner Navigation */}
      <div className="px-5 sm:px-8 py-4 border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/60 flex items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDiscovery}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] text-[12px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Discovery Workspace</span>
          </button>

          <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
            Project Blueprint Review
          </span>
        </div>

        {/* Quality Status Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[11px] font-mono font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Quality Check: Ready for Approval</span>
          </span>
        </div>
      </div>

      {/* Main Blueprint Document */}
      <div className="max-w-4xl mx-auto w-full px-5 sm:px-8 py-10 sm:py-14 space-y-12">
        {/* Document Title Header */}
        <div className="border-b border-[var(--bos-line)] pb-8">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bos-accent)]">
            <span>Executive Project Blueprint</span>
            <span>·</span>
            <span>{session.reference}</span>
          </div>

          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
            {model.whatWeAreBuilding.businessType || session.projectTitle}
          </h1>

          <p className="mt-2 text-[14px] text-[var(--bos-text-secondary)]">
            Prepared for <span className="font-semibold text-[var(--bos-text-primary)]">{session.companyName}</span> · Generated through Business OS Intelligent Project Discovery.
          </p>

          {isLocked && (
            <div className="mt-4 p-3 rounded-sm border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-[12px] text-emerald-700 font-medium">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Approved & Locked on {session.approvedAt ? new Date(session.approvedAt).toLocaleDateString() : "today"} by {session.approverName || "Client"}. Technical specification generated.
              </span>
            </div>
          )}
        </div>

        {/* SECTION 01: Business & Problem Context */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold">
            <span>01</span>
            <span>·</span>
            <span>Business Context & Objectives</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block mb-1">
                Business Problem Solved
              </span>
              <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">
                {model.whatWeAreBuilding.problemStatement || "Modernizing existing order handling into a dedicated digital platform."}
              </p>
            </div>

            <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block mb-1">
                Core Goal & Outcome
              </span>
              <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">
                {model.whatWeAreBuilding.coreGoal || "Centralize customer orders and streamline order fulfillment."}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 02: Process Transformation (Today vs Future) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold">
            <span>02</span>
            <span>·</span>
            <span>Process Transformation</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-sm border border-rose-500/20 bg-rose-500/5 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 font-semibold block">
                Today&apos;s Current Process
              </span>
              <ul className="space-y-1.5 text-[12px] text-[var(--bos-text-secondary)]">
                {model.processTransformation.todayProcess.length > 0 ? (
                  model.processTransformation.todayProcess.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li>Manual message handling and disjointed record keeping.</li>
                )}
              </ul>
            </div>

            <div className="p-4 rounded-sm border border-emerald-500/20 bg-emerald-500/5 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 font-semibold block">
                Future Proposed Process (Business OS)
              </span>
              <ul className="space-y-1.5 text-[12px] text-[var(--bos-text-primary)] font-medium">
                {model.processTransformation.futureProcess.length > 0 ? (
                  model.processTransformation.futureProcess.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span>✓</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li>Automated customer online storefront with live order status updates.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 03: Customer Journey Map */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold">
            <span>03</span>
            <span>·</span>
            <span>Customer Experience Journey</span>
          </div>

          <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40">
            {model.journeys[0]?.steps ? (
              <div className="flex flex-wrap items-center gap-2">
                {model.journeys[0].steps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-sm bg-[var(--bos-surface-panel)] border border-[var(--bos-line)] text-[12px] font-medium text-[var(--bos-text-primary)] shadow-xs">
                      {sIdx + 1}. {step}
                    </span>
                    {sIdx < model.journeys[0].steps.length - 1 && (
                      <span className="text-[var(--bos-accent)] font-bold">→</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-[var(--bos-text-tertiary)]">Journey pipeline</span>
            )}
          </div>
        </section>

        {/* SECTION 04: Capabilities Matrix */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold">
            <span>04</span>
            <span>·</span>
            <span>System Capabilities ({model.capabilities.length})</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {model.capabilities.map((cap) => (
              <div key={cap.id} className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-[13px] text-[var(--bos-text-primary)]">{cap.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-xs bg-[var(--bos-surface)] border border-[var(--bos-line)]">
                    {cap.roleName}
                  </span>
                </div>
                {cap.description && (
                  <p className="mt-1 text-[11px] text-[var(--bos-text-secondary)] leading-relaxed">
                    {cap.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 05: Scope Radar & Protection */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold">
            <span>05</span>
            <span>·</span>
            <span>Scope Boundaries & Out-Of-Scope Protection</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/30 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 font-semibold block">
                Included in Project Scope
              </span>
              <ul className="space-y-1 text-[12px] text-[var(--bos-text-primary)]">
                {model.scopeRadar.core.map((item) => (
                  <li key={item.id}>• {item.title}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-sm border border-rose-500/20 bg-rose-500/5 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 font-semibold block">
                Explicitly Out of Scope (Protected)
              </span>
              <ul className="space-y-1 text-[12px] text-[var(--bos-text-secondary)]">
                {model.scopeRadar.outOfScope.length > 0 ? (
                  model.scopeRadar.outOfScope.map((item) => (
                    <li key={item.id} className="line-through">• {item.title}</li>
                  ))
                ) : (
                  <li>No explicit exclusions logged yet.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 06: Formal Approval Ceremony (Screen 56) */}
        {!isLocked && (
          <section className="pt-8 border-t border-[var(--bos-line)]">
            <div className="rounded-sm border-2 border-[var(--bos-accent)] bg-[var(--bos-surface)]/80 p-6 sm:p-8 space-y-5 shadow-md">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[var(--bos-accent)]" />
                <h3 className="text-[18px] font-semibold text-[var(--bos-text-primary)]">
                  Approve Project Understanding
                </h3>
              </div>

              <p className="text-[13px] text-[var(--bos-text-secondary)] leading-relaxed">
                This blueprint represents what you have shared with Business OS about your project. Upon your approval, this business understanding will be locked, and detailed technical specifications and proposals will be generated directly from this approved scope.
              </p>

              <form onSubmit={handleApprove} className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-1">
                      Sign-off Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="e.g. Cheralathan"
                      className="w-full h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-1">
                      Business Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={approverEmail}
                      onChange={(e) => setApproverEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="w-full h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-[12px] text-[var(--bos-text-primary)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={confirmedCheckbox}
                    onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                    className="mt-0.5 accent-[var(--bos-accent)]"
                  />
                  <span>
                    I confirm that this project blueprint accurately reflects our business goals and requirements.
                  </span>
                </label>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!approverName.trim() || !confirmedCheckbox || isApproving}
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 shadow-sm transition-colors"
                  >
                    {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Approve Project Understanding</span>
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
