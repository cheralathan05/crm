"use client";

import { useEffect, useState, useTransition } from "react";
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
import { ExecutionOSHeader } from "./execution-os-header";
import { ExecutionGraph } from "./execution-graph";
import { LiveAttentionMatrix } from "./live-attention-matrix";
import { ExecutionCopilotCard } from "./execution-copilot-card";
import { WorkTreeView } from "./work-tree-view";
import { EngineeringFlowBoard } from "./engineering-flow-board";
import { CriticalPathView } from "./critical-path-view";
import { TaskExecutionWorkspace } from "./task-execution-workspace";
import { TaskCommandPalette } from "./task-command-palette";
import { WorkBreakdownBuilder } from "./work-breakdown-builder";
import { QuickTaskCreate } from "./quick-task-create";

export type ExecutionOSView =
  | "overview"
  | "board"
  | "work-tree"
  | "critical-path"
  | "dependencies"
  | "my-work";

export function TasksCommandCenter({
  initialView = "overview",
  initialNew = false,
}: {
  initialView?: string;
  initialNew?: boolean;
}) {
  const [view, setView] = useState<ExecutionOSView>(
    (initialView as ExecutionOSView) || "overview",
  );

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedLayer, setSelectedLayer] = useState<string>("ALL");

  // Data State
  const [projects, setProjects] = useState<Array<{ id: string; name: string; clientId: string }>>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || "Failed to load execution data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  // Status transition handler for flow board
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

  // Filter tasks by search query & layer
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchCode = t.code?.toLowerCase().includes(q);
      const matchAssignee = t.assigneeName?.toLowerCase().includes(q);
      const matchReq = t.sourceRequirementId?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchAssignee && !matchReq) return false;
    }
    if (selectedLayer !== "ALL") {
      const layer = (t.layer || t.workstream || "").toUpperCase();
      if (selectedLayer === "DATABASE" && layer !== "DATABASE") return false;
      if (selectedLayer === "BACKEND" && layer !== "BACKEND") return false;
      if (selectedLayer === "FRONTEND" && layer !== "FRONTEND") return false;
      if (selectedLayer === "TESTING" && layer !== "TESTING" && layer !== "QA") return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] pb-20">
      
      {/* ── 01. EXECUTION OS HEADER ───────────────────────────────── */}
      <ExecutionOSHeader
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(pId) => setSelectedProjectId(pId)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenWorkBreakdown={() => setShowBreakdownBuilder(true)}
        onOpenNewTask={() => setShowQuickCreate(true)}
        activeProjectContext={
          activeProject
            ? {
                code: activeProject.code,
                name: activeProject.name,
                clientName: activeProject.client?.companyName,
                stage: activeProject.stage,
                health: activeProject.health,
                currentMilestoneTitle: activeProject.milestones?.[0]?.title,
                deadline: activeProject.deadline,
                progress: Math.round(
                  (tasks.filter((t) => t.status === "DONE").length / (tasks.length || 1)) * 100,
                ),
                requirementCount: activeProject.requirements?.length || 1,
                deliverableCount: activeProject.deliverables?.length || 0,
              }
            : null
        }
      />

      {/* ── 02. VIEW SELECTION SUB-NAV ────────────────────────────── */}
      <div className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/80 sticky top-[95px] z-20 backdrop-blur-xs">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-1 py-1.5">
            {[
              { id: "overview", label: "Executive Overview", icon: Zap },
              { id: "board", label: `Engineering Flow Board (${filteredTasks.length})`, icon: LayoutGrid },
              { id: "work-tree", label: "Work Tree (Capabilities)", icon: GitBranch },
              { id: "critical-path", label: "Critical Path", icon: Flame },
              { id: "dependencies", label: "Dependency Matrix", icon: Layers },
              { id: "my-work", label: "My Execution Work", icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id as ExecutionOSView)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono font-medium transition-all whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)]",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Layer Filter Buttons */}
          <div className="flex items-center gap-1 py-1.5 text-[11px] font-mono">
            <span className="text-[var(--bos-text-tertiary)] uppercase mr-1">Layer:</span>
            {["ALL", "DATABASE", "BACKEND", "FRONTEND", "TESTING"].map((ly) => (
              <button
                key={ly}
                onClick={() => setSelectedLayer(ly)}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors cursor-pointer",
                  selectedLayer === ly
                    ? "bg-[var(--bos-text-primary)] text-[var(--bos-bg)] font-bold"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] bg-[var(--bos-bg)] border border-[var(--bos-border)]",
                )}
              >
                {ly}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 03. MAIN EXECUTION WORKSPACE BODY ──────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-6">
        {loading && tasks.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--bos-text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
            <p className="text-[13px] font-mono">Loading Execution OS Relational Graph…</p>
          </div>
        ) : tasks.length === 0 ? (
          /* ── HONEST EMPTY STATE: NO DATA ────────────────────────── */
          <div className="p-12 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-2xl mx-auto space-y-5 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] mx-auto flex items-center justify-center font-bold font-mono text-[22px]">
              ⬡
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[var(--bos-text-primary)]">
                NO EXECUTION PLAN CREATED YET
              </h3>
              <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed">
                Your approved proposal has not yet been decomposed into engineering execution tasks.
                Trigger technical decomposition to generate Frontend, Backend, Database, and QA nodes.
              </p>
            </div>

            <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-left text-[12px] space-y-2">
              <span className="text-[10.5px] font-mono font-bold text-[var(--bos-accent)] uppercase">
                AUTOMATED SCOPE PIPELINE:
              </span>
              <div className="flex items-center justify-between text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                <span>1. Approved Proposal</span>
                <span>→</span>
                <span>2. AI Technical Blueprint</span>
                <span>→</span>
                <span>3. Human Review & Approval</span>
                <span>→</span>
                <span>4. Real Execution Tasks</span>
              </div>
            </div>

            <button
              onClick={() => setShowBreakdownBuilder(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[13px] font-semibold transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Engineering Work Breakdown</span>
            </button>
          </div>
        ) : (
          <>
            {/* VIEW 1: EXECUTIVE OVERVIEW (Graph + Attention Matrix + Next Best Action) */}
            {view === "overview" && (
              <div className="space-y-6">
                {/* 1. Interactive Execution Graph */}
                <ExecutionGraph
                  project={activeProject}
                  tasks={tasks}
                  onSelectNode={(node) => {
                    if (node.type === "DATABASE" || node.type === "BACKEND" || node.type === "FRONTEND" || node.type === "TESTING") {
                      setSelectedLayer(node.type);
                      setView("board");
                    }
                  }}
                />

                {/* 2. Side-by-Side: Next Best Action Copilot & Live Attention Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 space-y-6">
                    <ExecutionCopilotCard
                      projectId={selectedProjectId}
                      projectName={activeProject?.name}
                      tasks={tasks}
                      deliverables={activeProject?.deliverables}
                      onExecuteAction={(label, task) => {
                        if (task) setActiveTaskId(task.id);
                        else if (label.includes("Breakdown")) setShowBreakdownBuilder(true);
                      }}
                    />
                  </div>

                  <div className="lg:col-span-7 space-y-6">
                    <LiveAttentionMatrix
                      tasks={filteredTasks}
                      onSelectTask={(task) => setActiveTaskId(task.id)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: ENGINEERING FLOW BOARD */}
            {view === "board" && (
              <EngineeringFlowBoard
                tasks={filteredTasks}
                onSelectTask={(task) => setActiveTaskId(task.id)}
                onUpdateStatus={handleUpdateTaskStatus}
              />
            )}

            {/* VIEW 3: HIERARCHICAL WORK TREE */}
            {view === "work-tree" && (
              <WorkTreeView
                tasks={filteredTasks}
                deliverables={activeProject?.deliverables}
                onSelectTask={(task) => setActiveTaskId(task.id)}
              />
            )}

            {/* VIEW 4: CRITICAL PATH ENGINE */}
            {view === "critical-path" && (
              <CriticalPathView
                tasks={filteredTasks}
                onSelectTask={(task) => setActiveTaskId(task.id)}
              />
            )}

            {/* VIEW 5: DEPENDENCY MATRIX */}
            {view === "dependencies" && (
              <CriticalPathView
                tasks={filteredTasks}
                onSelectTask={(task) => setActiveTaskId(task.id)}
              />
            )}

            {/* VIEW 6: MY WORK */}
            {view === "my-work" && (
              <LiveAttentionMatrix
                tasks={filteredTasks}
                onSelectTask={(task) => setActiveTaskId(task.id)}
              />
            )}
          </>
        )}
      </main>

      {/* ── 04. DEEP TASK EXECUTION WORKSPACE MODAL / DRAWER ──────── */}
      {activeTaskId && (
        <TaskExecutionWorkspace
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={() => loadData()}
        />
      )}

      {/* ── 05. COMMAND PALETTE (⌘K) ──────────────────────────────── */}
      <TaskCommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectAction={(actionId, payload) => {
          if (actionId === "create-task") setShowQuickCreate(true);
          else if (actionId === "work-breakdown") setShowBreakdownBuilder(true);
          else if (payload) setView(payload as ExecutionOSView);
        }}
      />

      {/* ── 06. WORK BREAKDOWN BUILDER (AI DECOMPOSITION) ─────────── */}
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

      {/* ── 07. QUICK TASK CREATOR ─────────────────────────────────── */}
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
