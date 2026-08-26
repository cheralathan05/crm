"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FolderGit2,
  Package,
  Users,
  Search,
  ArrowRight,
  ChevronDown,
  Building2,
  LogOut,
  Sparkles,
  Shield,
  Layers,
  Calendar,
  Activity,
  FileText,
  Filter,
  Check,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  User,
  Play,
} from "lucide-react";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { TaskExecutionWorkspace } from "@/components/tasks/task-execution-workspace";
import { cn } from "@/lib/utils";

export default function EmployeeWorkPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Task Drawer
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Search & Command
  const [searchQuery, setSearchQuery] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

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

  // Keyboard shortcut for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setOrgDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  if (loading) {
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
          <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">Workspace Error</h2>
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
  const { employee, organization, role, team, capabilities, organizations } = context;
  const { metrics, sections, projects, deliverables, teamMembers } = work;

  // Flatten assigned tasks for calculations
  const allAssignedTasks: any[] = [
    ...(sections.dueToday || []),
    ...(sections.inProgress || []),
    ...(sections.blocked || []),
    ...(sections.inReview || []),
    ...(sections.upcoming || []),
  ];

  // Primary active project
  const currentProject = projects.length > 0 ? projects[0] : null;

  // MY NEXT TASK (First priority task requiring action)
  const myNextTask =
    sections.inProgress?.length > 0
      ? sections.inProgress[0]
      : sections.dueToday?.length > 0
      ? sections.dueToday[0]
      : sections.upcoming?.length > 0
      ? sections.upcoming[0]
      : sections.blocked?.length > 0
      ? sections.blocked[0]
      : null;

  // Completed tasks count
  const completedTasksCount = metrics.completedCount || 0;

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* ── TOP NAV BAR ────────────────────────────────────────────── */}
      <header className="relative z-20 h-14 border-b border-[var(--bos-border)] bg-[var(--bos-bg)]/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-xs">
              ⬡
            </div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
              BUSINESS OS
            </span>
          </div>

          <div className="h-4 w-px bg-[var(--bos-border)]" />

          {/* Organization Switcher */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="font-semibold">{organization.name}</span>
              <ChevronDown className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 p-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl shadow-xl z-30 font-mono text-xs space-y-1">
                <span className="text-[9.5px] uppercase tracking-wider text-[var(--bos-text-tertiary)] px-2 py-1 block">
                  YOUR WORKSPACE
                </span>
                {organizations.map((org: any) => (
                  <div
                    key={org.workspaceId}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg transition-colors",
                      org.isCurrent ? "bg-[var(--bos-bg)] font-semibold text-[var(--bos-accent)]" : "text-[var(--bos-text-secondary)]"
                    )}
                  >
                    <div>
                      <span className="block">{org.workspaceName}</span>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] font-normal">{org.role}</span>
                    </div>
                    {org.isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Command Palette</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[10px]">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg hover:bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)] hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN EMPLOYEE CONTENT ───────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* ── 01. EMPLOYEE HEADER (WHO AM I?) ────────────────────────── */}
        <section className="p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)] flex items-center justify-center font-bold text-xl font-mono">
              {employee.fullName ? employee.fullName.charAt(0).toUpperCase() : "E"}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--bos-text-primary)]">
                  {employee.fullName.toUpperCase()}
                </h1>
                <span className="px-2 py-0.5 rounded font-mono text-[10.5px] uppercase font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {employee.status || "ACTIVE"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[12.5px] font-mono text-[var(--bos-text-secondary)] flex-wrap">
                <span className="font-semibold text-[var(--bos-text-primary)]">{role?.name || "Specialist"}</span>
                <span>·</span>
                <span>{team?.name || "Product Engineering"}</span>
                <span>·</span>
                <span>{employee.employeeCode || "EMP-001"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 02. MY WORK SUMMARY COUNTS ─────────────────────────────── */}
        <section className="space-y-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
            MY WORK
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* TODAY */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
              <span className="font-mono text-[10.5px] font-bold uppercase text-rose-600 block">TODAY</span>
              <div className="text-[22px] font-mono font-bold text-[var(--bos-text-primary)]">
                {metrics.dueTodayCount || 0}
              </div>
            </div>

            {/* IN PROGRESS */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
              <span className="font-mono text-[10.5px] font-bold uppercase text-sky-600 block">IN PROGRESS</span>
              <div className="text-[22px] font-mono font-bold text-[var(--bos-text-primary)]">
                {metrics.inProgressCount || 0}
              </div>
            </div>

            {/* UPCOMING */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
              <span className="font-mono text-[10.5px] font-bold uppercase text-[var(--bos-accent)] block">UPCOMING</span>
              <div className="text-[22px] font-mono font-bold text-[var(--bos-text-primary)]">
                {sections.upcoming?.length || 0}
              </div>
            </div>

            {/* COMPLETED */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
              <span className="font-mono text-[10.5px] font-bold uppercase text-emerald-600 block">COMPLETED</span>
              <div className="text-[22px] font-mono font-bold text-[var(--bos-text-primary)]">
                {completedTasksCount}
              </div>
            </div>

            {/* BLOCKED */}
            <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
              <span className="font-mono text-[10.5px] font-bold uppercase text-amber-600 block">BLOCKED</span>
              <div className="text-[22px] font-mono font-bold text-[var(--bos-text-primary)]">
                {metrics.blockedCount || 0}
              </div>
            </div>
          </div>
        </section>

        {/* ── 03. MY CURRENT PROJECT & MY NEXT TASK ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MY CURRENT PROJECT */}
          <section className="p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-4 shadow-xs">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              MY CURRENT PROJECT
            </span>

            {currentProject ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--bos-text-primary)]">
                    {currentProject.name}
                  </h3>
                  <p className="text-[12px] font-mono text-[var(--bos-text-secondary)] mt-0.5">
                    Client: {currentProject.clientName || "Client"}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[var(--bos-border)] text-[12px] font-mono">
                  <div className="flex items-center justify-between text-[var(--bos-text-secondary)]">
                    <span>Role:</span>
                    <strong className="text-[var(--bos-text-primary)]">{role?.name || currentProject.role || "Specialist"}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[var(--bos-text-secondary)]">
                    <span>Project Phase:</span>
                    <strong className="text-[var(--bos-text-primary)]">{currentProject.stage}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[var(--bos-text-secondary)]">
                    <span>Stage Progress:</span>
                    <strong className="text-[var(--bos-accent)]">{currentProject.progress}%</strong>
                  </div>
                </div>

                <div className="w-full bg-[var(--bos-bg)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--bos-accent)] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${currentProject.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-[var(--bos-bg)] rounded-xl font-mono text-[12.5px] text-[var(--bos-text-secondary)]">
                NO ACTIVE PROJECTS — You have not been assigned to a project yet.
              </div>
            )}
          </section>

          {/* MY NEXT TASK */}
          <section className="p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-4 shadow-xs">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              MY NEXT TASK
            </span>

            {myNextTask ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[var(--bos-accent)] bg-[var(--bos-bg)] px-2 py-0.5 rounded border border-[var(--bos-border)]">
                    {myNextTask.code || "TSK-001"}
                  </span>
                  <span className={cn(
                    "font-mono text-[10.5px] uppercase font-bold px-2 py-0.5 rounded border",
                    myNextTask.status === "BLOCKED" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-sky-500/10 text-sky-600 border-sky-500/20"
                  )}>
                    {myNextTask.status}
                  </span>
                </div>

                <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)] leading-snug">
                  {myNextTask.title}
                </h3>

                <div className="space-y-1 pt-2 border-t border-[var(--bos-border)] text-[12px] font-mono text-[var(--bos-text-secondary)]">
                  <div className="flex items-center justify-between">
                    <span>Due:</span>
                    <strong className="text-[var(--bos-text-primary)]">
                      {myNextTask.dueAt ? new Date(myNextTask.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not specified"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Priority:</span>
                    <strong className={cn(
                      myNextTask.priority === "URGENT" || myNextTask.priority === "HIGH" ? "text-rose-600" : "text-[var(--bos-text-primary)]"
                    )}>
                      {myNextTask.priority || "Medium"}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTaskId(myNextTask.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:brightness-110 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm mt-2"
                >
                  <span>Open Task →</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center bg-[var(--bos-bg)] rounded-xl font-mono text-[12.5px] text-[var(--bos-text-secondary)]">
                NO TASKS ASSIGNED — You currently have no assigned tasks.
              </div>
            )}
          </section>
        </div>

        {/* ── 04. MY PROJECT CONTEXT ───────────────────────────────── */}
        <section className="p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-6 shadow-xs">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              MY PROJECT CONTEXT
            </span>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-0.5">
              Clear summary of what we are building, your concrete responsibility, and blockers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. WHAT WE ARE BUILDING */}
            <div className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1.5">
              <span className="font-mono text-[10.5px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                WHAT WE ARE BUILDING
              </span>
              <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">
                {currentProject?.name ? `${currentProject.name} — scalable engineering platform developed for ${currentProject.clientName || "the client"} under approved specifications.` : "Not specified in active project."}
              </p>
            </div>

            {/* 2. MY RESPONSIBILITY */}
            <div className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1.5">
              <span className="font-mono text-[10.5px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                MY RESPONSIBILITY
              </span>
              <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">
                {role?.name || "Specialist"} responsibility across {deliverables.length > 0 ? deliverables.map((d: any) => d.title).slice(0, 3).join(", ") : "project execution tasks"}.
              </p>
            </div>

            {/* 3. WHAT I AM WAITING FOR */}
            <div className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1.5">
              <span className="font-mono text-[10.5px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                WHAT I AM WAITING FOR
              </span>
              {sections.blocked?.length > 0 ? (
                <div className="space-y-1 text-[12.5px] text-amber-600 font-mono">
                  {sections.blocked.map((bt: any) => (
                    <div key={bt.id}>● {bt.title}: {bt.blockedReason || "Waiting for resolution"}</div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-emerald-600 font-mono">
                  NO BLOCKERS — Nothing is currently preventing your work.
                </p>
              )}
            </div>

            {/* 4. WHAT I HAVE COMPLETED */}
            <div className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1.5">
              <span className="font-mono text-[10.5px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                WHAT I HAVE COMPLETED
              </span>
              <p className="text-[13px] text-[var(--bos-text-primary)] font-mono">
                {completedTasksCount} task{completedTasksCount === 1 ? "" : "s"} verified and marked complete in this workspace.
              </p>
            </div>
          </div>
        </section>

        {/* ── 05. ALL ASSIGNED TASKS LIST ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              ALL ASSIGNED TASKS ({allAssignedTasks.length})
            </span>
          </div>

          {allAssignedTasks.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl font-mono text-[13px] text-[var(--bos-text-secondary)]">
              NO TASKS ASSIGNED — You currently have no assigned tasks.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allAssignedTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTaskId(t.id)}
                  className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] font-bold text-[var(--bos-accent)] bg-[var(--bos-bg)] px-1.5 py-0.5 rounded border border-[var(--bos-border)]">
                        {t.code || "TSK"}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                        {t.dueAt ? new Date(t.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "No due date"}
                      </span>
                    </div>
                    <h4 className="text-[13.5px] font-bold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors truncate">
                      {t.title}
                    </h4>
                  </div>

                  <span className={cn(
                    "font-mono text-[10.5px] uppercase font-bold px-2 py-0.5 rounded border shrink-0",
                    t.status === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-600 border-sky-500/20" : t.status === "BLOCKED" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] border-[var(--bos-border)]"
                  )}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── 06. TASK EXECUTION WORKSPACE MODAL ─────────────────────── */}
      {activeTaskId && (
        <TaskExecutionWorkspace
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={() => fetchWorkData()}
        />
      )}

      {/* ── 07. COMMAND PALETTE MODAL (⌘K) ────────────────────────── */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 p-3.5 border-b border-[var(--bos-border)]">
              <Search className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search workspace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-hidden"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
              <span className="text-[9.5px] uppercase tracking-wider text-[var(--bos-text-tertiary)] px-2 py-1 block">
                ACTIONS
              </span>
              {[
                { label: "Refresh My Work", action: () => { fetchWorkData(); setCommandPaletteOpen(false); } },
                { label: "View Onboarding Specs", action: () => { router.push("/employee/onboarding"); setCommandPaletteOpen(false); } },
                { label: "Sign out of Business OS", action: handleLogout },
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={cmd.action}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--bos-bg)] text-left text-[var(--bos-text-primary)] cursor-pointer"
                >
                  <span>{cmd.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--bos-border)] px-6 py-4 flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)]">
        <span>BUSINESS OS · EMPLOYEE EXECUTION WORKSPACE</span>
        <span>CONNECTED OPERATING ENVIRONMENT</span>
      </footer>
    </div>
  );
}
