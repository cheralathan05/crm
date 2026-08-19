"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileCheck2,
  FileCode2,
  FileText,
  FolderKanban,
  GitBranch,
  History,
  Layers,
  ListTodo,
  Loader2,
  Lock,
  MessageSquare,
  Milestone as MilestoneIcon,
  Paperclip,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkDNA } from "@/lib/tasks";
import { TASK_STATUS_CONFIG, ALL_WORKSTREAMS } from "@/lib/tasks-types";

type TaskDrawerTab =
  | "work-dna"
  | "specification"
  | "criteria"
  | "subtasks"
  | "dependencies"
  | "review"
  | "files"
  | "comments"
  | "history";

export function TaskWorkspaceDrawer({
  taskId,
  onClose,
  onTaskUpdated,
}: {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
}) {
  const [data, setData] = useState<WorkDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<TaskDrawerTab>("work-dna");
  const [isPending, startTransition] = useTransition();

  // Subtask inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  // Criteria inputs
  const [newCriterion, setNewCriterion] = useState("");
  // Comment inputs
  const [newComment, setNewComment] = useState("");
  const [commentIsClientVisible, setCommentIsClientVisible] = useState(false);
  // Review feedback inputs
  const [reviewFeedback, setReviewFeedback] = useState("");
  // Smart Assignee modal
  const [assigneeRecommendation, setAssigneeRecommendation] = useState<any | null>(null);
  const [loadingAssignee, setLoadingAssignee] = useState(false);
  // Dependency add input
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [availableTasksForDep, setAvailableTasksForDep] = useState<any[]>([]);
  const [selectedDepTaskId, setSelectedDepTaskId] = useState("");

  const fetchWorkDNA = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}`);
      const json = await res.json();
      if (json.ok && json.workDNA) {
        setData(json.workDNA);
      } else {
        setError(json.message || "Failed to load Task DNA.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading task.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchWorkDNA();
    }
  }, [taskId]);

  const handleStatusChange = async (nextStatus: string, force: boolean = false) => {
    if (!data) return;
    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus, force }),
        });
        const json = await res.json();
        if (json.ok) {
          setNotice(`Status updated to ${nextStatus}.`);
          await fetchWorkDNA();
          onTaskUpdated?.();
        } else {
          setError(json.message || "Failed to update status.");
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleToggleSubtask = async (subtaskId: string, currentVal: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtaskId, completed: !currentVal }),
        });
        if (res.ok) {
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

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
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks?subtaskId=${subtaskId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleUpdateCriterionStatus = async (criterionId: string, status: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/criteria`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ criterionId, status }),
        });
        if (res.ok) {
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriterion.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/criteria`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ criterion: newCriterion.trim(), status: "NOT_STARTED" }),
        });
        if (res.ok) {
          setNewCriterion("");
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleDeleteCriterion = async (criterionId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/criteria?criterionId=${criterionId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment.trim(), isClientVisible: commentIsClientVisible }),
        });
        if (res.ok) {
          setNewComment("");
          await fetchWorkDNA();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleReviewAction = async (action: "SUBMIT" | "APPROVE" | "REQUEST_CHANGES") => {
    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        const res = await fetch(`/api/tasks/${taskId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, feedback: reviewFeedback }),
        });
        const json = await res.json();
        if (json.ok) {
          setNotice(`Task review action "${action}" completed.`);
          setReviewFeedback("");
          await fetchWorkDNA();
          onTaskUpdated?.();
        } else {
          setError(json.message || "Review action failed.");
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleLoadSmartAssignee = async () => {
    try {
      setLoadingAssignee(true);
      const res = await fetch("/api/tasks/recommend-assignee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json();
      if (json.ok && json.recommendation) {
        setAssigneeRecommendation(json.recommendation);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingAssignee(false);
    }
  };

  const handleApplyAssignee = async (name: string, role?: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeName: name, teamRole: role }),
        });
        if (res.ok) {
          setAssigneeRecommendation(null);
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleOpenAddDependency = async () => {
    if (!data) return;
    try {
      setShowAddDependency(true);
      const res = await fetch(`/api/tasks?projectId=${data.project.id}`);
      const json = await res.json();
      if (json.ok && json.tasks) {
        setAvailableTasksForDep(json.tasks.filter((t: any) => t.id !== taskId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDependency = async () => {
    if (!selectedDepTaskId) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dependsOnTaskId: selectedDepTaskId, dependencyType: "BLOCKED_BY" }),
        });
        if (res.ok) {
          setShowAddDependency(false);
          setSelectedDepTaskId("");
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleDeleteDependency = async (depTaskId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/dependencies?dependsOnTaskId=${depTaskId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchWorkDNA();
          onTaskUpdated?.();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-[var(--bos-surface)] border-l border-[var(--bos-border-strong)] shadow-2xl z-50 flex flex-col items-center justify-center p-8 animate-in slide-in-from-right duration-200">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)] mb-3" />
        <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Resolving Task Work DNA & Lineage…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-[var(--bos-surface)] border-l border-[var(--bos-border-strong)] shadow-2xl z-50 p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[var(--bos-border)]">
            <h2 className="text-[16px] font-semibold text-[var(--bos-text-primary)]">Task Not Found</h2>
            <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-4">{error || "Unable to locate task records."}</p>
        </div>
        <button onClick={onClose} className="w-full py-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded text-[13px]">
          Close Workspace
        </button>
      </div>
    );
  }

  const statusStyle = TASK_STATUS_CONFIG[data.task.status] || TASK_STATUS_CONFIG.TODO;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-[var(--bos-bg)] border-l border-[var(--bos-border-strong)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 text-[var(--bos-text-primary)]">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="p-5 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-medium bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-accent)]">
              {data.task.code || "TASK"}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5"
              style={{ backgroundColor: `${data.workstream.color}15`, color: data.workstream.color, border: `1px solid ${data.workstream.color}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: data.workstream.color }} />
              {data.workstream.label}
            </span>
            {data.dependencies.isBlockedByUpstream && (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-500 border border-red-500/30 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                BLOCKED BY PREREQUISITE
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-[18px] font-semibold tracking-tight text-[var(--bos-text-primary)] leading-snug">
              {data.task.title}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-[var(--bos-text-secondary)] font-mono">
              <Link href={`/clients/${data.client.id}`} className="hover:underline text-[var(--bos-text-primary)] font-sans font-medium">
                {data.client.companyName}
              </Link>
              <span>/</span>
              <Link href={`/projects/${data.project.id}`} className="hover:underline text-[var(--bos-text-primary)] font-sans font-medium">
                {data.project.name}
              </Link>
              {data.milestone && (
                <>
                  <span>/</span>
                  <span className="truncate max-w-[140px]">{data.milestone.title}</span>
                </>
              )}
            </div>
          </div>

          {/* Status Picker */}
          <div className="flex flex-col items-end gap-1">
            <select
              value={data.task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isPending}
              className="text-[12px] font-medium px-3 py-1.5 rounded-md border cursor-pointer font-mono"
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.text,
                borderColor: statusStyle.border,
              }}
            >
              {Object.entries(TASK_STATUS_CONFIG).map(([key, conf]) => (
                <option key={key} value={key} className="bg-[var(--bos-surface)] text-[var(--bos-text-primary)]">
                  {conf.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">State Machine Protected</span>
          </div>
        </div>

        {/* Notices and Alerts */}
        {notice && (
          <div className="px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[12px] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {notice}
            </span>
            <button onClick={() => setNotice(null)} className="hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[12px] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </span>
            <button onClick={() => setError(null)} className="hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Meta Rail */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--bos-border)] text-[12px]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">Owner</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-medium truncate">{data.employee?.name || "Unassigned"}</span>
              <button
                onClick={handleLoadSmartAssignee}
                title="Smart Assign"
                className="text-[var(--bos-accent)] hover:underline text-[10px] font-mono"
              >
                (Smart)
              </button>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">Priority</span>
            <span className="font-medium block mt-0.5">{data.task.priority}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">Target Due</span>
            <span className="font-medium block mt-0.5">
              {data.task.dueAt ? new Date(data.task.dueAt).toLocaleDateString("en-GB") : "No date"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">Subtask Progress</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bos-line-strong)] overflow-hidden">
                <div className="h-full bg-[var(--bos-accent)]" style={{ width: `${data.task.progress}%` }} />
              </div>
              <span className="font-mono text-[11px] font-medium">{data.task.progress}%</span>
            </div>
          </div>
        </div>

        {/* Smart Assignee Panel (Drawer inside drawer) */}
        {assigneeRecommendation && (
          <div className="p-3 mt-2 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-accent-ring)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--bos-accent)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Smart Assignee Recommendation
              </span>
              <button onClick={() => setAssigneeRecommendation(null)} className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)]">
              Recommended: <strong className="text-[var(--bos-text-primary)]">{assigneeRecommendation.recommended.name}</strong> ({assigneeRecommendation.recommended.role})
            </p>
            <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">Why: {assigneeRecommendation.reason}</p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => handleApplyAssignee(assigneeRecommendation.recommended.name, assigneeRecommendation.recommended.role)}
                className="px-3 py-1 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:bg-[var(--bos-accent-hover)] transition"
              >
                Assign {assigneeRecommendation.recommended.name}
              </button>
              <button
                onClick={() => setAssigneeRecommendation(null)}
                className="px-3 py-1 border border-[var(--bos-border)] text-[12px] rounded hover:bg-[var(--bos-surface)]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-5 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] overflow-x-auto text-[12px]">
        {[
          { id: "work-dna", label: "Work DNA", icon: GitBranch, badge: "SIGNATURE" },
          { id: "specification", label: "Spec & Scope", icon: FileText },
          { id: "criteria", label: "Acceptance Criteria", icon: FileCheck2, count: data.acceptanceCriteria.length },
          { id: "subtasks", label: "Subtasks", icon: ListTodo, count: data.subtasks.length },
          { id: "dependencies", label: "Dependencies", icon: Layers, count: data.dependencies.upstream.length },
          { id: "review", label: "Review Engine", icon: ShieldCheck },
          { id: "files", label: "Files", icon: Paperclip },
          { id: "comments", label: "Comments", icon: MessageSquare },
          { id: "history", label: "Audit History", icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as TaskDrawerTab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition",
                active
                  ? "border-[var(--bos-accent)] text-[var(--bos-accent)] bg-[var(--bos-bg)]"
                  : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.badge && (
                <span className="px-1 py-0.2 rounded font-mono text-[9px] bg-[var(--bos-accent)] text-white font-bold">
                  {t.badge}
                </span>
              )}
              {t.count !== undefined && t.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-[var(--bos-border)] text-[var(--bos-text-secondary)]">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main Tab Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 1. WORK DNA TAB (Signature Feature) */}
        {tab === "work-dna" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)]">
              <div className="flex items-center gap-2 text-[var(--bos-accent)] font-semibold text-[13px] uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4" />
                Work DNA — Origin & Execution Lineage
              </div>
              <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1">
                Every task in Business OS is an unbroken chain derived from client requirements and approved scope commitments.
              </p>
            </div>

            {/* Visual DNA Tree */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--bos-line-strong)]">
              {/* Step 1: Client */}
              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 -ml-6 rounded-full bg-[var(--bos-accent)] text-white flex items-center justify-center text-[10px] font-mono z-10 shrink-0">
                  1
                </div>
                <div className="flex-1 p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">Originating Client</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-semibold text-[14px]">{data.client.companyName}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                      Stage: {data.client.stage}
                    </span>
                  </div>
                  {data.lead?.source && (
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1 font-mono">
                      Acquisition Lead Source: {data.lead.source}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Requirement */}
              {data.requirement ? (
                <div className="relative flex items-start gap-3">
                  <div className="w-5 h-5 -ml-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono z-10 shrink-0">
                    2
                  </div>
                  <div className="flex-1 p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">Verified Requirement</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-medium text-[13px]">{data.requirement.title}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        {data.requirement.reference}
                      </span>
                    </div>
                    {data.requirementReview && (
                      <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1 font-mono">
                        Discovery Completeness: {data.requirementReview.completeness}% · Technical Readiness: {data.requirementReview.readiness}%
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Step 3: Approved Proposal */}
              {data.proposal ? (
                <div className="relative flex items-start gap-3">
                  <div className="w-5 h-5 -ml-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono z-10 shrink-0">
                    3
                  </div>
                  <div className="flex-1 p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">Approved Proposal</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-medium text-[13px]">{data.proposal.title}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        v{data.proposal.version} · {data.proposal.reference}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1 font-mono">
                      Commercial Commitment: {data.proposal.currency} {data.proposal.amount?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Step 4: Approved Scope Item */}
              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 -ml-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-mono z-10 shrink-0">
                  4
                </div>
                <div className="flex-1 p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">Approved Scope Commitment</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-medium text-[13px]">{data.scope?.title || data.task.title}</span>
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">{data.scope?.sourceSection || "Approved Scope"}</span>
                  </div>
                </div>
              </div>

              {/* Step 5: Project & Milestone */}
              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 -ml-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-mono z-10 shrink-0">
                  5
                </div>
                <div className="flex-1 p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">Project Delivery Structure</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-medium text-[13px]">{data.project.name} ({data.project.code})</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                      Phase: {data.milestone?.title || "Phase Execution"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 6: Deliverable & Workstream */}
              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 -ml-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-mono z-10 shrink-0">
                  6
                </div>
                <div className="flex-1 p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">Parent Deliverable & Workstream</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-medium text-[13px]">{data.deliverable?.title || "Primary Milestone Deliverable"}</span>
                    <span
                      className="text-[11px] font-mono px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${data.workstream.color}15`, color: data.workstream.color }}
                    >
                      {data.workstream.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 7: Executable Task */}
              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 -ml-6 rounded-full bg-[var(--bos-accent)] text-white flex items-center justify-center text-[10px] font-mono z-10 shrink-0 ring-4 ring-[var(--bos-accent-subtle)]">
                  7
                </div>
                <div className="flex-1 p-4 rounded-lg bg-[var(--bos-surface)] border-2 border-[var(--bos-accent)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[var(--bos-accent)] font-bold uppercase">Current Executable Unit</span>
                    <span
                      className="px-2 py-0.5 rounded font-mono text-[11px] font-medium"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[15px] mt-1 text-[var(--bos-text-primary)]">{data.task.title}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--bos-border)] text-[12px] font-mono">
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] block">Assigned Owner</span>
                      <span className="font-sans font-medium text-[var(--bos-text-primary)]">{data.employee?.name || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] block">Subtasks Completed</span>
                      <span className="font-sans font-medium text-[var(--bos-text-primary)]">
                        {data.subtasks.filter((s) => s.completed).length} / {data.subtasks.length} ({data.task.progress}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SPECIFICATION TAB */}
        {tab === "specification" && (
          <div className="space-y-5">
            <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
              <h3 className="text-[12px] font-mono font-semibold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                What to Do (Description)
              </h3>
              <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed whitespace-pre-wrap">
                {data.task.description || "No specific instructions entered. Refer to parent deliverable specification."}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
              <h3 className="text-[12px] font-mono font-semibold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                Expected Business Result
              </h3>
              <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">
                {data.task.expectedResult || `Deliver verified ${data.task.title} in accordance with approved milestone requirements.`}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between">
              <div>
                <span className="text-[13px] font-medium block text-[var(--bos-text-primary)]">Client Visibility</span>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">
                  {data.task.clientVisibility === "CLIENT_VISIBLE"
                    ? "Visible in client portal and delivery reviews."
                    : "Internal team only. Client will only see the completed deliverable."}
                </span>
              </div>
              <span
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-mono font-medium",
                  data.task.clientVisibility === "CLIENT_VISIBLE"
                    ? "bg-purple-500/10 text-purple-600 border border-purple-500/30"
                    : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)]",
                )}
              >
                {data.task.clientVisibility}
              </span>
            </div>
          </div>
        )}

        {/* 3. ACCEPTANCE CRITERIA TAB */}
        {tab === "criteria" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Acceptance Criteria Engine</h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  A task cannot be marked completed until all required acceptance criteria pass.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {data.acceptanceCriteria.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-[var(--bos-border)] text-[var(--bos-text-secondary)] text-[12px]">
                  No acceptance criteria defined yet. Add requirements below.
                </div>
              ) : (
                data.acceptanceCriteria.map((crit) => (
                  <div
                    key={crit.id}
                    className="p-3.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 space-y-1">
                      <span className="text-[13px] font-medium text-[var(--bos-text-primary)]">{crit.criterion}</span>
                      {crit.notes && <p className="text-[11px] text-[var(--bos-text-secondary)]">{crit.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={crit.status}
                        onChange={(e) => handleUpdateCriterionStatus(crit.id, e.target.value)}
                        disabled={isPending}
                        className={cn(
                          "text-[11px] font-mono px-2 py-1 rounded border cursor-pointer font-medium",
                          crit.status === "PASSED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : crit.status === "FAILED"
                            ? "bg-red-500/10 text-red-600 border-red-500/30"
                            : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] border-[var(--bos-border)]",
                        )}
                      >
                        <option value="NOT_STARTED">NOT_STARTED</option>
                        <option value="PASSED">PASSED ✓</option>
                        <option value="FAILED">FAILED ✗</option>
                        <option value="NOT_APPLICABLE">N/A</option>
                      </select>

                      <button
                        onClick={() => handleDeleteCriterion(crit.id)}
                        className="p-1 text-[var(--bos-text-tertiary)] hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Criterion Form */}
            <form onSubmit={handleAddCriterion} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add verifiable acceptance criterion (e.g. Products filter by category without reload)…"
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                className="flex-1 px-3 py-2 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded focus:outline-none focus:border-[var(--bos-accent)]"
              />
              <button
                type="submit"
                disabled={isPending || !newCriterion.trim()}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:bg-[var(--bos-accent-hover)] transition disabled:opacity-50"
              >
                Add Criterion
              </button>
            </form>
          </div>
        )}

        {/* 4. SUBTASKS TAB */}
        {tab === "subtasks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Execution Checklist</h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Granular implementation units ({data.subtasks.filter((s) => s.completed).length} of {data.subtasks.length} complete)
                </p>
              </div>
              <span className="text-[12px] font-mono font-semibold text-[var(--bos-accent)]">{data.task.progress}%</span>
            </div>

            <div className="space-y-2">
              {data.subtasks.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-[var(--bos-border)] text-[var(--bos-text-secondary)] text-[12px]">
                  No subtasks added. Break down this task below.
                </div>
              ) : (
                data.subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between gap-3 group"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id, st.completed)}
                        className="w-4 h-4 rounded text-[var(--bos-accent)] accent-[var(--bos-accent)] cursor-pointer"
                      />
                      <span className={cn("text-[13px]", st.completed ? "line-through text-[var(--bos-text-tertiary)]" : "text-[var(--bos-text-primary)]")}>
                        {st.title}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      {st.assigneeName && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)]">
                          {st.assigneeName}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--bos-text-tertiary)] hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add subtask unit (e.g. Implement pagination API handler)…"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 px-3 py-2 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded focus:outline-none focus:border-[var(--bos-accent)]"
              />
              <button
                type="submit"
                disabled={isPending || !newSubtaskTitle.trim()}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:bg-[var(--bos-accent-hover)] transition disabled:opacity-50"
              >
                Add Subtask
              </button>
            </form>
          </div>
        )}

        {/* 5. DEPENDENCIES TAB */}
        {tab === "dependencies" && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Upstream Prerequisites (Waiting For)</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">This task cannot start until prerequisites complete.</p>
                </div>
                <button
                  onClick={handleOpenAddDependency}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded hover:bg-[var(--bos-bg)] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Dependency
                </button>
              </div>

              <div className="space-y-2 mt-3">
                {data.dependencies.upstream.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] text-[var(--bos-text-secondary)]">
                    No upstream dependencies. This task is unblocked.
                  </div>
                ) : (
                  data.dependencies.upstream.map((up) => {
                    const isDone = up.status === "COMPLETED" || up.status === "DONE" || up.status === "CLIENT_APPROVED";
                    return (
                      <div
                        key={up.id}
                        className={cn(
                          "p-3 rounded-lg border flex items-center justify-between",
                          isDone ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20",
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium">{up.code || "TASK"}</span>
                            <span className="text-[13px] font-medium">{up.title}</span>
                          </div>
                          <span className="text-[11px] text-[var(--bos-text-secondary)] font-mono">
                            Owner: {up.assigneeName || "Unassigned"} · Status: {up.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-mono font-medium px-2 py-0.5 rounded",
                              isDone ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600 animate-pulse",
                            )}
                          >
                            {isDone ? "COMPLETED" : "BLOCKING"}
                          </span>
                          <button
                            onClick={() => handleDeleteDependency(up.id)}
                            className="p-1 text-[var(--bos-text-tertiary)] hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {showAddDependency && (
              <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-accent-ring)] space-y-3">
                <span className="text-[12px] font-semibold text-[var(--bos-accent)]">Select Prerequisite Task</span>
                <select
                  value={selectedDepTaskId}
                  onChange={(e) => setSelectedDepTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded font-mono"
                >
                  <option value="">-- Choose Task --</option>
                  {availableTasksForDep.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code || "TASK"} · {t.title} ({t.status})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddDependency}
                    disabled={!selectedDepTaskId || isPending}
                    className="px-3 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:bg-[var(--bos-accent-hover)] transition disabled:opacity-50"
                  >
                    Link Dependency
                  </button>
                  <button
                    onClick={() => setShowAddDependency(false)}
                    className="px-3 py-1.5 border border-[var(--bos-border)] text-[12px] rounded hover:bg-[var(--bos-bg)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Downstream Tasks */}
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Downstream Work (Dependent on This)</h3>
              <p className="text-[12px] text-[var(--bos-text-secondary)]">These tasks are waiting on this item to finish.</p>

              <div className="space-y-2 mt-3">
                {data.dependencies.downstream.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] text-[var(--bos-text-secondary)]">
                    No downstream tasks linked.
                  </div>
                ) : (
                  data.dependencies.downstream.map((down) => (
                    <div key={down.id} className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-medium">{down.code || "TASK"}</span>
                        <span className="text-[13px] font-medium">{down.title}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">{down.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. REVIEW ENGINE TAB */}
        {tab === "review" && (
          <div className="space-y-5">
            <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Task Review Workflow</h3>
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-medium"
                  style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                >
                  Current: {statusStyle.label}
                </span>
              </div>
              <p className="text-[12px] text-[var(--bos-text-secondary)]">
                Structured manager sign-off engine. Employees submit work with passing acceptance criteria, and reviewers can approve or request revisions.
              </p>

              {/* Review Actions */}
              <div className="pt-3 border-t border-[var(--bos-border)] space-y-3">
                <textarea
                  placeholder="Reviewer notes or reason for requesting changes…"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-[12px] bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded focus:outline-none focus:border-[var(--bos-accent)]"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReviewAction("SUBMIT")}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-blue-600 text-white text-[12px] font-medium rounded hover:bg-blue-700 transition"
                  >
                    Submit for Review
                  </button>
                  <button
                    onClick={() => handleReviewAction("APPROVE")}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-[12px] font-medium rounded hover:bg-emerald-700 transition"
                  >
                    Approve & Complete
                  </button>
                  <button
                    onClick={() => handleReviewAction("REQUEST_CHANGES")}
                    disabled={isPending || !reviewFeedback.trim()}
                    className="px-3 py-1.5 bg-red-600 text-white text-[12px] font-medium rounded hover:bg-red-700 transition disabled:opacity-50"
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Review History */}
            <div className="space-y-3">
              <h4 className="text-[12px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">Review Logs</h4>
              {data.reviews.length === 0 ? (
                <p className="text-[12px] text-[var(--bos-text-secondary)]">No formal reviews recorded yet.</p>
              ) : (
                data.reviews.map((rev) => (
                  <div key={rev.id} className="p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--bos-text-primary)]">{rev.reviewerName}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded font-mono text-[10px] font-medium",
                          rev.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : rev.status === "CHANGES_REQUESTED"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-blue-500/10 text-blue-600",
                        )}
                      >
                        {rev.status}
                      </span>
                    </div>
                    {rev.feedback && <p className="text-[var(--bos-text-secondary)]">{rev.feedback}</p>}
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">
                      {new Date(rev.submittedAt).toLocaleString("en-GB")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 7. FILES TAB */}
        {tab === "files" && (
          <div className="space-y-4">
            <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Task Deliverables & Technical Files</h3>
            <div className="p-6 text-center rounded-lg border border-dashed border-[var(--bos-border)] text-[var(--bos-text-secondary)] text-[12px]">
              Files uploaded to this task are version-tracked and categorized under deliverable specifications.
            </div>
          </div>
        )}

        {/* 8. COMMENTS TAB */}
        {tab === "comments" && (
          <div className="space-y-4">
            <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Discussion & Notes</h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.activities.filter((a) => a.type === "COMMENT_ADDED").length === 0 ? (
                <p className="text-[12px] text-[var(--bos-text-secondary)]">No comments yet. Start a discussion below.</p>
              ) : (
                data.activities
                  .filter((a) => a.type === "COMMENT_ADDED")
                  .map((c) => (
                    <div key={c.id} className="p-3 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--bos-text-primary)]">{c.actorName}</span>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                          {new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[var(--bos-text-secondary)]">{c.detail}</p>
                    </div>
                  ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-[var(--bos-border)]">
              <textarea
                placeholder="Write a comment or mention a colleague (@Name)…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded focus:outline-none focus:border-[var(--bos-accent)]"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-[var(--bos-text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commentIsClientVisible}
                    onChange={(e) => setCommentIsClientVisible(e.target.checked)}
                    className="rounded text-[var(--bos-accent)]"
                  />
                  Client Visible Comment
                </label>
                <button
                  type="submit"
                  disabled={isPending || !newComment.trim()}
                  className="px-4 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:bg-[var(--bos-accent-hover)] transition disabled:opacity-50"
                >
                  Post Comment
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 9. AUDIT HISTORY TAB */}
        {tab === "history" && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Immutable Event Stream</h3>
            <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--bos-line-strong)]">
              {data.activities.map((act) => (
                <div key={act.id} className="relative text-[12px]">
                  <div className="w-2.5 h-2.5 -ml-5.5 rounded-full bg-[var(--bos-accent)] mt-1.5" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--bos-text-primary)]">{act.title}</span>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                      {new Date(act.createdAt).toLocaleString("en-GB")}
                    </span>
                  </div>
                  {act.detail && <p className="text-[var(--bos-text-secondary)] text-[11px] mt-0.5">{act.detail}</p>}
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block mt-0.5">By {act.actorName || "System"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
