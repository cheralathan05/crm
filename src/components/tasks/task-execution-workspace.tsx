"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  History,
  Layers,
  Link2,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  Send,
  Unlock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkDNA } from "@/lib/tasks";

export type TaskExecutionWorkspaceProps = {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onNavigateTask?: (newTaskId: string) => void;
  isAdmin?: boolean;
};

/* ── Urgency & Date Calculation ───────────────────────────────── */
function calculateDueUrgency(dueAt: string | Date | null | undefined): {
  label: string;
  badge: "ON_TRACK" | "DUE_TODAY" | "DUE_TOMORROW" | "OVERDUE" | "NO_DATE";
  formattedDate: string;
  colorClass: string;
} {
  if (!dueAt) {
    return {
      label: "Flexible",
      badge: "NO_DATE",
      formattedDate: "No deadline set",
      colorClass: "text-[var(--bos-text-secondary)] bg-[var(--bos-surface)] border-[var(--bos-border)]",
    };
  }

  const dueDate = new Date(dueAt);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const tomorrowStart = new Date(todayEnd.getTime() + 1);
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

  const formattedDate = dueDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (dueDate < todayStart) {
    return {
      label: "OVERDUE",
      badge: "OVERDUE",
      formattedDate,
      colorClass: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
    };
  }

  if (dueDate >= todayStart && dueDate <= todayEnd) {
    return {
      label: "DUE TODAY",
      badge: "DUE_TODAY",
      formattedDate,
      colorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/40 font-bold",
    };
  }

  if (dueDate >= tomorrowStart && dueDate <= tomorrowEnd) {
    return {
      label: "DUE TOMORROW",
      badge: "DUE_TOMORROW",
      formattedDate,
      colorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
    };
  }

  return {
    label: "ON TRACK",
    badge: "ON_TRACK",
    formattedDate,
    colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  };
}

export function TaskExecutionWorkspace({
  taskId,
  onClose,
  onTaskUpdated,
  onNavigateTask,
  isAdmin = false,
}: TaskExecutionWorkspaceProps) {
  const [data, setData] = useState<WorkDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Collapsible sections
  const [showTraceability, setShowTraceability] = useState(false);
  const [showAdminContext, setShowAdminContext] = useState(false);

  // Form Inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newCriterion, setNewCriterion] = useState("");
  const [newComment, setNewComment] = useState("");
  const [blockedReasonInput, setBlockedReasonInput] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Evidence Form
  const [evidenceType, setEvidenceType] = useState<string>("GIT_COMMIT");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
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
        setError(json.message || "Failed to load task.");
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

  // Status Machine Handler
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
          setNotice(`Task updated to ${newStatus.replace(/_/g, " ")}.`);
          setShowBlockModal(false);
          setBlockedReasonInput("");
          setTimeout(() => setNotice(null), 3000);
          await fetchTaskDetails();
          onTaskUpdated?.();
        } else {
          setError(json.message || "Status update rejected.");
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
        const res = await fetch(`/api/tasks/${taskId}/criteria`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ criterionId, status: nextStatus }),
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
        const res = await fetch(`/api/tasks/${taskId}/criteria`, {
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

  // Toggle Subtask (Implementation Step)
  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtaskId, completed: !currentCompleted }),
        });
        if (res.ok) {
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  // Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newSubtaskTitle.trim() }),
        });
        if (res.ok) {
          setNewSubtaskTitle("");
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  // Post Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment.trim() }),
        });
        if (res.ok) {
          setNewComment("");
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
            url: evidenceUrl.trim() || undefined,
            description: evidenceDescription.trim() || undefined,
          }),
        });
        if (res.ok) {
          setEvidenceTitle("");
          setEvidenceUrl("");
          setEvidenceDescription("");
          setShowEvidenceForm(false);
          setNotice("Evidence submitted successfully.");
          setTimeout(() => setNotice(null), 3000);
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="p-8 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center space-y-3 font-sans shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)] mx-auto" />
          <p className="text-[13px] font-medium text-[var(--bos-text-secondary)]">Opening Task Workspace...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="p-8 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center space-y-4 max-w-md w-full shadow-2xl">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Task Not Available</h3>
          <p className="text-[13px] text-[var(--bos-text-secondary)]">{error || "Could not retrieve task instructions."}</p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            Back to My Work
          </button>
        </div>
      </div>
    );
  }

  const { task, project, deliverable, requirement, employee, dependencies, acceptanceCriteria, subtasks, activities, comments, evidenceRecords, workstream } = data;

  const isBlocked = task.status === "BLOCKED" || dependencies.isBlockedByUpstream;
  const isDone = task.status === "DONE" || task.status === "COMPLETED" || task.status === "CLIENT_APPROVED";
  const isInReview = task.status === "IN_REVIEW" || task.status === "CLIENT_REVIEW" || task.status === "READY_FOR_CLIENT" || task.status === "CHANGES_REQUESTED";
  const isInProgress = task.status === "IN_PROGRESS";
  const isTodo = !isDone && !isInProgress && !isInReview && !isBlocked;

  const urgency = calculateDueUrgency(task.dueAt);

  // Plain-Language "What do I need to do?" explanation
  const workInstruction = task.description && task.description.trim().length > 0 && task.description.trim() !== task.title
    ? task.description
    : task.expectedResult
    ? `${task.expectedResult}`
    : `Execute the work required for ${task.title}. Verify all acceptance criteria and deliver the completed artifact for ${project.name}.`;

  // Meaningful "Why am I doing this?" explanation
  const purposeReason = deliverable
    ? `This work directly contributes to the "${deliverable.title}" deliverable for ${project.name}.`
    : requirement
    ? `This fulfills approved project requirement "${requirement.title}" for ${project.name}.`
    : `This work is a core milestone component required to advance ${project.name}.`;

  // Work Progress Counts
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (isDone ? 100 : 0);

  // Criteria Counts
  const totalCriteria = acceptanceCriteria.length;
  const passedCriteria = acceptanceCriteria.filter((c) => c.status === "PASSED").length;

  // Next immediately relevant downstream task
  const nextWorkTask = dependencies.downstream.length > 0 ? dependencies.downstream[0] : null;

  // Immediate blocker task
  const blockerTask = dependencies.upstream.find((u) => u.status !== "DONE" && u.status !== "COMPLETED" && u.status !== "CLIENT_APPROVED") || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto font-sans">
      <div className="w-full max-w-5xl bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150 text-[var(--bos-text-primary)]">
        
        {/* ── TOP HEADER / WORKSPACE BAR ───────────────────────────── */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] bg-[var(--bos-surface-subtle)] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] border border-transparent hover:border-[var(--bos-border)] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Work</span>
            </button>
            <span className="text-[var(--bos-border)]">|</span>
            <div className="flex items-center gap-2 flex-wrap text-[12px] font-mono">
              <span className="px-2 py-0.5 rounded font-bold bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-accent)]">
                {task.priority || "MEDIUM"} PRIORITY
              </span>
              <span className="text-[var(--bos-text-secondary)]">·</span>
              <span className={cn(
                "px-2.5 py-0.5 rounded font-semibold uppercase tracking-wide",
                isDone && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                isBlocked && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
                isInReview && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
                isInProgress && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
                isTodo && "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30"
              )}>
                {task.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
              title="Close Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── NOTICES / NOTIFICATIONS ──────────────────────────────── */}
        {notice && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-[12.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 text-[12.5px] text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs hover:underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* ── MAIN WORKSPACE CONTENT (2-COLUMN LAYOUT) ─────────────── */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--bos-border)]">
          
          {/* ════ LEFT / MAIN COLUMN (8 cols) ════════════════════════ */}
          <div className="lg:col-span-8 p-6 sm:p-8 space-y-8">
            
            {/* Task Headline */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--bos-text-primary)] leading-snug">
                {task.title}
              </h1>
              <div className="flex items-center gap-2 text-[13px] text-[var(--bos-text-secondary)]">
                <span className="font-medium text-[var(--bos-text-primary)]">{project.name}</span>
                {task.dueAt && (
                  <>
                    <span>·</span>
                    <span>Due: {urgency.formattedDate}</span>
                  </>
                )}
              </div>
            </div>

            {/* ── 1. WHAT DO I NEED TO DO? ─────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--bos-accent)]" />
                <h2 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                  WHAT DO I NEED TO DO?
                </h2>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[14px] leading-relaxed text-[var(--bos-text-primary)] font-normal whitespace-pre-line">
                {workInstruction}
              </div>
            </section>

            {/* ── 2. WHAT DOES DONE LOOK LIKE? ─────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                    WHAT DOES DONE LOOK LIKE?
                  </h2>
                </div>
                {totalCriteria > 0 && (
                  <span className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
                    {passedCriteria} of {totalCriteria} requirements met
                  </span>
                )}
              </div>

              {totalCriteria > 0 ? (
                <div className="divide-y divide-[var(--bos-border)] rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] overflow-hidden">
                  {acceptanceCriteria.map((crit) => {
                    const isPassed = crit.status === "PASSED";
                    return (
                      <div
                        key={crit.id}
                        onClick={() => handleToggleCriterion(crit.id, crit.status)}
                        className={cn(
                          "p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-[var(--bos-surface)]",
                          isPassed && "bg-emerald-500/5"
                        )}
                      >
                        <div className={cn(
                          "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                          isPassed
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-[var(--bos-border)] bg-[var(--bos-surface)] text-transparent"
                        )}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-[13.5px] leading-normal font-normal",
                            isPassed ? "line-through text-[var(--bos-text-secondary)]" : "text-[var(--bos-text-primary)]"
                          )}>
                            {crit.criterion}
                          </p>
                          {crit.notes && (
                            <p className="text-[11.5px] text-[var(--bos-text-secondary)] mt-0.5">{crit.notes}</p>
                          )}
                        </div>
                        <span className={cn(
                          "text-[11px] font-mono font-medium px-2 py-0.5 rounded",
                          isPassed ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-[var(--bos-text-secondary)] bg-[var(--bos-surface)]"
                        )}>
                          {isPassed ? "Passed" : "Required"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-center">
                  <p className="text-[13px] text-[var(--bos-text-secondary)]">No completion criteria have been defined yet.</p>
                </div>
              )}

              {/* Add Criterion Form */}
              <form onSubmit={handleAddCriterion} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="+ Add acceptance criterion..."
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] placeholder-[var(--bos-text-secondary)] focus:outline-none focus:border-[var(--bos-accent)]"
                />
                <button
                  type="submit"
                  disabled={!newCriterion.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12.5px] font-medium text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] disabled:opacity-40 transition-all cursor-pointer"
                >
                  Add
                </button>
              </form>
            </section>

            {/* ── 3. WORK PROGRESS (SUBTASKS) ──────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h2 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                    YOUR WORK
                  </h2>
                </div>
                {totalSubtasks > 0 && (
                  <span className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
                    {completedSubtasks} of {totalSubtasks} completed ({subtaskProgress}%)
                  </span>
                )}
              </div>

              {totalSubtasks > 0 && (
                <div className="w-full bg-[var(--bos-surface-subtle)] h-1.5 rounded-full overflow-hidden border border-[var(--bos-border)]">
                  <div
                    className="bg-[var(--bos-accent)] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              )}

              {totalSubtasks > 0 ? (
                <div className="divide-y divide-[var(--bos-border)] rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] overflow-hidden">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleToggleSubtask(st.id, st.completed)}
                      className={cn(
                        "p-3.5 flex items-center gap-3 transition-colors cursor-pointer hover:bg-[var(--bos-surface)]",
                        st.completed && "bg-[var(--bos-surface)]/60"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                        st.completed
                          ? "bg-[var(--bos-accent)] border-[var(--bos-accent)] text-white"
                          : "border-[var(--bos-border)] bg-[var(--bos-surface)] text-transparent"
                      )}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className={cn(
                        "text-[13px] flex-1",
                        st.completed ? "line-through text-[var(--bos-text-secondary)]" : "text-[var(--bos-text-primary)] font-medium"
                      )}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Add Step Form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="+ Add implementation step..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] placeholder-[var(--bos-text-secondary)] focus:outline-none focus:border-[var(--bos-accent)]"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12.5px] font-medium text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] disabled:opacity-40 transition-all cursor-pointer"
                >
                  Add Step
                </button>
              </form>
            </section>

            {/* ── 4. WHY AM I DOING THIS? ─────────────────────────── */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <h2 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                  WHY AM I DOING THIS?
                </h2>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[13.5px] leading-relaxed text-[var(--bos-text-primary)]">
                {purposeReason}
              </div>
            </section>

            {/* ── 5. PROVE YOUR WORK (EVIDENCE) ────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <h2 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                    PROVE YOUR WORK
                  </h2>
                </div>
                <button
                  onClick={() => setShowEvidenceForm((prev) => !prev)}
                  className="text-[12px] text-[var(--bos-accent)] font-medium hover:underline cursor-pointer flex items-center gap-1"
                >
                  {showEvidenceForm ? "Cancel" : "+ Upload / Connect Evidence"}
                </button>
              </div>

              {/* Lifecycle Trail Indicator */}
              <div className="p-3.5 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)] overflow-x-auto gap-2">
                <span className={cn("px-2 py-1 rounded font-semibold", isTodo ? "text-[var(--bos-text-primary)] bg-[var(--bos-surface)] border border-[var(--bos-border)]" : "text-emerald-600 dark:text-emerald-400 font-bold")}>
                  1. WORK STARTED
                </span>
                <span>→</span>
                <span className={cn("px-2 py-1 rounded font-semibold", evidenceRecords.length > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-[var(--bos-text-secondary)]")}>
                  2. EVIDENCE SUBMITTED
                </span>
                <span>→</span>
                <span className={cn("px-2 py-1 rounded font-semibold", isInReview ? "text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10" : "text-[var(--bos-text-secondary)]")}>
                  3. REVIEW
                </span>
                <span>→</span>
                <span className={cn("px-2 py-1 rounded font-semibold", isDone ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10" : "text-[var(--bos-text-secondary)]")}>
                  4. VERIFIED & DONE
                </span>
              </div>

              {/* Evidence Form */}
              {showEvidenceForm && (
                <form onSubmit={handleSubmitEvidence} className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-accent)]/50 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11.5px] font-mono text-[var(--bos-text-secondary)] block mb-1">Evidence Type</label>
                      <select
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[12.5px] text-[var(--bos-text-primary)] focus:outline-none"
                      >
                        <option value="GIT_COMMIT">Git Commit</option>
                        <option value="PULL_REQUEST">Pull Request</option>
                        <option value="SCREENSHOT">Screenshot / Asset</option>
                        <option value="CI_TEST">Test Result</option>
                        <option value="DEPLOYMENT_URL">Deployment / Live URL</option>
                        <option value="DOCUMENT">Document / Specification</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11.5px] font-mono text-[var(--bos-text-secondary)] block mb-1">Title / Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Migration schema & tables verified"
                        value={evidenceTitle}
                        onChange={(e) => setEvidenceTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[12.5px] text-[var(--bos-text-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11.5px] font-mono text-[var(--bos-text-secondary)] block mb-1">Proof URL / Commit Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://github.com/... or upload URL"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[12.5px] text-[var(--bos-text-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEvidenceForm(false)}
                      className="px-3 py-1.5 rounded-lg text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-surface-subtle)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!evidenceTitle.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[var(--bos-accent)] text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer"
                    >
                      Submit Evidence
                    </button>
                  </div>
                </form>
              )}

              {/* Evidence Records List */}
              {evidenceRecords.length > 0 ? (
                <div className="divide-y divide-[var(--bos-border)] rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] overflow-hidden">
                  {evidenceRecords.map((ev) => (
                    <div key={ev.id} className="p-3.5 flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-accent)]">
                            {ev.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[13.5px] font-medium text-[var(--bos-text-primary)]">{ev.title}</span>
                        </div>
                        {ev.url && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] text-[var(--bos-accent)] hover:underline"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>{ev.url}</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                          </a>
                        )}
                        <p className="text-[11px] text-[var(--bos-text-secondary)]">
                          Submitted by {ev.verifiedBy || "Engineer"} · {new Date(ev.createdAt).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                        <Check className="w-3 h-3" /> Attached
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-center text-[12.5px] text-[var(--bos-text-secondary)]">
                  No evidence attached yet. Connect your commit, screenshot, or file proof when ready.
                </div>
              )}
            </section>

            {/* ── 6. COMMENTS / COMMUNICATION ──────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--bos-text-secondary)]" />
                <h2 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                  COMMENTS & COMMUNICATION
                </h2>
              </div>

              {comments.length > 0 && (
                <div className="space-y-2.5 max-h-64 overflow-y-auto p-1">
                  {comments.map((cmt) => (
                    <div key={cmt.id} className="p-3 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] space-y-1">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="font-semibold text-[var(--bos-text-primary)]">{cmt.authorName}</span>
                        <span className="font-mono text-[var(--bos-text-secondary)]">
                          {new Date(cmt.createdAt).toLocaleDateString("en-GB")} {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[13px] text-[var(--bos-text-primary)] leading-normal">{cmt.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] placeholder-[var(--bos-text-secondary)] focus:outline-none focus:border-[var(--bos-accent)]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--bos-accent)] text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </section>

            {/* ── 7. WHY THIS TASK EXISTS (TRACEABILITY ACCORDION) ──── */}
            <section className="border-t border-[var(--bos-border)] pt-4">
              <button
                onClick={() => setShowTraceability((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-[12px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer py-1"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span className="font-bold uppercase tracking-wider">WHY THIS TASK EXISTS (TRACEABILITY)</span>
                </div>
                {showTraceability ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showTraceability && (
                <div className="mt-3 p-4 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] space-y-2.5 text-[12.5px] font-mono animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bos-text-secondary)]">Project:</span>
                    <span className="font-semibold text-[var(--bos-text-primary)]">{project.name} {project.code ? `(${project.code})` : ""}</span>
                  </div>
                  {requirement && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Requirement:</span>
                      <span className="text-[var(--bos-text-primary)]">{requirement.title} ({requirement.reference})</span>
                    </div>
                  )}
                  {deliverable && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Deliverable:</span>
                      <span className="text-[var(--bos-text-primary)]">{deliverable.title} [{deliverable.status}]</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bos-text-secondary)]">Workstream:</span>
                    <span className="text-[var(--bos-accent)] font-semibold">{workstream?.label || "ENGINEERING"}</span>
                  </div>
                </div>
              )}
            </section>

            {/* ── 8. ACTIVITY TIMELINE ─────────────────────────────── */}
            <section className="border-t border-[var(--bos-border)] pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--bos-text-secondary)]" />
                <h2 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                  ACTIVITY
                </h2>
              </div>
              <div className="divide-y divide-[var(--bos-border)] rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] overflow-hidden max-h-48 overflow-y-auto">
                {activities.map((act) => (
                  <div key={act.id} className="p-3 text-[12px] flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[var(--bos-text-primary)] font-medium">{act.title}</p>
                      {act.detail && <p className="text-[11.5px] text-[var(--bos-text-secondary)] mt-0.5">{act.detail}</p>}
                    </div>
                    <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] shrink-0">
                      {new Date(act.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ════ RIGHT / SIDE COLUMN (4 cols) ═══════════════════════ */}
          <div className="lg:col-span-4 p-6 bg-[var(--bos-surface-subtle)] space-y-6">
            
            {/* ── DEADLINE & TIMELINE ──────────────────────────────── */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)]">
                  WHEN DO I NEED TO FINISH?
                </span>
                <span className={cn("text-[11px] font-mono font-bold px-2 py-0.5 rounded border", urgency.colorClass)}>
                  {urgency.label}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Calendar className="w-4 h-4 text-[var(--bos-accent)]" />
                <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                  {urgency.formattedDate}
                </span>
              </div>
            </div>

            {/* ── CAN I START? (BLOCKER CHECK) ─────────────────────── */}
            <div className={cn(
              "p-4 rounded-xl border space-y-2 transition-colors",
              isBlocked
                ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            )}>
              <div className="flex items-center gap-2">
                {isBlocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span className="text-[11.5px] font-mono uppercase tracking-wider font-bold">
                  CAN I START?
                </span>
              </div>

              {isBlocked ? (
                <div className="space-y-2 text-[13px] text-[var(--bos-text-primary)]">
                  <p className="font-semibold text-rose-600 dark:text-rose-400">
                    BLOCKED BY PREREQUISITE
                  </p>
                  <p className="text-[12.5px] leading-snug">
                    {task.blockedReason || (blockerTask ? `Prerequisite task "${blockerTask.title}" must be completed first.` : "Waiting on blocker resolution.")}
                  </p>
                  {blockerTask && onNavigateTask && (
                    <button
                      onClick={() => onNavigateTask(blockerTask.id)}
                      className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] font-medium text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] transition-all cursor-pointer"
                    >
                      <span>View blocking task ({blockerTask.code || "TSK"})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ You&apos;re clear to start. No active blockers.
                </p>
              )}
            </div>

            {/* ── WHAT HAPPENS AFTER I FINISH? ─────────────────────── */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
              <span className="text-[11.5px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)]">
                WHAT HAPPENS AFTER I FINISH?
              </span>
              {nextWorkTask ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">Your work unlocks:</p>
                  <p className="text-[13.5px] font-semibold text-[var(--bos-text-primary)]">
                    {nextWorkTask.title}
                  </p>
                  {onNavigateTask && (
                    <button
                      onClick={() => onNavigateTask(nextWorkTask.id)}
                      className="inline-flex items-center gap-1.5 text-[12px] text-[var(--bos-accent)] hover:underline cursor-pointer"
                    >
                      <span>View next work ({nextWorkTask.code || "TSK"})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--bos-text-secondary)]">
                  Your work completes this execution track and readies the deliverable for client approval.
                </p>
              )}
            </div>

            {/* ── OWNER / ASSIGNEE ─────────────────────────────────── */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
              <span className="text-[11.5px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)]">
                ASSIGNED TO
              </span>
              <div className="flex items-center gap-3 pt-1">
                <div className="w-8 h-8 rounded-full bg-[var(--bos-accent)]/15 border border-[var(--bos-accent)]/30 flex items-center justify-center font-bold text-xs text-[var(--bos-accent)]">
                  {(task.assigneeName || "U").charAt(0)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                    {task.assigneeName || "Unassigned"}
                  </p>
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                    {employee?.role || "Engineering Specialist"}
                  </p>
                </div>
              </div>
            </div>

            {/* ── ADMIN / ADVANCED CONTEXT (COLLAPSIBLE) ───────────── */}
            {(isAdmin || showAdminContext) && (
              <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 font-mono text-[12px]">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                  ADVANCED CONTEXT
                </span>
                <div className="space-y-1.5 text-[var(--bos-text-secondary)]">
                  <div className="flex justify-between">
                    <span>Task Code:</span>
                    <span className="text-[var(--bos-text-primary)] font-bold">{task.code || "TSK"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Task ID:</span>
                    <span className="text-[var(--bos-text-primary)] truncate max-w-[140px]">{task.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client Visibility:</span>
                    <span className="text-[var(--bos-text-primary)]">{task.clientVisibility}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── STICKY BOTTOM PRIMARY ACTION BAR ─────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between gap-4 flex-wrap shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-mono text-[var(--bos-text-secondary)] hidden sm:inline">
              PRIMARY ACTION:
            </span>
            {isBlocked && (
              <button
                onClick={() => handleUpdateStatus("IN_PROGRESS")}
                className="px-3.5 py-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12.5px] font-medium text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] transition-all cursor-pointer"
              >
                Mark Unblocked & Start
              </button>
            )}
            {!isBlocked && isTodo && (
              <button
                onClick={() => setShowBlockModal(true)}
                className="px-3 py-2 rounded-xl text-[12px] font-medium text-[var(--bos-text-secondary)] hover:text-rose-500 transition-colors cursor-pointer"
              >
                Mark as Blocked...
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* The One Clear Primary Action Button */}
            {isTodo && (
              <button
                onClick={() => handleUpdateStatus("IN_PROGRESS")}
                disabled={isPending}
                className="px-6 py-3 rounded-xl bg-[var(--bos-accent)] text-white text-[14px] font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Task</span>
              </button>
            )}

            {isInProgress && (
              <button
                onClick={() => handleUpdateStatus("IN_REVIEW")}
                disabled={isPending}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-[14px] font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit for Review</span>
              </button>
            )}

            {isInReview && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEvidenceForm(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] font-semibold text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] transition-all cursor-pointer"
                >
                  Submit Evidence
                </button>
                <button
                  onClick={() => handleUpdateStatus("COMPLETED")}
                  disabled={isPending}
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-[14px] font-bold shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Complete</span>
                </button>
              </div>
            )}

            {isBlocked && (
              <button
                onClick={() => handleUpdateStatus("IN_PROGRESS")}
                disabled={isPending}
                className="px-6 py-3 rounded-xl bg-[var(--bos-accent)] text-white text-[14px] font-bold shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Unblock & Resume</span>
              </button>
            )}

            {isDone && (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[13.5px]">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Completed</span>
                </span>
                <button
                  onClick={() => handleUpdateStatus("IN_PROGRESS")}
                  className="text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:underline cursor-pointer"
                >
                  Reopen Task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── BLOCK MODAL ─────────────────────────────────────────── */}
        {showBlockModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Why is this task blocked?</h3>
              <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                Provide a short plain-language explanation of what is preventing work from starting.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Authentication API route must be completed first."
                value={blockedReasonInput}
                onChange={(e) => setBlockedReasonInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl text-[12.5px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-surface-subtle)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus("BLOCKED", blockedReasonInput)}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-[13px] font-semibold hover:bg-rose-700 cursor-pointer"
                >
                  Set Blocked
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
