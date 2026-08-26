"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Flame,
  FolderGit2,
  Layers,
  ListTodo,
  Loader2,
  Lock,
  LogOut,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Unlock,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { TaskExecutionWorkspace } from "@/components/tasks/task-execution-workspace";
import { cn } from "@/lib/utils";

type TaskFilterTab = "ALL" | "TODAY" | "UPCOMING" | "BLOCKED" | "COMPLETED";

export default function EmployeeWorkPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Task Workspace Modal
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TaskFilterTab>("ALL");

  const fetchWorkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/employee/work");
      const json = await res.json();

      if (json.ok) {
        setData(json);
      } else {
        setError(json.message || "Failed to load employee workspace.");
      }
    } catch {
      setError("Business OS couldn't reach your workspace. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkData();
  }, [fetchWorkData]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col items-center justify-center p-6 gap-3 font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <p className="text-xs text-[var(--bos-text-secondary)] tracking-wider uppercase">
          RESTORING EMPLOYEE CONTEXT...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl text-center space-y-4 shadow-xl">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">Workspace Unavailable</h2>
          <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">{error}</p>
          <div className="pt-2 flex justify-center gap-2 font-mono text-xs">
            <button
              onClick={fetchWorkData}
              className="px-4 py-2 bg-[var(--bos-accent)] text-white font-semibold uppercase rounded-xl cursor-pointer"
            >
              Retry
            </button>
            <a
              href="/auth/employee/login"
              className="px-4 py-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] font-semibold uppercase rounded-xl"
            >
              Sign In Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { context, work } = data;
  const { employee, organization, role } = context;
  const { metrics, sections } = work;

  // Filter tasks based on activeTab and searchQuery
  const filteredTasks = useMemo(() => {
    let taskList: any[] = [];
    if (activeTab === "ALL") {
      taskList = sections.all || [];
    } else if (activeTab === "TODAY") {
      taskList = sections.dueToday || [];
    } else if (activeTab === "UPCOMING") {
      taskList = sections.upcoming || [];
    } else if (activeTab === "BLOCKED") {
      taskList = sections.blocked || [];
    } else if (activeTab === "COMPLETED") {
      taskList = sections.completed || [];
    }

    if (!searchQuery.trim()) return taskList;

    const q = searchQuery.toLowerCase().trim();
    return taskList.filter((t: any) =>
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.project?.name?.toLowerCase().includes(q) ||
      t.code?.toLowerCase().includes(q) ||
      t.assigneeName?.toLowerCase().includes(q)
    );
  }, [sections, activeTab, searchQuery]);

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* ── TOP NAVIGATION ─────────────────────────────────────────── */}
      <header className="relative z-20 h-16 border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            ⬡
          </div>
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase block">
              BUSINESS OS
            </span>
            <span className="text-[11px] text-[var(--bos-text-secondary)]">
              {organization?.name || "Workspace"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right hidden sm:block">
            <p className="text-[13px] font-semibold text-[var(--bos-text-primary)]">{employee.fullName}</p>
            <p className="text-[11px] font-mono text-[var(--bos-text-secondary)]">{role?.name || "Team Member"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-rose-500 hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        
        {/* ── 1. TASK HOME TITLE & LIVE SUMMARY ─────────────────────── */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--bos-text-primary)]">
              MY WORK
            </h1>
            <p className="text-[14px] text-[var(--bos-text-secondary)]">
              Everything you need to complete your work.
            </p>
          </div>

          {/* Real Live Database Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            
            {/* TODAY */}
            <div
              onClick={() => setActiveTab("TODAY")}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer",
                activeTab === "TODAY"
                  ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                  : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
              )}
            >
              <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                TODAY
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] mt-1">
                {metrics.todayCount ?? 0}
              </p>
            </div>

            {/* IN PROGRESS */}
            <div
              onClick={() => setActiveTab("ALL")}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer",
                activeTab === "ALL"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-sm"
                  : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
              )}
            >
              <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                IN PROGRESS
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] mt-1">
                {metrics.inProgressCount ?? 0}
              </p>
            </div>

            {/* DUE SOON */}
            <div
              onClick={() => setActiveTab("UPCOMING")}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer",
                activeTab === "UPCOMING"
                  ? "bg-purple-500/10 border-purple-500/40 shadow-sm"
                  : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
              )}
            >
              <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                DUE SOON
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] mt-1">
                {metrics.dueSoonCount ?? 0}
              </p>
            </div>

            {/* BLOCKED */}
            <div
              onClick={() => setActiveTab("BLOCKED")}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer",
                activeTab === "BLOCKED"
                  ? "bg-rose-500/10 border-rose-500/40 shadow-sm"
                  : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
              )}
            >
              <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                BLOCKED
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {metrics.blockedCount ?? 0}
              </p>
            </div>

            {/* COMPLETED */}
            <div
              onClick={() => setActiveTab("COMPLETED")}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1",
                activeTab === "COMPLETED"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                  : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
              )}
            >
              <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                COMPLETED
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {metrics.completedCount ?? 0}
              </p>
            </div>

          </div>
        </div>

        {/* ── 2. SEARCH & FILTER BAR ───────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--bos-text-secondary)]" />
              <input
                type="text"
                placeholder="Search your work..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13.5px] text-[var(--bos-text-primary)] placeholder-[var(--bos-text-secondary)] focus:outline-none focus:border-[var(--bos-accent)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl overflow-x-auto">
              {(["ALL", "TODAY", "UPCOMING", "BLOCKED", "COMPLETED"] as TaskFilterTab[]).map((tab) => {
                const labels: Record<TaskFilterTab, string> = {
                  ALL: "All",
                  TODAY: "Today",
                  UPCOMING: "Upcoming",
                  BLOCKED: "Blocked",
                  COMPLETED: "Completed",
                };
                const counts: Record<TaskFilterTab, number> = {
                  ALL: (sections.all || []).length,
                  TODAY: (sections.dueToday || []).length,
                  UPCOMING: (sections.upcoming || []).length,
                  BLOCKED: (sections.blocked || []).length,
                  COMPLETED: (sections.completed || []).length,
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                      activeTab === tab
                        ? "bg-[var(--bos-accent)] text-white shadow-xs"
                        : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                    )}
                  >
                    <span>{labels[tab]}</span>
                    <span className={cn(
                      "text-[11px] font-mono px-1.5 py-0.2 rounded-full",
                      activeTab === tab ? "bg-white/20 text-white" : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)]"
                    )}>
                      {counts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 3. TASK LIST — WORK INSTRUCTION CARDS ─────────────────── */}
        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((t: any) => {
                const isBlocked = t.status === "BLOCKED";
                const isDone = t.status === "DONE" || t.status === "COMPLETED" || t.status === "CLIENT_APPROVED";
                const isInProgress = t.status === "IN_PROGRESS";
                const isInReview = t.status === "IN_REVIEW" || t.status === "CLIENT_REVIEW" || t.status === "READY_FOR_CLIENT" || t.status === "CHANGES_REQUESTED";
                
                // Urgency calculation for date
                const dueText = t.dueAt
                  ? new Date(t.dueAt).toDateString() === new Date().toDateString()
                    ? "Due today"
                    : new Date(t.dueAt) < new Date()
                    ? `Overdue (${new Date(t.dueAt).toLocaleDateString("en-GB")})`
                    : `Due ${new Date(t.dueAt).toLocaleDateString("en-GB")}`
                  : "No deadline";

                // NEXT Action phrasing based on real status
                let nextActionText = "Start Task →";
                if (isInProgress) nextActionText = "Submit work for review →";
                else if (isInReview) nextActionText = "Review database & verify →";
                else if (isBlocked) nextActionText = "Check Blocker →";
                else if (isDone) nextActionText = "View Completed Work →";

                // Plain language description
                const plainDescription = t.description && t.description.trim().length > 0 && t.description.trim() !== t.title
                  ? t.description
                  : t.deliverable?.title
                  ? `Execute and deliver ${t.title} for ${t.deliverable.title}.`
                  : `Complete the required work for ${t.title}.`;

                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTaskId(t.id)}
                    className="p-5 sm:p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] transition-all shadow-xs hover:shadow-md cursor-pointer space-y-3.5 group"
                  >
                    {/* Header: Priority & Status Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[var(--bos-accent)]">
                          {t.priority || "MEDIUM"} PRIORITY
                        </span>
                        <span className={cn(
                          "text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded",
                          isDone && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                          isBlocked && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
                          isInReview && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
                          isInProgress && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
                          !isDone && !isBlocked && !isInReview && !isInProgress && "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30"
                        )}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
                        {t.code || "TSK"}
                      </span>
                    </div>

                    {/* Task Title & Project context */}
                    <div className="space-y-1">
                      <h3 className="text-[17px] font-bold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors">
                        {t.title}
                      </h3>
                      <p className="text-[13px] font-medium text-[var(--bos-text-secondary)]">
                        {t.project?.name || "Client Project"}
                      </p>
                    </div>

                    {/* Plain-Language Work Instruction */}
                    <p className="text-[13.5px] leading-relaxed text-[var(--bos-text-primary)] line-clamp-2">
                      {plainDescription}
                    </p>

                    {/* Subtasks / Progress snippet if available */}
                    {t.subtasks && t.subtasks.length > 0 && (
                      <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--bos-text-secondary)] pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          {t.subtasks.filter((s: any) => s.completed).length} of {t.subtasks.length} steps completed
                        </span>
                      </div>
                    )}

                    {/* Footer: Due date, assignee & NEXT Action */}
                    <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between gap-4 flex-wrap text-[12.5px]">
                      <div className="flex items-center gap-2 text-[var(--bos-text-secondary)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dueText} · Assigned to you</span>
                      </div>

                      <div className="inline-flex items-center gap-1 font-semibold text-[var(--bos-accent)] group-hover:translate-x-0.5 transition-transform">
                        <span className="font-mono text-[11.5px] text-[var(--bos-text-secondary)] uppercase mr-1">NEXT</span>
                        <span>{nextActionText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
              <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">
                {activeTab === "COMPLETED" ? "No completed tasks yet" : "You're all caught up!"}
              </h3>
              <p className="text-[13px] text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                {activeTab === "TODAY"
                  ? "No tasks are due today. Check Upcoming to prepare for upcoming work."
                  : activeTab === "BLOCKED"
                  ? "No tasks are currently blocked. You have clear runway."
                  : "Everything in this section is clear."}
              </p>
            </div>
          )}
        </div>

      </main>

      {/* ── OPEN TASK WORKSPACE DRAWER / MODAL ──────────────────────── */}
      {activeTaskId && (
        <TaskExecutionWorkspace
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={fetchWorkData}
          onNavigateTask={(newId) => setActiveTaskId(newId)}
        />
      )}
    </div>
  );
}
