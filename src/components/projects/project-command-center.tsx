"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck,
  FileCheck2,
  FileCode2,
  FileText,
  Filter,
  FolderKanban,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Layers,
  ListTodo,
  Loader2,
  Lock,
  MessageSquare,
  Milestone as MilestoneIcon,
  Play,
  Plus,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextBestAction } from "@/lib/projects";

type ProjectDetailData = {
  project: any;
  metrics: {
    progress: number;
    completedTasks: number;
    totalTasks: number;
    acceptedDeliverables: number;
    totalDeliverables: number;
    currentMilestone: any | null;
    nextBestAction: NextBestAction;
  };
};

type ActiveTab =
  | "overview"
  | "milestones"
  | "deliverables"
  | "tasks"
  | "team"
  | "change-requests"
  | "commercials"
  | "traceability";

export function ProjectCommandCenter({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Modals & Dialogs
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("Lead Engineer");
  const [newTaskHours, setNewTaskHours] = useState(10);
  const [newTaskPriority, setNewTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState("");
  const [newTaskDeliverableId, setNewTaskDeliverableId] = useState("");

  const [delivModalOpen, setDelivModalOpen] = useState(false);
  const [newDelivTitle, setNewDelivTitle] = useState("");
  const [newDelivDesc, setNewDelivDesc] = useState("");
  const [newDelivCategory, setNewDelivCategory] = useState("ENGINEERING");
  const [newDelivMilestoneId, setNewDelivMilestoneId] = useState("");
  const [newDelivCriteria, setNewDelivCriteria] = useState("");

  const [crModalOpen, setCrModalOpen] = useState(false);
  const [crTitle, setCrTitle] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crReason, setCrReason] = useState("");
  const [crDays, setCrDays] = useState(3);
  const [crAmount, setCrAmount] = useState(25000);
  const [crDeliverableId, setCrDeliverableId] = useState("");

  // Review Dialog for Deliverable
  const [reviewDeliv, setReviewDeliv] = useState<any | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");

  const refreshProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "Failed to load project.");
      setData(json);
    } catch (e: any) {
      setError(e.message || "Error loading project state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProject();
  }, [projectId]);

  /* ── Task Status Toggle ─────────────────────────────────────── */
  const updateTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "TODO" ? "IN_PROGRESS" : currentStatus === "IN_PROGRESS" ? "DONE" : "TODO";
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: nextStatus }),
      });
      if (res.ok) {
        setNotice(`Task status updated to ${nextStatus}`);
        await refreshProject();
      }
    } catch {
      setError("Could not update task.");
    }
  };

  /* ── Deliverable Status Action ──────────────────────────────── */
  const updateDeliverableStatus = async (deliverableId: string, status: string, feedback?: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverableId, status, clientFeedback: feedback }),
      });
      if (res.ok) {
        setNotice(`Deliverable updated to ${status}`);
        setReviewDeliv(null);
        await refreshProject();
      }
    } catch {
      setError("Could not update deliverable status.");
    }
  };

  /* ── Milestone Invoice Trigger ──────────────────────────────── */
  const triggerMilestoneInvoice = async (milestoneId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, invoiceStatus: "INVOICED" }),
      });
      if (res.ok) {
        setNotice("Milestone commercial invoice generated and recorded.");
        await refreshProject();
      }
    } catch {
      setError("Could not generate milestone invoice.");
    }
  };

  /* ── Create New Task ────────────────────────────────────────── */
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          teamRole: newTaskRole,
          estimatedHours: newTaskHours,
          priority: newTaskPriority,
          milestoneId: newTaskMilestoneId || null,
          deliverableId: newTaskDeliverableId || null,
        }),
      });
      if (res.ok) {
        setTaskModalOpen(false);
        setNewTaskTitle("");
        setNotice("Task added to project delivery queue.");
        await refreshProject();
      }
    } catch {
      setError("Could not add task.");
    }
  };

  /* ── Create New Deliverable ─────────────────────────────────── */
  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDelivTitle.trim()) return;
    try {
      const criteriaList = newDelivCriteria
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDelivTitle.trim(),
          description: newDelivDesc.trim(),
          category: newDelivCategory,
          milestoneId: newDelivMilestoneId || null,
          acceptanceCriteria: criteriaList,
        }),
      });
      if (res.ok) {
        setDelivModalOpen(false);
        setNewDelivTitle("");
        setNewDelivDesc("");
        setNewDelivCriteria("");
        setNotice("Deliverable artifact registered in delivery matrix.");
        await refreshProject();
      }
    } catch {
      setError("Could not add deliverable.");
    }
  };

  /* ── Create Change Request ──────────────────────────────────── */
  const handleCreateChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: crTitle.trim(),
          description: crDesc.trim(),
          reason: crReason.trim(),
          impactTimelineDays: crDays,
          impactBudgetAmount: crAmount,
          deliverableId: crDeliverableId || null,
        }),
      });
      if (res.ok) {
        setCrModalOpen(false);
        setCrTitle("");
        setCrDesc("");
        setCrReason("");
        setNotice("Formal Change Request submitted for review.");
        await refreshProject();
      }
    } catch {
      setError("Could not create change request.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">
          Connecting Project Command Center…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-6 rounded-lg border border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)] text-center">
        <h2 className="text-[16px] font-semibold text-[var(--bos-text-primary)]">Project Workspace Error</h2>
        <p className="text-[13px] text-[var(--bos-text-secondary)] mt-2">{error || "Project data unavailable."}</p>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="mt-6 px-4 py-2 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-overlay)] text-[12px] font-medium rounded-sm"
        >
          Return to Projects Portfolio
        </button>
      </div>
    );
  }

  const { project, metrics } = data;
  const client = project.client;
  const proposal = project.proposal;
  const milestones = project.milestones || [];
  const deliverables = project.deliverables || [];
  const tasks = project.tasks || [];
  const team = project.team || [];
  const changeRequests = project.changeRequests || [];
  const activities = project.activities || [];

  return (
    <div className="min-h-screen bg-[var(--bos-surface-canvas)] pb-16">
      {/* ── NOTICE BAR ────────────────────────────────────────── */}
      {notice && (
        <div className="bg-[#f0f8ee] border-b border-[#cde8c7] px-4 py-2 text-[12px] text-[#2c5324] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-[var(--bos-text-tertiary)] hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── TOP BREADCRUMB & HEADER ───────────────────────────── */}
      <div className="border-b border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)] px-6 py-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/projects"
                className="flex items-center gap-1 text-[11.5px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Projects Portfolio</span>
              </Link>
              <span className="text-[var(--bos-text-tertiary)]">/</span>
              <span className="font-mono text-[11.5px] font-semibold text-[var(--bos-accent)]">
                {project.code}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {proposal && (
                <Link
                  href={`/proposals/${proposal.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[11.5px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                  <span>Approved Proposal v{proposal.version}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Link>
              )}

              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>

              <button
                type="button"
                onClick={() => setDelivModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-[#3f6e35]" />
                <span>Add Deliverable</span>
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4 pt-1">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[24px] font-serif font-bold text-[var(--bos-text-primary)] tracking-tight">
                  {project.name}
                </h1>
                <span className="font-mono text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                  {project.code}
                </span>
                <span className={cn(
                  "font-mono text-[11px] font-semibold uppercase px-2 py-0.5 rounded",
                  project.health === "ON_TRACK" ? "bg-[#eaf5e7] text-[#2c5324]" : "bg-[#fbece7] text-[#b5452a]"
                )}>
                  ● {project.health.replace("_", " ")}
                </span>
                <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-[var(--bos-accent)]/15 text-[var(--bos-accent)]">
                  Stage: {project.stage}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[12.5px] text-[var(--bos-text-secondary)] mt-1.5 flex-wrap">
                <span>
                  Client:{" "}
                  <Link href={`/clients/${client.id}`} className="font-semibold text-[var(--bos-text-primary)] hover:underline">
                    {client.companyName}
                  </Link>
                </span>
                <span>·</span>
                <span>
                  Lead Manager: <strong className="text-[var(--bos-text-primary)]">{project.managerName || "Unassigned"}</strong>
                </span>
                <span>·</span>
                <span>
                  Contract Budget:{" "}
                  <strong className="font-mono text-[var(--bos-text-primary)]">
                    {project.currency} {(project.budget || 0).toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ── LIVE PROJECT SUMMARY DASHBOARD ──────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Progress Card */}
          <div className="p-3.5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1 col-span-2 md:col-span-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)] uppercase">
              <span>Overall Delivery</span>
              <span className="font-bold text-[var(--bos-accent)]">{metrics.progress}%</span>
            </div>
            <div className="w-full bg-[var(--bos-surface-sunken)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[var(--bos-accent)] h-full transition-all duration-500"
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10.5px] font-mono text-[var(--bos-text-secondary)] pt-1">
              <span>{metrics.completedTasks}/{metrics.totalTasks} Tasks Done</span>
              <span>{metrics.acceptedDeliverables}/{metrics.totalDeliverables} Accepted</span>
            </div>
          </div>

          {/* Current Phase */}
          <div className="p-3.5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1 col-span-2 lg:col-span-2">
            <span className="text-[10.5px] font-mono uppercase text-[var(--bos-text-tertiary)] block">
              Active Milestone Phase
            </span>
            <p className="text-[13px] font-semibold text-[var(--bos-text-primary)] truncate">
              {metrics.currentMilestone?.title || "Phase 1: Foundation"}
            </p>
            <span className="text-[10.5px] font-mono text-[#3f6e35] block">
              Status: {metrics.currentMilestone?.status || "IN_PROGRESS"}
            </span>
          </div>

          {/* Target Deadline */}
          <div className="p-3.5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
            <span className="text-[10.5px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Target Handover</span>
            <p className="text-[13px] font-bold text-[var(--bos-text-primary)]">
              {project.deadline ? new Date(project.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "8 Weeks"}
            </p>
            <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block">Target Schedule</span>
          </div>

          {/* Team Members */}
          <div className="p-3.5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
            <span className="text-[10.5px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Delivery Team</span>
            <p className="text-[13px] font-bold text-[var(--bos-text-primary)]">{team.length} Members</p>
            <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block">100% Allocated</span>
          </div>

          {/* Commercial Invoicing */}
          <div className="p-3.5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
            <span className="text-[10.5px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Commercial Stage</span>
            <p className="text-[13px] font-bold text-[#3f6e35]">
              {milestones.filter((m: any) => m.invoiceStatus === "INVOICED" || m.invoiceStatus === "PAID").length} / {milestones.length} Invoiced
            </p>
            <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block">Milestone Trigger</span>
          </div>
        </div>

        {/* ── NEXT BEST ACTION DYNAMIC CARD ───────────────────── */}
        <div className="p-4 rounded-lg bg-[#fbf9f4] border border-[#ecd5a8] flex items-center justify-between gap-4 flex-wrap shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#faece7] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-[var(--bos-accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-[#faece7] text-[#b5452a]">
                  Next Best Action
                </span>
                <h3 className="text-[13.5px] font-bold text-[var(--bos-text-primary)]">
                  {metrics.nextBestAction.title}
                </h3>
              </div>
              <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-0.5">
                {metrics.nextBestAction.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (metrics.nextBestAction.type === "ASSIGN_TEAM" || metrics.nextBestAction.type === "START_MILESTONE") {
                setActiveTab("tasks");
              } else if (metrics.nextBestAction.type === "INTERNAL_REVIEW" || metrics.nextBestAction.type === "SUBMIT_DELIVERABLE") {
                setActiveTab("deliverables");
              } else if (metrics.nextBestAction.type === "REVIEW_CHANGE_REQUEST") {
                setActiveTab("change-requests");
              } else {
                setActiveTab("commercials");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-sm bg-[var(--bos-accent)] text-white text-[12.5px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer ml-auto"
          >
            <span>{metrics.nextBestAction.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── TABS NAVIGATION ─────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-[var(--bos-border-subtle)] overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Execution Plan", icon: FolderKanban },
            { id: "deliverables", label: `Deliverables & Review (${deliverables.length})`, icon: FileCheck2 },
            { id: "tasks", label: `Tasks Board (${tasks.length})`, icon: ListTodo },
            { id: "milestones", label: `Milestones & Phase Gates (${milestones.length})`, icon: MilestoneIcon },
            { id: "team", label: `Team & Allocation (${team.length})`, icon: Users },
            { id: "change-requests", label: `Change Requests (${changeRequests.length})`, icon: GitPullRequest },
            { id: "commercials", label: "Commercials & Invoicing", icon: Coins },
            { id: "traceability", label: "Traceability & Audit", icon: GitCommit },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer",
                  activeTab === tab.id
                    ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
                    : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: OVERVIEW & PLAN ──────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Milestone Phase Gates & Progress */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                    Milestone Delivery Roadmaps & Gates
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("milestones")}
                    className="text-[11.5px] font-mono text-[var(--bos-accent)] hover:underline"
                  >
                    View Full Gates →
                  </button>
                </div>

                <div className="space-y-3">
                  {milestones.map((ms: any, idx: number) => {
                    const msTasks = tasks.filter((t: any) => t.milestoneId === ms.id);
                    const msDelivs = deliverables.filter((d: any) => d.milestoneId === ms.id);
                    const completedMsTasks = msTasks.filter((t: any) => t.status === "DONE").length;
                    const msProgress = msTasks.length > 0 ? Math.round((completedMsTasks / msTasks.length) * 100) : ms.status === "COMPLETED" ? 100 : 0;

                    return (
                      <div
                        key={ms.id}
                        className={cn(
                          "p-4 rounded border transition-all",
                          ms.status === "COMPLETED"
                            ? "bg-[#f5fbf3] border-[#cbe8c6]"
                            : ms.status === "IN_PROGRESS"
                            ? "bg-[var(--bos-surface-panel)] border-[var(--bos-accent)]/50 ring-1 ring-[var(--bos-accent)]/20"
                            : "bg-[var(--bos-surface-sunken)] border-[var(--bos-border-subtle)]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                                Phase {idx + 1}
                              </span>
                              <h4 className="text-[13.5px] font-bold text-[var(--bos-text-primary)]">
                                {ms.title}
                              </h4>
                            </div>
                            <p className="text-[12px] text-[var(--bos-text-secondary)]">{ms.description}</p>
                          </div>

                          <span className={cn(
                            "text-[10.5px] font-mono uppercase px-2 py-0.5 rounded font-semibold shrink-0",
                            ms.status === "COMPLETED" ? "bg-[#3f6e35] text-white" : ms.status === "IN_PROGRESS" ? "bg-[var(--bos-accent)] text-white" : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]"
                          )}>
                            {ms.status}
                          </span>
                        </div>

                        {/* Progress Bar & Subcounts */}
                        <div className="mt-3 pt-3 border-t border-[var(--bos-border-subtle)]/70 flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)]">
                          <div className="flex items-center gap-3">
                            <span>{completedMsTasks}/{msTasks.length} Tasks</span>
                            <span>·</span>
                            <span>{msDelivs.length} Deliverables</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Commercial Trigger: {ms.paymentPercentage}%</span>
                            <span className="font-bold text-[var(--bos-text-primary)]">
                              ({project.currency} {(ms.paymentAmount || 0).toLocaleString()})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Deliverable Review Matrix */}
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                    Deliverables & Client Acceptance Status
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("deliverables")}
                    className="text-[11.5px] font-mono text-[var(--bos-accent)] hover:underline"
                  >
                    Manage Deliverables →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {deliverables.slice(0, 5).map((deliv: any) => (
                    <div
                      key={deliv.id}
                      className="p-3 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-between gap-3 text-[12.5px]"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--bos-text-primary)] truncate">{deliv.title}</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)]">
                            {deliv.category}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-[var(--bos-text-tertiary)] truncate">{deliv.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold",
                          deliv.status === "ACCEPTED"
                            ? "bg-[#eaf5e7] text-[#2c5324]"
                            : deliv.status === "CLIENT_REVIEW"
                            ? "bg-[#fff6e6] text-[#b36b00]"
                            : deliv.status === "INTERNAL_REVIEW"
                            ? "bg-[#faece7] text-[#b5452a]"
                            : "bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)]"
                        )}>
                          {deliv.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Live Activity Stream & Quick Info */}
            <div className="space-y-6">
              {/* Activity Timeline */}
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
                <div className="flex items-center gap-2 text-[14px] font-bold text-[var(--bos-text-primary)]">
                  <Clock className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span>Real Event Stream</span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {activities.map((act: any) => (
                    <div key={act.id} className="text-[12px] space-y-0.5 border-l-2 border-[var(--bos-border-subtle)] pl-3 py-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                        <span>{act.actorName || "System"}</span>
                        <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="font-semibold text-[var(--bos-text-primary)]">{act.title}</p>
                      {act.detail && <p className="text-[11.5px] text-[var(--bos-text-secondary)]">{act.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope Traceability Snapshot */}
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--bos-text-primary)]">
                  <ShieldCheck className="w-4 h-4 text-[#3f6e35]" />
                  <span>Traceability Guarantee</span>
                </div>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  This project is cryptographically linked to Proposal <strong>{proposal?.reference || "PROP"} (v{proposal?.version})</strong> and verified client requirements.
                </p>
                <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between text-[11px] font-mono">
                  <span>Client Stage:</span>
                  <strong className="text-[#3f6e35]">PROJECT (ACTIVE)</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: DELIVERABLES & REVIEW ────────────────────── */}
        {activeTab === "deliverables" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Deliverables & Client Review Matrix</h2>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Every deliverable has clear acceptance criteria and must progress through internal review and client formal acceptance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDelivModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deliverable</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliverables.map((d: any) => {
                let criteria: string[] = [];
                try {
                  if (d.acceptanceCriteria) criteria = JSON.parse(d.acceptanceCriteria);
                } catch {}

                return (
                  <div key={d.id} className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]">
                          {d.category} · {d.milestone?.title || "Phase Deliverable"}
                        </span>
                        <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{d.title}</h3>
                      </div>

                      <span className={cn(
                        "text-[10.5px] font-mono uppercase px-2 py-0.5 rounded font-semibold",
                        d.status === "ACCEPTED"
                          ? "bg-[#eaf5e7] text-[#2c5324]"
                          : d.status === "CLIENT_REVIEW"
                          ? "bg-[#fff6e6] text-[#b36b00]"
                          : d.status === "INTERNAL_REVIEW"
                          ? "bg-[#faece7] text-[#b5452a]"
                          : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]"
                      )}>
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-[12.5px] text-[var(--bos-text-secondary)]">{d.description}</p>

                    {criteria.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--bos-border-subtle)]">
                        <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">
                          Acceptance Criteria Checklist
                        </span>
                        <ul className="space-y-1 text-[11.5px] text-[var(--bos-text-secondary)]">
                          {criteria.map((c, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#3f6e35] shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {d.clientFeedback && (
                      <div className="p-3 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] space-y-1">
                        <span className="font-mono text-[10.5px] uppercase font-bold text-[var(--bos-text-secondary)]">
                          Client Feedback & Notes:
                        </span>
                        <p className="text-[var(--bos-text-primary)]">{d.clientFeedback}</p>
                      </div>
                    )}

                    {/* Action Bar based on Lifecycle Stage */}
                    <div className="pt-3 border-t border-[var(--bos-border-subtle)] flex items-center justify-between gap-2 flex-wrap">
                      {d.status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() => updateDeliverableStatus(d.id, "INTERNAL_REVIEW")}
                          className="px-3 py-1.5 rounded-sm bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[11.5px] font-medium hover:bg-[var(--bos-overlay)] cursor-pointer"
                        >
                          Submit for Internal Review →
                        </button>
                      )}

                      {d.status === "INTERNAL_REVIEW" && (
                        <button
                          type="button"
                          onClick={() => updateDeliverableStatus(d.id, "CLIENT_REVIEW")}
                          className="px-3 py-1.5 rounded-sm bg-[var(--bos-accent)] text-white text-[11.5px] font-medium hover:brightness-95 cursor-pointer"
                        >
                          Deliver to Client for Sign-off →
                        </button>
                      )}

                      {d.status === "CLIENT_REVIEW" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateDeliverableStatus(d.id, "ACCEPTED", "Accepted without modifications.")}
                            className="px-3 py-1.5 rounded-sm bg-[#3f6e35] text-white text-[11.5px] font-medium hover:brightness-95 cursor-pointer"
                          >
                            ✓ Client Accepted Sign-off
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCrDeliverableId(d.id);
                              setCrTitle(`Changes requested for ${d.title}`);
                              setCrModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-sm bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[11.5px] font-medium hover:bg-[var(--bos-overlay)] cursor-pointer"
                          >
                            Request Scope Change
                          </button>
                        </div>
                      )}

                      {d.status === "ACCEPTED" && (
                        <span className="text-[11.5px] font-mono text-[#3f6e35] flex items-center gap-1 font-semibold">
                          <Check className="w-3.5 h-3.5" /> Formal Client Sign-off Recorded
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: TASKS BOARD ──────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Work Breakdown Tasks Execution</h2>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Live execution board with estimated vs actual effort, assigned engineers, and priority tags.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Kanban Columns: TODO, IN_PROGRESS, DONE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["TODO", "IN_PROGRESS", "DONE"] as const).map((colStatus) => {
                const colTasks = tasks.filter((t: any) => t.status === colStatus);
                return (
                  <div key={colStatus} className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
                      <span className="text-[12px] font-mono font-bold uppercase text-[var(--bos-text-primary)]">
                        {colStatus === "TODO" ? "To Do" : colStatus === "IN_PROGRESS" ? "In Progress" : "Completed"}
                      </span>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {colTasks.map((t: any) => (
                        <div
                          key={t.id}
                          className="p-3.5 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2 hover:border-[var(--bos-accent)]/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">{t.title}</h4>
                            <button
                              type="button"
                              onClick={() => updateTaskStatus(t.id, t.status)}
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center shrink-0 text-[11px] cursor-pointer transition-colors",
                                t.status === "DONE"
                                  ? "bg-[#3f6e35] text-white"
                                  : "border border-[var(--bos-border-subtle)] text-transparent hover:border-[#3f6e35]",
                              )}
                            >
                              {t.status === "DONE" && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)] pt-1 border-t border-[var(--bos-border-subtle)]/60">
                            <span>{t.assigneeName || t.teamRole || "Unassigned"}</span>
                            <span>{t.estimatedHours || 8} hrs</span>
                          </div>
                        </div>
                      ))}

                      {colTasks.length === 0 && (
                        <div className="py-8 text-center text-[11.5px] font-mono text-[var(--bos-text-tertiary)]">
                          No tasks in this column
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 4: MILESTONES ───────────────────────────────── */}
        {activeTab === "milestones" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Phase Gates & Milestone Roadmaps</h2>
            <div className="space-y-4">
              {milestones.map((ms: any, idx: number) => (
                <div key={ms.id} className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10.5px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--bos-accent)]/15 text-[var(--bos-accent)] font-semibold">
                        Phase {idx + 1}
                      </span>
                      <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)] mt-1">{ms.title}</h3>
                      <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-0.5">{ms.description}</p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-[11px] font-mono font-bold uppercase block text-[#3f6e35]">
                        Trigger: {ms.paymentPercentage}% ({project.currency} {(ms.paymentAmount || 0).toLocaleString()})
                      </span>
                      <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] block">
                        Invoice Status: {ms.invoiceStatus}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--bos-border-subtle)] flex items-center justify-between">
                    <span className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                      Target Handover: {ms.targetDate ? new Date(ms.targetDate).toLocaleDateString() : "Schedule locked"}
                    </span>
                    {ms.invoiceStatus === "UNINVOICED" && (
                      <button
                        type="button"
                        onClick={() => triggerMilestoneInvoice(ms.id)}
                        className="px-3 py-1.5 rounded-sm bg-[#3f6e35] text-white text-[11.5px] font-medium hover:brightness-95 cursor-pointer"
                      >
                        Generate Milestone Invoice ({ms.paymentPercentage}%)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: TEAM & ALLOCATION ────────────────────────── */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Assigned Project Team & Allocation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {team.map((member: any) => (
                <div key={member.id} className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--bos-accent)]/15 text-[var(--bos-accent)] font-bold flex items-center justify-center text-[14px]">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{member.name}</h3>
                    <p className="text-[12px] text-[var(--bos-text-secondary)]">{member.role}</p>
                    <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">{member.email || "staff@delivery.os"}</p>
                  </div>
                  <div className="pt-2 border-t border-[var(--bos-border-subtle)] text-[11px] font-mono flex justify-between text-[var(--bos-text-secondary)]">
                    <span>Allocation:</span>
                    <strong className="text-[var(--bos-text-primary)]">{member.allocation || 100}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 6: CHANGE REQUESTS ──────────────────────────── */}
        {activeTab === "change-requests" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Formal Scope Change Requests</h2>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Track modifications requested against verified scope with formal cost and timeline impact assessment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCrModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Change Request</span>
              </button>
            </div>

            <div className="space-y-3">
              {changeRequests.map((cr: any) => (
                <div key={cr.id} className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14.5px] font-bold text-[var(--bos-text-primary)]">{cr.title}</h3>
                      <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-1">{cr.description}</p>
                    </div>
                    <span className={cn(
                      "text-[10.5px] font-mono uppercase px-2 py-0.5 rounded font-semibold",
                      cr.status === "APPROVED" ? "bg-[#eaf5e7] text-[#2c5324]" : "bg-[#fff6e6] text-[#b36b00]"
                    )}>
                      {cr.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--bos-border-subtle)] text-[11.5px] font-mono">
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">Timeline Impact:</span>
                      <strong className="text-[var(--bos-text-primary)]">+{cr.impactTimelineDays} Days</strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">Commercial Impact:</span>
                      <strong className="text-[var(--bos-text-primary)]">+{project.currency} {(cr.impactBudgetAmount || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">Requested By:</span>
                      <strong className="text-[var(--bos-text-primary)]">{cr.submittedByName || "Client"}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">Date:</span>
                      <strong className="text-[var(--bos-text-primary)]">{new Date(cr.submittedAt).toLocaleDateString()}</strong>
                    </div>
                  </div>
                </div>
              ))}

              {changeRequests.length === 0 && (
                <div className="p-8 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center text-[13px] text-[var(--bos-text-secondary)]">
                  Zero active scope change requests. Delivery scope is fully baseline-locked.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 7: COMMERCIALS & INVOICING ──────────────────── */}
        {activeTab === "commercials" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Commercials & Milestone Invoicing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Total Contract Value</span>
                <p className="text-[20px] font-bold text-[var(--bos-text-primary)] font-mono">
                  {project.currency} {(project.budget || 0).toLocaleString()}
                </p>
                <p className="text-[11.5px] text-[var(--bos-text-secondary)]">Approved Proposal Agreement</p>
              </div>

              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Invoiced Milestones</span>
                <p className="text-[20px] font-bold text-[#3f6e35] font-mono">
                  {project.currency}{" "}
                  {milestones
                    .filter((m: any) => m.invoiceStatus === "INVOICED" || m.invoiceStatus === "PAID")
                    .reduce((sum: number, m: any) => sum + (m.paymentAmount || 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-[11.5px] text-[var(--bos-text-secondary)]">Delivered Phase Gates</p>
              </div>

              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Remaining Handover Value</span>
                <p className="text-[20px] font-bold text-[var(--bos-accent)] font-mono">
                  {project.currency}{" "}
                  {milestones
                    .filter((m: any) => m.invoiceStatus === "UNINVOICED")
                    .reduce((sum: number, m: any) => sum + (m.paymentAmount || 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-[11.5px] text-[var(--bos-text-secondary)]">Payable upon acceptance</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 8: TRACEABILITY & AUDIT ─────────────────────── */}
        {activeTab === "traceability" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Cryptographic Lineage & Master Traceability</h2>
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="space-y-3 font-mono text-[12px]">
                <div className="flex items-center gap-3 p-3 rounded bg-[var(--bos-surface-sunken)]">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
                  <span className="text-[var(--bos-text-secondary)]">Client Record:</span>
                  <strong className="text-[var(--bos-text-primary)]">{client.companyName} ({client.id})</strong>
                </div>

                <div className="flex items-center gap-3 p-3 rounded bg-[var(--bos-surface-sunken)]">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
                  <span className="text-[var(--bos-text-secondary)]">Proposal Record:</span>
                  <strong className="text-[var(--bos-text-primary)]">
                    {proposal?.reference || "PROP"} (v{proposal?.version}) — Status: {proposal?.status}
                  </strong>
                </div>

                <div className="flex items-center gap-3 p-3 rounded bg-[var(--bos-surface-sunken)]">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
                  <span className="text-[var(--bos-text-secondary)]">Active Delivery Project:</span>
                  <strong className="text-[var(--bos-text-primary)]">{project.name} ({project.code})</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE TASK MODAL ─────────────────────────────────── */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Add Delivery Task</h3>
              <button type="button" onClick={() => setTaskModalOpen(false)} className="text-[var(--bos-text-tertiary)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement webhook authentication handlers"
                  className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Team Role</label>
                  <input
                    type="text"
                    value={newTaskRole}
                    onChange={(e) => setNewTaskRole(e.target.value)}
                    className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(Number(e.target.value))}
                    className="w-full h-9 px-3 text-[13px] font-mono bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Milestone Phase</label>
                <select
                  value={newTaskMilestoneId}
                  onChange={(e) => setNewTaskMilestoneId(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                >
                  <option value="">Select Milestone</option>
                  {milestones.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--bos-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-4 py-2 text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:brightness-95 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE DELIVERABLE MODAL ──────────────────────────── */}
      {delivModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Add Deliverable Artifact</h3>
              <button type="button" onClick={() => setDelivModalOpen(false)} className="text-[var(--bos-text-tertiary)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Deliverable Title</label>
                <input
                  type="text"
                  required
                  value={newDelivTitle}
                  onChange={(e) => setNewDelivTitle(e.target.value)}
                  placeholder="e.g. Real-time Lead Notification Engine"
                  className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Category</label>
                <select
                  value={newDelivCategory}
                  onChange={(e) => setNewDelivCategory(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                >
                  <option value="ENGINEERING">Engineering</option>
                  <option value="ARCHITECTURE">Architecture</option>
                  <option value="DESIGN">UI/UX Design</option>
                  <option value="QA">Quality Assurance</option>
                  <option value="DOCUMENTATION">Documentation</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Acceptance Criteria (1 per line)</label>
                <textarea
                  rows={3}
                  value={newDelivCriteria}
                  onChange={(e) => setNewDelivCriteria(e.target.value)}
                  placeholder="Verified operation with zero errors&#10;Passed cross-browser tests"
                  className="w-full p-2.5 text-[12px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--bos-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setDelivModalOpen(false)}
                  className="px-4 py-2 text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-sm bg-[#3f6e35] text-white text-[12px] font-medium hover:brightness-95 cursor-pointer"
                >
                  Save Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE CHANGE REQUEST MODAL ───────────────────────── */}
      {crModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Formal Scope Change Request</h3>
              <button type="button" onClick={() => setCrModalOpen(false)} className="text-[var(--bos-text-tertiary)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChangeRequest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Change Request Title</label>
                <input
                  type="text"
                  required
                  value={crTitle}
                  onChange={(e) => setCrTitle(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={crDesc}
                  onChange={(e) => setCrDesc(e.target.value)}
                  className="w-full p-2.5 text-[12px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Timeline Impact (Days)</label>
                  <input
                    type="number"
                    value={crDays}
                    onChange={(e) => setCrDays(Number(e.target.value))}
                    className="w-full h-9 px-3 text-[13px] font-mono bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">Budget Impact ({project.currency})</label>
                  <input
                    type="number"
                    value={crAmount}
                    onChange={(e) => setCrAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 text-[13px] font-mono bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--bos-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setCrModalOpen(false)}
                  className="px-4 py-2 text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:brightness-95 cursor-pointer"
                >
                  Submit Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
