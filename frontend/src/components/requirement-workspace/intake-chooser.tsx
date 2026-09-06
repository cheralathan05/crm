"use client";

import { ArrowRight, Code2, Sparkles, CheckCircle2, History, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoverySessionDto } from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   FIRST SCREEN — INTAKE PATH CHOOSER (Screen 02)
   "BUILD YOUR PROJECT"
   Empowers the client to choose:
   - 👨‍💻 I'M TECHNICAL: Direct authoring control over full technical requirements.
   - ✨ HELP ME DEFINE IT: Interactive Project Discovery Studio with Business OS.
   ──────────────────────────────────────────────────────────────────────────── */

interface IntakeChooserProps {
  projectTitle: string;
  companyName: string;
  reference: string;
  existingSession?: DiscoverySessionDto | null;
  onSelectTechnical: () => void;
  onSelectGuided: () => void;
  onResumeGuided: () => void;
}

export function IntakeChooser({
  projectTitle,
  companyName,
  reference,
  existingSession,
  onSelectTechnical,
  onSelectGuided,
  onResumeGuided,
}: IntakeChooserProps) {
  const hasDiscoveryProgress = existingSession && existingSession.completeness > 0;
  const isApproved = existingSession?.mode === "APPROVED";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--bos-line-strong)] bg-[var(--bos-surface)]/60 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
          <span>Project Intake</span>
          <span>·</span>
          <span>{reference}</span>
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
          Build Your Project
        </h1>

        <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-[var(--bos-text-secondary)]">
          Let&apos;s understand what you want to create for <span className="font-semibold text-[var(--bos-text-primary)]">{companyName}</span>. How would you like to provide your project details?
        </p>
      </div>

      {/* Resume Banner if user already has an active session */}
      {hasDiscoveryProgress && (
        <div className="mb-8 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 p-5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bos-accent)]/15 text-[var(--bos-accent)] shrink-0">
                {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <History className="w-4 h-4" />}
              </span>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
                  {isApproved ? "Approved Project Understanding" : "Discovery Session in Progress"}
                </div>
                <div className="text-[14px] font-semibold text-[var(--bos-text-primary)] mt-0.5">
                  {isApproved
                    ? "Your project understanding has been approved."
                    : `We were defining: ${existingSession?.model.whatWeAreBuilding.businessType || projectTitle}`}
                </div>
                <div className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                  {isApproved
                    ? `Signed off by ${existingSession.approverName || "Client"} · Technical specification ready`
                    : `Last focus: ${existingSession?.lastDiscussedTopic || "Core Features"} · ${existingSession.model.openDecisions.length} decisions recorded`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onResumeGuided}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors shrink-0"
            >
              {isApproved ? "View Project Blueprint" : "Continue Discovery"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Two Core Paths */}
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        {/* Option 1: Advanced Intake (Technical) */}
        <div className="flex flex-col rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] p-6 sm:p-7 transition-all duration-200 hover:border-[var(--bos-border-strong)] hover:shadow-[var(--bos-shadow-md)]">
          <div className="w-12 h-12 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-surface)] flex items-center justify-center text-[var(--bos-text-primary)] mb-5">
            <Code2 className="w-6 h-6" />
          </div>

          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">
            Technical Path
          </div>

          <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
            I&apos;m Technical
          </h2>

          <p className="mt-3 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] flex-1">
            I already understand software architectures and want direct authoring control over tech stack, database models, APIs, authentication, security, and acceptance criteria.
          </p>

          <div className="mt-6 pt-5 border-t border-[var(--bos-line)]">
            <button
              type="button"
              onClick={onSelectTechnical}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-sm border border-[var(--bos-line-strong)] bg-transparent text-[13px] font-medium text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-surface)] transition-colors"
            >
              Use Advanced Intake
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Option 2: Project Discovery Studio (Guided) */}
        <div className="flex flex-col rounded-sm border-2 border-[var(--bos-accent)]/50 bg-[var(--bos-surface)]/70 p-6 sm:p-7 relative overflow-hidden transition-all duration-200 hover:border-[var(--bos-accent)] hover:shadow-[var(--bos-shadow-lg)]">
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--bos-accent)]/15 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] font-semibold">
              Recommended
            </span>
          </div>

          <div className="w-12 h-12 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center mb-5 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>

          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
            Intelligent Studio
          </div>

          <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
            Help Me Define It
          </h2>

          <p className="mt-3 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] flex-1">
            I know my business and what I want to achieve, but I don&apos;t want to deal with technical details. Business OS will guide me through an adaptive discovery studio and build my project model live.
          </p>

          <div className="mt-6 pt-5 border-t border-[var(--bos-line)]">
            <button
              type="button"
              onClick={onSelectGuided}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:bg-[var(--bos-accent-hover)] shadow-sm transition-colors"
            >
              Start Project Discovery
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Security & Autosave note */}
      <div className="mt-10 text-center text-[11px] text-[var(--bos-text-tertiary)] flex items-center justify-center gap-4">
        <span>✓ Private & tenant-isolated</span>
        <span>·</span>
        <span>✓ Every answer & decision saves automatically</span>
        <span>·</span>
        <span>✓ Zero technical jargon required</span>
      </div>
    </div>
  );
}
