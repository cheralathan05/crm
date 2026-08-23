"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Database,
  Server,
  Globe,
  ShieldCheck,
  User,
  GitCommit,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { resolveTaskLayer, resolveTaskRequirement } from "@/lib/tasks-types";

export type FlowColumn =
  | "READY"
  | "BUILDING"
  | "BLOCKED"
  | "REVIEW"
  | "VERIFY"
  | "DONE";

export type EngineeringFlowBoardProps = {
  tasks: any[];
  onSelectTask: (task: any) => void;
  onUpdateStatus: (taskId: string, newStatus: string) => Promise<void>;
};

export function EngineeringFlowBoard({
  tasks = [],
  onSelectTask,
  onUpdateStatus,
}: EngineeringFlowBoardProps) {
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const columns: Array<{ id: FlowColumn; label: string; color: string }> = [
    { id: "READY", label: "Ready to Build", color: "border-sky-500/50 text-sky-600" },
    { id: "BUILDING", label: "Building / In Progress", color: "border-blue-500/50 text-blue-600" },
    { id: "BLOCKED", label: "Blocked by Dependency", color: "border-rose-500/50 text-rose-600" },
    { id: "REVIEW", label: "Code & Architecture Review", color: "border-purple-500/50 text-purple-600" },
    { id: "VERIFY", label: "Automated QA Verification", color: "border-amber-500/50 text-amber-600" },
    { id: "DONE", label: "Verified & Done", color: "border-emerald-500/50 text-emerald-600" },
  ];

  // Map database status to flow column
  const getColumnForTask = (t: any): FlowColumn => {
    if (t.status === "DONE" || t.status === "COMPLETED" || t.status === "CLIENT_APPROVED") return "DONE";
    if (t.status === "BLOCKED") return "BLOCKED";
    if (t.status === "IN_REVIEW") return "REVIEW";
    if (t.status === "CHANGES_REQUESTED") return "VERIFY";
    if (t.status === "IN_PROGRESS") return "BUILDING";
    return "READY";
  };

  const handleAdvance = async (e: React.MouseEvent, task: any, targetStatus: string) => {
    e.stopPropagation();
    setUpdatingTaskId(task.id);
    try {
      await onUpdateStatus(task.id, targetStatus);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
        <span className="text-[13px] font-bold text-[var(--bos-text-primary)]">
          Engineering Flow Pipeline
        </span>
        <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
          Enforces strict state transitions from Ready → Building → Blocked → Review → Verify → Done
        </span>
      </div>

      {/* Kanban Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => getColumnForTask(t) === col.id);

          return (
            <div
              key={col.id}
              className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-3 space-y-3 min-h-[480px] flex flex-col justify-between shadow-xs"
            >
              <div>
                {/* Column Header */}
                <div className={cn("flex items-center justify-between pb-2 border-b-2 font-mono", col.color)}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--bos-bg)]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5 mt-2.5">
                  {colTasks.map((task) => {
                    const layer = resolveTaskLayer(task);
                    const reqInfo = resolveTaskRequirement(task);
                    const passedCriteria = (task.acceptanceCriteria || []).filter((c: any) => c.status === "PASSED").length;
                    const totalCriteria = task.acceptanceCriteria?.length || 0;

                    return (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-lg transition-all cursor-pointer group space-y-2 shadow-xs"
                      >
                        {/* Top: Code & Priority */}
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded",
                            layer === "DATABASE" ? "bg-purple-500/10 text-purple-600" :
                            layer === "BACKEND" ? "bg-emerald-500/10 text-emerald-600" :
                            layer === "FRONTEND" ? "bg-sky-500/10 text-sky-600" :
                            layer === "TESTING" ? "bg-amber-500/10 text-amber-600" :
                            "bg-indigo-500/10 text-indigo-600"
                          )}>
                            {task.code || task.workId || "TSK"}
                          </span>
                          <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] font-semibold">
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h5 className="text-[12.5px] font-semibold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors line-clamp-2">
                          {task.title}
                        </h5>

                        {/* Layer & Requirement Link */}
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--bos-text-tertiary)] truncate">
                          <span className="font-semibold">{layer}</span>
                          <span className="text-[var(--bos-border)]">·</span>
                          <span className="truncate">{reqInfo.title}</span>
                        </div>

                        {/* Owner & Verification Stats */}
                        <div className="pt-2 border-t border-[var(--bos-border)]/60 flex items-center justify-between text-[10.5px] font-mono text-[var(--bos-text-secondary)]">
                          <span className="truncate max-w-[100px]">{task.assigneeName || "Unassigned"}</span>
                          {totalCriteria > 0 ? (
                            <span className={cn(
                              "font-bold",
                              passedCriteria === totalCriteria ? "text-emerald-600" : "text-amber-600"
                            )}>
                              {passedCriteria}/{totalCriteria} verified
                            </span>
                          ) : (
                            <span>{task.estimatedHours ? `${task.estimatedHours}h` : "4h"}</span>
                          )}
                        </div>

                        {/* Quick Transition Action Button */}
                        {col.id !== "DONE" && (
                          <button
                            type="button"
                            disabled={updatingTaskId === task.id}
                            onClick={(e) => {
                              const nextStatus =
                                col.id === "READY" ? "IN_PROGRESS" :
                                col.id === "BUILDING" ? "IN_REVIEW" :
                                col.id === "BLOCKED" ? "IN_PROGRESS" :
                                col.id === "REVIEW" ? "DONE" : "DONE";
                              handleAdvance(e, task, nextStatus);
                            }}
                            className="w-full mt-1 py-1 rounded bg-[var(--bos-surface)] hover:bg-[var(--bos-accent-subtle)] text-[10px] font-mono font-semibold text-[var(--bos-text-primary)] hover:text-[var(--bos-accent)] border border-[var(--bos-border)] transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Advance →</span>
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="p-4 text-center text-[11px] font-mono text-[var(--bos-text-tertiary)] italic">
                      Empty
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--bos-border)]/60 text-[10px] font-mono text-[var(--bos-text-tertiary)] text-center">
                {col.id} Gate
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
