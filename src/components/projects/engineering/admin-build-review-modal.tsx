"use client";

import { useState } from "react";
import {
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Camera,
  GitPullRequest,
  CheckSquare,
  Sparkles,
  Loader2,
  Eye,
  ExternalLink,
  ChevronRight,
  User,
  Send,
  MessageSquare,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminBuildReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: any;
  projectId: string;
  onDecisionSubmitted: () => void;
}

export function AdminBuildReviewModal({
  isOpen,
  onClose,
  review,
  projectId,
  onDecisionSubmitted,
}: AdminBuildReviewModalProps) {
  const [activeTab, setActiveTab] = useState<"FINDINGS" | "EVIDENCE" | "DECISION">("FINDINGS");
  const [selectedProof, setSelectedProof] = useState<any | null>(null);

  // Decision State
  const [decisionType, setDecisionType] = useState<"APPROVE" | "CHANGES" | "REJECT">("APPROVE");
  const [approvalNote, setApprovalNote] = useState("");
  const [changeIssue, setChangeIssue] = useState("");
  const [changeRequired, setChangeRequired] = useState("");
  const [changeCriterion, setChangeCriterion] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !review) return null;

  const report = review.verificationReport;
  const criteria = report?.criteriaResults || [];
  const proofs = review.proofs || [];
  const isAlreadyDecided = review.status === "APPROVED" || review.status === "CHANGES_REQUESTED" || review.status === "REJECTED";

  const handleExecuteDecision = async () => {
    setSubmitting(true);
    setError(null);

    let payload: any = {
      decision: decisionType === "APPROVE" ? "APPROVED" : decisionType === "CHANGES" ? "CHANGES_REQUESTED" : "REJECTED",
    };

    if (decisionType === "APPROVE") {
      payload.comment = approvalNote.trim() || "Approved build specifications and evidence.";
    } else if (decisionType === "CHANGES") {
      if (!changeIssue.trim() || !changeRequired.trim()) {
        setError("Please specify the issue and the required change.");
        setSubmitting(false);
        return;
      }
      payload.issue = changeIssue.trim();
      payload.requiredChange = changeRequired.trim();
      payload.affectedCriterion = changeCriterion.trim() || undefined;
      payload.comment = `Changes requested: ${changeIssue.trim()}`;
    } else if (decisionType === "REJECT") {
      if (!rejectionReason.trim()) {
        setError("Please specify the rejection reason.");
        setSubmitting(false);
        return;
      }
      payload.comment = rejectionReason.trim();
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/reviews/${review.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.ok) {
        onDecisionSubmitted();
        onClose();
      } else {
        setError(json.message || "Failed to record decision.");
      }
    } catch (err: any) {
      setError(err.message || "Network error submitting review decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
      <div
        className="w-full max-w-4xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 border-b border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
                  BUILD REVIEW CENTER
                </span>
                <span className="font-mono text-xs text-[var(--bos-text-tertiary)]">
                  {review.submissionCode} • Version {review.version}
                </span>
              </div>
              <h3 className="font-bold text-lg text-[var(--bos-text-primary)]">
                {review.featureName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-3 py-1 rounded-xl font-mono text-xs font-bold uppercase border",
                review.status === "APPROVED"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : review.status === "CHANGES_REQUESTED"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : review.status === "REJECTED"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-purple-500/10 text-purple-400 border-purple-500/20"
              )}
            >
              {review.status}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── CONTEXT BAR ─────────────────────────────────────────── */}
        <div className="px-6 py-3 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">EMPLOYEE</span>
            <span className="font-bold text-[var(--bos-text-primary)]">{review.employee.name}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">ROLE</span>
            <span className="text-blue-400 font-bold">{review.employee.role}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">SUBMITTED</span>
            <span className="text-[var(--bos-text-primary)]">{new Date(review.submittedAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">AI COVERAGE</span>
            <span className="text-purple-400 font-bold">{report?.requirementCoverage || "Review Required"}</span>
          </div>
        </div>

        {/* ── NAVIGATION TABS ─────────────────────────────────────── */}
        <div className="px-6 border-b border-[var(--bos-border)] flex items-center gap-4 bg-[var(--bos-surface-panel)] text-xs font-mono">
          <button
            onClick={() => setActiveTab("FINDINGS")}
            className={cn(
              "py-3 border-b-2 font-bold transition-all cursor-pointer",
              activeTab === "FINDINGS"
                ? "border-[var(--bos-accent)] text-[var(--bos-accent)]"
                : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            AI Verification & Specifications
          </button>
          <button
            onClick={() => setActiveTab("EVIDENCE")}
            className={cn(
              "py-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "EVIDENCE"
                ? "border-[var(--bos-accent)] text-[var(--bos-accent)]"
                : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            <span>Evidence Inspector</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--bos-surface)] text-[10px] border border-[var(--bos-border)]">
              {proofs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("DECISION")}
            className={cn(
              "py-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "DECISION"
                ? "border-[var(--bos-accent)] text-[var(--bos-accent)]"
                : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            <span>Human Decision</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        {/* ── TAB CONTENT (SCROLLABLE) ────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--bos-text-primary)] flex-1">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 font-mono">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── TAB 1: AI FINDINGS & SPECS ──────────────────────────── */}
          {activeTab === "FINDINGS" && (
            <div className="space-y-6">
              {/* WHAT WAS REQUESTED vs WHAT EMPLOYEE BUILT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                    WHAT WAS REQUESTED (APPROVED SPEC)
                  </span>
                  <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                    {review.requirementText}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    WHAT EMPLOYEE BUILT (CONTRIBUTION)
                  </span>
                  <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                    {review.whatYouBuilt}
                  </p>
                </div>
              </div>

              {/* AI VERIFICATION FINDINGS PANEL */}
              {report && (
                <div className="p-5 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        AI VERIFICATION FINDINGS (OLLAMA)
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-400">
                      {report.requirementCoverage}
                    </span>
                  </div>

                  {/* Findings breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    {/* Supported */}
                    <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                        SUPPORTED ({report.supportedFindings?.length || 0})
                      </span>
                      <ul className="space-y-1 text-[11px] text-[var(--bos-text-primary)]">
                        {report.supportedFindings?.map((s: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Not Verified */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase block">
                        NOT VERIFIED ({report.notVerifiedFindings?.length || 0})
                      </span>
                      <ul className="space-y-1 text-[11px] text-[var(--bos-text-secondary)]">
                        {report.notVerifiedFindings?.map((nv: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-400">○</span>
                            <span>{nv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Potential Gaps */}
                    <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                      <span className="text-[10px] font-bold text-blue-400 uppercase block">
                        POTENTIAL GAPS ({report.potentialGaps?.length || 0})
                      </span>
                      <ul className="space-y-1 text-[11px] text-[var(--bos-text-secondary)]">
                        {report.potentialGaps?.length > 0 ? (
                          report.potentialGaps.map((g: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-blue-400">△</span>
                              <span>{g}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-[var(--bos-text-tertiary)] italic">None identified</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* AI Explanation Text */}
                  <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--bos-text-tertiary)] block">
                      AI EXPLANATION
                    </span>
                    <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                      {report.aiSummary}
                    </p>
                  </div>
                </div>
              )}

              {/* SPECIFICATION CRITERIA LIST */}
              <div className="p-5 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                  DETAILED ACCEPTANCE CRITERIA
                </span>
                <div className="space-y-2">
                  {criteria.map((c: any) => (
                    <div
                      key={c.id}
                      className={cn(
                        "p-3 rounded-xl border flex items-start justify-between gap-3 text-xs",
                        c.status === "SUPPORTED"
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-amber-500/5 border-amber-500/20"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {c.status === "SUPPORTED" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-amber-400 text-amber-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                            ○
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-[var(--bos-text-primary)]">{c.criterion}</p>
                          <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">{c.reason}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0",
                          c.status === "SUPPORTED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        )}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: EVIDENCE INSPECTOR ───────────────────────────── */}
          {activeTab === "EVIDENCE" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block mb-1">
                  EVIDENCE ATTACHED TO SUBMISSION {review.submissionCode}
                </span>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Click any evidence record below to inspect captured proofs, timestamps, and commit/test outputs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {proofs.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProof(p)}
                    className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {p.type}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors">
                      {p.title}
                    </h4>

                    <p className="text-xs text-[var(--bos-text-secondary)] line-clamp-2">
                      {p.whatChanged}
                    </p>

                    <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between font-mono text-[10px] text-[var(--bos-text-tertiary)]">
                      <span>Milestone: {p.milestone}</span>
                      <span className="flex items-center gap-1 text-[var(--bos-accent)]">
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Proof Details Modal Drawer */}
              {selectedProof && (
                <div className="p-5 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-accent)]/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[var(--bos-accent)]" />
                      <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">
                        Proof Detail • {selectedProof.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedProof(null)}
                      className="p-1 rounded-lg text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] block">TYPE</span>
                      <span className="text-emerald-400 font-bold">{selectedProof.type}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] block">MILESTONE</span>
                      <span className="text-[var(--bos-text-primary)] font-bold">{selectedProof.milestone}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] block">SUBMISSION</span>
                      <span className="text-purple-400 font-bold">{review.submissionCode} (v{review.version})</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] block">CAPTURED</span>
                      <span className="text-[var(--bos-text-primary)] font-bold">{new Date(selectedProof.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1">
                    <span className="font-mono text-[10px] font-bold text-[var(--bos-text-tertiary)] block">
                      WHAT CHANGED / EVIDENCE SUMMARY
                    </span>
                    <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                      {selectedProof.whatChanged}
                    </p>
                  </div>

                  {selectedProof.evidenceUrl && (
                    <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between font-mono text-xs">
                      <span className="text-[var(--bos-text-secondary)]">External Reference / URL:</span>
                      <span className="text-blue-400 truncate max-w-xs">{selectedProof.evidenceUrl}</span>
                    </div>
                  )}

                  {selectedProof.evidenceCode && (
                    <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1 font-mono">
                      <span className="text-[10px] font-bold text-purple-400 block">CODE SNIPPET</span>
                      <pre className="p-3 rounded-xl bg-black/40 text-[11px] text-emerald-400 overflow-x-auto">
                        {selectedProof.evidenceCode}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: HUMAN DECISION ──────────────────────────────── */}
          {activeTab === "DECISION" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  HUMAN REVIEW AUTHORITY
                </span>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Ollama AI assists with verification, but only the project administrator makes the binding decision.
                </p>
              </div>

              {/* 3 Actions Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setDecisionType("APPROVE")}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2",
                    decisionType === "APPROVE"
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-md"
                      : "bg-[var(--bos-surface)] border-[var(--bos-border)] opacity-70 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase text-emerald-400">ACTION 1</span>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">APPROVE</h4>
                  <p className="text-[11px] text-[var(--bos-text-secondary)]">
                    Marks build VERIFIED, unblocks dependencies, updates project deliverables.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionType("CHANGES")}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2",
                    decisionType === "CHANGES"
                      ? "bg-amber-500/10 border-amber-500/50 shadow-md"
                      : "bg-[var(--bos-surface)] border-[var(--bos-border)] opacity-70 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase text-amber-400">ACTION 2</span>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">REQUEST CHANGES</h4>
                  <p className="text-[11px] text-[var(--bos-text-secondary)]">
                    Creates Version 2 in BUILDING state without overwriting Version 1.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionType("REJECT")}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2",
                    decisionType === "REJECT"
                      ? "bg-rose-500/10 border-rose-500/50 shadow-md"
                      : "bg-[var(--bos-surface)] border-[var(--bos-border)] opacity-70 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span className="text-[10px] font-bold uppercase text-rose-400">ACTION 3</span>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">REJECT</h4>
                  <p className="text-[11px] text-[var(--bos-text-secondary)]">
                    Rejects submission with permanent auditable reason.
                  </p>
                </button>
              </div>

              {/* FORM BASED ON DECISION */}
              {decisionType === "APPROVE" && (
                <div className="p-5 rounded-3xl bg-[var(--bos-surface)] border border-emerald-500/30 space-y-3">
                  <span className="font-mono text-[10px] font-bold uppercase text-emerald-400 block">
                    CONFIRM APPROVAL • OPTIONAL REVIEW NOTE
                  </span>
                  <textarea
                    rows={3}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Optional comment: Verified layout adherence, API binding, and error states..."
                    className="w-full p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] focus:outline-hidden focus:border-emerald-400 font-sans"
                  />
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 font-mono text-[11px] text-emerald-300 space-y-1">
                    <p className="font-bold">Automatic Project Updates upon Approval:</p>
                    <ul className="list-disc list-inside text-[10px] space-y-0.5">
                      <li>Build marked VERIFIED ✓</li>
                      <li>Blueprint capability marked COMPLETED ✓</li>
                      <li>Deliverable & Task marked READY / COMPLETED ✓</li>
                      <li>Employee receives notification & contribution badge ✓</li>
                    </ul>
                  </div>
                </div>
              )}

              {decisionType === "CHANGES" && (
                <div className="p-5 rounded-3xl bg-[var(--bos-surface)] border border-amber-500/30 space-y-4">
                  <span className="font-mono text-[10px] font-bold uppercase text-amber-400 block">
                    CHANGES REQUIRED (STRUCTURED FEEDBACK)
                  </span>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                      ISSUE IDENTIFIED *
                    </label>
                    <input
                      type="text"
                      value={changeIssue}
                      onChange={(e) => setChangeIssue(e.target.value)}
                      placeholder="e.g. Mobile responsive behavior has not been demonstrated."
                      className="w-full p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                      REQUIRED ACTION / CHANGE *
                    </label>
                    <textarea
                      rows={2}
                      value={changeRequired}
                      onChange={(e) => setChangeRequired(e.target.value)}
                      placeholder="e.g. Provide mobile verification evidence and adjust the responsive container."
                      className="w-full p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                      AFFECTED CRITERION (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={changeCriterion}
                      onChange={(e) => setChangeCriterion(e.target.value)}
                      placeholder="e.g. AC-04 (Responsive layout)"
                      className="w-full p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {decisionType === "REJECT" && (
                <div className="p-5 rounded-3xl bg-[var(--bos-surface)] border border-rose-500/30 space-y-3">
                  <span className="font-mono text-[10px] font-bold uppercase text-rose-400 block">
                    REJECTION REASON *
                  </span>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify why this build is rejected..."
                    className="w-full p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] focus:outline-hidden focus:border-rose-400"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between gap-3 font-mono">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[var(--bos-surface-panel)] text-xs text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
          >
            Close
          </button>

          {activeTab !== "DECISION" ? (
            <button
              onClick={() => setActiveTab("DECISION")}
              className="px-6 py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>Make Decision</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled={submitting}
              onClick={handleExecuteDecision}
              className={cn(
                "px-6 py-2.5 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50",
                decisionType === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : decisionType === "CHANGES"
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-rose-600 hover:bg-rose-500"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Decision...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm {decisionType === "APPROVE" ? "Approval" : decisionType === "CHANGES" ? "Change Request" : "Rejection"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
