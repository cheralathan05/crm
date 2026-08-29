"use client";

import { useState } from "react";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Share2,
  FileCode,
  Globe,
  Database,
  Server,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildWorkspaceProps {
  homeData: any;
  onOpenProofModal: () => void;
  onOpenBlockerModal: () => void;
  onOpenAIReviewModal: () => void;
  onOpenHandoffModal: () => void;
  onOpenSubmitModal?: () => void;
  onOpenSignatureView?: () => void;
}

export function BuildWorkspaceView({
  homeData,
  onOpenProofModal,
  onOpenBlockerModal,
  onOpenAIReviewModal,
  onOpenHandoffModal,
  onOpenSubmitModal,
  onOpenSignatureView,
}: BuildWorkspaceProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(1); // 1 = Build UI

  if (!homeData) return null;

  const { project, yourArea, currentBuild, dependency } = homeData;

  const buildSteps = [
    { id: "step-understand", label: "1. Understand Requirement", key: "UNDERSTAND" },
    { id: "step-ui", label: "2. Build UI Interface", key: "BUILD_UI" },
    { id: "step-data", label: "3. Connect API & Data", key: "CONNECT_DATA" },
    { id: "step-states", label: "4. Handle States (Loading/Error)", key: "HANDLE_STATES" },
    { id: "step-responsive", label: "5. Responsive Layout", key: "RESPONSIVE" },
    { id: "step-test", label: "6. Test & Verify", key: "TEST" },
    { id: "step-prove", label: "7. Prove This Build", key: "PROVE" },
    { id: "step-review", label: "8. Peer & AI Review", key: "REVIEW" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150 font-sans">
      {/* ── TOP LIVE CONTEXT BAR ────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              CURRENTLY BUILDING
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[var(--bos-text-primary)]">
              {currentBuild.featureName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {onOpenSignatureView && (
            <button
              onClick={onOpenSignatureView}
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Build Journey</span>
            </button>
          )}

          {onOpenSubmitModal && (
            <button
              onClick={onOpenSubmitModal}
              className="px-4 py-1.5 rounded-xl bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)] transition-all flex items-center gap-1.5 cursor-pointer font-bold shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Submit for Verification</span>
            </button>
          )}

          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
            STATUS: {currentBuild.status}
          </span>
          <button
            onClick={onOpenBlockerModal}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Report Blocker</span>
          </button>
        </div>
      </div>

      {/* ── 3-COLUMN BUILD ENVIRONMENT ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: BUILD STEPS (Col 3) ───────────────────────── */}
        <div className="lg:col-span-3 p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
            BUILD STEPS
          </span>
          <div className="space-y-1.5 text-xs font-mono">
            {buildSteps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={cn(
                    "w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer",
                    isCurrent
                      ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                      : isPast
                      ? "bg-[var(--bos-surface-panel)] text-emerald-400 hover:bg-[var(--bos-surface-subtle)]"
                      : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-surface-subtle)] hover:text-[var(--bos-text-primary)]"
                  )}
                >
                  <span>{step.label}</span>
                  {isPast && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isCurrent && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[var(--bos-border)] space-y-2">
            <button
              onClick={onOpenProofModal}
              className="w-full py-2.5 bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-subtle)] text-[var(--bos-text-primary)] border border-[var(--bos-border)] text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span>Capture Proof</span>
            </button>

            {onOpenSubmitModal && (
              <button
                onClick={onOpenSubmitModal}
                className="w-full py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Submit for Verification</span>
              </button>
            )}
          </div>
        </div>

        {/* ── CENTER COLUMN: WORK CONTEXT (Col 6) ────────────────────── */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                ACTIVE STEP: {buildSteps[currentStepIndex]?.label}
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                Step {currentStepIndex + 1} of {buildSteps.length}
              </span>
            </div>

            {currentStepIndex === 0 && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">
                  Step 1: Understand Requirement
                </h3>
                <p className="text-[var(--bos-text-secondary)] leading-relaxed">
                  Review the core requirement specifications and verify that you understand all expected behavior, user inputs, and output states.
                </p>
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1">
                  <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold">CORE OBJECTIVE</span>
                  <p className="text-[var(--bos-text-primary)]">{currentBuild.expectedResult}</p>
                </div>
              </div>
            )}

            {currentStepIndex === 1 && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">
                  Step 2: Build UI Components
                </h3>
                <p className="text-[var(--bos-text-secondary)] leading-relaxed">
                  Implement the layout, typographic hierarchy, responsive containers, and client action triggers for {currentBuild.featureName}.
                </p>
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1 font-mono text-[11px]">
                  <span className="text-[10px] text-blue-400 uppercase font-bold">COMPONENT SPEC</span>
                  <p className="text-[var(--bos-text-primary)]">Include view header, dynamic list/grid, primary submission action, and state wrappers.</p>
                </div>
              </div>
            )}

            {currentStepIndex === 2 && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">
                  Step 3: Connect API & Data
                </h3>
                <p className="text-[var(--bos-text-secondary)] leading-relaxed">
                  Bind the approved API endpoint to the interface. Handle response serialization and query parameters.
                </p>
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1 font-mono text-[11px]">
                  <span className="text-[10px] text-purple-400 uppercase font-bold">API CONTRACT</span>
                  <p className="text-purple-400 font-bold">{dependency.name}</p>
                  <p className="text-[var(--bos-text-secondary)]">Status: {dependency.status} (Owner: {dependency.ownerRole})</p>
                </div>
              </div>
            )}

            {currentStepIndex >= 3 && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">
                  {buildSteps[currentStepIndex]?.label}
                </h3>
                <p className="text-[var(--bos-text-secondary)] leading-relaxed">
                  Ensure all states (loading, error, empty) and responsive breakpoints function smoothly before capturing proof.
                </p>
              </div>
            )}

            {/* Step Navigation Actions */}
            <div className="pt-4 border-t border-[var(--bos-border)] flex items-center justify-between">
              <button
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl bg-[var(--bos-surface-panel)] text-xs font-mono text-[var(--bos-text-secondary)] disabled:opacity-30 cursor-pointer"
              >
                &larr; Previous Step
              </button>
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.min(buildSteps.length - 1, prev + 1))}
                className="px-5 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{currentStepIndex === buildSteps.length - 1 ? "Finish & Review" : "Next Step"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <button
              onClick={onOpenAIReviewModal}
              className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Build Review</span>
            </button>

            <button
              onClick={onOpenHandoffModal}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Handoff to QA</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: PROJECT CONTEXT (Col 3) ──────────────────── */}
        <div className="lg:col-span-3 space-y-4 text-xs font-sans">
          {/* REQUIREMENT */}
          <div className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
            <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase block">
              REQUIREMENT
            </span>
            <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
              {currentBuild.expectedResult}
            </p>
          </div>

          {/* DESIGN */}
          <div className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
            <span className="font-mono text-[10px] font-bold text-blue-400 uppercase block">
              APPROVED DESIGN
            </span>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Follows standard design system tokens and architectural specs.
            </p>
          </div>

          {/* DEPENDENCIES */}
          <div className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
            <span className="font-mono text-[10px] font-bold text-purple-400 uppercase block">
              DEPENDENCIES
            </span>
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1">
              <span className="font-mono font-bold text-purple-400 block">{dependency.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">✓ {dependency.status}</span>
            </div>
          </div>

          {/* ACCEPTANCE CRITERIA */}
          <div className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
            <span className="font-mono text-[10px] font-bold text-amber-400 uppercase block">
              ACCEPTANCE CRITERIA
            </span>
            <ul className="space-y-1.5 text-xs text-[var(--bos-text-primary)]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interface renders data</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Responsive on mobile</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Loading & error states</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
