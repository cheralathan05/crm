"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Database,
  ExternalLink,
  GitCommit,
  GitPullRequest,
  Globe,
  Layers,
  LayoutGrid,
  Link2,
  ListTodo,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Unlock,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkDNA } from "@/lib/tasks";
import { ProductPreviewHero } from "./product-preview-hero";
import { ProductLineageGraph } from "./product-lineage-graph";
import { ProductWorkPackage } from "./product-work-package";
import { ProductMapModal } from "./product-map-modal";

export type TaskExecutionWorkspaceProps = {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onNavigateTask?: (newTaskId: string) => void;
  isAdmin?: boolean;
};

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

  // "SEE PRODUCT" Map Modal
  const [showProductMap, setShowProductMap] = useState(false);

  // Subtask & Comment form inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [blockedReasonInput, setBlockedReasonInput] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);

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

  // Real Status Transition Handler
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
          await fetchTaskDetails();
          onTaskUpdated?.();
          setShowBlockModal(false);
        } else {
          setError(json.message || "Failed to update status.");
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  // Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string, currentVal: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtaskId, completed: !currentVal }),
        });
        if (res.ok) {
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
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
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  // Toggle Acceptance Criteria
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
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment.trim(), isClientVisible: false }),
        });
        if (res.ok) {
          setNewComment("");
          await fetchTaskDetails();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 font-mono">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-xs tracking-wider uppercase">Loading Product System...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-[var(--bos-text-primary)]">Task Unavailable</h3>
          <p className="text-xs text-[var(--bos-text-secondary)]">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bos-accent)] text-white font-mono text-xs rounded-xl cursor-pointer"
          >
            Close Workspace
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { project, task, productUnderstanding, subtasks, acceptanceCriteria, comments } = data;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
      {/* ── Top Bar ───────────────────────────────────────────────── */}
      <div className="px-6 py-3.5 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--bos-bg)] hover:bg-[var(--bos-surface-hover)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-all cursor-pointer"
            title="Back to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--bos-accent)]">
              {task.code || "TSK"}
            </span>
            <span className="text-sm font-bold text-[var(--bos-text-primary)] truncate max-w-md">
              {task.title}
            </span>
          </div>
        </div>

        {/* Global Action: SEE PRODUCT */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowProductMap(true)}
            className="px-3.5 py-1.5 bg-[var(--bos-accent)] hover:opacity-90 text-white text-xs font-mono font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            SEE PRODUCT
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Notice Banner ─────────────────────────────────────────── */}
      {notice && (
        <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-500 text-xs font-mono flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="hover:text-emerald-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Workspace Scrollable Container ───────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[var(--bos-bg)] p-6 md:p-10 space-y-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* ══════════════════════════════════════════════════════════
             1. THE FIRST SCREEN: FEEL LIKE A REAL PRODUCT
             ══════════════════════════════════════════════════════════ */}
          <div className="p-6 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl space-y-4 shadow-sm">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider">
                PROJECT
              </div>
              <h1 className="text-2xl font-extrabold text-[var(--bos-text-primary)] tracking-tight">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-xs text-[var(--bos-text-secondary)] max-w-3xl leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--bos-border)] space-y-1">
              <div className="text-[10px] font-mono text-[var(--bos-accent)] font-bold uppercase tracking-wider">
                YOU ARE BUILDING
              </div>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                {productUnderstanding?.featureName || task.title}
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                {productUnderstanding?.featureDescription || task.expectedResult || "Engineered module for live system delivery."}
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
             2. HERO PRODUCT PREVIEW (LARGE VISUAL REPRESENTATION)
             ══════════════════════════════════════════════════════════ */}
          <ProductPreviewHero
            understanding={productUnderstanding}
            taskId={task.id}
            projectId={project.id}
            onOpenProductMap={() => setShowProductMap(true)}
          />

          {/* ══════════════════════════════════════════════════════════
             3. HOW THIS CONNECTS (INTERACTIVE LINEAGE)
             ══════════════════════════════════════════════════════════ */}
          {productUnderstanding?.lineage && (
            <ProductLineageGraph lineage={productUnderstanding.lineage} />
          )}

          {/* ══════════════════════════════════════════════════════════
             4. WORK PACKAGE SPECIFICATION
             ══════════════════════════════════════════════════════════ */}
          {productUnderstanding?.workPackage && (
            <ProductWorkPackage
              workPackage={productUnderstanding.workPackage}
              taskId={task.id}
              onEvidenceAdded={fetchTaskDetails}
            />
          )}

          {/* ══════════════════════════════════════════════════════════
             5. STEP-BY-STEP EXECUTION (SUBTASKS)
             ══════════════════════════════════════════════════════════ */}
          <div className="p-6 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border)]">
              <h3 className="text-xs font-mono font-bold uppercase text-[var(--bos-text-muted)] tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                EXECUTION CHECKLIST ({subtasks.filter((s) => s.completed).length} / {subtasks.length})
              </h3>
            </div>

            <div className="space-y-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleToggleSubtask(st.id, st.completed)}
                  className={cn(
                    "p-3 rounded-xl border flex items-center gap-3 text-xs font-mono cursor-pointer transition-all",
                    st.completed
                      ? "bg-[var(--bos-bg)] border-emerald-500/30 text-[var(--bos-text-muted)] line-through"
                      : "bg-[var(--bos-bg)] border-[var(--bos-border)] text-[var(--bos-text-primary)] hover:border-[var(--bos-border-hover)]"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-[var(--bos-accent)] cursor-pointer"
                  />
                  <span>{st.title}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add implementation step..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 p-2.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs font-mono text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-muted)] focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[var(--bos-surface-elevated)] border border-[var(--bos-border)] rounded-xl text-xs font-mono font-semibold text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-hover)] cursor-pointer"
              >
                Add Step
              </button>
            </form>
          </div>

          {/* ══════════════════════════════════════════════════════════
             6. STATUS & NEXT ACTION BAR
             ══════════════════════════════════════════════════════════ */}
          <div className="p-6 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-[10px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider">
                CURRENT STATE
              </div>
              <div className="text-sm font-bold font-mono text-[var(--bos-text-primary)] mt-0.5">
                {task.status.replace(/_/g, " ")}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {task.status !== "IN_PROGRESS" && task.status !== "DONE" && (
                <button
                  onClick={() => handleUpdateStatus("IN_PROGRESS")}
                  disabled={isPending}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Work
                </button>
              )}

              {task.status === "IN_PROGRESS" && (
                <button
                  onClick={() => handleUpdateStatus("IN_REVIEW")}
                  disabled={isPending}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-mono font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Submit for Review
                </button>
              )}

              {(task.status === "IN_REVIEW" || isAdmin) && (
                <button
                  onClick={() => handleUpdateStatus("COMPLETED")}
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-mono font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve & Complete
                </button>
              )}

              {task.status !== "BLOCKED" && (
                <button
                  onClick={() => setShowBlockModal(true)}
                  disabled={isPending}
                  className="px-4 py-2 bg-[var(--bos-bg)] border border-rose-500/30 text-rose-500 text-xs font-mono font-bold rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  Mark Blocked
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Block Modal ───────────────────────────────────────────── */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--bos-text-primary)] font-mono">
              FLAG TASK AS BLOCKED
            </h3>
            <textarea
              placeholder="State the exact technical or external blocker..."
              value={blockedReasonInput}
              onChange={(e) => setBlockedReasonInput(e.target.value)}
              className="w-full p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs font-mono text-[var(--bos-text-primary)] focus:outline-none h-24"
            />
            <div className="flex justify-end gap-2 font-mono text-xs">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)] text-[var(--bos-text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus("BLOCKED", blockedReasonInput)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
              >
                Confirm Blocked
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Map Modal ─────────────────────────────────────── */}
      {showProductMap && (
        <ProductMapModal
          projectId={project.id}
          onClose={() => setShowProductMap(false)}
          onSelectTask={(newTId) => {
            setShowProductMap(false);
            onNavigateTask?.(newTId);
          }}
        />
      )}
    </div>
  );
}
