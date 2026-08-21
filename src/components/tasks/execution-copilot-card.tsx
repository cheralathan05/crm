"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Bot,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExecutionCopilotCardProps = {
  projectId?: string;
  projectName?: string;
  tasks?: any[];
  deliverables?: any[];
  onExecuteAction?: (action: string, payload?: any) => void;
};

export function ExecutionCopilotCard({
  projectId,
  projectName,
  tasks = [],
  deliverables = [],
  onExecuteAction,
}: ExecutionCopilotCardProps) {
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  // Compute Grounded Next Best Action from Real Database State
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
  const inReviewTasks = tasks.filter((t) => t.status === "IN_REVIEW" || t.status === "CHANGES_REQUESTED");
  const readyTasks = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED");

  let actionTitle = "Continue Next Sprint Work Item";
  let actionReason = "All active blockers are resolved. Focus on in-progress delivery.";
  let actionImpact = `Advances overall delivery progress (${completedTasks.length}/${tasks.length || 1} tasks complete).`;
  let actionRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let targetTask = readyTasks[0] || tasks[0] || null;
  let actionLabel = "Open Next Task";

  if (blockedTasks.length > 0) {
    targetTask = blockedTasks[0];
    actionTitle = `Resolve Blocker: ${targetTask.title}`;
    actionReason = `${blockedTasks.length} tasks are blocked by upstream migrations, API dependencies, or client inputs.`;
    actionImpact = `Unblocks downstream work for ${targetTask.assigneeName || "engineering team"}.`;
    actionRisk = "HIGH";
    actionLabel = "Resolve Active Blocker";
  } else if (inReviewTasks.length > 0) {
    targetTask = inReviewTasks[0];
    actionTitle = `Conduct Verification Sign-off: ${targetTask.title}`;
    actionReason = `${inReviewTasks.length} completed tasks are awaiting lead review or automated test verification.`;
    actionImpact = "Enables deliverable advancement to Client Review phase gate.";
    actionRisk = "MEDIUM";
    actionLabel = "Review Work Item";
  } else if (tasks.length === 0) {
    actionTitle = "Decompose Approved Proposal into Engineering Work";
    actionReason = "Proposal is approved but no executable tasks exist yet.";
    actionImpact = "Generates Frontend, Backend, Database, and QA execution nodes with complete Work DNA.";
    actionRisk = "HIGH";
    actionLabel = "Start Work Breakdown";
  }

  const handleExplain = async () => {
    if (!projectId) return;
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Explain the technical reason why "${actionTitle}" is the next critical engineering priority and its dependency impact.`,
        }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        setExplanation(data.answer);
      }
    } catch {
      setExplanation("Unable to generate AI explanation. Please check Ollama connection.");
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--bos-border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              EXECUTION COPILOT
            </span>
            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
              · Grounded in Relational Database Context
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">RISK PROFILE:</span>
          <span
            className={cn(
              "text-[10.5px] font-mono font-bold px-2 py-0.5 rounded",
              actionRisk === "HIGH" ? "bg-rose-500/10 text-rose-600" :
              actionRisk === "MEDIUM" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
            )}
          >
            {actionRisk} RISK
          </span>
        </div>
      </div>

      {/* Main Recommendation Body */}
      <div className="space-y-3">
        <div>
          <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">
            NEXT BEST ACTION
          </span>
          <h4 className="text-[15px] font-bold text-[var(--bos-text-primary)] mt-0.5">
            {actionTitle}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <div className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] font-bold block">
              OPERATIONAL WHY
            </span>
            <p className="text-[var(--bos-text-secondary)]">{actionReason}</p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] font-bold block">
              EXECUTION IMPACT
            </span>
            <p className="text-[var(--bos-text-secondary)]">{actionImpact}</p>
          </div>
        </div>

        {/* AI Deep Explanation block if requested */}
        {explanation && (
          <div className="p-3.5 rounded-lg bg-[var(--bos-accent-subtle)]/30 border border-[var(--bos-accent)]/20 text-[12.5px] text-[var(--bos-text-primary)] leading-relaxed space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[var(--bos-accent)] font-mono text-[11px]">
              <Bot className="w-3.5 h-3.5" />
              <span>AI COPILOT REASONING</span>
            </div>
            <div className="whitespace-pre-wrap">{explanation}</div>
          </div>
        )}
      </div>

      {/* Actions Strip */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--bos-border)] flex-wrap">
        <button
          type="button"
          onClick={handleExplain}
          disabled={explaining || !projectId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[12px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-all cursor-pointer disabled:opacity-50"
        >
          {explaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
          <span>{explaining ? "Analyzing Graph..." : "Explain Dependencies"}</span>
        </button>

        <button
          type="button"
          onClick={() => onExecuteAction?.(actionLabel, targetTask)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-medium transition-all shadow-xs cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
