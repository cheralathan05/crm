"use client";

import { useState } from "react";
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  RotateCcw,
} from "lucide-react";

interface EmployeeSubmissionsViewProps {
  portalData: any;
  onOpenNewSubmission: () => void;
  onNavigateTab: (tab: string, context?: any) => void;
}

export function EmployeeSubmissionsView({
  portalData,
  onOpenNewSubmission,
  onNavigateTab,
}: EmployeeSubmissionsViewProps) {
  const { submissions = [], workItems = [], employee } = portalData;
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredSubmissions = submissions.filter((s: any) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "APPROVED") return s.status === "APPROVED" || s.status === "VERIFIED" || s.status === "COMPLETED";
    if (statusFilter === "CHANGES_REQUESTED") return s.status === "CHANGES_REQUESTED";
    if (statusFilter === "IN_REVIEW") return s.status === "SUBMITTED" || s.status === "IN_REVIEW";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[var(--bos-accent)]" />
            <h1 className="text-xl font-bold text-[var(--bos-text-primary)]">My Submissions & Proofs</h1>
          </div>
          <p className="text-xs font-mono text-[var(--bos-text-tertiary)] mt-1">
            Permanent Audit Trail · Immutable Iteration History & Verification Proofs
          </p>
        </div>

        <button
          onClick={() => onNavigateTab("MY_WORK")}
          className="px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-mono font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[var(--bos-accent)]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Work From Active Tasks</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
        {[
          { key: "ALL", label: "All Submissions", count: submissions.length },
          { key: "APPROVED", label: "Approved", count: submissions.filter((s: any) => s.status === "APPROVED" || s.status === "VERIFIED" || s.status === "COMPLETED").length },
          { key: "IN_REVIEW", label: "In Review", count: submissions.filter((s: any) => s.status === "SUBMITTED" || s.status === "IN_REVIEW").length },
          { key: "CHANGES_REQUESTED", label: "Changes Requested", count: submissions.filter((s: any) => s.status === "CHANGES_REQUESTED").length },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key)}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
              statusFilter === item.key
                ? "bg-[var(--bos-accent)] text-white font-bold"
                : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            }`}
          >
            <span>{item.label}</span>
            <span className="text-[10px] ml-1.5 opacity-75">({item.count})</span>
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-3 font-mono">
          <FileCheck2 className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
          <div className="text-sm font-bold text-[var(--bos-text-primary)]">No submissions recorded</div>
          <p className="text-xs text-[var(--bos-text-tertiary)] max-w-sm mx-auto">
            When you complete work on an assigned task in My Work, click [SUBMIT FOR REVIEW] to attach proof and freeze evidence.
          </p>
          <button
            onClick={() => onNavigateTab("MY_WORK")}
            className="px-4 py-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-bold text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] cursor-pointer"
          >
            Go to My Work
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub: any) => {
            const isApproved = sub.status === "APPROVED" || sub.status === "VERIFIED" || sub.status === "COMPLETED";
            const isChanges = sub.status === "CHANGES_REQUESTED";

            return (
              <div
                key={sub.id}
                className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  isApproved
                    ? "bg-[var(--bos-surface-panel)] border-emerald-500/20"
                    : isChanges
                    ? "bg-[var(--bos-surface-panel)] border-amber-500/20"
                    : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)]"
                }`}
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs pb-3 border-b border-[var(--bos-border)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--bos-accent)]">{sub.submissionCode}</span>
                    <span className="text-[var(--bos-text-tertiary)]">•</span>
                    <span className="text-[var(--bos-text-secondary)] font-semibold">{sub.project?.name}</span>
                    <span className="text-[var(--bos-text-tertiary)]">•</span>
                    <span className="text-[var(--bos-text-tertiary)] font-bold">Iteration #{sub.version}</span>
                    <span className="text-[var(--bos-text-tertiary)]">•</span>
                    <span className="text-[var(--bos-text-tertiary)]">
                      {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : isChanges
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                {/* Task Title */}
                <div>
                  <h3 className="text-base font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                    <span className="text-[var(--bos-accent)] font-mono">{sub.taskCode}</span>
                    <span>{sub.featureName}</span>
                  </h3>
                  <div className="text-xs font-mono text-[var(--bos-text-tertiary)] mt-0.5">
                    Responsibility: {sub.responsibility}
                  </div>
                </div>

                {/* What You Built */}
                <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] font-mono text-xs space-y-1">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-bold">
                    Completion Summary
                  </span>
                  <p className="text-xs text-[var(--bos-text-primary)] font-sans leading-relaxed">
                    {sub.whatYouBuilt}
                  </p>
                </div>

                {/* Attached Proofs */}
                {sub.proofs?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block font-bold">
                      Attached Evidence ({sub.proofs.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                      {sub.proofs.map((proof: any) => (
                        <div
                          key={proof.id}
                          className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between"
                        >
                          <span className="text-[var(--bos-text-secondary)] truncate max-w-[220px]">
                            <span className="font-bold text-[var(--bos-accent)]">{proof.type}: </span>
                            {proof.title}
                          </span>
                          {proof.evidenceUrl && (
                            <a
                              href={proof.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--bos-accent)] hover:underline flex items-center gap-1 shrink-0 ml-2 text-[11px] font-bold"
                            >
                              <span>Inspect Proof</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Decisions Feedback & WHAT NEEDS TO CHANGE */}
                {sub.reviewDecisions?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-amber-500/20 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase">
                      <span>{isChanges ? "⚠️ What Needs to Change?" : "Reviewer Sign-Off"}</span>
                      <span>{sub.reviewDecisions[0].decision}</span>
                    </div>
                    <p className="text-xs text-[var(--bos-text-primary)] font-sans leading-relaxed">
                      {sub.reviewDecisions[0].comment || sub.reviewDecisions[0].requiredChange}
                    </p>
                    <div className="text-[10px] text-[var(--bos-text-tertiary)] flex items-center justify-between">
                      <span>
                        Reviewer: {sub.reviewDecisions[0].reviewerName} ·{" "}
                        {new Date(sub.reviewDecisions[0].reviewedAt).toLocaleString()}
                      </span>

                      {isChanges && sub.taskId && (
                        <button
                          onClick={() => onNavigateTab("MY_WORK", { highlightTaskId: sub.taskId })}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-400 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Fix & Resubmit Work</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
