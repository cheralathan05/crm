"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar as CalendarIcon,
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
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  User,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_WORKSTREAMS, TASK_STATUS_CONFIG, type WorkstreamType, type CommandCenterMetrics } from "@/lib/tasks";
import { TaskWorkspaceDrawer } from "./task-workspace-drawer";
import { WorkBreakdownBuilder } from "./work-breakdown-builder";
import { QuickTaskCreate } from "./quick-task-create";
import { TaskCommandPalette } from "./task-command-palette";

type MainViewMode =
  | "overview"
  | "board"
  | "list"
  | "timeline"
  | "calendar"
  | "work-map"
  | "dependencies"
  | "my-work";

type QuickFilterTab =
  | "all"
  | "my"
  | "today"
  | "upcoming"
  | "overdue"
  | "blocked"
  | "in-review"
  | "completed";

export function TasksCommandCenter({
  initialView = "all",
  initialNew = false,
}: {
  initialView?: string;
  initialNew?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<QuickFilterTab>(
    (initialView as QuickFilterTab) || "all",
  );
  const [viewMode, setViewMode] = useState<MainViewMode>(
    initialView === "my" ? "my-work" : "overview",
  );

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");

  // Data State
  const [tasks, setTasks] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<CommandCenterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modals & Drawers
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showWorkBreakdownBuilder, setShowWorkBreakdownBuilder] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(initialNew);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Fetch metrics & tasks
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("view", activeTab);
      if (selectedProjectId) params.set("projectId", selectedProjectId);
      if (selectedWorkstream) params.set("workstream", selectedWorkstream);
      if (selectedPriority) params.set("priority", selectedPriority);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const [tasksRes, metricsRes] = await Promise.all([
        fetch(`/api/tasks?${params.toString()}`),
        fetch(`/api/tasks/command-center${selectedProjectId ? `?projectId=${selectedProjectId}` : ""}`),
      ]);

      const [tasksJson, metricsJson] = await Promise.all([tasksRes.json(), metricsRes.json()]);

      if (tasksJson.ok) {
        setTasks(tasksJson.tasks || []);
      }
      if (metricsJson.ok) {
        setMetrics(metricsJson.metrics);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load Task Command Center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedProjectId, selectedWorkstream, selectedPriority, searchQuery]);

  // Keyboard shortcut listener for Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCommandAction = (actionId: string, payload?: any) => {
    if (actionId === "create-task") setShowQuickCreate(true);
    else if (actionId === "work-breakdown") setShowWorkBreakdownBuilder(true);
    else if (actionId.startsWith("view-")) setViewMode(payload);
    else if (actionId.startsWith("filter-")) setActiveTab(payload);
  };

  // Group tasks for Board View columns
  const boardColumns = [
    { id: "BACKLOG", label: "Backlog", statuses: ["BACKLOG"] },
    { id: "READY", label: "Ready to Start", statuses: ["READY", "TODO"] },
    { id: "IN_PROGRESS", label: "In Progress", statuses: ["IN_PROGRESS"] },
    { id: "BLOCKED", label: "Blocked", statuses: ["BLOCKED"] },
    { id: "IN_REVIEW", label: "In Review", statuses: ["IN_REVIEW", "CHANGES_REQUESTED"] },
    { id: "CLIENT_REVIEW", label: "Client Review", statuses: ["READY_FOR_CLIENT", "CLIENT_REVIEW"] },
    { id: "COMPLETED", label: "Completed", statuses: ["COMPLETED", "DONE", "CLIENT_APPROVED"] },
  ];

  // Unique projects list for dropdown filter
  const availableProjects = Array.from(
    new Map(tasks.filter((t) => t.project).map((t) => [t.project.id, t.project.name])).entries(),
  ).map(([id, name]) => ({ id, name }));

  return (
    <div className="min-h-[90vh] bg-[var(--bos-bg)] flex flex-col font-sans text-[var(--bos-text-primary)]">
      {/* ── TOP OPERATIONAL HEADER ───────────────────────────────── */}
      <div className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)] px-6 py-5 flex flex-col gap-4">
        {/* Title & Context & Global Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--bos-accent)]" />
              <h1 className="text-[20px] font-bold tracking-tight text-[var(--bos-text-primary)]">
                TASK COMMAND CENTER
              </h1>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]">
                EXECUTION BRAIN
              </span>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5 font-mono">
              Turning approved client commitments into structured, traceable execution.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Context Selector */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 text-[12px] bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-md font-sans text-[var(--bos-text-primary)] cursor-pointer"
            >
              <option value="">All Projects Workspace</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Quick Command Button */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-md text-[12px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] flex items-center gap-2 transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quick Command</span>
              <kbd className="px-1 py-0.2 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded text-[10px]">
                ⌘K
              </kbd>
            </button>

            {/* Work Breakdown Builder Button */}
            <button
              onClick={() => setShowWorkBreakdownBuilder(true)}
              className="px-3.5 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-accent-ring)] text-[var(--bos-accent)] rounded-md text-[12px] font-semibold hover:bg-[var(--bos-accent-subtle)] transition flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Work Breakdown Builder
            </button>

            {/* Create Task Button */}
            <button
              onClick={() => setShowQuickCreate(true)}
              className="px-4 py-1.5 bg-[var(--bos-accent)] text-white rounded-md text-[12px] font-semibold hover:bg-[var(--bos-accent-hover)] transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Task
            </button>
          </div>
        </div>

        {/* ── LIVE DELIVERY SIGNALS CAROUSEL/BAR ─────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          {[
            { label: "ACTIVE WORK", count: metrics?.activeWork ?? 0, color: "var(--bos-text-primary)", bg: "var(--bos-bg)" },
            { label: "IN PROGRESS", count: metrics?.inProgress ?? 0, color: "var(--bos-accent)", bg: "var(--bos-accent-subtle)" },
            { label: "BLOCKED", count: metrics?.blocked ?? 0, color: "var(--bos-error)", bg: "rgba(196, 58, 49, 0.08)" },
            { label: "OVERDUE", count: metrics?.overdue ?? 0, color: "var(--bos-error)", bg: "rgba(196, 58, 49, 0.08)" },
            { label: "IN REVIEW", count: metrics?.inReview ?? 0, color: "var(--bos-warning)", bg: "rgba(166, 124, 46, 0.08)" },
            { label: "DUE TODAY", count: metrics?.dueToday ?? 0, color: "var(--bos-info)", bg: "rgba(47, 111, 159, 0.08)" },
            { label: "COMPLETED", count: metrics?.completed ?? 0, color: "var(--bos-success)", bg: "rgba(43, 122, 75, 0.08)" },
          ].map((sig) => (
            <div
              key={sig.label}
              className="p-3 rounded-lg border border-[var(--bos-border)] flex flex-col justify-between"
              style={{ backgroundColor: sig.bg }}
            >
              <span className="text-[10px] font-mono font-bold tracking-wider text-[var(--bos-text-tertiary)] uppercase">
                {sig.label}
              </span>
              <span className="text-[20px] font-bold font-mono tracking-tight mt-1" style={{ color: sig.color }}>
                {sig.count}
              </span>
            </div>
          ))}
        </div>

        {/* ── QUICK FILTER TABS ──────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-[var(--bos-border)] pt-3 overflow-x-auto gap-2">
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "ALL WORK" },
              { id: "my", label: "MY WORK" },
              { id: "today", label: "TODAY" },
              { id: "upcoming", label: "UPCOMING" },
              { id: "overdue", label: "OVERDUE" },
              { id: "blocked", label: "BLOCKED" },
              { id: "in-review", label: "IN REVIEW" },
              { id: "completed", label: "COMPLETED" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as QuickFilterTab)}
                className={cn(
                  "px-3 py-1 rounded text-[11px] font-mono font-medium whitespace-nowrap transition",
                  activeTab === tab.id
                    ? "bg-[var(--bos-accent)] text-white shadow-sm"
                    : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Modes Switcher */}
          <div className="flex items-center gap-1 bg-[var(--bos-bg)] p-0.5 rounded-lg border border-[var(--bos-border)] shrink-0">
            {[
              { id: "overview", label: "Overview", icon: Zap },
              { id: "board", label: "Board", icon: LayoutGrid },
              { id: "list", label: "Work Tree", icon: ListTodo },
              { id: "timeline", label: "Timeline", icon: Clock },
              { id: "calendar", label: "Calendar", icon: CalendarIcon },
              { id: "work-map", label: "Work Map", icon: GitBranch },
              { id: "dependencies", label: "Dependencies", icon: Layers },
              { id: "my-work", label: "My Hub", icon: User },
            ].map((vm) => {
              const Icon = vm.icon;
              const active = viewMode === vm.id;
              return (
                <button
                  key={vm.id}
                  onClick={() => setViewMode(vm.id as MainViewMode)}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition",
                    active
                      ? "bg-[var(--bos-surface)] text-[var(--bos-accent)] font-semibold shadow-xs"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{vm.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── WORKSTREAM BAR & SEARCH FILTER ───────────────────────── */}
      <div className="px-6 py-3 border-b border-[var(--bos-border)] bg-[var(--bos-bg)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Workstream Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase mr-1">Workstreams:</span>
          <button
            onClick={() => setSelectedWorkstream("")}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-mono transition",
              !selectedWorkstream
                ? "bg-[var(--bos-text-primary)] text-[var(--bos-text-inverse)] font-medium"
                : "bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)]",
            )}
          >
            All
          </button>
          {ALL_WORKSTREAMS.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setSelectedWorkstream(ws.id === selectedWorkstream ? "" : ws.id)}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-mono font-medium transition flex items-center gap-1",
                selectedWorkstream === ws.id
                  ? "bg-[var(--bos-accent)] text-white shadow-xs"
                  : "bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ws.color }} />
              {ws.label}
            </button>
          ))}
        </div>

        {/* Search & Priority Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--bos-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search code, title, owner, requirement…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md focus:outline-none focus:border-[var(--bos-accent)] w-[220px]"
            />
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2 py-1 text-[11px] font-mono bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md text-[var(--bos-text-secondary)]"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* ── MAIN CONTENT WORKSPACE ───────────────────────────────── */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading && tasks.length === 0 ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
            <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Loading Execution State…</p>
          </div>
        ) : tasks.length === 0 ? (
          /* Honest Product Empty State */
          <div className="min-h-[400px] rounded-xl border border-dashed border-[var(--bos-border)] bg-[var(--bos-surface)] flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">NO WORK HAS BEEN PLANNED YET</h3>
              <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1">
                Create a structured work plan from approved requirements and proposals, or create your first task.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowWorkBreakdownBuilder(true)}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-semibold rounded hover:bg-[var(--bos-accent-hover)] transition flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Build Project Work Plan
              </button>
              <button
                onClick={() => setShowQuickCreate(true)}
                className="px-4 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] font-medium rounded hover:bg-[var(--bos-surface)]"
              >
                Create Direct Task
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW COCKPIT VIEW */}
            {viewMode === "overview" && (
              <div className="space-y-6">
                {/* Attention & Real Activity Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left (Cols: 7): What Needs Attention */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[13px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[var(--bos-accent)]" />
                        What Needs Attention ({metrics?.whatNeedsAttention.length ?? 0})
                      </h2>
                    </div>

                    <div className="space-y-2.5">
                      {!metrics?.whatNeedsAttention || metrics.whatNeedsAttention.length === 0 ? (
                        <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] text-emerald-600 flex items-center gap-2 font-mono">
                          <CheckCircle2 className="w-4 h-4" />
                          CLEAR · All tasks on track with zero blocking exceptions.
                        </div>
                      ) : (
                        metrics.whatNeedsAttention.map((att) => (
                          <div
                            key={att.id}
                            className={cn(
                              "p-3.5 rounded-lg border flex items-start justify-between gap-3 transition",
                              att.priority === "CRITICAL"
                                ? "bg-red-500/5 border-red-500/25"
                                : "bg-[var(--bos-surface)] border-[var(--bos-border)]",
                            )}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase",
                                    att.priority === "CRITICAL" ? "bg-red-500 text-white" : "bg-amber-500 text-white",
                                  )}
                                >
                                  {att.type}
                                </span>
                                <h3 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">{att.title}</h3>
                              </div>
                              <p className="text-[12px] text-[var(--bos-text-secondary)]">{att.reason}</p>
                              <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--bos-text-tertiary)] pt-1">
                                <span>Project: {att.affectedProject}</span>
                                {att.owner && <span>Owner: {att.owner}</span>}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (att.taskId) setSelectedTaskId(att.taskId);
                              }}
                              className="px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[11px] font-semibold rounded hover:bg-[var(--bos-surface)] whitespace-nowrap shrink-0 flex items-center gap-1"
                            >
                              <span>{att.nextAction}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right (Cols: 5): Work Happening Now */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[13px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 text-emerald-500" />
                        Work Happening Now
                      </h2>
                    </div>

                    <div className="space-y-2.5">
                      {!metrics?.workHappeningNow || metrics.workHappeningNow.length === 0 ? (
                        <div className="p-4 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] text-[var(--bos-text-secondary)]">
                          No active sprints in progress right now.
                        </div>
                      ) : (
                        metrics.workHappeningNow.map((w) => (
                          <div
                            key={w.id}
                            onClick={() => setSelectedTaskId(w.id)}
                            className="p-3.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] cursor-pointer transition space-y-2 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-[10px] text-[var(--bos-accent)] font-semibold">{w.code || "TASK"}</span>
                                <h3 className="text-[13px] font-semibold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition">
                                  {w.title}
                                </h3>
                              </div>
                              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/10 text-emerald-600 font-medium shrink-0">
                                {w.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)]">
                              <span>
                                {w.owner} · {w.workstream}
                              </span>
                              <span>{w.dueLabel}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-1 rounded-full bg-[var(--bos-line-strong)] overflow-hidden">
                              <div className="h-full bg-[var(--bos-accent)]" style={{ width: `${w.progress}%` }} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Workload & Active Workstream Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--bos-border)]">
                  {/* Workstream Distribution */}
                  <div className="p-5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                    <h3 className="text-[13px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[var(--bos-accent)]" />
                      Active Workstreams Performance
                    </h3>
                    <div className="space-y-3 pt-1">
                      {metrics?.activeWorkstreams.map((ws) => (
                        <div key={ws.id} className="space-y-1">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-medium flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
                              {ws.label}
                            </span>
                            <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                              {ws.completedCount} / {ws.taskCount} tasks ({ws.progress}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--bos-line-strong)] overflow-hidden">
                            <div className="h-full" style={{ width: `${ws.progress}%`, backgroundColor: ws.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Employee Workloads */}
                  <div className="p-5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                    <h3 className="text-[13px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--bos-accent)]" />
                      Team Real Capacity & Workload
                    </h3>
                    <div className="space-y-2.5 pt-1">
                      {!metrics?.employeeWorkloads || metrics.employeeWorkloads.length === 0 ? (
                        <p className="text-[12px] text-[var(--bos-text-secondary)]">No team allocations recorded yet.</p>
                      ) : (
                        metrics.employeeWorkloads.map((emp) => (
                          <div key={emp.id} className="p-2.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between text-[12px]">
                            <div>
                              <span className="font-semibold block text-[var(--bos-text-primary)]">{emp.name}</span>
                              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                                {emp.role} · {emp.activeTasks} active · {emp.overdue} overdue
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-[11px] font-medium">{emp.capacity}% Load</span>
                              <div className="w-16 h-1.5 rounded-full bg-[var(--bos-line-strong)] overflow-hidden mt-1">
                                <div
                                  className={cn("h-full", emp.capacity > 85 ? "bg-red-500" : "bg-[var(--bos-accent)]")}
                                  style={{ width: `${emp.capacity}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. KANBAN BOARD VIEW */}
            {viewMode === "board" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 overflow-x-auto pb-6">
                {boardColumns.map((col) => {
                  const colTasks = tasks.filter((t) => col.statuses.includes(t.status));
                  return (
                    <div key={col.id} className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-3 flex flex-col min-w-[240px] max-h-[75vh]">
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)]">
                        <span className="font-mono text-[11px] font-bold text-[var(--bos-text-primary)] uppercase tracking-wider">
                          {col.label}
                        </span>
                        <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[var(--bos-bg)] border border-[var(--bos-border)] font-medium">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1">
                        {colTasks.map((t) => {
                          const statusConf = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.TODO;
                          const completedSub = t.subtasks?.filter((s: any) => s.completed).length || 0;
                          const totalSub = t.subtasks?.length || 0;
                          const hasBlockers = t.dependencies?.some((d: any) => d.dependsOnTask.status !== "COMPLETED" && d.dependsOnTask.status !== "DONE");

                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTaskId(t.id)}
                              className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] cursor-pointer transition space-y-2 shadow-xs group"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="font-mono text-[10px] font-semibold text-[var(--bos-accent)]">
                                  {t.code || "TASK"}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                                  {t.priority}
                                </span>
                              </div>

                              <h4 className="text-[12px] font-semibold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition leading-snug">
                                {t.title}
                              </h4>

                              {t.project && (
                                <p className="text-[10px] font-mono text-[var(--bos-text-tertiary)] truncate">
                                  {t.project.name}
                                </p>
                              )}

                              {hasBlockers && (
                                <div className="text-[10px] font-mono text-red-500 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Blocked by Prerequisite
                                </div>
                              )}

                              <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-secondary)]">
                                <span>{t.assigneeName || "Unassigned"}</span>
                                {totalSub > 0 && (
                                  <span>
                                    {completedSub}/{totalSub}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. WORK BREAKDOWN TREE / LIST VIEW */}
            {viewMode === "list" && (
              <div className="rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] overflow-hidden shadow-xs">
                <div className="p-3 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] grid grid-cols-12 text-[11px] font-mono font-bold text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                  <div className="col-span-4">Task & Hierarchy</div>
                  <div className="col-span-2">Workstream</div>
                  <div className="col-span-2">Assignee</div>
                  <div className="col-span-2">Target Due</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1 text-right">Progress</div>
                </div>

                <div className="divide-y divide-[var(--bos-border)] bg-[var(--bos-bg)]">
                  {tasks.map((t) => {
                    const statusConf = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.TODO;
                    const ws = ALL_WORKSTREAMS.find((w) => w.id === t.workstream) || { label: t.workstream, color: "#888" };
                    const completedSub = t.subtasks?.filter((s: any) => s.completed).length || 0;
                    const totalSub = t.subtasks?.length || 0;
                    const subPct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : (t.status === "COMPLETED" || t.status === "DONE" ? 100 : 0);

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className="p-3 grid grid-cols-12 items-center text-[12px] hover:bg-[var(--bos-surface)] cursor-pointer transition group"
                      >
                        <div className="col-span-4 flex items-center gap-2 pr-3">
                          <span className="font-mono text-[10px] font-semibold text-[var(--bos-accent)] shrink-0">
                            {t.code || "TASK"}
                          </span>
                          <span className="font-medium text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition truncate">
                            {t.title}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center gap-1.5 text-[11px] font-mono">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ws.color }} />
                          <span className="truncate">{ws.label}</span>
                        </div>

                        <div className="col-span-2 truncate font-mono text-[11px] text-[var(--bos-text-secondary)]">
                          {t.assigneeName || "Unassigned"}
                        </div>

                        <div className="col-span-2 font-mono text-[11px] text-[var(--bos-text-secondary)]">
                          {t.dueAt ? new Date(t.dueAt).toLocaleDateString("en-GB") : "—"}
                        </div>

                        <div className="col-span-1">
                          <span
                            className="px-2 py-0.5 rounded font-mono text-[10px] font-medium inline-block"
                            style={{ backgroundColor: statusConf.bg, color: statusConf.text }}
                          >
                            {statusConf.label}
                          </span>
                        </div>

                        <div className="col-span-1 text-right font-mono text-[11px] font-medium text-[var(--bos-text-secondary)]">
                          {subPct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. WORK MAP VIEW (Interactive Tree) */}
            {viewMode === "work-map" && (
              <div className="p-6 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-6">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Project Work Map Visualization</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Interactive tree showing the direct relationship from Client down to Subtask units.
                  </p>
                </div>

                <div className="space-y-4">
                  {tasks.slice(0, 8).map((t) => (
                    <div key={t.id} className="p-4 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 overflow-x-auto text-[12px] font-mono">
                        <span className="px-2 py-1 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] shrink-0">
                          {t.client?.companyName || "Client"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
                          {t.project?.name || "Project"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
                        <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 shrink-0">
                          {t.deliverable?.title || t.milestone?.title || "Deliverable"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
                        <span className="px-2.5 py-1 rounded bg-[var(--bos-accent)] text-white font-medium shrink-0">
                          {t.code || "TASK"}: {t.title}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedTaskId(t.id)}
                        className="px-3 py-1 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded text-[11px] font-semibold hover:bg-[var(--bos-bg)] shrink-0"
                      >
                        Inspect DNA
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. TIMELINE / GANTT VIEW */}
            {viewMode === "timeline" && (
              <div className="rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] p-6 space-y-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Execution Timeline & Milestones</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">Gantt schedule plotted against target delivery dates.</p>
                </div>

                <div className="space-y-3 pt-2">
                  {tasks.map((t) => {
                    const hasDate = !!t.dueAt;
                    return (
                      <div key={t.id} onClick={() => setSelectedTaskId(t.id)} className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] cursor-pointer flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-semibold text-[var(--bos-accent)]">{t.code || "TASK"}</span>
                            <span className="text-[13px] font-medium">{t.title}</span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                            Workstream: {t.workstream} · Owner: {t.assigneeName || "Unassigned"}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[var(--bos-surface)]">
                          {t.dueAt ? `Due ${new Date(t.dueAt).toLocaleDateString("en-GB")}` : "No fixed date"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. CALENDAR VIEW */}
            {viewMode === "calendar" && (
              <div className="rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] p-6 space-y-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Deadlines & Review Gate Calendar</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">Target deadlines and milestone dates.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {tasks.filter((t) => t.dueAt).slice(0, 9).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="p-3.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] cursor-pointer space-y-1.5"
                    >
                      <span className="text-[11px] font-mono text-[var(--bos-accent)] font-semibold">
                        {new Date(t.dueAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <h4 className="text-[12px] font-semibold text-[var(--bos-text-primary)]">{t.title}</h4>
                      <p className="text-[10px] font-mono text-[var(--bos-text-secondary)]">{t.assigneeName || "Unassigned"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. DEPENDENCIES GRAPH VIEW */}
            {viewMode === "dependencies" && (
              <div className="p-6 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Dependency Graph & Blocker Map</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">Prerequisites connecting upstream architecture to downstream delivery.</p>
                </div>

                <div className="space-y-3 pt-2">
                  {tasks.map((t) => {
                    const blockers = t.dependencies || [];
                    return (
                      <div key={t.id} onClick={() => setSelectedTaskId(t.id)} className="p-4 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] cursor-pointer hover:border-[var(--bos-accent)] flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-semibold text-[var(--bos-accent)]">{t.code || "TASK"}</span>
                            <span className="text-[13px] font-medium">{t.title}</span>
                          </div>
                          {blockers.length > 0 ? (
                            <span className="text-[11px] font-mono text-red-500 flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              Waiting on {blockers.length} upstream prerequisite tasks
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-emerald-600 flex items-center gap-1 mt-1">
                              <Check className="w-3 h-3" />
                              Unblocked & ready for execution
                            </span>
                          )}
                        </div>
                        <button className="px-3 py-1 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded text-[11px] font-mono">
                          Inspect
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. MY WORK VIEW */}
            {viewMode === "my-work" && (
              <div className="p-6 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">My Personal Execution Hub</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">Tasks allocated to you across all active client projects.</p>
                </div>

                <div className="space-y-3 pt-2">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="p-4 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-semibold text-[var(--bos-accent)]">{t.code || "TASK"}</span>
                          <span className="text-[13px] font-medium">{t.title}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                          Project: {t.project?.name || "Project"} · Workstream: {t.workstream}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded font-mono text-[11px] bg-[var(--bos-surface)] font-medium">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODALS & DRAWERS ─────────────────────────────────────── */}
      {/* 1. Deep Task Workspace Drawer */}
      {selectedTaskId && (
        <TaskWorkspaceDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={fetchData}
        />
      )}

      {/* 2. Project Work Breakdown Builder (AI Review) */}
      {showWorkBreakdownBuilder && (
        <WorkBreakdownBuilder
          projectId={selectedProjectId || availableProjects[0]?.id || ""}
          onClose={() => setShowWorkBreakdownBuilder(false)}
          onPlanCommitted={fetchData}
        />
      )}

      {/* 3. Quick Task Creation Modal */}
      {showQuickCreate && (
        <QuickTaskCreate
          onClose={() => setShowQuickCreate(false)}
          onTaskCreated={(id) => {
            fetchData();
            setSelectedTaskId(id);
          }}
          preselectedProjectId={selectedProjectId}
        />
      )}

      {/* 4. Task Command Palette */}
      <TaskCommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectAction={handleCommandAction}
      />
    </div>
  );
}
