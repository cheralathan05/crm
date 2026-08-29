"use client";

import { useState } from "react";
import {
  Play,
  Clock,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Sparkles,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MyDayViewProps {
  myDayData: any;
  onStartBuild: (taskId?: string) => void;
}

export function EmployeeOSMyDayView({ myDayData, onStartBuild }: MyDayViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "NOW" | "NEXT" | "WAITING" | "BLOCKED" | "REVIEW">("ALL");

  if (!myDayData) return null;

  const { projectName, todayDate, sections, counts } = myDayData;

  const tabs = [
    { key: "ALL", label: "ALL ITEMS", count: counts.now + counts.next + counts.waiting + counts.blocked + counts.review },
    { key: "NOW", label: "NOW (IN PROGRESS)", count: counts.now, color: "text-blue-400" },
    { key: "NEXT", label: "NEXT (READY)", count: counts.next, color: "text-emerald-400" },
    { key: "WAITING", label: "WAITING", count: counts.waiting, color: "text-purple-400" },
    { key: "BLOCKED", label: "BLOCKED", count: counts.blocked, color: "text-rose-400" },
    { key: "REVIEW", label: "IN REVIEW", count: counts.review, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-sans">
      {/* Header */}
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
            PERSONAL EXECUTION
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
            My Day • {todayDate}
          </h1>
          <p className="text-xs text-[var(--bos-text-secondary)]">
            {projectName} • Focused personal queue without spreadsheet noise.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5",
                selectedCategory === tab.key
                  ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                  : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("text-[10px] opacity-80", selectedCategory === tab.key ? "text-white" : tab.color)}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task Streams */}
      <div className="space-y-6">
        {/* 1. NOW */}
        {(selectedCategory === "ALL" || selectedCategory === "NOW") && sections.now.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
              <Clock className="w-4 h-4" />
              <span>NOW • IN PROGRESS ({sections.now.length})</span>
            </div>
            <div className="space-y-2.5">
              {sections.now.map((task: any) => (
                <TaskCard key={task.id} task={task} onStartBuild={onStartBuild} accent="blue" />
              ))}
            </div>
          </div>
        )}

        {/* 2. NEXT */}
        {(selectedCategory === "ALL" || selectedCategory === "NEXT") && sections.next.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>NEXT • UNBLOCKED & READY ({sections.next.length})</span>
            </div>
            <div className="space-y-2.5">
              {sections.next.map((task: any) => (
                <TaskCard key={task.id} task={task} onStartBuild={onStartBuild} accent="emerald" />
              ))}
            </div>
          </div>
        )}

        {/* 3. WAITING */}
        {(selectedCategory === "ALL" || selectedCategory === "WAITING") && sections.waiting.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              <Clock className="w-4 h-4" />
              <span>WAITING ON UPSTREAM ({sections.waiting.length})</span>
            </div>
            <div className="space-y-2.5">
              {sections.waiting.map((task: any) => (
                <TaskCard key={task.id} task={task} onStartBuild={onStartBuild} accent="purple" />
              ))}
            </div>
          </div>
        )}

        {/* 4. BLOCKED */}
        {(selectedCategory === "ALL" || selectedCategory === "BLOCKED") && sections.blocked.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>BLOCKED ({sections.blocked.length})</span>
            </div>
            <div className="space-y-2.5">
              {sections.blocked.map((task: any) => (
                <TaskCard key={task.id} task={task} onStartBuild={onStartBuild} accent="rose" />
              ))}
            </div>
          </div>
        )}

        {/* 5. IN REVIEW */}
        {(selectedCategory === "ALL" || selectedCategory === "REVIEW") && sections.review.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>IN REVIEW ({sections.review.length})</span>
            </div>
            <div className="space-y-2.5">
              {sections.review.map((task: any) => (
                <TaskCard key={task.id} task={task} onStartBuild={onStartBuild} accent="amber" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onStartBuild, accent }: { task: any; onStartBuild: (id: string) => void; accent: string }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] flex flex-wrap items-center justify-between gap-4 hover:border-[var(--bos-accent)]/40 transition-all text-xs">
      <div className="space-y-1 max-w-xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[var(--bos-accent)]">{task.code}</span>
          <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">{task.title}</h3>
        </div>
        {task.description && (
          <p className="text-xs text-[var(--bos-text-secondary)] line-clamp-1">{task.description}</p>
        )}
        {task.blockedReason && (
          <p className="text-xs text-rose-400 font-mono">Blocker: {task.blockedReason}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)]">
          {task.layer} • ~{task.estimatedHours}h
        </span>
        <button
          onClick={() => onStartBuild(task.id)}
          className="px-4 py-2 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Build</span>
        </button>
      </div>
    </div>
  );
}
