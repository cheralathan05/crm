"use client";

import { useEffect, useState, useTransition } from "react";
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
  FileCheck2,
  FileCode2,
  FileText,
  FolderKanban,
  GitBranch,
  Layers,
  ListTodo,
  Loader2,
  Lock,
  Milestone as MilestoneIcon,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkBreakdownPreview, WorkstreamType } from "@/lib/tasks";
import { ALL_WORKSTREAMS } from "@/lib/tasks";

export function WorkBreakdownBuilder({
  projectId,
  onClose,
  onPlanCommitted,
}: {
  projectId: string;
  onClose: () => void;
  onPlanCommitted?: () => void;
}) {
  const [plan, setPlan] = useState<WorkBreakdownPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkstream, setSelectedWorkstream] = useState<WorkstreamType>("FRONTEND");
  const [selectedMilestoneIdx, setSelectedMilestoneIdx] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tasks/work-breakdown?projectId=${projectId}`);
      const json = await res.json();
      if (json.ok && json.plan) {
        setPlan(json.plan);
        if (json.plan.recommendedWorkstreams.length > 0) {
          setSelectedWorkstream(json.plan.recommendedWorkstreams[0].id);
        }
      } else {
        setError(json.message || "Failed to generate Work Breakdown.");
      }
    } catch (err: any) {
      setError(err.message || "Network error generating work plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchPlan();
    }
  }, [projectId]);

  const handleCommitPlan = async () => {
    if (!plan) return;
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/tasks/work-breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, plan }),
        });
        const json = await res.json();
        if (json.ok) {
          onPlanCommitted?.();
          onClose();
        } else {
          setError(json.message || "Failed to commit work breakdown plan.");
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)] mb-3" />
          <h3 className="text-[16px] font-semibold text-[var(--bos-text-primary)]">
            Synthesizing Project Work Breakdown…
          </h3>
          <p className="text-[12px] text-[var(--bos-text-secondary)] mt-2">
            Analyzing verified requirements, proposal scope commitments, deliverables, and dependency relations.
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-8 max-w-md w-full shadow-2xl space-y-4">
          <h3 className="text-[16px] font-semibold text-[var(--bos-text-primary)]">Unable to Build Work Plan</h3>
          <p className="text-[12px] text-[var(--bos-text-secondary)]">{error || "Could not generate work plan."}</p>
          <button onClick={onClose} className="w-full py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded text-[13px]">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Filter tasks for selected workstream
  const wsTasks = plan.recommendedTasks.filter((t) => t.workstream === selectedWorkstream);
  const totalHours = plan.recommendedTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[var(--bos-bg)] border border-[var(--bos-border-strong)] rounded-xl shadow-2xl flex-1 flex flex-col overflow-hidden text-[var(--bos-text-primary)]">
        {/* Top Header */}
        <div className="p-4 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-bold tracking-tight text-[var(--bos-text-primary)]">
                  Project Work Breakdown Builder
                </h1>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium">
                  AI WORK PLAN REVIEW
                </span>
              </div>
              <p className="text-[12px] text-[var(--bos-text-secondary)] font-mono">
                {plan.clientName} · {plan.projectName} · {plan.recommendedTasks.length} tasks · {totalHours} total hours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlan}
              disabled={isPending}
              className="px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] font-medium rounded hover:bg-[var(--bos-surface)] flex items-center gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isPending && "animate-spin")} />
              Regenerate
            </button>
            <button
              onClick={handleCommitPlan}
              disabled={isPending}
              className="px-4 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-semibold rounded hover:bg-[var(--bos-accent-hover)] transition flex items-center gap-1.5 shadow-sm"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Approve & Commit Work Plan
            </button>
            <button onClick={onClose} className="p-1.5 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 text-[12px] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3-Column Visual Planning Workspace */}
        <div className="flex-1 grid grid-cols-12 divide-x divide-[var(--bos-border)] overflow-hidden">
          {/* LEFT COLUMN: Approved Requirements & Scope Understood (Cols: 3) */}
          <div className="col-span-3 flex flex-col bg-[var(--bos-surface)] overflow-hidden">
            <div className="p-3 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                Approved Scope & Requirements
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                {plan.whatWasUnderstood.length} items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {plan.whatWasUnderstood.map((item, idx) => (
                <div key={idx} className="p-3 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">0{idx + 1}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600">
                      {item.source}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[var(--bos-text-primary)]">{item.title}</h4>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-2">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER COLUMN: Project Work Tree (Cols: 5) */}
          <div className="col-span-5 flex flex-col bg-[var(--bos-bg)] overflow-hidden">
            <div className="p-3 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                Project Work Tree Hierarchy
              </span>
              <span className="font-mono text-[10px] text-[var(--bos-text-secondary)]">
                {plan.recommendedPhases.length} Phases · {plan.recommendedDeliverables.length} Deliverables
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {plan.recommendedPhases.map((phase, pIdx) => {
                const phaseDeliverables = plan.recommendedDeliverables.filter((d) => d.milestoneIndex === pIdx);
                const phaseTasks = plan.recommendedTasks.filter((t) => t.milestoneIndex === pIdx);

                return (
                  <div key={phase.phase} className="p-3.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--bos-accent)] text-white text-[10px] font-mono flex items-center justify-center font-bold">
                          {pIdx + 1}
                        </span>
                        <h3 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">{phase.title}</h3>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">Week {phase.targetWeek}</span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] pl-7">{phase.description}</p>

                    {/* Deliverables in this Phase */}
                    <div className="pl-7 space-y-2 pt-1">
                      {phaseDeliverables.map((deliv, dIdx) => (
                        <div key={dIdx} className="p-2.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between">
                          <div>
                            <span className="text-[12px] font-medium block text-[var(--bos-text-primary)]">{deliv.title}</span>
                            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                              Category: {deliv.category} · {deliv.acceptanceCriteria.length} criteria
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                            Deliverable
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Workstream Control & Selected Tasks (Cols: 4) */}
          <div className="col-span-4 flex flex-col bg-[var(--bos-surface)] overflow-hidden">
            <div className="p-3 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                Workstream Inspector
              </span>

              {/* Workstream selector pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {plan.recommendedWorkstreams.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedWorkstream(ws.id)}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-mono font-medium whitespace-nowrap transition flex items-center gap-1",
                      selectedWorkstream === ws.id
                        ? "bg-[var(--bos-accent)] text-white shadow-sm"
                        : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)] hover:text-[var(--bos-text-primary)]",
                    )}
                  >
                    <span>{ws.label}</span>
                    <span className="text-[9px] opacity-80">({ws.taskCount})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Workstream tasks list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              <div className="text-[11px] font-mono text-[var(--bos-text-tertiary)] flex items-center justify-between pb-1">
                <span>{selectedWorkstream} ({wsTasks.length} tasks)</span>
                <span>{wsTasks.reduce((sum, t) => sum + t.estimatedHours, 0)} hours</span>
              </div>

              {wsTasks.map((task) => (
                <div key={task.code} className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] text-[var(--bos-accent)] font-semibold">{task.code}</span>
                      <h4 className="text-[12px] font-semibold text-[var(--bos-text-primary)] leading-tight">
                        {task.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] shrink-0">
                      {task.estimatedHours}h
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-2">{task.description}</p>

                  <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                    <span>Role: {task.teamRole}</span>
                    <span>{task.subtasks.length} subtasks · {task.acceptanceCriteria.length} criteria</span>
                  </div>

                  {task.sourceRequirementTitle && (
                    <div className="text-[9px] font-mono text-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] px-2 py-0.5 rounded">
                      Source: {task.sourceRequirementTitle}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
