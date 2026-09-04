"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  X,
  MessageSquare,
  Ban,
  GitBranch,
  Layers,
  FileText,
  User,
  History,
} from "lucide-react";

interface EmployeeReviewsViewProps {
  portalData: any;
  onRefresh: () => void;
}

export function EmployeeReviewsView({ portalData, onRefresh }: EmployeeReviewsViewProps) {
  const [activeTab, setActiveTab] = useState<"INCOMING" | "MY_REQUESTS">("INCOMING");
  const [reviewsData, setReviewsData] = useState<{ incomingReviews: any[]; mySubmissions: any[] }>({
    incomingReviews: [],
    mySubmissions: [],
  });
  const [loading, setLoading] = useState(true);

  // Review Decision Action State
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    submission: any | null;
    decisionType: "APPROVED" | "CHANGES_REQUESTED" | "BLOCKED";
    comment: string;
    requiredChange: string;
    blockerReason: string;
  }>({
    isOpen: false,
    submission: null,
    decisionType: "APPROVED",
    comment: "",
    requiredChange: "",
    blockerReason: "",
  });
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/employee/reviews");
      const json = await res.json();
      if (json.ok) {
        setReviewsData(json.data);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleOpenDecisionModal = (submission: any, type: "APPROVED" | "CHANGES_REQUESTED" | "BLOCKED") => {
    setActionError(null);
    setDecisionModal({
      isOpen: true,
      submission,
      decisionType: type,
      comment: "",
      requiredChange: "",
      blockerReason: "",
    });
  };

  const handlePostDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal.submission) return;
    setActionError(null);

    const reason =
      decisionModal.decisionType === "CHANGES_REQUESTED"
        ? decisionModal.requiredChange.trim()
        : decisionModal.decisionType === "BLOCKED"
        ? decisionModal.blockerReason.trim()
        : decisionModal.comment.trim();

    if (
      (decisionModal.decisionType === "CHANGES_REQUESTED" || decisionModal.decisionType === "BLOCKED") &&
      !reason
    ) {
      setActionError("A detailed explanation is required for this decision.");
      return;
    }

    try {
      setSubmittingDecision(true);
      const res = await fetch("/api/employee/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: decisionModal.submission.id,
          decision: decisionModal.decisionType,
          comment: decisionModal.comment.trim() || undefined,
          requiredChange: reason || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to submit review decision.");
      }

      setDecisionModal({
        isOpen: false,
        submission: null,
        decisionType: "APPROVED",
        comment: "",
        requiredChange: "",
        blockerReason: "",
      });
      await fetchReviews();
      onRefresh();
    } catch (err: any) {
      console.error("Failed to submit review decision:", err);
      setActionError(err.message || "Failed to process review.");
    } finally {
      setSubmittingDecision(false);
    }
  };

  const currentList =
    activeTab === "INCOMING" ? reviewsData.incomingReviews : reviewsData.mySubmissions;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--bos-accent)]" />
            <h1 className="text-xl font-bold text-[var(--bos-text-primary)]">Internal Review Queue</h1>
          </div>
          <p className="text-xs font-mono text-[var(--bos-text-tertiary)] mt-1">
            Verification Quality Gate · Acceptance Criteria Audit · Zero Client-Side Delivery
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[var(--bos-surface)] p-1 rounded-2xl border border-[var(--bos-border)] font-mono text-xs">
          <button
            onClick={() => setActiveTab("INCOMING")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
              activeTab === "INCOMING"
                ? "bg-[var(--bos-accent)] text-white font-bold"
                : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            }`}
          >
            <span>Reviews to Complete</span>
            <span className="text-[10px] ml-1.5 opacity-75">({reviewsData.incomingReviews.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("MY_REQUESTS")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
              activeTab === "MY_REQUESTS"
                ? "bg-[var(--bos-accent)] text-white font-bold"
                : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            }`}
          >
            <span>My Submitted Proofs</span>
            <span className="text-[10px] ml-1.5 opacity-75">({reviewsData.mySubmissions.length})</span>
          </button>
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-[var(--bos-text-tertiary)] flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
          <span>Synchronizing verification records from database...</span>
        </div>
      ) : currentList.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-2 font-mono">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-sm font-bold text-[var(--bos-text-primary)]">No reviews in queue</div>
          <p className="text-xs text-[var(--bos-text-tertiary)] max-w-sm mx-auto">
            {activeTab === "INCOMING"
              ? "All submitted internal task proofs have been verified. Review queue is completely clear."
              : "You have no active task submissions waiting for review."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentList.map((sub: any) => {
            const isApproved = sub.status === "APPROVED" || sub.status === "COMPLETED";
            const isChanges = sub.status === "CHANGES_REQUESTED";
            const isBlocked = sub.status === "BLOCKED";

            return (
              <div
                key={sub.id}
                className={`p-6 rounded-3xl border transition-all space-y-5 ${
                  isApproved
                    ? "bg-[var(--bos-surface-panel)] border-emerald-500/20"
                    : isChanges
                    ? "bg-[var(--bos-surface-panel)] border-amber-500/20"
                    : isBlocked
                    ? "bg-[var(--bos-surface-panel)] border-rose-500/20"
                    : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] hover:border-[var(--bos-border-strong)]"
                }`}
              >
                {/* 1. Header Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--bos-border)]">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-[var(--bos-accent)]">{sub.submissionCode}</span>
                    <span className="text-[var(--bos-text-tertiary)]">•</span>
                    <span className="text-[var(--bos-text-secondary)] font-semibold">{sub.project?.name}</span>
                    <span className="text-[var(--bos-text-tertiary)]">•</span>
                    <span className="text-[var(--bos-text-tertiary)]">
                      Iteration #{sub.version}
                    </span>
                    <span className="text-[var(--bos-text-tertiary)]">•</span>
                    <span className="text-[var(--bos-text-tertiary)]">
                      {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full font-mono text-xs font-bold uppercase ${
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : isChanges
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : isBlocked
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                {/* 2. Task Details & Submitter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider mb-1">
                      Task
                    </div>
                    <h3 className="text-base font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                      <span className="text-[var(--bos-accent)] font-mono">{sub.taskCode}</span>
                      <span>{sub.featureName}</span>
                    </h3>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider mb-1">
                      Submitter & Workstream
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--bos-text-secondary)]">
                      <User className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />
                      <span className="font-semibold text-[var(--bos-text-primary)]">
                        {sub.employee?.fullName || "Assigned Engineer"}
                      </span>
                      {sub.employee?.department && (
                        <span className="text-[var(--bos-text-tertiary)]">({sub.employee.department})</span>
                      )}
                      <span className="text-[var(--bos-text-tertiary)]">•</span>
                      <span className="text-[var(--bos-accent)] font-bold uppercase">{sub.workstream}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Requirement & Expected Result */}
                {sub.expectedResult && (
                  <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] font-mono text-xs space-y-1">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-bold">
                      Requirement Context
                    </span>
                    <p className="text-xs text-[var(--bos-text-secondary)] font-sans leading-relaxed">
                      {sub.expectedResult}
                    </p>
                  </div>
                )}

                {/* 4. Acceptance Criteria */}
                {sub.acceptanceCriteria && sub.acceptanceCriteria.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] font-mono text-xs space-y-2">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-bold">
                      Acceptance Criteria ({sub.acceptanceCriteria.length})
                    </span>
                    <ul className="space-y-1.5 font-sans">
                      {sub.acceptanceCriteria.map((crit: any, idx: number) => {
                        const critText = typeof crit === "string" ? crit : crit.criteria || crit.text;
                        return (
                          <li key={idx} className="flex items-start gap-2 text-xs text-[var(--bos-text-secondary)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)] mt-1.5 shrink-0" />
                            <span>{critText}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* 5. Dependencies */}
                {sub.dependencies && sub.dependencies.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] font-mono text-xs space-y-2">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-bold">
                      Task Dependencies
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sub.dependencies.map((dep: any, idx: number) => {
                        const depTask = dep.dependsOnTask;
                        const isDepCompleted = depTask?.status === "COMPLETED" || depTask?.status === "DONE";
                        return (
                          <div
                            key={idx}
                            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs ${
                              isDepCompleted
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span className="font-bold">{depTask?.code || "DEP"}</span>
                            <span>{depTask?.title || "Dependency"}</span>
                            <span className="text-[10px] opacity-75">({depTask?.status})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Employee Completion Summary & Proof */}
                <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2 font-mono text-xs">
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
                      Submitted Verification Proof ({sub.proofs.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                      {sub.proofs.map((proof: any) => (
                        <div
                          key={proof.id}
                          className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between"
                        >
                          <div className="truncate max-w-[240px]">
                            <span className="font-bold text-[var(--bos-accent)]">{proof.type}: </span>
                            <span className="text-[var(--bos-text-secondary)]">{proof.title}</span>
                          </div>
                          {proof.evidenceUrl && (
                            <a
                              href={proof.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--bos-accent)] hover:underline flex items-center gap-1 shrink-0 ml-2 font-bold"
                            >
                              <span>Inspect Proof</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Previous Reviews / Feedback History */}
                {sub.reviewDecisions?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-amber-500/20 space-y-2 font-mono text-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-[10px]">
                      <History className="w-3.5 h-3.5" />
                      <span>Review Decision: {sub.reviewDecisions[0].decision}</span>
                    </div>
                    <p className="text-xs text-[var(--bos-text-primary)] font-sans">
                      {sub.reviewDecisions[0].comment || sub.reviewDecisions[0].requiredChange}
                    </p>
                    <div className="text-[10px] text-[var(--bos-text-tertiary)]">
                      Reviewed by {sub.reviewDecisions[0].reviewerName} on{" "}
                      {new Date(sub.reviewDecisions[0].reviewedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* 8. Action Controls for Incoming Queue */}
                {activeTab === "INCOMING" && !isApproved && (
                  <div className="pt-4 border-t border-[var(--bos-border)] flex flex-wrap items-center justify-end gap-3 font-mono text-xs">
                    <button
                      onClick={() => handleOpenDecisionModal(sub, "BLOCKED")}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block</span>
                    </button>

                    <button
                      onClick={() => handleOpenDecisionModal(sub, "CHANGES_REQUESTED")}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>

                    <button
                      onClick={() => handleOpenDecisionModal(sub, "APPROVED")}
                      className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {decisionModal.decisionType === "APPROVED" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                {decisionModal.decisionType === "CHANGES_REQUESTED" && (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                {decisionModal.decisionType === "BLOCKED" && (
                  <Ban className="w-5 h-5 text-rose-400" />
                )}
                <h2 className="text-base font-bold text-[var(--bos-text-primary)]">
                  {decisionModal.decisionType === "APPROVED"
                    ? "Approve Task Work"
                    : decisionModal.decisionType === "CHANGES_REQUESTED"
                    ? "Request Required Changes"
                    : "Block Task Execution"}
                </h2>
              </div>
              <button
                onClick={() => setDecisionModal((p) => ({ ...p, isOpen: false }))}
                className="p-1 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-mono">
                {actionError}
              </div>
            )}

            <form onSubmit={handlePostDecision} className="space-y-4">
              <div className="space-y-1.5 font-mono text-xs">
                <label className="block font-bold text-[var(--bos-text-secondary)] uppercase">
                  {decisionModal.decisionType === "APPROVED"
                    ? "Approval Notes & Sign-Off Checklist"
                    : decisionModal.decisionType === "CHANGES_REQUESTED"
                    ? "What Needs To Change? (Specific Reason) *"
                    : "Blocker Reason *"}
                </label>
                <textarea
                  rows={4}
                  required={decisionModal.decisionType !== "APPROVED"}
                  value={
                    decisionModal.decisionType === "APPROVED"
                      ? decisionModal.comment
                      : decisionModal.decisionType === "CHANGES_REQUESTED"
                      ? decisionModal.requiredChange
                      : decisionModal.blockerReason
                  }
                  onChange={(e) =>
                    setDecisionModal((prev) => ({
                      ...prev,
                      comment: e.target.value,
                      requiredChange: e.target.value,
                      blockerReason: e.target.value,
                    }))
                  }
                  placeholder={
                    decisionModal.decisionType === "APPROVED"
                      ? "All acceptance criteria verified. Visual and functional proof satisfies requirements."
                      : decisionModal.decisionType === "CHANGES_REQUESTED"
                      ? "e.g. Product Listing does not display the empty-state required by the acceptance criteria."
                      : "e.g. Database migration failed in staging environment, blocking API test verification."
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-sm text-[var(--bos-text-primary)] focus:outline-none focus:border-[var(--bos-accent)] resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 font-mono text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal((p) => ({ ...p, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl border border-[var(--bos-border)] text-[var(--bos-text-secondary)] cursor-pointer hover:bg-[var(--bos-surface)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg ${
                    decisionModal.decisionType === "APPROVED"
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                      : decisionModal.decisionType === "CHANGES_REQUESTED"
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                      : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                  }`}
                >
                  {submittingDecision ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Decision...</span>
                    </>
                  ) : (
                    <span>
                      {decisionModal.decisionType === "APPROVED"
                        ? "Approve & Complete Task"
                        : decisionModal.decisionType === "CHANGES_REQUESTED"
                        ? "Request Changes"
                        : "Block Task"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
