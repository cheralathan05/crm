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
  CheckSquare,
  Square,
  FileText,
  GitPullRequest,
  Check,
  AlertTriangle,
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
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      if (homeData?.currentFocus?.checklistState) {
        return typeof homeData.currentFocus.checklistState === "string"
          ? JSON.parse(homeData.currentFocus.checklistState)
          : homeData.currentFocus.checklistState;
      }
    } catch {}
    return {};
  });

  if (!homeData) return null;

  const { employee, project, currentFocus, dependency } = homeData;
  const criteria = currentFocus?.doneWhen || [
    { id: "AC-01", criterion: "Interface renders layout and conforms to design tokens" },
    { id: "AC-02", criterion: "Connected API endpoints load without runtime errors" },
    { id: "AC-03", criterion: "Loading, empty, and error fallback states handled" },
    { id: "AC-04", criterion: "Responsive mobile and desktop views verified" },
  ];

  const proofs = currentFocus?.proofs || [];

  const toggleCriterion = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150 font-sans pb-16">
      {/* ── TOP LIVE CONTEXT BAR ────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)]">
                FOCUSED BUILD MODE
              </span>
              <span className="font-mono text-xs text-[var(--bos-text-tertiary)]">•</span>
              <span className="font-mono text-xs text-[var(--bos-text-secondary)]">{employee?.role} ({employee?.workstream})</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--bos-text-primary)]">
              {currentFocus?.productAreaName}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {onOpenSignatureView && (
            <button
              onClick={onOpenSignatureView}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Review Journey</span>
            </button>
          )}

          {onOpenSubmitModal && (
            <button
              onClick={onOpenSubmitModal}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 cursor-pointer font-bold shadow-md hover:shadow-emerald-600/30 font-mono text-xs uppercase"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Send to Admin for Checking</span>
            </button>
          )}

          <span className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
            {currentFocus?.status || "BUILDING"}
          </span>

          <button
            onClick={onOpenBlockerModal}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Blocker</span>
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN STRUCTURED BUILD ENVIRONMENT ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT COLUMN: WORK SPECIFICATIONS & PROOFS (Col 7) ──────── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* WHY & WHAT YOU ARE BUILDING */}
          <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
              1. PURPOSE & REQUIREMENT (WHY)
            </span>
            <p className="text-xs sm:text-sm text-[var(--bos-text-secondary)] leading-relaxed">
              {currentFocus?.why}
            </p>

            <div className="pt-2 border-t border-[var(--bos-border)] space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 block">
                2. WHAT YOU ARE BUILDING (SCOPE)
              </span>
              <p className="text-xs sm:text-sm text-[var(--bos-text-primary)] leading-relaxed">
                {currentFocus?.whatYouAreBuilding}
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--bos-border)] space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                3. EXPECTED USER EXPERIENCE (BEHAVIOR)
              </span>
              <p className="text-xs sm:text-sm text-[var(--bos-text-secondary)] leading-relaxed">
                {currentFocus?.userExperience}
              </p>
            </div>
          </div>

          {/* VISUAL / DESIGN SPEC */}
          <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
              4. WHAT IT SHOULD LOOK LIKE
            </span>
            
            <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--bos-text-primary)]">
                  Approved Design Specification
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
                  Design Tokens Active
                </span>
              </div>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                Specification Route: <span className="font-mono text-purple-400">{currentFocus?.visualSpec?.specRoute || "/app"}</span>
              </p>
              <p className="text-[11px] text-[var(--bos-text-tertiary)]">
                Complies with enterprise design hierarchy, typography tokens, responsive containers, and color accessibility requirements.
              </p>
            </div>
          </div>

          {/* CAPTURED PROOF SECTION */}
          <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
                  VERIFICATION PROOF
                </span>
                <h3 className="text-base font-bold text-[var(--bos-text-primary)]">
                  EVIDENCE OF WORK ({proofs.length})
                </h3>
              </div>
              <button
                onClick={onOpenProofModal}
                className="px-4 py-2 rounded-xl bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-subtle)] text-[var(--bos-text-primary)] border border-[var(--bos-border)] text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span>+ Capture Proof</span>
              </button>
            </div>

            {proofs.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-[var(--bos-border)] text-center space-y-2">
                <FileText className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
                <p className="text-xs text-[var(--bos-text-secondary)] font-mono">
                  No proof submitted yet.
                </p>
                <p className="text-[11px] text-[var(--bos-text-tertiary)]">
                  Attach screenshots, pull requests, commit hashes, or test logs to prove completion.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {proofs.map((proof: any, idx: number) => (
                  <div
                    key={proof.id || idx}
                    className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-mono text-[9px] font-bold uppercase">
                          {proof.type}
                        </span>
                        <span className="font-bold text-[var(--bos-text-primary)]">
                          {proof.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--bos-text-secondary)]">
                        {proof.whatChanged}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0 pt-0.5">
                      ✓ Attached
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: CHECKLIST & CONNECTIVITY (Col 5) ──────────── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* DONE WHEN: ACCEPTANCE CRITERIA CHECKLIST */}
          <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
              5. DONE WHEN (ACCEPTANCE CRITERIA)
            </span>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Check off criteria as you build. Must be satisfied before submitting proof for Admin review.
            </p>

            <div className="space-y-2.5 pt-1">
              {criteria.map((item: any) => {
                const checked = !!checklist[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCriterion(item.id)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs",
                      checked
                        ? "bg-emerald-500/5 border-emerald-500/30 text-[var(--bos-text-primary)]"
                        : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-hover)]"
                    )}
                  >
                    <div className="pt-0.5">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] text-emerald-400 font-bold block">
                        {item.id}
                      </span>
                      <p className="leading-relaxed">{item.criterion}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONNECTED ARCHITECTURE */}
          <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
              6. CONNECTED ARCHITECTURE
            </span>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
                  <span>API CONTRACT</span>
                  <span className="text-emerald-400 font-bold">READY</span>
                </div>
                <p className="font-bold text-[var(--bos-text-primary)]">{currentFocus?.connectedTo?.api}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
                  <span>BACKEND SERVICE</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <p className="font-bold text-[var(--bos-text-primary)]">{currentFocus?.connectedTo?.backend}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
                  <span>DATABASE LAYER</span>
                  <span className="text-emerald-400 font-bold">MIGRATED</span>
                </div>
                <p className="font-bold text-[var(--bos-text-primary)]">{currentFocus?.connectedTo?.database}</p>
              </div>
            </div>
          </div>

          {/* SUBMISSION READY CALLOUT */}
          <div className="p-6 rounded-3xl border-2 border-[var(--bos-accent)]/50 bg-[var(--bos-accent)]/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-[var(--bos-accent)]">
              <Sparkles className="w-4 h-4" />
              <span>READY FOR REVIEW?</span>
            </div>
            <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
              When finished, submit for Admin Review. Ollama will analyze evidence coverage, and your submission will be presented to the Administrator for approval.
            </p>
            {onOpenSubmitModal && (
              <button
                onClick={onOpenSubmitModal}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-600/30"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Send to Admin for Checking</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
