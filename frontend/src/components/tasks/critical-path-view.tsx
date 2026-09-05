"use client";

import { useState } from "react";
import {
  Flame,
  Layers,
  ArrowRight,
  Database,
  Server,
  Globe,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { resolveTaskLayer } from "@/lib/tasks-types";

export type CriticalPathViewProps = {
  tasks: any[];
  onSelectTask: (task: any) => void;
};

export function CriticalPathView({ tasks = [], onSelectTask }: CriticalPathViewProps) {
  // Sort tasks in dependency topological order (Database -> Backend -> Frontend -> QA)
  const dbTasks = tasks.filter((t) => resolveTaskLayer(t) === "DATABASE");
  const beTasks = tasks.filter((t) => resolveTaskLayer(t) === "BACKEND");
  const feTasks = tasks.filter((t) => resolveTaskLayer(t) === "FRONTEND");
  const qaTasks = tasks.filter((t) => resolveTaskLayer(t) === "TESTING");

  // Critical path represents the highest priority tasks sequentially
  const criticalDb = dbTasks.find((t) => t.status !== "DONE") || dbTasks[0];
  const criticalBe = beTasks.find((t) => t.status !== "DONE") || beTasks[0];
  const criticalFe = feTasks.find((t) => t.status !== "DONE") || feTasks[0];
  const criticalQa = qaTasks.find((t) => t.status !== "DONE") || qaTasks[0];

  const criticalSequence = [
    { tier: "DATABASE", task: criticalDb, label: "01. Schema & Migration Gate" },
    { tier: "BACKEND", task: criticalBe, label: "02. API Contract & Handler Gate" },
    { tier: "FRONTEND", task: criticalFe, label: "03. Presentation & State Gate" },
    { tier: "TESTING", task: criticalQa, label: "04. Automated QA Verification Gate" },
  ].filter((s) => s.task != null);

  const blockedCount = tasks.filter((t) => t.status === "BLOCKED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
              Critical Path Dependency Engine
            </h3>
            <p className="text-[11px] text-[var(--bos-text-secondary)]">
              The minimum sequence of dependent tasks determining the delivery date of the current project milestone.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-600">
            {criticalSequence.length} Critical Stages
          </span>
          {blockedCount > 0 && (
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600">
              {blockedCount} Bottlenecks
            </span>
          )}
        </div>
      </div>

      {/* Critical Path Flow Strip */}
      <div className="p-5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl shadow-xs space-y-4">
        <h4 className="text-[12px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-tertiary)]">
          Milestone Delivery Critical Path
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {criticalSequence.map((step, idx) => {
            const t = step.task;
            const isDone = t.status === "DONE" || t.status === "COMPLETED";
            const isBlocked = t.status === "BLOCKED";

            return (
              <div
                key={idx}
                onClick={() => onSelectTask(t)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between space-y-3",
                  isDone
                    ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : isBlocked
                      ? "bg-rose-500/5 border-rose-500/30 ring-1 ring-rose-500/20"
                      : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-accent)] shadow-xs",
                )}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-current/10">
                    <span className="text-[10px] font-mono font-bold uppercase">{step.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded",
                      isDone ? "bg-emerald-500/20 text-emerald-600" :
                      isBlocked ? "bg-rose-500/20 text-rose-600" : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)]"
                    )}>
                      {t.status}
                    </span>
                  </div>

                  <h5 className="text-[13px] font-semibold text-[var(--bos-text-primary)] mt-2 group-hover:text-[var(--bos-accent)] transition-colors">
                    {t.title}
                  </h5>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1 line-clamp-2">
                    {t.expectedResult || t.description || "Milestone dependent work item"}
                  </p>
                </div>

                <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[10.5px] font-mono opacity-80">
                  <span>{t.assigneeName || "Unassigned"}</span>
                  <span className="flex items-center gap-1 font-bold">
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Dependency Matrix by Layer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Foundation & Backend Gate */}
        <div className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-purple-600 font-mono text-[12px] font-bold">
            <Database className="w-4 h-4" />
            <span>Upstream Foundation Dependencies</span>
          </div>
          <div className="space-y-2">
            {[...dbTasks, ...beTasks].slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTask(t)}
                className="p-2.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-purple-500 rounded-lg flex items-center justify-between cursor-pointer text-[12px]"
              >
                <span className="font-medium text-[var(--bos-text-primary)]">{t.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)]">{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Presentation & QA Gate */}
        <div className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-sky-600 font-mono text-[12px] font-bold">
            <Globe className="w-4 h-4" />
            <span>Downstream Delivery Dependencies</span>
          </div>
          <div className="space-y-2">
            {[...feTasks, ...qaTasks].slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTask(t)}
                className="p-2.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-sky-500 rounded-lg flex items-center justify-between cursor-pointer text-[12px]"
              >
                <span className="font-medium text-[var(--bos-text-primary)]">{t.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)]">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
