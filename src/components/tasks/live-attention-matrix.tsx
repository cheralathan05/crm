"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserX,
  ShieldAlert,
  Flame,
  ArrowRight,
  Eye,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { resolveTaskLayer, resolveTaskRequirement } from "@/lib/tasks-types";

export type AttentionCategory =
  | "BLOCKED"
  | "READY"
  | "REVIEW"
  | "OVERDUE"
  | "CRITICAL_PATH"
  | "UNASSIGNED"
  | "FAILED_VERIFICATION";

export type LiveAttentionMatrixProps = {
  tasks: any[];
  onSelectTask: (task: any) => void;
};

export function LiveAttentionMatrix({ tasks = [], onSelectTask }: LiveAttentionMatrixProps) {
  const [activeCategory, setActiveCategory] = useState<AttentionCategory>("READY");
  const now = new Date();

  // 1. Group tasks by real operational state
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED" || t.priority === "URGENT");
  const readyTasks = tasks.filter((t) => (t.status === "TODO" || t.status === "READY") && !t.dependencies?.some?.((d: any) => d.status !== "DONE"));
  const reviewTasks = tasks.filter((t) => t.status === "IN_REVIEW" || t.status === "CHANGES_REQUESTED");
  const overdueTasks = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "DONE" && t.status !== "COMPLETED");
  const unassignedTasks = tasks.filter((t) => !t.assigneeName && t.status !== "DONE");
  const criticalPathTasks = tasks.filter((t) => resolveTaskLayer(t) === "DATABASE" || t.priority === "HIGH" || (t.dependencies && t.dependencies.length > 0));
  const failedVerificationTasks = tasks.filter((t) => t.status === "CHANGES_REQUESTED" || (t.testResults && t.testResults.some((tr: any) => tr.status === "FAILING")));

  const categories = [
    {
      id: "BLOCKED" as const,
      label: "Blocked Work",
      count: blockedTasks.length,
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-500/10 border-rose-500/20",
      items: blockedTasks,
    },
    {
      id: "READY" as const,
      label: "Ready to Start",
      count: readyTasks.length,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      items: readyTasks,
    },
    {
      id: "REVIEW" as const,
      label: "In Review",
      count: reviewTasks.length,
      icon: Eye,
      color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
      items: reviewTasks,
    },
    {
      id: "OVERDUE" as const,
      label: "Overdue",
      count: overdueTasks.length,
      icon: Clock,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      items: overdueTasks,
    },
    {
      id: "CRITICAL_PATH" as const,
      label: "Critical Path",
      count: criticalPathTasks.length,
      icon: Flame,
      color: "text-orange-600 bg-orange-500/10 border-orange-500/20",
      items: criticalPathTasks,
    },
    {
      id: "UNASSIGNED" as const,
      label: "Unassigned",
      count: unassignedTasks.length,
      icon: UserX,
      color: "text-sky-600 bg-sky-500/10 border-sky-500/20",
      items: unassignedTasks,
    },
    {
      id: "FAILED_VERIFICATION" as const,
      label: "Failed Verification",
      count: failedVerificationTasks.length,
      icon: ShieldAlert,
      color: "text-red-700 bg-red-500/10 border-red-500/20",
      items: failedVerificationTasks,
    },
  ];

  const activeGroup = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono text-[var(--bos-accent)] uppercase tracking-wider font-bold">
            Live Attention Matrix
          </span>
          <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
            Execution Focus Grouped by Operational Reason
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
          Total Work Items: {tasks.length}
        </span>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-mono transition-all whitespace-nowrap cursor-pointer",
                isSelected
                  ? "bg-[var(--bos-bg)] border-[var(--bos-accent)] text-[var(--bos-text-primary)] font-bold shadow-xs ring-1 ring-[var(--bos-accent)]/20"
                  : "bg-[var(--bos-bg)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-full text-[10px] font-bold ml-0.5", cat.color)}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items List for Selected Category */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {activeGroup.items.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bos-bg)] rounded-xl border border-[var(--bos-border)] text-[var(--bos-text-secondary)] space-y-1">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <p className="text-[13px] font-medium text-[var(--bos-text-primary)]">
              No items in {activeGroup.label}
            </p>
            <p className="text-[11px] text-[var(--bos-text-tertiary)]">
              All active execution nodes for this category are in healthy operational state.
            </p>
          </div>
        ) : (
          activeGroup.items.map((item) => {
            const layer = resolveTaskLayer(item);
            const reqInfo = resolveTaskRequirement(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelectTask(item)}
                className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-xl transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.code && (
                      <span className={cn(
                        "text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded",
                        layer === "DATABASE" ? "bg-purple-500/10 text-purple-600" :
                        layer === "BACKEND" ? "bg-emerald-500/10 text-emerald-600" :
                        layer === "FRONTEND" ? "bg-sky-500/10 text-sky-600" :
                        layer === "TESTING" ? "bg-amber-500/10 text-amber-600" :
                        "bg-indigo-500/10 text-indigo-600"
                      )}>
                        {item.code}
                      </span>
                    )}
                    <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)]">
                      {item.priority}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-[var(--bos-text-secondary)] line-clamp-1">
                    {item.description || item.blockedReason || item.expectedResult || "Executable work item"}
                  </p>

                  <div className="flex items-center gap-3 text-[10.5px] font-mono text-[var(--bos-text-tertiary)] pt-0.5">
                    <span className="font-semibold text-[var(--bos-text-secondary)]">{layer}</span>
                    <span>·</span>
                    <span className="text-[var(--bos-accent)]">{reqInfo.title}</span>
                    <span>·</span>
                    <span>Owner: {item.assigneeName || "Unassigned"}</span>
                    {item.estimatedHours && <span>· {item.estimatedHours}h</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--bos-border)]">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bos-surface)] text-[var(--bos-text-primary)]">
                    {item.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--bos-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
