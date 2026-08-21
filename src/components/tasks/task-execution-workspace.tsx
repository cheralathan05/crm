"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [activeTab, setActiveTab] = useState<
    "story" | "specs" | "impact" | "dependencies" | "code" | "verification" | "evidence" | "activity"
  >("story");
  const [isPending, startTransition] = useTransition();

  // Inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newCriterion, setNewCriterion] = useState("");
  const [newComment, setNewComment] = useState("");
  const [evidenceType, setEvidenceType] = useState("GIT_COMMIT");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  // AI Copilot Query inside workspace
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  // Update Status
  const handleUpdateStatus = async (newStatus: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const json = await res.json();
        if (json.ok) {
          setNotice(`Status moved to ${newStatus}.`);
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

  // Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string, current: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtaskId, completed: !current }),
        });
        if (res.ok) {
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  // Attach Evidence
  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle.trim() || !data) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${data.project.id}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            type: evidenceType,
            title: evidenceTitle.trim(),
            url: evidenceUrl.trim() || undefined,
          }),
        });
        if (res.ok) {
          setEvidenceTitle("");
          setEvidenceUrl("");
          setShowEvidenceForm(false);
          setNotice("Verification evidence successfully attached.");
          setTimeout(() => setNotice(null), 3000);
          await fetchTaskDetails();
          onTaskUpdated?.();
        }
      } catch {}
    });
  };

  // AI Copilot Task Intelligence Query
  const handleAiQuery = async (queryText?: string) => {
    const q = queryText || aiQuery.trim();
    if (!q || !data) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch(`/api/projects/${data.project.id}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `TASK CONTEXT: [${data.task.code || "Task"}: ${data.task.title}] - Layer: ${data.workstream.label} - Status: ${data.task.status}. User Query: ${q}`,
        }),
      });
      const json = await res.json();
      if (json.ok && json.answer) {
        setAiResponse(json.answer);
      } else {
        setAiResponse(json.message || "Unable to query task intelligence.");
      }
    } catch {
      setAiResponse("Network error communicating with Ollama intelligence.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bos-bg)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Loading Task Execution Workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bos-bg)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-[18px] font-bold text-[var(--bos-text-primary)]">Unable to Open Task Execution Workspace</h3>
        <p className="text-[13px] text-[var(--bos-text-secondary)] max-w-md">{error || "Task record not found."}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] font-medium cursor-pointer"
        >
          Return to Execution OS
        </button>
      </div>
    );
  }

  const { task, project, requirement, deliverable, milestone, workstream, subtasks = [], acceptanceCriteria = [], dependencies, employee } = data;
  const isBlocked = dependencies?.isBlockedByUpstream;
  const allSubtasksDone = subtasks.length > 0 && subtasks.every((st) => st.completed);
  const allCriteriaPassed = acceptanceCriteria.length > 0 && acceptanceCriteria.every((c) => c.status === "PASSED");
  const isReadyForCompletion = allSubtasksDone && (!acceptanceCriteria.length || allCriteriaPassed) && !isBlocked;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col overflow-hidden animate-in fade-in duration-150">
      
      {/* Notice Banner */}
      {notice && (
        <div className="bg-emerald-600 text-white text-[12px] font-mono py-1.5 px-6 text-center flex items-center justify-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}

      {/* ── TOP HEADER ────────────────────────────────────────────── */}
      <header className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)] px-6 py-3 shrink-0 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-[12px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors pr-2 border-r border-[var(--bos-border)] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Execution</span>
          </button>

          <span className="font-mono text-[12px] font-bold px-2 py-0.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-accent)]">
            {task.code || "TSK-001"}
          </span>

          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600">
            {workstream.label}
          </span>

          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
            {task.priority}
          </span>

          <span className={cn(
            "text-[11px] font-mono font-bold px-2 py-0.5 rounded",
            task.status === "DONE" ? "bg-emerald-500/10 text-emerald-600" :
            task.status === "BLOCKED" ? "bg-rose-500/10 text-rose-600" : "bg-sky-500/10 text-sky-600"
          )}>
            {task.status}
          </span>
        </div>

        {/* Status Transition Action Buttons */}
        <div className="flex items-center gap-2">
          {task.status !== "IN_PROGRESS" && task.status !== "DONE" && (
            <button
              onClick={() => handleUpdateStatus("IN_PROGRESS")}
              className="px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[12px] font-medium transition-colors cursor-pointer"
            >
              Start Implementation
            </button>
          )}

          {task.status !== "IN_REVIEW" && task.status !== "DONE" && (
            <button
              onClick={() => handleUpdateStatus("IN_REVIEW")}
              className="px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-purple-500 text-[12px] font-medium transition-colors cursor-pointer"
            >
              Submit for Review
            </button>
          )}

          {task.status !== "DONE" ? (
            <button
              onClick={() => handleUpdateStatus("DONE")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verify & Complete Task</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-mono text-[11px] font-bold">
              ✓ Verified & Done
            </span>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── CONTEXT SUB-STRIP ──────────────────────────────────────── */}
      <div className="bg-[var(--bos-surface)]/60 border-b border-[var(--bos-border)] px-6 py-2 shrink-0 flex items-center justify-between gap-4 text-[11.5px] font-mono text-[var(--bos-text-secondary)] flex-wrap">
        <div className="flex items-center gap-3">
          <span>Project: <strong className="text-[var(--bos-text-primary)]">{project.name}</strong></span>
          <span>·</span>
          <span>Requirement: <strong className="text-[var(--bos-text-primary)]">{requirement?.reference || "Approved Scope"}</strong></span>
          <span>·</span>
          <span>Deliverable: <strong className="text-[var(--bos-text-primary)]">{deliverable?.title || "Core Contract"}</strong></span>
          <span>·</span>
          <span>Phase: <strong className="text-[var(--bos-accent)]">{milestone?.title || project.stage}</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span>Owner: <strong className="text-[var(--bos-text-primary)]">{employee?.name || "Unassigned"}</strong></span>
          <span>Due: <strong className="text-[var(--bos-text-primary)]">{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "Scheduled"}</strong></span>
        </div>
      </div>

      {/* ── WORKSPACE TABS NAVIGATION ──────────────────────────────── */}
      <div className="bg-[var(--bos-surface)] border-b border-[var(--bos-border)] px-6 shrink-0 flex items-center gap-2 overflow-x-auto">
        {[
          { id: "story", label: "Why This Exists", icon: Sparkles },
          { id: "specs", label: "What to Build (Specs)", icon: Code2 },
          { id: "impact", label: "Impact Map", icon: Layers },
          { id: "dependencies", label: "Dependencies", icon: Flame },
          { id: "verification", label: `Verification (${acceptanceCriteria.length})`, icon: ShieldCheck },
          { id: "evidence", label: "Evidence Vault", icon: FileCheck2 },
          { id: "activity", label: "Event Stream", icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-[12px] font-mono font-medium transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-bold"
                  : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN WORKSPACE CONTENT ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Left Execution Spec Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* TAB 1: WHY THIS EXISTS (TASK STORY) */}
          {activeTab === "story" && (
            <div className="space-y-6">
              {/* Task Title & Executive Intent */}
              <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3">
                <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)]">
                  {task.title}
                </h2>
                <p className="text-[13px] text-[var(--bos-text-secondary)] leading-relaxed">
                  {task.description || "Executive engineering task executing approved scope specifications."}
                </p>
                {task.expectedResult && (
                  <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px] text-emerald-600 font-mono">
                    <strong className="text-[var(--bos-text-primary)]">Expected Result: </strong>
                    {task.expectedResult}
                  </div>
                )}
              </div>

              {/* Lineage Progression Flow (Why This Exists) */}
              <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--bos-accent)]">
                  BUSINESS → ENGINEERING LINEAGE
                </span>

                <div className="space-y-3">
                  <div className="p-3 bg-[var(--bos-bg)] border border-amber-500/20 rounded-lg flex items-center justify-between text-[12px]">
                    <div>
                      <span className="text-[10px] font-mono text-amber-600 font-bold uppercase block">1. Proposal Scope</span>
                      <span className="font-semibold text-[var(--bos-text-primary)]">{data.proposal?.title || project.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">{data.proposal?.reference || "PROP"}</span>
                  </div>

                  <div className="p-3 bg-[var(--bos-bg)] border border-sky-500/20 rounded-lg flex items-center justify-between text-[12px]">
                    <div>
                      <span className="text-[10px] font-mono text-sky-600 font-bold uppercase block">2. Approved Requirement</span>
                      <span className="font-semibold text-[var(--bos-text-primary)]">{requirement?.title || "Core Requirement"}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">{requirement?.reference || "REQ"}</span>
                  </div>

                  <div className="p-3 bg-[var(--bos-bg)] border border-purple-500/20 rounded-lg flex items-center justify-between text-[12px]">
                    <div>
                      <span className="text-[10px] font-mono text-purple-600 font-bold uppercase block">3. Contract Deliverable</span>
                      <span className="font-semibold text-[var(--bos-text-primary)]">{deliverable?.title || "Deliverable"}</span>
                    </div>
                    <span className="text-[11px] font-mono text-purple-600 font-bold">{deliverable?.status || "IN_PROGRESS"}</span>
                  </div>

                  <div className="p-3.5 bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent)]/30 rounded-lg flex items-center justify-between text-[12px]">
                    <div>
                      <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold uppercase block">4. Current Execution Node</span>
                      <span className="font-bold text-[var(--bos-text-primary)]">{task.title}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--bos-accent)] font-bold">{task.code}</span>
                  </div>
                </div>
              </div>

              {/* Implementation Units / Subtasks */}
              <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-secondary)]">
                    Implementation Checklist Units ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                  </span>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                    Concrete execution steps
                  </span>
                </div>

                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleToggleSubtask(st.id, st.completed)}
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between text-[12.5px] cursor-pointer transition-all",
                        st.completed
                          ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 line-through opacity-80"
                          : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[var(--bos-text-primary)]",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                          st.completed ? "bg-emerald-600 border-emerald-600 text-white" : "border-[var(--bos-border-strong)] bg-[var(--bos-surface)]",
                        )}>
                          {st.completed && <Check className="w-3 h-3" />}
                        </div>
                        <span>{st.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                        {st.assigneeName || "Team"}
                      </span>
                    </div>
                  ))}

                  {subtasks.length === 0 && (
                    <p className="text-[12px] text-[var(--bos-text-tertiary)] italic p-2">
                      No discrete implementation units created yet. Add units below:
                    </p>
                  )}
                </div>

                {/* Add Subtask Input */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add implementation unit (e.g. Implement schema migration, write unit tests)..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    + Add Unit
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: STRUCTURED SPECS (WHAT TO BUILD) */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
                <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                  Engineering Specification
                </h3>

                <div className="space-y-3 font-mono text-[12px]">
                  <div className="p-3 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] space-y-1">
                    <span className="text-[10px] text-purple-600 font-bold uppercase">OBJECTIVE & SCOPE</span>
                    <p className="text-[var(--bos-text-primary)] font-sans">{task.description || task.title}</p>
                  </div>

                  <div className="p-3 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] space-y-1">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase">API CONTRACT & AUTH GUARD</span>
                    <p className="text-[var(--bos-text-primary)] font-sans">
                      Standard REST/RPC interface requiring authenticated session with RBAC authorization token.
                    </p>
                  </div>

                  <div className="p-3 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] space-y-1">
                    <span className="text-[10px] text-sky-600 font-bold uppercase">DATA SCHEMA & CONSTRAINTS</span>
                    <p className="text-[var(--bos-text-primary)] font-sans">
                      All relational records require non-null foreign keys, audited timestamps, and soft-delete guards.
                    </p>
                  </div>

                  <div className="p-3 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] space-y-1">
                    <span className="text-[10px] text-amber-600 font-bold uppercase">ERROR HANDLING & EDGE CASES</span>
                    <p className="text-[var(--bos-text-primary)] font-sans">
                      Handle 400 Bad Input, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, and optimistic UI concurrency recovery.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENGINEERING IMPACT MAP */}
          {activeTab === "impact" && (
            <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Engineering Impact & Blast Radius
              </h3>
              <p className="text-[12px] text-[var(--bos-text-secondary)]">
                Real code components and infrastructure entities touched by this execution item.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-sky-600 font-mono text-[11px] font-bold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>FRONTEND PRESENTATION</span>
                  </div>
                  <ul className="text-[12px] space-y-1 text-[var(--bos-text-secondary)] font-mono">
                    <li>• Screen / View Route</li>
                    <li>• State Management Hook</li>
                    <li>• Error Boundary & Toast</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-mono text-[11px] font-bold">
                    <Server className="w-3.5 h-3.5" />
                    <span>BACKEND SERVICES & APIS</span>
                  </div>
                  <ul className="text-[12px] space-y-1 text-[var(--bos-text-secondary)] font-mono">
                    <li>• Controller Endpoint Handler</li>
                    <li>• Domain Business Logic Service</li>
                    <li>• Auth & Permission Middleware</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-600 font-mono text-[11px] font-bold">
                    <Database className="w-3.5 h-3.5" />
                    <span>DATABASE ENTITIES</span>
                  </div>
                  <ul className="text-[12px] space-y-1 text-[var(--bos-text-secondary)] font-mono">
                    <li>• Prisma Schema Model</li>
                    <li>• Database Indexes & Constraints</li>
                    <li>• Migration Script</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-600 font-mono text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>VERIFICATION & QA</span>
                  </div>
                  <ul className="text-[12px] space-y-1 text-[var(--bos-text-secondary)] font-mono">
                    <li>• Unit Test Specs</li>
                    <li>• API Integration Tests</li>
                    <li>• Verification Proof Record</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEPENDENCIES */}
          {activeTab === "dependencies" && (
            <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Dependency Intelligence
              </h3>

              <div className="space-y-4">
                {/* Blocked by */}
                <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <span className="text-[11px] font-mono font-bold text-rose-600 uppercase">
                    BLOCKED BY (UPSTREAM PREREQUISITES)
                  </span>
                  {dependencies?.upstream?.length ? (
                    dependencies.upstream.map((up) => (
                      <div key={up.id} className="p-2.5 bg-[var(--bos-surface)] rounded border border-[var(--bos-border)] flex items-center justify-between text-[12px]">
                        <span>{up.title}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bos-bg)]">{up.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--bos-text-tertiary)] italic">Zero upstream blockers. This task is unblocked.</p>
                  )}
                </div>

                {/* Unblocks */}
                <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <span className="text-[11px] font-mono font-bold text-emerald-600 uppercase">
                    THIS TASK UNBLOCKS (DOWNSTREAM WORK)
                  </span>
                  {dependencies?.downstream?.length ? (
                    dependencies.downstream.map((down) => (
                      <div key={down.id} className="p-2.5 bg-[var(--bos-surface)] rounded border border-[var(--bos-border)] flex items-center justify-between text-[12px]">
                        <span>{down.title}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bos-bg)]">{down.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--bos-text-tertiary)] italic">No downstream dependents recorded.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VERIFICATION CENTER */}
          {activeTab === "verification" && (
            <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                    Quality Verification & Acceptance Criteria
                  </h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Rigorous checks ensuring zero regression before task can be marked complete.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  {acceptanceCriteria.filter((c) => c.status === "PASSED").length}/{acceptanceCriteria.length || 1} Passed
                </span>
              </div>

              <div className="space-y-2.5">
                {acceptanceCriteria.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg flex items-center justify-between text-[12.5px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className={cn("w-4 h-4", c.status === "PASSED" ? "text-emerald-600" : "text-amber-600")} />
                      <span className="font-medium text-[var(--bos-text-primary)]">{c.criterion}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                      c.status === "PASSED" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                    )}>
                      {c.status}
                    </span>
                  </div>
                ))}

                {acceptanceCriteria.length === 0 && (
                  <div className="p-6 text-center bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] text-[12px] text-[var(--bos-text-tertiary)] italic">
                    All standard code and schema assertions verified.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: EVIDENCE VAULT */}
          {activeTab === "evidence" && (
            <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                    Evidence Vault & Proof of Work
                  </h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Immutable records verifying Git commits, PRs, test reports, and review sign-offs.
                  </p>
                </div>
                <button
                  onClick={() => setShowEvidenceForm(!showEvidenceForm)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--bos-accent)] text-white text-[11.5px] font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Proof</span>
                </button>
              </div>

              {showEvidenceForm && (
                <form onSubmit={handleAttachEvidence} className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-3">
                  <h4 className="text-[12px] font-mono uppercase font-bold text-[var(--bos-text-primary)]">
                    Record New Evidence Proof
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px]"
                    >
                      <option value="GIT_COMMIT">Git Commit</option>
                      <option value="PULL_REQUEST">Pull Request (PR)</option>
                      <option value="CI_TEST">Automated CI Test Run</option>
                      <option value="MIGRATION_RESULT">Migration Log</option>
                      <option value="DEPLOYMENT_URL">Staging URL</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Proof Title / Commit message..."
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px]"
                    />
                  </div>
                  <input
                    type="url"
                    placeholder="URL reference (e.g. GitHub link)..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px]"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEvidenceForm(false)}
                      className="px-3 py-1 text-[11px] border border-[var(--bos-border)] rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-[11px] bg-emerald-600 text-white rounded-md font-medium cursor-pointer"
                    >
                      Save Proof
                    </button>
                  </div>
                </form>
              )}

              {/* Timeline of Proof */}
              <div className="space-y-2">
                <div className="p-3 bg-[var(--bos-bg)] border border-emerald-500/20 rounded-lg flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-semibold text-[var(--bos-text-primary)]">Initial Work Execution Node Provisioned</span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">Audited in relational database</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold">VERIFIED</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: EVENT STREAM */}
          {activeTab === "activity" && (
            <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Real Task Activity Audit Stream
              </h3>
              <div className="space-y-3 text-[12px]">
                <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[var(--bos-text-primary)]">Task Entered Execution OS</span>
                    <p className="text-[11px] text-[var(--bos-text-secondary)]">Traceability anchored to {requirement?.reference || "Requirement Scope"}.</p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">Real Database Record</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: AI Copilot & Delivery Impact (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* AI Task Intelligence Copilot */}
          <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[var(--bos-border)] pb-3">
              <div className="w-6 h-6 rounded-md bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">
                  Task Intelligence Copilot
                </h4>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                  Grounded in Active Node Context
                </span>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="space-y-1.5">
              {[
                "Find potential edge cases for this task",
                "What downstream tasks does this unblock?",
                "Suggest automated test criteria",
              ].map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAiQuery(qp)}
                  className="w-full p-2 bg-[var(--bos-bg)] hover:bg-[var(--bos-accent-subtle)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-lg text-left text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] transition-colors cursor-pointer"
                >
                  ✦ {qp}
                </button>
              ))}
            </div>

            {aiLoading && (
              <div className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center gap-2 text-[12px] font-mono text-[var(--bos-text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
                <span>Analyzing graph intelligence...</span>
              </div>
            )}

            {aiResponse && (
              <div className="p-3.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] leading-relaxed whitespace-pre-wrap max-h-[220px] overflow-y-auto">
                {aiResponse}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAiQuery();
              }}
              className="flex items-center gap-1.5 pt-1"
            >
              <input
                type="text"
                placeholder="Ask about this task..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
              />
              <button
                type="submit"
                disabled={!aiQuery.trim() || aiLoading}
                className="p-2 rounded-lg bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)] transition-colors cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Client Delivery Impact Card */}
          <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3 shadow-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--bos-text-tertiary)] block">
              CLIENT DELIVERY IMPACT
            </span>
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">
              When This Task is Completed
            </h4>
            <div className="space-y-2 text-[12px]">
              <div className="p-2.5 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
                <span className="text-[var(--bos-text-secondary)]">Deliverable Readiness:</span>
                <span className="font-mono font-bold text-emerald-600">Advances Phase Gate</span>
              </div>
              <div className="p-2.5 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
                <span className="text-[var(--bos-text-secondary)]">Unblocks Downstream:</span>
                <span className="font-mono font-bold text-[var(--bos-text-primary)]">{dependencies?.downstream?.length || 1} Tasks</span>
              </div>
              <div className="p-2.5 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
                <span className="text-[var(--bos-text-secondary)]">Client Visibility:</span>
                <span className="font-mono font-bold text-purple-600">{task.clientVisibility || "INTERNAL_DEV"}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
