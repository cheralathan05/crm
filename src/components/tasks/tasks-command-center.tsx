"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
  Eye,
  FileCheck2,
  FileCode2,
  FileText,
  Filter,
  Flame,
  FolderKanban,
  GitBranch,
  History,
  Layers,
  LayoutGrid,
  ListTodo,
  Loader2,
  Lock,
  MessageSquare,
  Milestone as MilestoneIcon,
  Paperclip,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
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
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkTreeView } from "./work-tree-view";
import { EngineeringFlowBoard } from "./engineering-flow-board";
import { CriticalPathView } from "./critical-path-view";
import { ExecutionGraph } from "./execution-graph";
import { TaskExecutionWorkspace } from "./task-execution-workspace";
import { TaskCommandPalette } from "./task-command-palette";
import { WorkBreakdownBuilder } from "./work-breakdown-builder";
import { QuickTaskCreate } from "./quick-task-create";

export type ExecutionOSView =
  | "list"
  | "board"
  | "work-tree"
  | "critical-path"
  | "dependencies"
  | "graph";

export function TasksCommandCenter({
  initialView = "list",
  initialNew = false,
}: {
  initialView?: string;
  initialNew?: boolean;
}) {
  const [view, setView] = useState<ExecutionOSView>(
    initialView === "overview" ? "list" : (initialView as ExecutionOSView) || "list",
  );

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedScope, setSelectedScope] = useState<"ALL" | "MY">("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Data State
  const [projects, setProjects] = useState<Array<{ id: string; name: string; code?: string; clientId: string }>>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role?: string } | null>(null);

  // Drawers & Modals
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBreakdownBuilder, setShowBreakdownBuilder] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(initialNew);

  // Load Projects & Tasks from Real Database API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch projects list
      const projRes = await fetch("/api/tasks/command-center");
      const projJson = await projRes.json();
      if (projJson.ok && projJson.projects) {
        setProjects(projJson.projects);
        if (!selectedProjectId && projJson.projects.length > 0) {
          setSelectedProjectId(projJson.projects[0].id);
        }
      }

      // Fetch tasks filtered by selected project
      const taskUrl = selectedProjectId ? `/api/tasks?projectId=${selectedProjectId}` : "/api/tasks";
      const taskRes = await fetch(taskUrl);
      const taskJson = await taskRes.json();
      if (taskJson.ok && taskJson.tasks) {
        setTasks(taskJson.tasks);
      }

      // Fetch project details for context bar if project selected
      if (selectedProjectId) {
        const pRes = await fetch(`/api/projects/${selectedProjectId}`);
        const pJson = await pRes.json();
        if (pJson.ok && pJson.project) {
          setActiveProject(pJson.project);
        }
      }

      // Fetch current user session info
      const authRes = await fetch("/api/auth/me").catch(() => null);
      if (authRes && authRes.ok) {
        const authJson = await authRes.json();
        if (authJson.user) setCurrentUser(authJson.user);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load execution data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  // Status transition handler for flow board & quick status changes
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Summary counts calculated strictly from real tasks
  const counts = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const relevantTasks = selectedScope === "MY" && currentUser
      ? tasks.filter((t) => t.assigneeId === currentUser.id || t.assigneeName === currentUser.name)
      : tasks;

    const todayCount = relevantTasks.filter(
      (t) => t.dueAt && new Date(t.dueAt) <= endOfToday && t.status !== "DONE" && t.status !== "COMPLETED"
    ).length;

    const inProgressCount = relevantTasks.filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
    ).length;

    const upNextCount = relevantTasks.filter(
      (t) => (t.status === "TODO" || t.status === "READY" || t.status === "BACKLOG")
    ).length;

    const blockedCount = relevantTasks.filter((t) => t.status === "BLOCKED").length;

    const completedCount = relevantTasks.filter(
      (t) => t.status === "DONE" || t.status === "COMPLETED" || t.status === "CLIENT_APPROVED"
    ).length;

    return {
      today: todayCount,
      inProgress: inProgressCount,
      upNext: upNextCount,
      blocked: blockedCount,
      completed: completedCount,
      total: relevantTasks.length,
    };
  }, [tasks, selectedScope, currentUser]);

  // Filter tasks by search query, scope & status
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Scope filter
      if (selectedScope === "MY" && currentUser) {
        const isMyTask = t.assigneeId === currentUser.id || t.assigneeName === currentUser.name;
        if (!isMyTask) return false;
      }

      // Status pill filter
      if (selectedStatusFilter === "TODAY") {
        const now = new Date();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const isDue = t.dueAt && new Date(t.dueAt) <= endOfToday && t.status !== "DONE" && t.status !== "COMPLETED";
        if (!isDue) return false;
      } else if (selectedStatusFilter === "IN_PROGRESS") {
        if (t.status !== "IN_PROGRESS" && t.status !== "IN_REVIEW") return false;
      } else if (selectedStatusFilter === "UP_NEXT") {
        if (t.status !== "TODO" && t.status !== "READY" && t.status !== "BACKLOG") return false;
      } else if (selectedStatusFilter === "BLOCKED") {
        if (t.status !== "BLOCKED") return false;
      } else if (selectedStatusFilter === "COMPLETED") {
        if (t.status !== "DONE" && t.status !== "COMPLETED" && t.status !== "CLIENT_APPROVED") return false;
      }

      // Search keyword filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchCode = t.code?.toLowerCase().includes(q);
        const matchAssignee = t.assigneeName?.toLowerCase().includes(q);
        const matchDeliverable = (t.deliverable?.title || t.sourceDeliverableTitle || "").toLowerCase().includes(q);
        const matchProject = (t.project?.name || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchAssignee && !matchDeliverable && !matchProject) return false;
      }

      return true;
    });
  }, [tasks, selectedScope, selectedStatusFilter, searchQuery, currentUser]);

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] pb-24">
      {/* ── 01. TASK PAGE HEADER ───────────────────────────────────── */}
      <header className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/90 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Title & Scope Toggle */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
                  {selectedScope === "MY" ? "MY WORK" : "PROJECT WORK"}
                </span>
                <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                  · {selectedScope === "MY" ? "Tasks assigned to you" : "All work required to deliver this project"}
                </span>
              </div>
              <h1 className="text-[20px] font-bold text-[var(--bos-text-primary)]">
                {activeProject ? activeProject.name : "All Project Tasks"}
              </h1>
            </div>

            {/* Scope Switcher + Project Selector + Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Project selector */}
              {projects.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] font-mono">
                  <span className="text-[var(--bos-text-tertiary)] uppercase text-[10px]">Project:</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    aria-label="Select Project"
                    className="bg-transparent text-[var(--bos-text-primary)] font-semibold focus:outline-hidden cursor-pointer"
                  >
                    <option value="">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `${p.code} - ` : ""}{p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scope Switcher: All vs My */}
              <div className="flex items-center p-0.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] font-mono font-medium">
                <button
                  type="button"
                  onClick={() => setSelectedScope("ALL")}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all cursor-pointer",
                    selectedScope === "ALL"
                      ? "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] font-bold shadow-2xs"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                  )}
                >
                  All Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedScope("MY")}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all cursor-pointer",
                    selectedScope === "MY"
                      ? "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] font-bold shadow-2xs"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                  )}
                >
                  My Work
                </button>
              </div>

              {/* Create Task Button */}
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:brightness-110 text-white text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>

              {/* Work Breakdown Trigger */}
              <button
                type="button"
                onClick={() => setShowBreakdownBuilder(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] hover:bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-[12px] font-medium transition-all cursor-pointer"
                title="AI Work Breakdown Decomposition"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span className="hidden sm:inline">Decompose Scope</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 max-w-md bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg px-3 py-1.5 text-[12px]">
            <Search className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search tasks by title, code, owner, or deliverable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-hidden text-[12.5px]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── 02. TOP SUMMARY METRICS (Clickable Filter Cards) ────────── */}
      <section className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/60">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* 1. TODAY */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === "TODAY" ? "ALL" : "TODAY")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer space-y-0.5",
                selectedStatusFilter === "TODAY"
                  ? "bg-rose-500/10 border-rose-500 shadow-xs"
                  : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-rose-500/40"
              )}
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase font-bold text-rose-600">
                <span>TODAY</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                {counts.today} <span className="text-[11.5px] font-normal text-[var(--bos-text-secondary)]">tasks</span>
              </div>
            </button>

            {/* 2. IN PROGRESS */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer space-y-0.5",
                selectedStatusFilter === "IN_PROGRESS"
                  ? "bg-sky-500/10 border-sky-500 shadow-xs"
                  : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-sky-500/40"
              )}
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase font-bold text-sky-600">
                <span>IN PROGRESS</span>
                <Play className="w-3.5 h-3.5" />
              </div>
              <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                {counts.inProgress} <span className="text-[11.5px] font-normal text-[var(--bos-text-secondary)]">tasks</span>
              </div>
            </button>

            {/* 3. UP NEXT */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === "UP_NEXT" ? "ALL" : "UP_NEXT")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer space-y-0.5",
                selectedStatusFilter === "UP_NEXT"
                  ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] shadow-xs"
                  : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/40"
              )}
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase font-bold text-[var(--bos-accent)]">
                <span>UP NEXT</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
              <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                {counts.upNext} <span className="text-[11.5px] font-normal text-[var(--bos-text-secondary)]">tasks</span>
              </div>
            </button>

            {/* 4. BLOCKED */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === "BLOCKED" ? "ALL" : "BLOCKED")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer space-y-0.5",
                selectedStatusFilter === "BLOCKED"
                  ? "bg-amber-500/10 border-amber-500 shadow-xs"
                  : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-amber-500/40"
              )}
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase font-bold text-amber-600">
                <span>BLOCKED</span>
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                {counts.blocked} <span className="text-[11.5px] font-normal text-[var(--bos-text-secondary)]">tasks</span>
              </div>
            </button>

            {/* 5. COMPLETED */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === "COMPLETED" ? "ALL" : "COMPLETED")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer space-y-0.5",
                selectedStatusFilter === "COMPLETED"
                  ? "bg-emerald-500/10 border-emerald-500 shadow-xs"
                  : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-emerald-500/40"
              )}
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase font-bold text-emerald-600">
                <span>COMPLETED</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                {counts.completed} <span className="text-[11.5px] font-normal text-[var(--bos-text-secondary)]">tasks</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── 03. NAVIGATION SUB-NAV (Primary List vs Advanced Views) ── */}
      <div className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/80 sticky top-[73px] z-20 backdrop-blur-xs">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 flex items-center justify-between gap-4 overflow-x-auto">
          {/* Main Views */}
          <div className="flex items-center gap-1 py-1.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-mono font-medium transition-all whitespace-nowrap cursor-pointer",
                view === "list"
                  ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)]",
              )}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Task List ({filteredTasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-mono font-medium transition-all whitespace-nowrap cursor-pointer",
                view === "board"
                  ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)]",
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Engineering Flow Board</span>
            </button>
          </div>

          {/* Advanced Engineering Views */}
          <div className="flex items-center gap-1 py-1.5 text-[11px] font-mono">
            <span className="text-[var(--bos-text-tertiary)] uppercase text-[10px] mr-1 hidden sm:inline">Advanced:</span>
            {[
              { id: "work-tree", label: "Work Tree", icon: GitBranch },
              { id: "critical-path", label: "Critical Path", icon: Flame },
              { id: "dependencies", label: "Dependency Matrix", icon: Layers },
              { id: "graph", label: "Execution Graph", icon: Zap },
            ].map((adv) => {
              const Icon = adv.icon;
              const isActive = view === adv.id;
              return (
                <button
                  key={adv.id}
                  type="button"
                  onClick={() => setView(adv.id as ExecutionOSView)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-[var(--bos-text-primary)] text-[var(--bos-bg)] font-bold"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)]",
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span>{adv.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 04. MAIN TASK CONTENT ─────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        {loading && tasks.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--bos-text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
            <p className="text-[13px] font-mono">Loading Real Tasks from Database...</p>
          </div>
        ) : tasks.length === 0 ? (
          /* ── MEANINGFUL HONEST EMPTY STATE ─────────────────────── */
          <div className="p-12 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-2xl mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] mx-auto flex items-center justify-center font-bold font-mono text-[22px]">
              ⬡
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[var(--bos-text-primary)]">
                NO TASKS ASSIGNED
              </h3>
              <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed">
                There are currently no tasks created or assigned for this project scope.
                Decompose the approved proposal into engineering tasks or create a new task.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bos-accent)] hover:brightness-110 text-white text-[13px] font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Task</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBreakdownBuilder(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-[13px] font-medium transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[var(--bos-accent)]" />
                <span>Decompose Scope</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── VIEW 1: CLEAN TASK LIST (WHAT? WHY? WHO? WHEN? STATUS?) ── */}
            {view === "list" && (
              <div className="space-y-4">
                {selectedStatusFilter !== "ALL" && (
                  <div className="flex items-center justify-between pb-2 text-[12px] font-mono text-[var(--bos-text-secondary)]">
                    <span>Filtering by: <strong className="text-[var(--bos-accent)]">{selectedStatusFilter}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter("ALL")}
                      className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:underline cursor-pointer"
                    >
                      Clear filter
                    </button>
                  </div>
                )}

                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl font-mono text-[13px] text-[var(--bos-text-secondary)]">
                    No tasks match the active filter.
                  </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTasks.map((t) => {
                      const isBlocked = t.status === "BLOCKED";
                      const isDone = t.status === "DONE" || t.status === "COMPLETED" || t.status === "CLIENT_APPROVED";
                      const isInProgress = t.status === "IN_PROGRESS";
                      const isInReview = t.status === "IN_REVIEW" || t.status === "CLIENT_REVIEW" || t.status === "READY_FOR_CLIENT" || t.status === "CHANGES_REQUESTED";

                      // Due text
                      const dueText = t.dueAt
                        ? new Date(t.dueAt).toDateString() === new Date().toDateString()
                          ? "Due today"
                          : new Date(t.dueAt) < new Date()
                          ? `Overdue (${new Date(t.dueAt).toLocaleDateString("en-GB")})`
                          : `Due ${new Date(t.dueAt).toLocaleDateString("en-GB")}`
                        : "No deadline";

                      // Next action text
                      let nextActionLabel = "Start Task →";
                      if (isInProgress) nextActionLabel = "Submit for Review →";
                      else if (isInReview) nextActionLabel = "Review & Verify →";
                      else if (isBlocked) nextActionLabel = "Check Blocker →";
                      else if (isDone) nextActionLabel = "View Completed Work →";

                      // Plain description
                      const plainDesc = t.description && t.description.trim().length > 0 && t.description.trim() !== t.title
                        ? t.description
                        : t.deliverable?.title
                        ? `Execute and deliver ${t.title} for ${t.deliverable.title}.`
                        : `Complete the required work for ${t.title}.`;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTaskId(t.id)}
                          className={cn(
                            "p-5 rounded-2xl bg-[var(--bos-surface)] border transition-all space-y-3.5 cursor-pointer group shadow-xs hover:shadow-md",
                            isBlocked
                              ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500"
                              : isDone
                              ? "border-[var(--bos-border)] hover:border-emerald-500/50"
                              : "border-[var(--bos-border)] hover:border-[var(--bos-accent)]"
                          )}
                        >
                          {/* Priority & Status Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[var(--bos-accent)]">
                                {t.priority || "MEDIUM"} PRIORITY
                              </span>
                              <span
                                className={cn(
                                  "font-mono text-[10.5px] uppercase font-bold px-2 py-0.5 rounded border",
                                  isDone
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : isInProgress
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                    : isInReview
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : isBlocked
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                    : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)] border-[var(--bos-border)]"
                                )}
                              >
                                {t.status.replace(/_/g, " ")}
                              </span>
                            </div>

                            <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                              {t.code || "TSK"}
                            </span>
                          </div>

                          {/* Task Title & Project */}
                          <div className="space-y-1">
                            <h3 className="text-[15.5px] font-bold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors leading-snug line-clamp-2">
                              {t.title}
                            </h3>
                            <p className="text-[12.5px] font-medium text-[var(--bos-text-secondary)] truncate">
                              {t.project?.name || activeProject?.name || "Client Project"}
                            </p>
                          </div>

                          {/* Plain-Language Instruction */}
                          <p className="text-[13px] leading-relaxed text-[var(--bos-text-primary)] line-clamp-2">
                            {plainDesc}
                          </p>

                          {/* Footer: Due date & NEXT Action */}
                          <div className="pt-2.5 border-t border-[var(--bos-border)] flex items-center justify-between gap-2 text-[12px]">
                            <div className="text-[var(--bos-text-secondary)] truncate">
                              <span>{dueText} · {t.assigneeName || "Unassigned"}</span>
                            </div>

                            <div className="inline-flex items-center gap-1 font-semibold text-[var(--bos-accent)] shrink-0 group-hover:translate-x-0.5 transition-transform">
                              <span className="font-mono text-[10.5px] text-[var(--bos-text-secondary)] uppercase">NEXT</span>
                              <span>{nextActionLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── VIEW 2: ENGINEERING FLOW BOARD ──────────────────────── */}
            {view === "board" && (
              <EngineeringFlowBoard
                tasks={filteredTasks}
                onSelectTask={(task) => setActiveTaskId(task.id)}
                onUpdateStatus={handleUpdateTaskStatus}
              />
            )}

            {/* ── VIEW 3: WORK TREE (CAPABILITIES) ────────────────────── */}
            {view === "work-tree" && (
              <WorkTreeView
                tasks={filteredTasks}
                deliverables={activeProject?.deliverables}
                onSelectTask={(task) => setActiveTaskId(task.id)}
              />
            )}

            {/* ── VIEW 4: CRITICAL PATH ───────────────────────────────── */}
            {view === "critical-path" && (
              <CriticalPathView
                tasks={filteredTasks}
                onSelectTask={(task) => setActiveTaskId(task.id)}
              />
            )}

            {/* ── VIEW 5: DEPENDENCY MATRIX ───────────────────────────── */}
            {view === "dependencies" && (
              <CriticalPathView
                tasks={filteredTasks}
                onSelectTask={(task) => setActiveTaskId(task.id)}
              />
            )}

            {/* ── VIEW 6: EXECUTION GRAPH ─────────────────────────────── */}
            {view === "graph" && (
              <ExecutionGraph
                project={activeProject}
                tasks={tasks}
                onSelectNode={(node) => {
                  if (node.type) {
                    setView("board");
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* ── 05. TASK EXECUTION WORKSPACE MODAL / DRAWER ───────────── */}
      {activeTaskId && (
        <TaskExecutionWorkspace
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={() => loadData()}
          onNavigateTask={(newId) => setActiveTaskId(newId)}
          isAdmin={true}
        />
      )}

      {/* ── 06. COMMAND PALETTE (⌘K) ──────────────────────────────── */}
      <TaskCommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectAction={(actionId, payload) => {
          if (actionId === "create-task") setShowQuickCreate(true);
          else if (actionId === "work-breakdown") setShowBreakdownBuilder(true);
          else if (payload) setView(payload as ExecutionOSView);
        }}
      />

      {/* ── 07. WORK BREAKDOWN BUILDER (AI DECOMPOSITION) ─────────── */}
      {showBreakdownBuilder && (
        <WorkBreakdownBuilder
          projectId={selectedProjectId}
          onClose={() => setShowBreakdownBuilder(false)}
          onPlanCommitted={() => {
            setShowBreakdownBuilder(false);
            loadData();
          }}
        />
      )}

      {/* ── 08. QUICK TASK CREATOR ─────────────────────────────────── */}
      {showQuickCreate && (
        <QuickTaskCreate
          onClose={() => setShowQuickCreate(false)}
          onTaskCreated={() => {
            setShowQuickCreate(false);
            loadData();
          }}
          preselectedProjectId={selectedProjectId}
        />
      )}
    </div>
  );
}
