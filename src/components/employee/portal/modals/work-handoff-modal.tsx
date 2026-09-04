"use client";

import { useState } from "react";
import {
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  UploadCloud,
  Link as LinkIcon,
  ShieldAlert,
  Layers,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";

interface WorkHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: {
    id: string;
    code?: string;
    title: string;
    layer?: string;
    status?: string;
    whyAmIBuildingIt?: string;
    whatShouldFinalResultLookLike?: string;
    acceptanceCriteriaList?: Array<{ id: string; criterion: string; status: string }>;
    whatDoesItDependOn?: string;
    reviewerFeedback?: string | null;
    deliverable?: { title: string } | null;
    submissions?: Array<any>;
  } | null;
  projectName?: string;
  employeeRole?: string;
  employeeDiscipline?: string;
}

export function WorkHandoffModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  projectName,
  employeeRole,
  employeeDiscipline,
}: WorkHandoffModalProps) {
  const [summary, setSummary] = useState("");
  const [proofType, setProofType] = useState("SCREENSHOT");
  const [proofUrl, setProofUrl] = useState("");
  const [knownIssues, setKnownIssues] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const isResubmitting = task.status === "CHANGES_REQUESTED";
  const iterationNumber = (task.submissions?.length || 0) + 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Please enter a completion summary describing what was built and verified.");
      return;
    }
    if (!proofUrl.trim()) {
      setError("Please provide proof (screenshot URL, deployment link, PR, commit hash, or test result).");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim(),
          proofType,
          proofUrl: proofUrl.trim(),
          knownIssues: knownIssues.trim() || undefined,
          comments: comments.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to submit work for review.");
      }

      setSummary("");
      setProofUrl("");
      setKnownIssues("");
      setComments("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error submitting work.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-accent)]/30 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--bos-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 flex items-center justify-center text-[var(--bos-accent)]">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                {isResubmitting ? `Fix & Resubmit Work (Iteration #${iterationNumber})` : "Submit Work for Internal Review"}
              </h2>
              <p className="text-xs text-[var(--bos-text-tertiary)] font-mono uppercase tracking-wider">
                Internal Execution Unit · Freezes Proof for Quality Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Changes Requested Banner if Resubmitting */}
        {isResubmitting && task.reviewerFeedback && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-400 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>Reviewer Feedback to Resolve:</span>
            </div>
            <p className="text-sm font-sans text-[var(--bos-text-primary)]">{task.reviewerFeedback}</p>
          </div>
        )}

        {/* Auto-populated Context Card */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 font-mono text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-[var(--bos-border)] text-[11px]">
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Project</span>
              <span className="font-bold text-[var(--bos-text-primary)] truncate block">{projectName || "Active Project"}</span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Team</span>
              <span className="font-bold text-[var(--bos-accent)] block">{employeeDiscipline || "Engineering"}</span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Role</span>
              <span className="font-bold text-[var(--bos-text-secondary)] truncate block">{employeeRole || "Developer"}</span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Task Code</span>
              <span className="font-bold text-[var(--bos-accent)] block">{task.code || "TSK"}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">What am I building?</span>
            <div className="text-sm font-bold text-[var(--bos-text-primary)]">{task.title}</div>
          </div>

          {task.whyAmIBuildingIt && (
            <div>
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Requirement Context</span>
              <p className="text-[11px] text-[var(--bos-text-secondary)] font-sans">{task.whyAmIBuildingIt}</p>
            </div>
          )}

          {task.whatShouldFinalResultLookLike && (
            <div>
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Acceptance Criteria</span>
              <p className="text-[11px] text-[var(--bos-text-primary)] font-mono">{task.whatShouldFinalResultLookLike}</p>
            </div>
          )}

          {task.whatDoesItDependOn && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--bos-border)]">
              <span className="text-[var(--bos-text-tertiary)]">Dependencies:</span>
              <span className="text-[var(--bos-text-secondary)]">{task.whatDoesItDependOn}</span>
            </div>
          )}
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* COMPLETION SUMMARY */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-[var(--bos-text-primary)] uppercase">
              Completion Summary (What was completed?) *
            </label>
            <textarea
              rows={3}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detail the completed behavior, edge cases handled, and how acceptance criteria were satisfied..."
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)] transition-colors resize-none"
            />
          </div>

          {/* PROOF TYPE & PROOF LINK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-[var(--bos-text-primary)] uppercase">
                Proof Type *
              </label>
              <select
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] focus:outline-none"
              >
                <option value="SCREENSHOT">Screenshot / UI Proof</option>
                <option value="DEPLOYMENT_URL">Deployment / Live Endpoint</option>
                <option value="PR">Pull Request / Branch Link</option>
                <option value="COMMIT">Git Commit Hash</option>
                <option value="TEST_RESULTS">Test Results / Verification Log</option>
                <option value="DOCUMENT">Schema / Specification Document</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-[var(--bos-text-primary)] uppercase">
                Proof Evidence (URL, Commit or Link) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://... or commit #abc1234 or PR #42"
                  className="w-full px-3 py-2.5 pl-8 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)]"
                />
                <LinkIcon className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* KNOWN ISSUES (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[var(--bos-text-secondary)] uppercase">
              Known Issues (Optional)
            </label>
            <input
              type="text"
              value={knownIssues}
              onChange={(e) => setKnownIssues(e.target.value)}
              placeholder="e.g. Minor edge-case animation latency on mobile Safari..."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none"
            />
          </div>

          {/* COMMENTS (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[var(--bos-text-secondary)] uppercase">
              Reviewer Notes / Comments (Optional)
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Unit tests in /tests/components/listing.spec.ts pass 100%..."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 font-mono text-xs border-t border-[var(--bos-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-[var(--bos-accent)]/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Proof...</span>
                </>
              ) : (
                <>
                  <span>{isResubmitting ? "Fix & Resubmit Proof" : "Submit for Review"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
