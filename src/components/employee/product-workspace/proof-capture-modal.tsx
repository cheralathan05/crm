"use client";

import { useState, useEffect } from "react";
import {
  Camera,
  X,
  CheckCircle2,
  GitPullRequest,
  TestTube2,
  FileCode,
  Upload,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Check,
  Link2,
  FileText,
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
    label: "Pull Request / Commit",
    icon: GitPullRequest,
    milestonePresets: [
      "Feature Logic Implemented",
      "API & Data Binding Connected",
      "State Management & State Flow",
      "Bug Fix & Edge Case Handled",
    ],
    defaultMilestone: "Feature Logic Implemented",
    urlLabel: "PR OR COMMIT URL",
    urlPlaceholder: "https://github.com/organization/repository/pull/104",
    whatChangedPlaceholder: "Implemented component architecture, action handlers, and verified API data integration.",
  },
  SCREENSHOT: {
    label: "Screenshot / UI",
    icon: ImageIcon,
    milestonePresets: [
      "UI Layout & Structure Created",
      "Responsive Breakpoints Aligned",
      "Interactive States (Loading & Error)",
      "Design Token & Theme Verified",
    ],
    defaultMilestone: "UI Layout & Structure Created",
    urlLabel: "IMAGE URL / UPLOAD",
    urlPlaceholder: "https://images.unsplash.com/... or uploaded screenshot",
    whatChangedPlaceholder: "Constructed responsive interface layout adhering to approved design tokens.",
  },
  TEST: {
    label: "Test Outcome",
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

export function ProofCaptureModal({
  isOpen,
  onClose,
  buildId,
  featureName,
  onProofCaptured,
}: ProofCaptureModalProps) {
  const [type, setType] = useState<ProofType>("PR");

  // Separate state per proof type to prevent cross-contamination
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

  const current = typeState[type];
  const config = TYPE_CONFIG[type];

  const updateCurrentState = (updates: Partial<typeof current>) => {
    setTypeState((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        ...updates,
      },
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In browser preview, use object URL or data URL
      const previewUrl = URL.createObjectURL(file);
      updateCurrentState({
        evidenceUrl: previewUrl,
        uploadedFileName: file.name,
      });
    }
  };

  const handleSubmit = async () => {
    const title = `${featureName} • ${current.milestone}`;
    const whatChangedText = current.whatChanged.trim() || `Verified ${current.milestone} for ${featureName}.`;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/employee/product/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId,
          type,
          milestone: current.milestone,
          title,
          evidenceUrl: current.evidenceUrl.trim() || undefined,
          evidenceCode: current.evidenceCode.trim() || undefined,
          testOutcome: type === "TEST" ? current.testOutcome.trim() || "Passed" : undefined,
          whatChanged: whatChangedText,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        onProofCaptured();
        onClose();
      } else {
        setError(json.message || "Failed to capture proof.");
      }
    } catch (err: any) {
      setError(err.message || "Network error capturing proof.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
      <div
        className="w-full max-w-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] flex items-center justify-center border border-[var(--bos-accent)]/20">
              <Camera className="w-4 h-4" />
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

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* ── PROOF TYPE TABS ───────────────────────────────────── */}
          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1.5">
              PROOF TYPE
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {(["PR", "SCREENSHOT", "TEST"] as const).map((tKey) => {
                const conf = TYPE_CONFIG[tKey];
                const Icon = conf.icon;
                const active = type === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setType(tKey)}
                    className={cn(
                      "p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                      active
                        ? "bg-[var(--bos-accent)] text-white font-bold border-transparent shadow-md"
                        : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── MILESTONE SELECTION & PRESETS ─────────────────────── */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
              MILESTONE
            </label>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {config.milestonePresets.map((preset) => {
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
                        : "bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] border-[var(--bos-border)] hover:text-[var(--bos-text-primary)]"
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

          {/* ── TYPE-SPECIFIC EVIDENCE INPUTS ─────────────────────── */}
          {type === "SCREENSHOT" && (
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                SCREENSHOT FILE OR URL
              </label>

              {/* Upload Drop Area */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50 bg-[var(--bos-surface)] text-center transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-1.5 pointer-events-none">
                  <Upload className="w-5 h-5 text-[var(--bos-accent)] mx-auto" />
                  <p className="font-bold text-xs text-[var(--bos-text-primary)]">
                    {current.uploadedFileName ? `Attached: ${current.uploadedFileName}` : "Click or drag screenshot here"}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                    Supports PNG, JPG, WebP up to 10MB
                  </p>
                </div>
              </div>

              {/* Or Direct Image URL */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">
                  OR ENTER HOSTED IMAGE URL
                </span>
                <input
                  type="text"
                  value={current.evidenceUrl}
                  onChange={(e) => updateCurrentState({ evidenceUrl: e.target.value })}
                  placeholder="https://assets.domain.com/screenshots/view.png"
                  className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
                />
              </div>
            </div>
          )}

          {type === "PR" && (
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                PULL REQUEST OR COMMIT URL
              </label>
              <input
                type="text"
                value={current.evidenceUrl}
                onChange={(e) => updateCurrentState({ evidenceUrl: e.target.value })}
                placeholder={config.urlPlaceholder}
                className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
              />

              <div className="space-y-1 pt-1">
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

          {type === "TEST" && (
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                CI RUN URL / TEST REPORT LINK
              </label>
              <input
                type="text"
                value={current.evidenceUrl}
                onChange={(e) => updateCurrentState({ evidenceUrl: e.target.value })}
                placeholder={config.urlPlaceholder}
                className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none font-mono focus:border-[var(--bos-accent)]"
              />

              <div className="space-y-1 pt-1">
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

          {/* ── WHAT CHANGED DESCRIPTION ──────────────────────────── */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
              WHAT CHANGED & VERIFIED?
            </label>
            <textarea
              value={current.whatChanged}
              onChange={(e) => updateCurrentState({ whatChanged: e.target.value })}
              rows={3}
              placeholder={config.whatChangedPlaceholder}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] outline-none leading-relaxed focus:border-[var(--bos-accent)]"
            />
          </div>
        </div>

        {/* ── ACTION CONTROLS ─────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--bos-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !current.milestone.trim() || !current.whatChanged.trim()}
            className="px-6 py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] disabled:opacity-50 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Confirm Proof</span>
          </button>
        </div>
      </div>
    </div>
  );
}
