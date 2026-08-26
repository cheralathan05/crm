"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode2,
  FileText,
  Flame,
  GitBranch,
  GitCommit,
  GitPullRequest,
  History,
  Layers,
  Loader2,
  Lock,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Server,
  Database,
  Globe,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkDNA } from "@/lib/tasks";

export type TaskExecutionWorkspaceProps = {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
};

export function TaskExecutionWorkspace({
  taskId,
  onClose,
  onTaskUpdated,
}: TaskExecutionWorkspaceProps) {
  const [data, setData] = useState<WorkDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Active sub-tab for advanced details
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "comments" | "activity">("overview");

  // Inputs
  const [newCriterion, setNewCriterion] = useState("");
  const [newComment, setNewComment] = useState("");
  const [blockedReasonInput, setBlockedReasonInput] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Evidence
  const [evidenceType, setEvidenceType] = useState("GIT_COMMIT");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}`);
      const json = await res.json();
      if (json.ok && json.workDNA) {
        setData(json.workDNA);
      } else {
        setError(json.message || "Failed to load task execution workspace.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading task.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  // Update Status Handler
  const handleUpdateStatus = async (newStatus: string, blockedReason?: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            blockedReason: blockedReason || (newStatus === "BLOCKED" ? blockedReasonInput : undefined),
          }),
        });
        const json = await res.json();
        if (json.ok) {
          setNotice(`Status moved to ${newStatus}.`);
          setShowBlockModal(false);
          setBlockedReasonInput("");
          setTimeout(() => setNotice(null), 3000);
          await fetchTaskDetails();
          onTaskUpdated?.();
        } else {
          setError(json.message || "Status update rejected by state engine.");
        }
      } catch {
        setError("Network error updating status.");
      }
    });
  };

  // Toggle Acceptance Criteria Status
  const handleToggleCriterion = async (criterionId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PASSED" ? "NOT_STARTED" : "PASSED";
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/acceptance-criteria/${criterionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (res.ok) {
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  // Add Acceptance Criterion
  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriterion.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/acceptance-criteria`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ criterion: newCriterion.trim() }),
        });
        if (res.ok) {
          setNewCriterion("");
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  // Submit Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: evidenceTitle.trim(),
            type: evidenceType,
            externalUrl: evidenceUrl.trim() || undefined,
          }),
        });
        if (res.ok) {
          setEvidenceTitle("");
          setEvidenceUrl("");
          setShowEvidenceForm(false);
          setNotice("Evidence attached successfully.");
          setTimeout(() => setNotice(null), 3000);
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
        <div className="p-8 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center space-y-3 font-mono">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)] mx-auto" />
          <p className="text-[13px] text-[var(--bos-text-secondary)]">Loading Task Details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
        <div className="p-8 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center space-y-4 max-w-md w-full">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Task Not Found</h3>
          <p className="text-[12.5px] text-[var(--bos-text-secondary)]">{error || "Could not retrieve task details."}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] text-white text-[12px] font-semibold"
          >
            Close Drawer
          </button>
        </div>
      </div>
    );
  }

  const { task, project, deliverable, proposal, requirement, employee, dependencies, acceptanceCriteria } = data;
  const isBlocked = task.status === "BLOCKED";
  const isDone = task.status === "DONE" || task.status === "COMPLETED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="p-5 border-b border-[var(--bos-border)] bg-[var(--bos-bg)]/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11.5px] font-bold text-[var(--bos-accent)] bg-[var(--bos-surface)] px-2.5 py-0.5 rounded border border-[var(--bos-border)]">
                {task.code || "TSK-000"}
              </span>
              <span className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
                · {project?.name || "Client Project"}
              </span>
              <span
                className={cn(
                  "font-mono text-[10.5px] uppercase font-bold px-2 py-0.5 rounded border",
                  isDone
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : task.status === "IN_PROGRESS"
                    ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                    : isBlocked
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] border-[var(--bos-border)]"
                )}
              >
                {task.status === "IN_PROGRESS" ? "In Progress" : task.status === "TODO" ? "To Do" : task.status}
              </span>
            </div>

            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] leading-snug">
              {task.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── NOTICE & ERROR BANNERS ──────────────────────────────── */}
        {notice && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-[12px] font-mono text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 text-[12px] font-mono text-rose-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-[11px] hover:underline">Dismiss</button>
          </div>
        )}

        {/* ── WORKSPACE BODY ──────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ── 1. WHAT DO I NEED TO DO? ───────────────────────────── */}
          <section className="p-5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              1. WHAT DO I NEED TO DO?
            </span>
            <p className="text-[14px] text-[var(--bos-text-primary)] leading-relaxed">
              {task.description || task.title}
            </p>
            {task.expectedResult && (
              <div className="pt-2 text-[12.5px] text-[var(--bos-text-secondary)]">
                <strong className="text-[var(--bos-text-primary)] font-medium">Expected Output: </strong>
                {task.expectedResult}
              </div>
            )}
          </section>

          {/* ── 2. WHY AM I DOING THIS? ────────────────────────────── */}
          <section className="p-5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              2. WHY AM I DOING THIS?
            </span>
            <p className="text-[13.5px] text-[var(--bos-text-secondary)] leading-relaxed">
              Required to complete the <strong className="text-[var(--bos-text-primary)]">"{deliverable?.title || "Core Scope"}"</strong> deliverable for milestone <strong className="text-[var(--bos-text-primary)]">{data.milestone?.title || project.stage}</strong>.
            </p>
          </section>

          {/* ── 3. WHERE DID THIS COME FROM? (TRACEABILITY) ────────── */}
          <section className="p-5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              3. WHERE DID THIS COME FROM?
            </span>

            {/* Traceability Breadcrumb Pipeline */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11.5px] font-mono">
              {/* Proposal */}
              <div className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-0.5">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">PROPOSAL</span>
                <span className="text-[var(--bos-text-primary)] font-bold block truncate">
                  {proposal?.reference || "PROP-2026-001"}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">{proposal?.status || "APPROVED"}</span>
              </div>

              {/* Requirement */}
              <div className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-0.5">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">REQUIREMENT</span>
                <span className="text-[var(--bos-text-primary)] font-bold block truncate">
                  {requirement?.reference || "REQ-000001"}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">{requirement?.status || "APPROVED"}</span>
              </div>

              {/* Deliverable */}
              <div className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-0.5">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">DELIVERABLE</span>
                <span className="text-[var(--bos-text-primary)] font-bold block truncate">
                  {deliverable?.title || "Pages & Content"}
                </span>
                <span className="text-[10px] text-[var(--bos-accent)] font-semibold block">{deliverable?.status || "IN PROGRESS"}</span>
              </div>

              {/* Task */}
              <div className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-accent)] space-y-0.5 shadow-2xs">
                <span className="text-[10px] text-[var(--bos-accent)] font-bold uppercase block">TASK</span>
                <span className="text-[var(--bos-text-primary)] font-bold block truncate">
                  {task.code || "TSK-003"}
                </span>
                <span className="text-[10px] text-[var(--bos-text-secondary)] font-semibold block">{task.status}</span>
              </div>
            </div>
          </section>

          {/* ── 4. WHAT DOES DONE MEAN? (ACCEPTANCE CRITERIA) ──────── */}
          <section className="p-5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
                4. WHAT DOES DONE MEAN?
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                {acceptanceCriteria.filter((c) => c.status === "PASSED").length} / {acceptanceCriteria.length} Passed
              </span>
            </div>

            {acceptanceCriteria.length === 0 ? (
              <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12.5px] text-[var(--bos-text-secondary)] font-mono">
                No specific criteria recorded. Complete task according to instructions.
              </div>
            ) : (
              <div className="space-y-2">
                {acceptanceCriteria.map((crit) => {
                  const isPassed = crit.status === "PASSED";
                  return (
                    <button
                      key={crit.id}
                      type="button"
                      onClick={() => handleToggleCriterion(crit.id, crit.status)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer",
                        isPassed
                          ? "bg-emerald-500/5 border-emerald-500/20 text-[var(--bos-text-primary)]"
                          : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-border-strong)] text-[var(--bos-text-secondary)]"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded mt-0.5 flex items-center justify-center text-[10px] font-bold border transition-colors shrink-0",
                        isPassed ? "bg-emerald-600 text-white border-emerald-600" : "border-[var(--bos-border)] bg-[var(--bos-bg)]"
                      )}>
                        {isPassed && "✓"}
                      </div>
                      <span className={cn("text-[13px] leading-relaxed", isPassed && "line-through opacity-80")}>
                        {crit.criterion}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick add criterion */}
            <form onSubmit={handleAddCriterion} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="+ Add acceptance criterion..."
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                className="flex-1 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!newCriterion.trim() || isPending}
                className="px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] hover:bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] font-mono text-[var(--bos-text-primary)] disabled:opacity-40 cursor-pointer"
              >
                Add
              </button>
            </form>
          </section>

          {/* ── 5. WHAT IS BLOCKING ME? ────────────────────────────── */}
          <section className="p-5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              5. WHAT IS BLOCKING ME?
            </span>

            {isBlocked ? (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[13px] space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-600 font-mono">
                  <AlertTriangle className="w-4 h-4" />
                  <span>BLOCKED: {task.blockedReason || "Waiting for resolution."}</span>
                </div>
                {dependencies.upstream.length > 0 && (
                  <div className="text-[12px] text-[var(--bos-text-secondary)]">
                    <span className="font-semibold block mb-1">Blocking Dependencies:</span>
                    {dependencies.upstream.map((dep) => (
                      <div key={dep.id} className="flex items-center gap-2 font-mono text-[11.5px]">
                        <span>● {dep.code || "DEP"}: {dep.title} ({dep.status})</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("IN_PROGRESS")}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[12px] font-semibold cursor-pointer"
                >
                  Mark Blocker Resolved →
                </button>
              </div>
            ) : dependencies.upstream.length > 0 && dependencies.isBlockedByUpstream ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[13px] space-y-1.5 font-mono">
                <span className="font-bold text-amber-600">Waiting for upstream tasks to complete:</span>
                {dependencies.upstream.map((dep) => (
                  <div key={dep.id} className="text-[12px] text-[var(--bos-text-primary)]">
                    ● {dep.code || "DEP"}: {dep.title} · <span className="text-[var(--bos-text-secondary)]">{dep.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[12.5px] font-mono text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No blockers — nothing is currently preventing your work.</span>
              </div>
            )}
          </section>

          {/* ── 6. WHAT HAPPENS AFTER THIS? ────────────────────────── */}
          <section className="p-5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              6. WHAT HAPPENS AFTER THIS?
            </span>

            {dependencies.downstream.length > 0 ? (
              <div className="space-y-2 font-mono text-[12px]">
                <span className="text-[var(--bos-text-secondary)] block">
                  Completing this task unlocks the following downstream work:
                </span>
                <div className="space-y-1.5">
                  {dependencies.downstream.map((down) => (
                    <div key={down.id} className="p-2.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between">
                      <span className="font-semibold text-[var(--bos-text-primary)]">
                        {down.code ? `${down.code}: ` : ""}{down.title}
                      </span>
                      <span className="text-[11px] text-[var(--bos-text-tertiary)]">{down.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] font-mono text-[var(--bos-text-secondary)]">
                Completing this task contributes directly to the final acceptance of the deliverable.
              </p>
            )}
          </section>

          {/* ── EVIDENCE SECTION ───────────────────────────────────── */}
          <section className="p-5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
                VERIFICATION EVIDENCE
              </span>
              <button
                type="button"
                onClick={() => setShowEvidenceForm(!showEvidenceForm)}
                className="text-[12px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
              >
                {showEvidenceForm ? "Cancel" : "+ Attach Evidence"}
              </button>
            </div>

            {showEvidenceForm && (
              <form onSubmit={handleSubmitEvidence} className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block mb-1">
                      Evidence Type
                    </label>
                    <select
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value)}
                      className="w-full bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg px-3 py-1.5 text-[12px] font-mono text-[var(--bos-text-primary)]"
                    >
                      <option value="GIT_COMMIT">Git Commit / PR</option>
                      <option value="SCREENSHOT">Screenshot / UI Preview</option>
                      <option value="TEST_OUTPUT">Test Run Output</option>
                      <option value="DOCUMENT">Documentation Link</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block mb-1">
                      Evidence Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PR #42 merged into main"
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                      required
                      className="w-full bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block mb-1">
                    URL / Reference (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!evidenceTitle.trim() || isPending}
                  className="px-4 py-1.5 rounded-lg bg-[var(--bos-accent)] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Save Evidence
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ── ACTIONS FOOTER (LIFECYCLE CONTROLS) ─────────────────── */}
        <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-bg)] flex items-center justify-between gap-4 flex-wrap">
          {/* Status Lifecycle Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--bos-text-secondary)]">
            <span className="text-[var(--bos-text-tertiary)] uppercase text-[10px]">Lifecycle:</span>
            {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((st, idx, arr) => (
              <span key={st} className="flex items-center gap-1">
                <span className={cn(
                  "px-2 py-0.5 rounded",
                  task.status === st ? "bg-[var(--bos-accent)] text-white font-bold" : "text-[var(--bos-text-tertiary)]"
                )}>
                  {st === "TODO" ? "To Do" : st === "IN_PROGRESS" ? "In Progress" : st === "IN_REVIEW" ? "In Review" : "Done"}
                </span>
                {idx < arr.length - 1 && <span className="opacity-40">→</span>}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Block Button */}
            {!isBlocked && !isDone && (
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 text-[12px] font-mono font-medium transition-all cursor-pointer"
              >
                Mark Blocked
              </button>
            )}

            {/* Lifecycle Advancements */}
            {(task.status === "TODO" || task.status === "READY" || task.status === "BACKLOG") && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("IN_PROGRESS")}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--bos-accent)] hover:brightness-110 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-4 h-4" />
                <span>Start Task</span>
              </button>
            )}

            {task.status === "IN_PROGRESS" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("IN_REVIEW")}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Submit for Review</span>
              </button>
            )}

            {task.status === "IN_REVIEW" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("DONE")}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify &amp; Complete</span>
              </button>
            )}

            {isDone && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-[12.5px] font-mono font-bold border border-emerald-500/20">
                <Check className="w-4 h-4" />
                TASK VERIFIED &amp; COMPLETE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600 font-mono font-bold text-[14px]">
              <AlertTriangle className="w-5 h-5" />
              <span>Declare Execution Blocker</span>
            </div>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
              Specify the reason why this task cannot proceed so the project lead can assist.
            </p>
            <textarea
              placeholder="e.g. Waiting for client API credentials or upstream backend schema migration..."
              value={blockedReasonInput}
              onChange={(e) => setBlockedReasonInput(e.target.value)}
              rows={3}
              required
              className="w-full bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl p-3 text-[12.5px] text-[var(--bos-text-primary)] focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("BLOCKED", blockedReasonInput)}
                disabled={!blockedReasonInput.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold disabled:opacity-50"
              >
                Confirm Blocker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
