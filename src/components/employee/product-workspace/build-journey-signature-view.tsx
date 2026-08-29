"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  ShieldCheck,
  AlertCircle,
  FileCode,
  Camera,
  GitPullRequest,
  CheckSquare,
  ArrowRight,
  RefreshCw,
  UserCheck,
  History,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildJourneySignatureViewProps {
  buildId: string;
  onReturnToBuild?: () => void;
}

export function BuildJourneySignatureView({
  buildId,
  onReturnToBuild,
}: BuildJourneySignatureViewProps) {
  const [journeyData, setJourneyData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/employee/product/submission/status?buildId=${buildId}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setJourneyData(json.data);
      } else {
        setError(json.message || "Failed to load build journey status.");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching submission status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Live polling every 3 seconds while analyzing or queued
    const interval = setInterval(() => {
      if (
        journeyData?.submission?.status === "QUEUED" ||
        journeyData?.submission?.status === "ANALYZING" ||
        journeyData?.submission?.job?.status === "ANALYZING" ||
        journeyData?.submission?.job?.status === "QUEUED"
      ) {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [buildId, journeyData?.submission?.status, journeyData?.submission?.job?.status]);

  const handleRetryAi = async () => {
    if (!journeyData?.submission?.id || retrying) return;
    setRetrying(true);
    try {
      await fetch("/api/employee/product/submission/retry-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: journeyData.submission.id }),
      });
      await fetchStatus();
    } catch (err) {
      console.error("Error retrying AI verification:", err);
    } finally {
      setRetrying(false);
    }
  };

  if (loading && !journeyData) {
    return (
      <div className="py-20 text-center space-y-4 font-sans">
        <Loader2 className="w-8 h-8 text-[var(--bos-accent)] animate-spin mx-auto" />
        <p className="font-mono text-xs text-[var(--bos-text-secondary)]">
          Loading Build Journey status...
        </p>
      </div>
    );
  }

  if (!journeyData?.hasSubmission) {
    return (
      <div className="p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-4 max-w-xl mx-auto font-sans">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg text-[var(--bos-text-primary)]">
          No Active Submission Found
        </h3>
        <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
          This build has not yet been submitted for AI verification. Capture proofs in your workspace and click &ldquo;Submit for Verification&rdquo;.
        </p>
        {onReturnToBuild && (
          <button
            onClick={onReturnToBuild}
            className="px-5 py-2.5 bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>Go to Build Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const { submission } = journeyData;
  const isAnalyzing = submission.status === "ANALYZING" || submission.status === "QUEUED";
  const isAiFailed = submission.job?.status === "FAILED";
  const isApproved = submission.status === "APPROVED";
  const isChangesRequested = submission.status === "CHANGES_REQUESTED";
  const isRejected = submission.status === "REJECTED";

  const report = submission.report;
  const criteria = report?.criteriaResults || [];
  const supportedCount = criteria.filter((c: any) => c.status === "SUPPORTED").length;
  const notVerifiedCount = criteria.filter((c: any) => c.status === "NOT_VERIFIED" || c.status === "POTENTIAL_GAP").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150 font-sans pb-12">
      {/* ── TOP HEADER / IDENTITY BANNER ──────────────────────────── */}
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-mono text-[10px] font-bold uppercase">
                BUILD JOURNEY
              </span>
              <span className="font-mono text-xs text-[var(--bos-text-tertiary)]">
                {submission.submissionCode} • Version {submission.version}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--bos-text-primary)]">
              {submission.featureName}
            </h2>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Product: <span className="text-[var(--bos-text-primary)] font-medium">{submission.project.name}</span> • Role: <span className="text-blue-400 font-medium">{submission.employee.role} ({submission.employee.workstream})</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "px-4 py-2 rounded-2xl font-mono text-xs font-bold uppercase flex items-center gap-2 border",
                isAnalyzing
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse"
                  : isApproved
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : isChangesRequested
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : isRejected
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-purple-500/10 text-purple-300 border-purple-500/30"
              )}
            >
              {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isApproved && <CheckCircle2 className="w-4 h-4" />}
              {isChangesRequested && <AlertTriangle className="w-4 h-4" />}
              <span>STATUS: {submission.status}</span>
            </div>

            <button
              onClick={fetchStatus}
              title="Refresh status"
              className="p-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── STAGE 1: REAL-TIME ANALYZING BANNER (WHEN OLLAMA IS RUNNING) ── */}
      {isAnalyzing && (
        <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                AI VERIFICATION IN PROGRESS
              </span>
              <h3 className="text-base font-bold text-[var(--bos-text-primary)]">
                Analyzing submitted build evidence with Ollama...
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs space-y-2">
            <p className="text-[var(--bos-text-secondary)]">
              Your build is being checked against:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
              <span className="p-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]">
                ✓ Requirement
              </span>
              <span className="p-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]">
                ✓ Acceptance criteria
              </span>
              <span className="p-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]">
                ✓ Approved design
              </span>
              <span className="p-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]">
                ✓ Submitted evidence
              </span>
              <span className="p-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]">
                ✓ Test results
              </span>
            </div>
          </div>

          <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)] italic">
            &ldquo;Your build has been submitted. Business OS is verifying the submitted evidence.&rdquo;
          </p>
        </div>
      )}

      {/* ── STAGE 1B: AI FAILED RECOVERY ────────────────────────────── */}
      {isAiFailed && (
        <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <div>
                <h4 className="font-bold text-sm text-rose-400">
                  AI Verification Service Paused
                </h4>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  The AI verification service could not complete this analysis.
                </p>
              </div>
            </div>
            <button
              onClick={handleRetryAi}
              disabled={retrying}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Retry Verification</span>
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 2: AI VERIFICATION COMPLETE SCREEN ────────────────── */}
      {report && (
        <div className="space-y-6">
          {/* Summary Scorecard */}
          <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                  AI VERIFICATION COMPLETE
                </span>
                <h3 className="text-xl font-bold text-[var(--bos-text-primary)]">
                  {report.requirementCoverage} Demonstrated
                </h3>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  ✓ {supportedCount} Supported
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  ○ {notVerifiedCount} Not Verified
                </span>
              </div>
            </div>

            {/* AI Summary Text */}
            <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)] block">
                AI ANALYSIS SUMMARY
              </span>
              <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                {report.aiSummary}
              </p>
            </div>

            {/* Missing Evidence Warning */}
            {report.missingEvidence && report.missingEvidence.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">
                  MISSING EVIDENCE IDENTIFIED
                </span>
                <ul className="space-y-1 text-xs text-[var(--bos-text-secondary)] font-mono">
                  {report.missingEvidence.map((item: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-amber-400">○</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Step Banner */}
            <div className="p-4 rounded-2xl bg-[var(--bos-accent)]/5 border border-[var(--bos-accent)]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-[var(--bos-accent)]" />
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase text-[var(--bos-accent)] block">
                    NEXT STEP
                  </span>
                  <span className="font-bold text-[var(--bos-text-primary)]">
                    {isApproved
                      ? "Build Verified & Approved • Upstream dependencies unblocked"
                      : isChangesRequested
                      ? "Revisions Requested • Return to build workspace to address feedback"
                      : "Awaiting Human Admin / Reviewer Decision"}
                  </span>
                </div>
              </div>

              {onReturnToBuild && isChangesRequested && (
                <button
                  onClick={onReturnToBuild}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase rounded-xl hover:bg-[var(--bos-accent-hover)] transition-all cursor-pointer"
                >
                  Return to Build Workspace
                </button>
              )}
            </div>
          </div>

          {/* ── 2-COLUMN DOSSIER: ACCEPTANCE CRITERIA & EVIDENCE ────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Criteria Breakdown (Col 7) */}
            <div className="lg:col-span-7 p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                  ACCEPTANCE CRITERIA EVALUATION
                </span>
                <span className="text-[10px] font-mono text-purple-400">
                  {criteria.length} specifications
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {criteria.map((c: any) => (
                  <div
                    key={c.id}
                    className={cn(
                      "p-4 rounded-2xl border space-y-2 transition-all",
                      c.status === "SUPPORTED"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-amber-500/5 border-amber-500/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {c.status === "SUPPORTED" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold text-[var(--bos-text-primary)]">
                            {c.criterion}
                          </p>
                          <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">
                            {c.reason}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-md shrink-0",
                          c.status === "SUPPORTED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}
                      >
                        {c.status}
                      </span>
                    </div>

                    {c.evidence && c.evidence.length > 0 && (
                      <div className="pt-2 border-t border-[var(--bos-border)] flex items-center gap-2 font-mono text-[10px] text-emerald-400/90">
                        <span>Supporting Proof:</span>
                        <span className="font-bold">{c.evidence.join(", ")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dependency Status */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-2 font-mono text-xs">
                <span className="text-[10px] font-bold uppercase text-[var(--bos-text-tertiary)] block">
                  DEPENDENCY STATUS
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">BACKEND API</span>
                    <span className="text-emerald-400 font-bold">✓ {report.dependencyStatus?.api || "READY"}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">DATABASE</span>
                    <span className="text-emerald-400 font-bold">✓ {report.dependencyStatus?.database || "READY"}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">DESIGN</span>
                    <span className="text-emerald-400 font-bold">✓ {report.dependencyStatus?.design || "APPROVED"}</span>
                  </div>
                </div>
              </div>

              {/* AI Audit Traceability */}
              <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] font-mono text-[10px] text-[var(--bos-text-tertiary)] space-y-1">
                <div className="flex items-center justify-between">
                  <span>AI Engine: Ollama ({report.model || "llama3"})</span>
                  <span>Prompt: {report.promptVersion || "verification-v3"}</span>
                </div>
                <div>Verified: {new Date(report.verifiedAt).toLocaleString()}</div>
                <div className="text-amber-400/80 pt-1 border-t border-[var(--bos-border)]">
                  IMPORTANT: This is an AI-assisted verification report. It is NOT final approval.
                </div>
              </div>
            </div>

            {/* Right: Real Attached Evidence & Audit History (Col 5) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Evidence Inspector */}
              <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border)]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    SUBMITTED EVIDENCE ({submission.proofs.length})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    FROZEN IN {submission.submissionCode}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {submission.proofs.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--bos-text-primary)]">
                          {p.title}
                        </span>
                        <span className="font-mono text-[10px] uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {p.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--bos-text-secondary)]">
                        {p.whatChanged}
                      </p>
                      <div className="flex items-center justify-between font-mono text-[10px] text-[var(--bos-text-tertiary)] pt-1 border-t border-[var(--bos-border)]">
                        <span>Milestone: {p.milestone}</span>
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permanent Audit Trail */}
              <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--bos-border)]">
                  <History className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    PERMANENT AUDIT TRAIL
                  </span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  {submission.auditTimeline.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-[var(--bos-accent)] shrink-0 mt-1.5" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--bos-text-primary)]">
                            {item.eventType}
                          </span>
                          <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                            (v{item.version})
                          </span>
                        </div>
                        <p className="text-[var(--bos-text-secondary)]">{item.detail}</p>
                        <span className="text-[9px] text-[var(--bos-text-tertiary)] block">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
