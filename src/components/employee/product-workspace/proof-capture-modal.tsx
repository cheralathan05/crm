"use client";

import { useState } from "react";
import {
  Camera,
  X,
  CheckCircle2,
  GitPullRequest,
  TestTube2,
  Upload,
  Loader2,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProofType = "PR" | "SCREENSHOT" | "TEST";

interface ProofCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildId: string;
  featureName: string;
  onProofCaptured: () => void;
}

const TYPE_CONFIG = {
  PR: {
    id: "PR" as ProofType,
    label: "Pull Request / Commit",
    step: 1,
    icon: GitPullRequest,
    milestonePresets: [
      "Feature Logic Implemented",
      "API & Data Binding Connected",
      "State Management & State Flow",
      "Bug Fix & Edge Case Handled",
    ],
    defaultMilestone: "Feature Logic Implemented",
    urlLabel: "PULL REQUEST OR COMMIT URL",
    urlPlaceholder: "https://github.com/organization/repository/pull/104",
    whatChangedPlaceholder: "Implemented component architecture, action handlers, and verified API data integration.",
  },
  SCREENSHOT: {
    id: "SCREENSHOT" as ProofType,
    label: "Screenshot / UI",
    step: 2,
    icon: ImageIcon,
    milestonePresets: [
      "UI Layout & Structure Created",
      "Responsive Breakpoints Aligned",
      "Interactive States (Loading & Error)",
      "Design Token & Theme Verified",
    ],
    defaultMilestone: "UI Layout & Structure Created",
    urlLabel: "SCREENSHOT FILE OR IMAGE URL",
    urlPlaceholder: "https://images.unsplash.com/... or uploaded screenshot",
    whatChangedPlaceholder: "Constructed responsive interface layout adhering to approved design tokens.",
  },
  TEST: {
    id: "TEST" as ProofType,
    label: "Test Outcome",
    step: 3,
    icon: TestTube2,
    milestonePresets: [
      "Unit & Integration Tests Passed",
      "API Contract Schema Validated",
      "End-to-End User Flow Verified",
      "Regression Suite 100% Green",
    ],
    defaultMilestone: "Unit & Integration Tests Passed",
    urlLabel: "CI TEST RUN LINK / REPORT",
    urlPlaceholder: "https://github.com/organization/repo/actions/runs/984210",
    whatChangedPlaceholder: "Executed automated test specifications. Verified all acceptance criteria pass with zero errors.",
  },
};

const PROOF_ORDER: ProofType[] = ["PR", "SCREENSHOT", "TEST"];

export function ProofCaptureModal({
  isOpen,
  onClose,
  buildId,
  featureName,
  onProofCaptured,
}: ProofCaptureModalProps) {
  const [activeType, setActiveType] = useState<ProofType>("PR");

  // State for each of the 3 required sections
  const [typeState, setTypeState] = useState<
    Record<
      ProofType,
      {
        milestone: string;
        evidenceUrl: string;
        evidenceCode: string;
        testOutcome: string;
        whatChanged: string;
        uploadedFileName?: string;
      }
    >
  >({
    PR: {
      milestone: TYPE_CONFIG.PR.defaultMilestone,
      evidenceUrl: "",
      evidenceCode: "",
      testOutcome: "",
      whatChanged: "",
    },
    SCREENSHOT: {
      milestone: TYPE_CONFIG.SCREENSHOT.defaultMilestone,
      evidenceUrl: "",
      evidenceCode: "",
      testOutcome: "",
      whatChanged: "",
    },
    TEST: {
      milestone: TYPE_CONFIG.TEST.defaultMilestone,
      evidenceUrl: "",
      evidenceCode: "",
      testOutcome: "",
      whatChanged: "",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const current = typeState[activeType];
  const currentConfig = TYPE_CONFIG[activeType];

  const updateCurrentState = (updates: Partial<typeof current>) => {
    setTypeState((prev) => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        ...updates,
      },
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64Url = (loadEvt.target?.result as string) || "";
        updateCurrentState({
          evidenceUrl: base64Url,
          uploadedFileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Section completion checks
  const isSectionComplete = (t: ProofType): boolean => {
    const st = typeState[t];
    const hasMilestone = Boolean(st.milestone && st.milestone.trim().length > 0);

    if (t === "PR") {
      const hasUrlOrCode = Boolean((st.evidenceUrl && st.evidenceUrl.trim().length > 0) || (st.evidenceCode && st.evidenceCode.trim().length > 0));
      return hasMilestone && hasUrlOrCode;
    }

    if (t === "SCREENSHOT") {
      const hasScreenshot = Boolean((st.evidenceUrl && st.evidenceUrl.trim().length > 0) || st.uploadedFileName);
      return hasMilestone && hasScreenshot;
    }

    if (t === "TEST") {
      const hasTestEvidence = Boolean((st.evidenceUrl && st.evidenceUrl.trim().length > 0) || (st.testOutcome && st.testOutcome.trim().length > 0));
      return hasMilestone && hasTestEvidence;
    }

    return false;
  };

  const prComplete = isSectionComplete("PR");
  const screenshotComplete = isSectionComplete("SCREENSHOT");
  const testComplete = isSectionComplete("TEST");

  const completedCount = (prComplete ? 1 : 0) + (screenshotComplete ? 1 : 0) + (testComplete ? 1 : 0);
  const allSectionsComplete = completedCount === 3;

  const activeIndex = PROOF_ORDER.indexOf(activeType);

  const handleNextSection = () => {
    if (activeIndex < PROOF_ORDER.length - 1) {
      setActiveType(PROOF_ORDER[activeIndex + 1]);
    }
  };

  const handlePrevSection = () => {
    if (activeIndex > 0) {
      setActiveType(PROOF_ORDER[activeIndex - 1]);
    }
  };

  const handleSubmitAll = async () => {
    if (!allSectionsComplete || submitting) return;

    setSubmitting(true);
    setError(null);

    const proofsToSubmit = PROOF_ORDER.map((pType) => {
      const st = typeState[pType];
      const cfg = TYPE_CONFIG[pType];
      const whatChangedText =
        st.whatChanged.trim() ||
        cfg.whatChangedPlaceholder ||
        `Verified ${st.milestone} for ${featureName}.`;

      return {
        type: pType,
        milestone: st.milestone.trim() || cfg.defaultMilestone,
        title: `${featureName} • ${st.milestone.trim() || cfg.defaultMilestone}`,
        evidenceUrl: st.evidenceUrl.trim() || undefined,
        evidenceCode: st.evidenceCode.trim() || undefined,
        testOutcome: pType === "TEST" ? st.testOutcome.trim() || "Passed" : undefined,
        whatChanged: whatChangedText,
      };
    });

    try {
      const res = await fetch("/api/employee/product/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId,
          proofs: proofsToSubmit,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        onProofCaptured();
        onClose();
      } else {
        setError(json.message || "Failed to capture proofs.");
      }
    } catch (err: any) {
      setError(err.message || "Network error capturing proofs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
      <div
        className="w-full max-w-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] flex items-center justify-center border border-[var(--bos-accent)]/20">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
                CAPTURE VERIFICATION PROOF
              </span>
              <h3 className="font-bold text-base sm:text-lg text-[var(--bos-text-primary)]">
                {featureName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── PROGRESS & COMPLETION STATUS BAR ───────────────────── */}
        <div className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="font-bold text-[var(--bos-text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span>ALL 3 SECTIONS REQUIRED</span>
            </span>
            <span
              className={cn(
                "font-bold px-2 py-0.5 rounded-md",
                allSectionsComplete
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] border border-[var(--bos-accent)]/20"
              )}
            >
              {completedCount} / 3 Completed
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="grid grid-cols-3 gap-1.5">
            {PROOF_ORDER.map((pKey) => {
              const done = isSectionComplete(pKey);
              const isActive = activeType === pKey;
              return (
                <div
                  key={pKey}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    done
                      ? "bg-emerald-400"
                      : isActive
                      ? "bg-[var(--bos-accent)]"
                      : "bg-[var(--bos-border)]"
                  )}
                />
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── SCROLLABLE FORM BODY ───────────────────────────────── */}
        <div className="space-y-4 text-xs overflow-y-auto pr-1">
          {/* ── 3 SECTION TABS ───────────────────────────────────── */}
          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1.5">
              PROOF TYPE (COMPLETE ALL 3)
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {PROOF_ORDER.map((tKey) => {
                const conf = TYPE_CONFIG[tKey];
                const Icon = conf.icon;
                const active = activeType === tKey;
                const done = isSectionComplete(tKey);

                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setActiveType(tKey)}
                    className={cn(
                      "p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 relative",
                      active
                        ? "bg-[var(--bos-accent)] text-white font-bold border-transparent shadow-md"
                        : done
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
                        : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                    )}
                  >
                    {/* Done badge indicator */}
                    <div className="absolute top-1.5 right-1.5">
                      {done ? (
                        <CheckCircle2 className={cn("w-3.5 h-3.5", active ? "text-white" : "text-emerald-400")} />
                      ) : (
                        <div className={cn("w-2 h-2 rounded-full", active ? "bg-white/60" : "bg-amber-400/80")} />
                      )}
                    </div>

                    <Icon className="w-4 h-4" />
                    <span className="text-[10.5px] font-semibold leading-tight">{conf.label}</span>
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1.5 py-0.5 rounded",
                        done
                          ? active
                            ? "bg-white/20 text-white"
                            : "bg-emerald-500/20 text-emerald-400"
                          : active
                          ? "bg-black/20 text-white/90"
                          : "bg-[var(--bos-border)] text-[var(--bos-text-tertiary)]"
                      )}
                    >
                      {done ? "Complete ✓" : "Required"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ACTIVE SECTION FORM ──────────────────────────────── */}
          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3.5">
            {/* Active section title badge */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border)]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--bos-accent)]">
                  SECTION {currentConfig.step} OF 3: {currentConfig.label.toUpperCase()}
                </span>
              </div>
              <span
                className={cn(
                  "font-mono text-[10px] font-bold px-2 py-0.5 rounded-md",
                  isSectionComplete(activeType)
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}
              >
                {isSectionComplete(activeType) ? "Section Complete ✓" : "Incomplete"}
              </span>
            </div>

            {/* MILESTONE */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                MILESTONE
              </label>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {currentConfig.milestonePresets.map((preset) => {
                  const isSelected = current.milestone === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateCurrentState({ milestone: preset })}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border font-mono text-[10.5px] transition-all cursor-pointer",
                        isSelected
                          ? "bg-[var(--bos-accent)]/15 text-[var(--bos-accent)] border-[var(--bos-accent)]/40 font-bold"
                          : "bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)] border-[var(--bos-border)] hover:text-[var(--bos-text-primary)]"
                      )}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Custom Milestone Input */}
              <input
                type="text"
                value={current.milestone}
                onChange={(e) => updateCurrentState({ milestone: e.target.value })}
                placeholder="e.g. API Connected, UI Verified"
                className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
              />
            </div>

            {/* SECTION 1: PR / COMMIT INPUTS */}
            {activeType === "PR" && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                      PULL REQUEST OR COMMIT URL <span className="text-rose-400">*</span>
                    </label>
                    {current.evidenceUrl.trim().length > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400">✓ Added</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={current.evidenceUrl}
                    onChange={(e) => updateCurrentState({ evidenceUrl: e.target.value })}
                    placeholder={currentConfig.urlPlaceholder}
                    className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[var(--bos-text-secondary)] font-bold uppercase">
                    COMMIT HASH OR BRANCH (OPTIONAL)
                  </span>
                  <input
                    type="text"
                    value={current.evidenceCode}
                    onChange={(e) => updateCurrentState({ evidenceCode: e.target.value })}
                    placeholder="e.g. feat/product-listing (commit 4b89f2a)"
                    className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: SCREENSHOT / UI INPUTS */}
            {activeType === "SCREENSHOT" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                    SCREENSHOT FILE OR URL <span className="text-rose-400">*</span>
                  </label>
                  {(current.evidenceUrl.trim().length > 0 || current.uploadedFileName) && (
                    <span className="text-[10px] font-mono text-emerald-400">✓ Added</span>
                  )}
                </div>

                {/* Upload Drop Area */}
                <div className="p-3.5 rounded-2xl border-2 border-dashed border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50 bg-[var(--bos-surface-panel)] text-center transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 pointer-events-none">
                    <Upload className="w-4 h-4 text-[var(--bos-accent)] mx-auto" />
                    <p className="font-bold text-xs text-[var(--bos-text-primary)]">
                      {current.uploadedFileName ? `Attached: ${current.uploadedFileName}` : "Click or drag screenshot here"}
                    </p>
                    <p className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                      Supports PNG, JPG, WebP up to 10MB
                    </p>
                  </div>
                </div>

                {/* Direct Image URL */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">
                    OR ENTER HOSTED IMAGE URL
                  </span>
                  <input
                    type="text"
                    value={current.evidenceUrl.startsWith("data:image") ? "[Image Attached via Upload]" : current.evidenceUrl}
                    onChange={(e) => updateCurrentState({ evidenceUrl: e.target.value, uploadedFileName: undefined })}
                    placeholder="https://assets.domain.com/screenshots/view.png"
                    className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
                  />
                </div>

                {/* Live Screenshot Preview */}
                {current.evidenceUrl && (
                  <div className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                        Screenshot Preview
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCurrentState({ evidenceUrl: "", uploadedFileName: undefined })}
                        className="text-[10px] font-mono text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="max-h-40 rounded-xl overflow-hidden border border-[var(--bos-border)] bg-black/20 flex items-center justify-center">
                      <img
                        src={current.evidenceUrl}
                        alt="Screenshot proof preview"
                        className="max-h-40 w-auto object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: TEST OUTCOME INPUTS */}
            {activeType === "TEST" && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                      CI RUN URL / TEST REPORT LINK <span className="text-rose-400">*</span>
                    </label>
                    {current.evidenceUrl.trim().length > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400">✓ Added</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={current.evidenceUrl}
                    onChange={(e) => updateCurrentState({ evidenceUrl: e.target.value })}
                    placeholder={currentConfig.urlPlaceholder}
                    className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[var(--bos-text-secondary)] font-bold uppercase">
                    TEST OUTCOME SUMMARY
                  </span>
                  <input
                    type="text"
                    value={current.testOutcome}
                    onChange={(e) => updateCurrentState({ testOutcome: e.target.value })}
                    placeholder="e.g. 18 / 18 tests passed, 0 failures, 94% coverage"
                    className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
                  />
                </div>
              </div>
            )}

            {/* WHAT CHANGED DESCRIPTION */}
            <div className="space-y-1 pt-1">
              <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                WHAT CHANGED & VERIFIED?
              </label>
              <textarea
                value={current.whatChanged}
                onChange={(e) => updateCurrentState({ whatChanged: e.target.value })}
                rows={2}
                placeholder={currentConfig.whatChangedPlaceholder}
                className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none leading-relaxed focus:border-[var(--bos-accent)]"
              />
            </div>

            {/* Section step navigation helpers */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--bos-border)] font-mono text-xs">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={activeIndex === 0}
                className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Prev Section</span>
              </button>

              <button
                type="button"
                onClick={handleNextSection}
                disabled={activeIndex === PROOF_ORDER.length - 1}
                className="px-3 py-1.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)]/50 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>Next Section</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── ACTION CONTROLS & SUBMIT ENFORCEMENT ─────────────────── */}
        <div className="pt-3 border-t border-[var(--bos-border)] space-y-2">
          {!allSectionsComplete && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Complete all 3 sections (Pull Request, Screenshot, and Test) to submit proof ({completedCount}/3 ready).</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmitAll}
              disabled={submitting || !allSectionsComplete}
              className={cn(
                "px-6 py-2.5 font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md flex items-center gap-2",
                allSectionsComplete
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/30"
                  : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-tertiary)] opacity-50 cursor-not-allowed border border-[var(--bos-border)]"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting All Proofs...</span>
                </>
              ) : allSectionsComplete ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Confirm & Submit All 3 Proofs</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm Proof ({completedCount}/3 Ready)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

