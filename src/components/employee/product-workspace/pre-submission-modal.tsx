"use client";

import { useState, useEffect } from "react";
import {
  Send,
  X,
  CheckCircle2,
  Circle,
  Camera,
  FileCode,
  GitPullRequest,
  CheckSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreSubmissionData } from "@/lib/employees/employee-build-journey.service";

interface PreSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildId: string;
  onSubmitted: (submissionData: any) => void;
}

export function PreSubmissionModal({
  isOpen,
  onClose,
  buildId,
  onSubmitted,
}: PreSubmissionModalProps) {
  const [data, setData] = useState<PreSubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributionNotes, setContributionNotes] = useState("");
  const [submittedResult, setSubmittedResult] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen || !buildId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSubmittedResult(null);

    fetch("/api/employee/product/submission/precheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.ok && json.data) {
          setData(json.data);
          setContributionNotes(json.data.whatYouBuilt || "");
        } else {
          setError(json.message || "Failed to load pre-submission data.");
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Network error loading pre-submission check.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, buildId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/employee/product/submission/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId,
          whatYouBuilt: contributionNotes.trim() || data?.whatYouBuilt,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSubmittedResult(json.data);
        setTimeout(() => {
          onSubmitted(json.data);
          onClose();
        }, 2200);
      } else {
        setError(json.message || "Submission failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Network error during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImmediateNavigate = () => {
    if (submittedResult) {
      onSubmitted(submittedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
      <div
        className="w-full max-w-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 border-b border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                EMPLOYEE SELF-CHECK & CONFIRMATION
              </span>
              <h3 className="font-bold text-lg text-[var(--bos-text-primary)]">
                {submittedResult ? "Delivered to Admin Review Center" : "Ready to Submit for Verification"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BODY (SCROLLABLE) ────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--bos-text-primary)]">
          {submittedResult ? (
            <div className="py-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] font-bold">
                  {submittedResult.submissionCode || "SUBMISSION RECORD CREATED"} • VERSION {submittedResult.version || 1}
                </span>
                <h3 className="text-xl font-extrabold text-[var(--bos-text-primary)] pt-1">
                  Successfully Sent to Admin for Checking!
                </h3>
                <p className="text-xs text-[var(--bos-text-secondary)] max-w-md mx-auto">
                  All 3 verification proofs, criteria demonstration, and code contracts have been delivered to the Administrator review queue.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] max-w-md mx-auto space-y-2 text-left font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--bos-text-tertiary)]">STATUS:</span>
                  <span className="text-emerald-400 font-bold">SENT TO ADMIN (IN REVIEW)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--bos-text-tertiary)]">AI VERIFICATION:</span>
                  <span className="text-purple-400 font-bold">ANALYSIS RUNNING</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--bos-text-tertiary)]">EVIDENCE FREEZE:</span>
                  <span className="text-blue-400 font-bold">LOCKED FOR REVIEW</span>
                </div>
              </div>

              <button
                onClick={handleImmediateNavigate}
                className="px-6 py-3 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white font-mono text-xs font-bold uppercase transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <span>Open Journey Signature Timeline</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {loading && (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[var(--bos-accent)] animate-spin mx-auto" />
                  <p className="font-mono text-xs text-[var(--bos-text-secondary)]">
                    Gathering real project context and captured evidence...
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 font-mono">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {data && !loading && (
                <>
              {/* SECTION 1: CONTEXT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-bold block">
                    PRODUCT
                  </span>
                  <span className="text-xs font-bold text-[var(--bos-text-primary)] truncate block">
                    {data.projectName}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-bold block">
                    FEATURE
                  </span>
                  <span className="text-xs font-bold text-emerald-400 truncate block">
                    {data.featureName}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-bold block">
                    YOUR RESPONSIBILITY
                  </span>
                  <span className="text-xs font-bold text-blue-400 truncate block">
                    {data.responsibility}
                  </span>
                </div>
              </div>

              {/* SECTION 2: WHAT YOU BUILT */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    WHAT YOU BUILT
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Version {data.currentVersion}
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={contributionNotes}
                  onChange={(e) => setContributionNotes(e.target.value)}
                  placeholder="Describe what you built and verified..."
                  className="w-full p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] transition-colors font-sans"
                />
              </div>

              {/* SECTION 3: EVIDENCE ATTACHED (ONLY WHAT ACTUALLY EXISTS) */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    EVIDENCE ATTACHED (3 SECTIONS REQUIRED)
                  </span>
                  <span className="font-mono text-[10px] font-bold text-emerald-400">
                    {data.evidenceCounts.total} total proof items
                  </span>
                </div>

                {data.evidence.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs">
                    Evidence not available. Please capture all 3 proof sections (Pull Request, Screenshot, and Test Outcome) before submitting for verification.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center gap-2",
                        data.evidenceCounts.screenshots > 0
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      )}
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>{data.evidenceCounts.screenshots > 0 ? `${data.evidenceCounts.screenshots} Screenshot` : "Missing Screenshot"}</span>
                    </div>

                    <div
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center gap-2",
                        data.evidenceCounts.commits > 0 || data.evidenceCounts.prs > 0
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      )}
                    >
                      <GitPullRequest className="w-3.5 h-3.5 shrink-0" />
                      <span>{data.evidenceCounts.prs + data.evidenceCounts.commits > 0 ? `${data.evidenceCounts.prs + data.evidenceCounts.commits} PR / Commit` : "Missing PR/Commit"}</span>
                    </div>

                    <div
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center gap-2",
                        data.evidenceCounts.tests > 0
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      )}
                    >
                      <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                      <span>{data.evidenceCounts.tests > 0 ? `${data.evidenceCounts.tests} Test Outcome` : "Missing Tests"}</span>
                    </div>

                    <div
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center gap-2",
                        (data.evidenceCounts.screenshots > 0 && (data.evidenceCounts.prs > 0 || data.evidenceCounts.commits > 0) && data.evidenceCounts.tests > 0)
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                          : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] text-[var(--bos-text-tertiary)]"
                      )}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {(data.evidenceCounts.screenshots > 0 && (data.evidenceCounts.prs > 0 || data.evidenceCounts.commits > 0) && data.evidenceCounts.tests > 0)
                          ? "3/3 Verified"
                          : "Incomplete"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Proof List Details */}
                {data.evidence.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {data.evidence.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-bold text-[var(--bos-text-primary)] truncate">
                            {p.title}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)]">
                            ({p.milestone})
                          </span>
                        </div>
                        <span className="font-mono text-[10px] uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {p.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: ACCEPTANCE CRITERIA BREAKDOWN */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    ACCEPTANCE CRITERIA DEMONSTRATION
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {data.criteriaDemonstratedCount} / {data.criteriaTotalCount} criteria demonstrated
                  </span>
                </div>

                <div className="space-y-2">
                  {data.acceptanceCriteria.map((ac) => (
                    <div
                      key={ac.id}
                      className={cn(
                        "p-3 rounded-xl border flex items-start justify-between gap-3 text-xs transition-colors",
                        ac.isDemonstrated
                          ? "bg-emerald-500/5 border-emerald-500/20 text-[var(--bos-text-primary)]"
                          : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] text-[var(--bos-text-secondary)]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {ac.isDemonstrated ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-[var(--bos-text-tertiary)] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{ac.criterion}</p>
                          {ac.matchingProof && (
                            <span className="font-mono text-[10px] text-emerald-400/80 block mt-0.5">
                              Demonstrated by: {ac.matchingProof}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded-md",
                          ac.isDemonstrated
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-tertiary)]"
                        )}
                      >
                        {ac.isDemonstrated ? "Demonstrated" : "Pending Proof"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ACTIONS ────────────────────────────────────────── */}
        {!submittedResult && (
          <div className="p-4 sm:p-5 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[var(--bos-surface-panel)] text-xs text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
            >
              Cancel & Return to Build
            </button>

            {data && (!data.evidenceCounts.screenshots || (!data.evidenceCounts.prs && !data.evidenceCounts.commits) || !data.evidenceCounts.tests) && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>All 3 proof sections required before submitting.</span>
              </span>
            )}

            <button
              disabled={
                submitting ||
                loading ||
                !data ||
                data.evidence.length === 0 ||
                data.evidenceCounts.screenshots === 0 ||
                (data.evidenceCounts.prs === 0 && data.evidenceCounts.commits === 0) ||
                data.evidenceCounts.tests === 0
              }
              onClick={handleSubmit}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg hover:shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Details to Admin...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send to Admin for Checking</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
