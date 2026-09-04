"use client";

import { useState } from "react";
import {
  Play,
  MessageSquare,
  AlertOctagon,
  CheckCircle2,
  FileCheck2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  ChevronRight,
  Filter,
  AlertTriangle,
  ExternalLink,
  History,
  CheckCircle,
  XCircle,
  UserCheck,
} from "lucide-react";

interface EmployeeMyWorkViewProps {
  portalData: any;
  highlightTaskId?: string | null;
  onOpenSmartContact: (person: any, task: any) => void;
  onOpenBlockerModal: (task: any) => void;
  onOpenHelpModal: (task: any) => void;
  onOpenHandoffModal: (task: any) => void;
  onRefresh: () => void;
}

export function EmployeeMyWorkView({
  portalData,
  highlightTaskId,
  onOpenSmartContact,
  onOpenBlockerModal,
  onOpenHelpModal,
  onOpenHandoffModal,
  onRefresh,
}: EmployeeMyWorkViewProps) {
  const { employee, currentProject, workItems = [], myWorkToday } = portalData;
  const [filter, setFilter] = useState<string>("ALL");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(highlightTaskId || null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [viewingSubmissionTask, setViewingSubmissionTask] = useState<any | null>(null);

  // Filter tasks strictly from real states
  const filteredWorkItems = workItems.filter((t: any) => {
    if (filter === "ALL") return true;
    if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
    if (filter === "CHANGES_REQUESTED") return t.status === "CHANGES_REQUESTED";
    if (filter === "BLOCKED") return t.status === "BLOCKED";
    if (filter === "IN_REVIEW") return t.status === "IN_REVIEW" || t.status === "SUBMITTED";
    if (filter === "TODO") return t.status === "TODO" || t.status === "READY";
    if (filter === "COMPLETED") return t.status === "COMPLETED" || t.status === "DONE";
    return true;
  });

  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      const res = await fetch("/api/employee/work/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "IN_PROGRESS" }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to start task:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--bos-text-primary)]">My Assigned Work</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-xs font-mono font-bold uppercase">
              {employee.discipline} WORKSTREAM
            </span>
          </div>
          <p className="text-xs text-[var(--bos-text-tertiary)] font-mono mt-1">
            Internal Execution Engine · Project: {currentProject?.name || "None"}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[var(--bos-surface)] rounded-2xl border border-[var(--bos-border)] font-mono text-xs">
          {[
            { key: "ALL", label: "All", count: workItems.length },
            { key: "IN_PROGRESS", label: "In Progress", count: workItems.filter((w: any) => w.status === "IN_PROGRESS").length },
            { key: "CHANGES_REQUESTED", label: "Changes Requested", count: workItems.filter((w: any) => w.status === "CHANGES_REQUESTED").length },
            { key: "IN_REVIEW", label: "Under Review", count: workItems.filter((w: any) => w.status === "IN_REVIEW" || w.status === "SUBMITTED").length },
            { key: "BLOCKED", label: "Blocked", count: workItems.filter((w: any) => w.status === "BLOCKED").length },
            { key: "TODO", label: "To Do / Ready", count: workItems.filter((w: any) => w.status === "TODO" || w.status === "READY").length },
            { key: "COMPLETED", label: "Completed", count: workItems.filter((w: any) => w.status === "COMPLETED" || w.status === "DONE").length },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filter === item.key
                  ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[10px] opacity-75">({item.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zero State */}
      {filteredWorkItems.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-center text-[var(--bos-text-tertiary)]">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--bos-text-primary)]">No active tasks found</h3>
          <p className="text-xs text-[var(--bos-text-tertiary)] max-w-sm mx-auto font-mono">
            {filter === "ALL"
              ? `No ${employee.discipline.toLowerCase()} tasks are currently assigned to your profile in this project.`
              : `No tasks currently match the "${filter}" filter status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredWorkItems.map((task: any) => {
            const isHighlight = highlightTaskId === task.id || activeTaskId === task.id;
            const isBlocked = task.status === "BLOCKED";
            const isInProgress = task.status === "IN_PROGRESS";
            const isChangesRequested = task.status === "CHANGES_REQUESTED";
            const isInReview = task.status === "IN_REVIEW" || task.status === "SUBMITTED";
            const isCompleted = task.status === "COMPLETED" || task.status === "DONE";
            const isTodoOrReady = task.status === "TODO" || task.status === "READY";

            const waitingFor = task.waitingFor;
            const hasWaitingDependency = !!waitingFor && waitingFor.status !== "COMPLETED" && waitingFor.status !== "DONE";

            return (
              <div
                key={task.id}
                id={`task-${task.id}`}
                className={`rounded-3xl border transition-all overflow-hidden ${
                  isHighlight
                    ? "bg-[var(--bos-surface-panel)] border-[var(--bos-accent)] shadow-2xl ring-1 ring-[var(--bos-accent)]"
                    : isChangesRequested
                    ? "bg-[var(--bos-surface-panel)] border-amber-500/40 hover:border-amber-500/60 shadow-lg shadow-amber-500/5"
                    : isBlocked
                    ? "bg-[var(--bos-surface-panel)] border-rose-500/30 hover:border-rose-500/50"
                    : isInProgress
                    ? "bg-[var(--bos-surface-panel)] border-emerald-500/30 hover:border-emerald-500/50 shadow-md shadow-emerald-500/5"
                    : isCompleted
                    ? "bg-[var(--bos-surface-panel)] border-blue-500/20 opacity-95"
                    : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] hover:border-[var(--bos-border-strong)]"
                }`}
              >
                {/* Task Top Banner */}
                <div className="px-6 py-4 border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/50 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-extrabold text-sm text-[var(--bos-accent)]">
                      {task.code}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] uppercase">
                      {task.layer}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        isChangesRequested
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"
                          : isBlocked
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : isInProgress
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isInReview
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : isCompleted
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      }`}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--bos-text-tertiary)]">PRIORITY:</span>
                      <span
                        className={`font-bold uppercase ${
                          task.priority === "URGENT" || task.priority === "HIGH"
                            ? "text-rose-400"
                            : task.priority === "MEDIUM"
                            ? "text-amber-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 border-l border-[var(--bos-border)] pl-4">
                      <span className="text-[var(--bos-text-tertiary)]">REVIEWER:</span>
                      <span className="font-semibold text-[var(--bos-text-secondary)] truncate max-w-[150px]">
                        {task.whoReviewsThis?.name || "QA & Project Reviewer"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 09 & 10: CHANGES REQUESTED ALERT BANNER */}
                {isChangesRequested && task.reviewerFeedback && (
                  <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs text-amber-400">
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-2 uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>WHAT NEEDS TO CHANGE?</span>
                      </div>
                      <p className="font-sans text-sm text-[var(--bos-text-primary)] leading-relaxed">
                        {task.reviewerFeedback}
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenHandoffModal(task)}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors shrink-0 flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>FIX & RESUBMIT</span>
                    </button>
                  </div>
                )}

                {/* Blocker alert if blocked */}
                {isBlocked && task.blockedReason && (
                  <div className="px-6 py-4 bg-rose-500/10 border-b border-rose-500/30 flex items-center gap-3 font-mono text-xs text-rose-400">
                    <AlertOctagon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="font-bold uppercase block">TASK BLOCKED:</span>
                      <span className="font-sans text-sm text-[var(--bos-text-primary)]">{task.blockedReason}</span>
                    </div>
                  </div>
                )}

                {/* Task Body (Specification Section 03) */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* WHAT AM I BUILDING? */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                      WHAT AM I BUILDING?
                    </div>
                    <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">{task.title}</h2>
                    <p className="text-sm text-[var(--bos-text-secondary)] leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  {/* WHY AM I BUILDING IT? */}
                  <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
                    <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                      WHY AM I BUILDING IT? (REQUIREMENT CONTEXT)
                    </div>
                    <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                      {task.whyAmIBuildingIt}
                    </p>
                  </div>

                  {/* ACCEPTANCE CRITERIA */}
                  <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                    <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider flex items-center justify-between">
                      <span>ACCEPTANCE CRITERIA</span>
                      <span className="text-[10px] text-[var(--bos-accent)] font-semibold">Quality Gate</span>
                    </div>
                    {task.acceptanceCriteriaList && task.acceptanceCriteriaList.length > 0 ? (
                      <ul className="space-y-1.5 text-xs font-mono text-[var(--bos-text-primary)]">
                        {task.acceptanceCriteriaList.map((ac: any) => (
                          <li key={ac.id} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)] mt-1.5 shrink-0" />
                            <span>{ac.criterion}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[var(--bos-text-primary)] font-mono leading-relaxed">
                        {task.whatShouldFinalResultLookLike}
                      </p>
                    )}
                  </div>

                  {/* DEPENDENCIES, WAITING FOR & WHO IS WAITING FOR ME */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Section 13: WHAT AM I WAITING FOR? */}
                    <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                          DEPENDENCIES & STATUS
                        </div>
                        <div className="text-xs font-bold text-[var(--bos-text-primary)]">
                          {task.whatDoesItDependOn}
                        </div>

                        {waitingFor ? (
                          <div className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1 text-xs font-mono">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[var(--bos-text-tertiary)] uppercase text-[10px]">WAITING FOR:</span>
                              <span className="text-amber-400 font-bold">{waitingFor.status}</span>
                            </div>
                            <div className="font-bold text-[var(--bos-text-primary)]">{waitingFor.code}: {waitingFor.title}</div>
                            <div className="text-[11px] text-[var(--bos-text-secondary)]">
                              Owner: {waitingFor.ownerName} ({waitingFor.ownerRole})
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 pt-1">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Upstream dependencies satisfied / Ready for execution.</span>
                          </div>
                        )}
                      </div>

                      {waitingFor && (
                        <button
                          onClick={() => onOpenSmartContact(waitingFor, task)}
                          className="mt-2 w-full px-3 py-2 rounded-xl bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-xs font-mono font-bold text-[var(--bos-text-primary)] hover:bg-[var(--bos-accent)] hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>MESSAGE OWNER ({waitingFor.ownerName})</span>
                        </button>
                      )}
                    </div>

                    {/* Section 14: WHO IS WAITING FOR ME? */}
                    <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                      <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                        WHO IS WAITING FOR THIS TASK?
                      </div>
                      {task.whoIsWaitingForMe && task.whoIsWaitingForMe.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-[var(--bos-text-secondary)] font-mono">
                            The following downstream deliverables rely on this task completing:
                          </p>
                          <ul className="space-y-1.5 font-mono text-xs">
                            {task.whoIsWaitingForMe.map((downstream: any) => (
                              <li
                                key={downstream.id}
                                className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-[var(--bos-text-primary)]">{downstream.code}</span>
                                  <span className="text-[var(--bos-text-secondary)] text-[11px] ml-1.5 truncate">
                                    {downstream.title}
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bos-surface)] font-bold text-[var(--bos-accent)] uppercase">
                                  {downstream.layer}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--bos-text-tertiary)] font-mono pt-1">
                          No downstream tasks are currently waiting for this work item.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* PROOF REQUIRED & WHO REVIEWS THIS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                      <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                        PROOF REQUIRED UPON COMPLETION
                      </div>
                      <ul className="space-y-1 font-mono text-[11px] text-[var(--bos-text-secondary)]">
                        {task.whatProofIsRequired.map((p: string, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                      <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                        CONFIGURED REVIEWER
                      </div>
                      <div className="space-y-1 font-mono text-xs">
                        <div className="font-bold text-[var(--bos-text-primary)]">
                          {task.whoReviewsThis?.name || "QA & Project Reviewer"}
                        </div>
                        <div className="text-[11px] text-[var(--bos-text-secondary)]">
                          {task.whoReviewsThis?.role || "QA Lead / Project Governance"}
                        </div>
                        <div className="text-[10px] text-[var(--bos-accent)] pt-1">
                          Internal Quality Assurance Gate · Enforces criteria sign-off
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 24: AFTER APPROVAL VIEW */}
                  {isCompleted && (
                    <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3 font-mono text-xs text-blue-300">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-sm text-blue-400">
                          <CheckCircle className="w-5 h-5" />
                          <span>✓ TASK COMPLETED</span>
                        </div>
                        <div className="text-[11px] text-[var(--bos-text-secondary)]">
                          Approved by: <span className="font-bold text-[var(--bos-text-primary)]">{task.approvedBy || "Reviewer"}</span> ·{" "}
                          {task.approvedAt ? new Date(task.approvedAt).toLocaleDateString() : "Verified"}
                        </div>
                      </div>

                      {/* Next eligible work if available */}
                      <div className="pt-2 border-t border-blue-500/20 space-y-1.5">
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-bold">
                          NEXT WORK ITEM:
                        </span>
                        {myWorkToday?.nextEligibleWork ? (
                          <div className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-[var(--bos-accent)]">
                                {myWorkToday.nextEligibleWork.code}
                              </span>
                              <span className="text-[var(--bos-text-primary)] ml-2 font-semibold">
                                {myWorkToday.nextEligibleWork.title}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px]">
                              READY
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--bos-text-tertiary)] italic">
                            NO NEXT TASK AVAILABLE (All currently eligible tasks in this project are completed or waiting for upstream work).
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── STATE-AWARE ACTION CONTROLS (Specification Section 04) ──────────────────────────── */}
                  <div className="pt-4 border-t border-[var(--bos-border)] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                    {/* Secondary Actions: Inside Task Communication */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1. Message Team */}
                      <button
                        onClick={() => onOpenSmartContact(task.whoDoIContact, task)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Open communication thread auto-attached to this task"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                        <span>MESSAGE TEAM</span>
                      </button>

                      {/* 2. Request Help */}
                      <button
                        onClick={() => onOpenHelpModal(task)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Request assistance on this task"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>REQUEST HELP</span>
                      </button>

                      {/* 3. Report Blocker */}
                      {!isBlocked && !isCompleted && (
                        <button
                          onClick={() => onOpenBlockerModal(task)}
                          className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Report blocker with auto-attached task context"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>REPORT BLOCKER</span>
                        </button>
                      )}
                    </div>

                    {/* Primary State-Aware Execution Action */}
                    <div className="flex items-center gap-2">
                      {/* TODO / READY -> [ START TASK ] */}
                      {isTodoOrReady && (
                        <button
                          disabled={actionLoadingId === task.id}
                          onClick={() => handleStartTask(task.id)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>START TASK</span>
                        </button>
                      )}

                      {/* IN PROGRESS -> [ SUBMIT FOR REVIEW ] */}
                      {isInProgress && (
                        <button
                          onClick={() => onOpenHandoffModal(task)}
                          className="px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[var(--bos-accent)]/20"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>SUBMIT FOR REVIEW</span>
                        </button>
                      )}

                      {/* CHANGES REQUESTED -> [ FIX & RESUBMIT ] */}
                      {isChangesRequested && (
                        <button
                          onClick={() => onOpenHandoffModal(task)}
                          className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 animate-pulse"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>FIX & RESUBMIT</span>
                        </button>
                      )}

                      {/* SUBMITTED / IN REVIEW -> [ VIEW SUBMISSION ] */}
                      {isInReview && (
                        <button
                          onClick={() => setViewingSubmissionTask(task)}
                          className="px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Clock className="w-4 h-4" />
                          <span>VIEW SUBMISSION</span>
                        </button>
                      )}

                      {/* COMPLETED -> ✓ COMPLETED */}
                      {isCompleted && (
                        <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>✓ COMPLETED</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Detail Modal for Viewing Submission */}
      {viewingSubmissionTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] p-6 sm:p-8 space-y-5 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--bos-text-primary)]">Current Submission</h3>
                <span className="text-[11px] text-[var(--bos-text-tertiary)]">
                  {viewingSubmissionTask.code} — {viewingSubmissionTask.title}
                </span>
              </div>
              <button
                onClick={() => setViewingSubmissionTask(null)}
                className="p-1.5 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-bold">Status:</span>
                <span className="text-purple-400 font-bold text-sm">Under Internal Review</span>
                <p className="text-[11px] text-[var(--bos-text-secondary)] font-sans pt-1">
                  Submitted and queued for configured reviewer: {viewingSubmissionTask.whoReviewsThis?.name}
                </p>
              </div>

              {viewingSubmissionTask.latestSubmission && (
                <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--bos-accent)] font-bold">
                      {viewingSubmissionTask.latestSubmission.submissionCode}
                    </span>
                    <span className="text-[var(--bos-text-tertiary)]">
                      Iteration #{viewingSubmissionTask.latestSubmission.iteration}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Summary:</span>
                    <p className="text-xs text-[var(--bos-text-primary)] font-sans">
                      {viewingSubmissionTask.latestSubmission.summary}
                    </p>
                  </div>
                  {viewingSubmissionTask.latestSubmission.proofUrl && (
                    <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between">
                      <span className="text-[var(--bos-text-tertiary)]">Attached Proof:</span>
                      <a
                        href={viewingSubmissionTask.latestSubmission.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--bos-accent)] hover:underline flex items-center gap-1"
                      >
                        <span>View Evidence</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingSubmissionTask(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-bold text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
