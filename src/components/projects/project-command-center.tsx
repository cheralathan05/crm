"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileCheck2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  GitBranch,
  GitCommit,
  GitPullRequest,
  HelpCircle,
  History,
  Layers,
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
  Rocket,
  Search,
  Send,
  Share2,
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
  Code2,
  Server,
  Database,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextBestAction } from "@/lib/projects";
import { EngineeringHub } from "./engineering/engineering-hub";
import { ProjectOverviewBlueprint } from "./engineering/project-overview-blueprint";
import { FrontendArchitectureView } from "./engineering/frontend-architecture-view";
import { BackendArchitectureView } from "./engineering/backend-architecture-view";
import { DatabaseArchitectureView } from "./engineering/database-architecture-view";
import { ApiArchitectureView } from "./engineering/api-architecture-view";
import { IntegrationsArchitectureView } from "./engineering/integrations-architecture-view";
import { AuthSecurityView } from "./engineering/auth-security-view";
import { TestingArchitectureView } from "./engineering/testing-architecture-view";
import { DeploymentArchitectureView } from "./engineering/deployment-architecture-view";

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

type ActiveWorkspaceView =
  | "overview"
  | "engineering"
  | "frontend"
  | "backend"
  | "database"
  | "apis"
  | "integrations"
  | "auth"
  | "testing"
  | "deployment"
  | "tasks"
  | "deliverables"
  | "timeline"
  | "story"
  | "scope"
  | "team"
  | "changes"
  | "commercials"
  | "vault"
  | "activity";

export function ProjectCommandCenter({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [blueprint, setBlueprint] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<ActiveWorkspaceView>("overview");
  const [isPending, startTransition] = useTransition();

  // Drawers & Context Modals
  const [activeDrawer, setActiveDrawer] = useState<
    | null
    | "task"
    | "deliverable"
    | "milestone"
    | "client"
    | "proposal"
    | "requirement"
    | "team"
    | "client-request"
    | "change-request"
    | "copilot"
    | "closure"
    | "summary-pdf"
  >(null);

  // Selected entities for right drawer
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState<any | null>(null);
  const [selectedScopeItem, setSelectedScopeItem] = useState<any | null>(null);
  const [teamWorkstreamFilter, setTeamWorkstreamFilter] = useState<string>("ALL");
  const [assigningTask, setAssigningTask] = useState<any | null>(null);
  const [selectedEmployeeToAssign, setSelectedEmployeeToAssign] = useState<string>("");

  // Creation forms
  const [taskLayerFilter, setTaskLayerFilter] = useState<string>("ALL");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("Lead Engineer");
  const [newTaskHours, setNewTaskHours] = useState(8);
  const [newTaskPriority, setNewTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState("");
  const [newTaskDeliverableId, setNewTaskDeliverableId] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const [newDelivTitle, setNewDelivTitle] = useState("");
  const [newDelivDesc, setNewDelivDesc] = useState("");
  const [newDelivCategory, setNewDelivCategory] = useState("ENGINEERING");
  const [newDelivMilestoneId, setNewDelivMilestoneId] = useState("");
  const [newDelivCriteria, setNewDelivCriteria] = useState("");

  const [crTitle, setCrTitle] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crReason, setCrReason] = useState("");
  const [crDays, setCrDays] = useState(3);
  const [crAmount, setCrAmount] = useState(25000);
  const [crDeliverableId, setCrDeliverableId] = useState("");

  const [clientReqTitle, setClientReqTitle] = useState("");
  const [clientReqReason, setClientReqReason] = useState("");
  const [clientReqNeededFor, setClientReqNeededFor] = useState("");
  const [clientReqIsBlocker, setClientReqIsBlocker] = useState(true);

  // Team member form
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Lead Engineer");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberAllocation, setNewMemberAllocation] = useState(100);

  // Deliverable review form
  const [reviewFeedback, setReviewFeedback] = useState("");

  // AI Copilot state
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotSource, setCopilotSource] = useState<string | null>(null);
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string; action?: string; source?: string }>
  >([
    {
      role: "assistant",
      text: "I am your Project Delivery Copilot. I analyze real database records across approved requirements, proposal scope, deliverables, task blockers, and team velocity.",
    },
  ]);

  const refreshProject = async () => {
    try {
      const [resPrj, resBp] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/blueprint`),
      ]);
      const json = await resPrj.json();
      const jsonBp = await resBp.json();
      if (!resPrj.ok || !json.ok) throw new Error(json.message || "Failed to load project.");
      setData(json);
      if (jsonBp.ok && jsonBp.blueprint) {
        setBlueprint(jsonBp.blueprint);
      }
      // Keep selected items updated
      if (selectedTask) {
        const updatedT = json.project.tasks?.find((t: any) => t.id === selectedTask.id);
        if (updatedT) setSelectedTask(updatedT);
      }
      if (selectedDeliverable) {
        const updatedD = json.project.deliverables?.find((d: any) => d.id === selectedDeliverable.id);
        if (updatedD) setSelectedDeliverable(updatedD);
      }
    } catch (e: any) {
      setError(e.message || "Error loading project state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProject();
  }, [projectId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUpdateTaskStatus = async (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, status: newStatus }),
        });
        if (res.ok) {
          setNotice(`Task updated to ${newStatus.replace("_", " ")}`);
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleAssignTaskToMember = async (taskId: string, assigneeName: string, assigneeId?: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, assigneeName, assigneeId: assigneeId || null }),
        });
        if (res.ok) {
          setNotice(`Task successfully assigned to ${assigneeName}.`);
          setTimeout(() => setNotice(null), 3000);
          setAssigningTask(null);
          setSelectedEmployeeToAssign("");
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTaskTitle.trim(),
            teamRole: newTaskRole,
            estimatedHours: newTaskHours,
            priority: newTaskPriority,
            milestoneId: newTaskMilestoneId || undefined,
            deliverableId: newTaskDeliverableId || undefined,
            assigneeName: newTaskAssignee || undefined,
          }),
        });
        if (res.ok) {
          setNewTaskTitle("");
          setActiveDrawer(null);
          setNotice("New task registered in delivery plan.");
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDelivTitle.trim()) return;
    const criteriaArr = newDelivCriteria
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/deliverables`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newDelivTitle.trim(),
            description: newDelivDesc.trim() || undefined,
            category: newDelivCategory,
            milestoneId: newDelivMilestoneId || undefined,
            acceptanceCriteria: criteriaArr,
          }),
        });
        if (res.ok) {
          setNewDelivTitle("");
          setNewDelivDesc("");
          setNewDelivCriteria("");
          setActiveDrawer(null);
          setNotice("Deliverable registered with acceptance criteria.");
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleDeliverableStatus = async (
    deliverableId: string,
    status: "DRAFT" | "INTERNAL_REVIEW" | "DELIVERED_TO_CLIENT" | "CLIENT_REVIEW" | "ACCEPTED" | "CHANGES_REQUESTED",
  ) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/deliverables`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliverableId,
            status,
            clientFeedback: reviewFeedback || undefined,
            clientSignoffBy: status === "ACCEPTED" ? data?.project.client?.companyName || "Client" : undefined,
          }),
        });
        if (res.ok) {
          setNotice(`Deliverable moved to ${status.replace(/_/g, " ")}`);
          setTimeout(() => setNotice(null), 3000);
          setActiveDrawer(null);
          setReviewFeedback("");
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleCreateChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/change-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: crTitle.trim(),
            description: crDesc.trim() || undefined,
            reason: crReason.trim() || undefined,
            timelineDaysImpact: Number(crDays),
            budgetImpact: Number(crAmount),
            deliverableId: crDeliverableId || undefined,
          }),
        });
        if (res.ok) {
          setCrTitle("");
          setCrDesc("");
          setCrReason("");
          setActiveDrawer(null);
          setNotice("Formal scope change request submitted for impact review.");
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleDecideChangeRequest = async (changeRequestId: string, status: "APPROVED" | "REJECTED", adminResponse?: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/change-requests`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changeRequestId,
            status,
            adminResponse: adminResponse || `Decision: ${status}`,
          }),
        });
        if (res.ok) {
          setNotice(`Change request marked ${status}.`);
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleCreateClientRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientReqTitle.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/client-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: clientReqTitle.trim(),
            reason: clientReqReason.trim() || undefined,
            neededFor: clientReqNeededFor.trim() || undefined,
            isBlocker: clientReqIsBlocker,
          }),
        });
        if (res.ok) {
          setClientReqTitle("");
          setClientReqReason("");
          setClientReqNeededFor("");
          setActiveDrawer(null);
          setNotice("Client request dispatched. Status set to WAITING FOR CLIENT.");
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/team`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newMemberName.trim(),
            role: newMemberRole.trim(),
            email: newMemberEmail.trim() || undefined,
            allocation: Number(newMemberAllocation),
          }),
        });
        if (res.ok) {
          setNewMemberName("");
          setNewMemberEmail("");
          setActiveDrawer(null);
          setNotice("Team specialist allocated to project.");
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/team?memberId=${memberId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setNotice("Staff member removed from project team.");
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleMilestoneInvoiceStatus = async (milestoneId: string, invoiceStatus: "UNINVOICED" | "INVOICED" | "PAID") => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/milestones`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            milestoneId,
            invoiceStatus,
          }),
        });
        if (res.ok) {
          setNotice(`Milestone invoice updated to ${invoiceStatus}.`);
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleProjectStage = async (newStage: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });
        if (res.ok) {
          setNotice(`Project stage transitioned to ${newStage}.`);
          setTimeout(() => setNotice(null), 3000);
          await refreshProject();
        }
      } catch {
        /* ignore */
      }
    });
  };

  const handleCopilotAsk = async (questionText?: string) => {
    const q = (questionText || copilotQuery).trim();
    if (!q || !data || copilotLoading) return;

    const userMsg = { role: "user" as const, text: q };
    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotQuery("");
    setCopilotLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (json.ok && json.answer) {
        setCopilotMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: json.answer,
            action: json.nextRecommendedAction || undefined,
            source: json.source,
          },
        ]);
        setCopilotSource(json.source || "OLLAMA");
      } else {
        setCopilotMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: json.message || "Failed to analyze project database state.",
          },
        ]);
      }
    } catch {
      setCopilotMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Network error connecting to project intelligence service.",
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // ── Skeletons / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <div className="h-12 bg-[var(--bos-surface-panel)] rounded-sm animate-pulse border border-[var(--bos-border-subtle)]" />
        <div className="h-20 bg-[var(--bos-surface-panel)] rounded-sm animate-pulse border border-[var(--bos-border-subtle)]" />
        <div className="grid grid-cols-3 gap-6">
          <div className="h-64 bg-[var(--bos-surface-panel)] rounded-sm animate-pulse border border-[var(--bos-border-subtle)] col-span-2" />
          <div className="h-64 bg-[var(--bos-surface-panel)] rounded-sm animate-pulse border border-[var(--bos-border-subtle)]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-[#b5452a] mx-auto opacity-80" />
        <h2 className="text-[20px] font-serif font-bold text-[var(--bos-text-primary)]">
          Unable to Load Project Command Center
        </h2>
        <p className="text-[13px] text-[var(--bos-text-secondary)]">{error || "Project record not found."}</p>
        <button
          onClick={refreshProject}
          className="px-4 py-2 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12.5px] rounded font-medium hover:bg-[var(--bos-surface-sunken)] transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { project, metrics } = data;
  const { currentMilestone, nextBestAction } = metrics;
  const tasks = project.tasks || [];
  const deliverables = project.deliverables || [];
  const milestones = project.milestones || [];
  const team = project.team || [];
  const changeRequests = project.changeRequests || [];
  const activities = project.activities || [];

  // Active work happening right now
  const inProgressTasks = tasks.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "TODO");
  const blockedTasks = tasks.filter((t: any) => t.status === "BLOCKED" || t.priority === "URGENT");
  const pendingReviewDelivs = deliverables.filter(
    (d: any) => d.status === "INTERNAL_REVIEW" || d.status === "CLIENT_REVIEW" || d.status === "DELIVERED_TO_CLIENT",
  );

  // Closure readiness checks
  const allTasksDone = tasks.length > 0 && tasks.every((t: any) => t.status === "DONE");
  const allDelivsAccepted = deliverables.length > 0 && deliverables.every((d: any) => d.status === "ACCEPTED");
  const noPendingCRs = changeRequests.every((cr: any) => cr.status === "APPROVED" || cr.status === "REJECTED");
  const isClosureReady = allDelivsAccepted && noPendingCRs;

  return (
    <div className="min-h-screen bg-[var(--bos-surface-canvas)] pb-24">
      {/* ── NOTICE BANNER ────────────────────────────────────────── */}
      {notice && (
        <div className="bg-[#2d5016] text-white text-[12px] font-mono py-2 px-6 text-center flex items-center justify-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}

      {/* ── 04: PROJECT COMMAND HEADER ───────────────────────────── */}
      <header className="border-b border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)]">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left Title & Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 text-[12px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors pr-2 border-r border-[var(--bos-border-subtle)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Projects</span>
              </Link>

              <span className="font-mono text-[12px] font-bold tracking-tight text-[var(--bos-accent)] bg-[var(--bos-surface-sunken)] px-2.5 py-0.5 rounded border border-[var(--bos-border-subtle)]">
                {project.code || "PRJ-2026"}
              </span>

              <div className="flex items-baseline gap-2">
                <h1 className="text-[20px] font-serif font-bold text-[var(--bos-text-primary)]">
                  {project.name}
                </h1>
                <span className="text-[13px] text-[var(--bos-text-secondary)] font-medium">
                  · {project.client?.companyName}
                </span>
              </div>

              {/* Stage & Health Badges */}
              <div className="flex items-center gap-2 ml-2">
                <span className="font-mono text-[10.5px] uppercase font-semibold px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                  {project.stage}
                </span>

                <span
                  className={cn(
                    "font-mono text-[10.5px] uppercase font-semibold px-2.5 py-0.5 rounded flex items-center gap-1.5",
                    project.health === "ON_TRACK"
                      ? "bg-[#eaf5e7] text-[#2c5324] border border-[#d2eacb]"
                      : "bg-[#fbece7] text-[#b5452a] border border-[#f5d3c8]",
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {project.health.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* 05: Header Action System */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveDrawer("copilot")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12px] font-medium text-[var(--bos-text-primary)] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span>Copilot</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawer("task")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12px] font-medium text-[var(--bos-text-primary)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Task</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawer("deliverable")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12px] font-medium text-[var(--bos-text-primary)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deliverable</span>
              </button>

              {project.stage !== "COMPLETED" ? (
                <button
                  type="button"
                  onClick={() => setActiveDrawer("closure")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm text-[12px] font-medium transition-all shadow-xs cursor-pointer",
                    isClosureReady
                      ? "bg-[#2d5016] text-white hover:brightness-110"
                      : "bg-[var(--bos-accent)] text-white hover:brightness-95",
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isClosureReady ? "Review & Complete" : "Project Controls"}</span>
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[#eaf5e7] text-[#2c5324] text-[12px] font-mono font-semibold">
                  <Check className="w-3.5 h-3.5" /> DELIVERED
                </span>
              )}
            </div>
          </div>

          {/* Connected Metadata Line (Clickable Tokens) */}
          <div className="flex items-center gap-4 text-[11.5px] font-mono text-[var(--bos-text-secondary)] flex-wrap pt-1 border-t border-[var(--bos-border-subtle)]/60">
            <button
              onClick={() => setActiveDrawer("client")}
              className="hover:text-[var(--bos-text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Client:</span>
              <strong className="text-[var(--bos-text-primary)]">{project.client?.companyName}</strong>
              <ArrowRight className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
            </button>

            <span>·</span>

            {project.proposal && (
              <>
                <button
                  onClick={() => setActiveDrawer("proposal")}
                  className="hover:text-[var(--bos-text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Proposal:</span>
                  <strong className="text-[var(--bos-text-primary)]">
                    {project.proposal.reference || "PROP"} (v{project.proposalVersion || 1})
                  </strong>
                  <ArrowRight className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                </button>
                <span>·</span>
              </>
            )}

            <button
              onClick={() => setActiveDrawer("requirement")}
              className="hover:text-[var(--bos-text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Requirement:</span>
              <strong className="text-[var(--bos-text-primary)]">
                {project.requirementRequestId ? "REQ-LOCKED" : "REQ-APPROVED"}
              </strong>
              <ArrowRight className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
            </button>

            <span>·</span>

            <div className="flex items-center gap-1">
              <span>Manager:</span>
              <strong className="text-[var(--bos-text-primary)]">{project.managerName || "Unassigned"}</strong>
            </div>

            <span>·</span>

            <div className="flex items-center gap-1">
              <span>Handover:</span>
              <strong className="text-[var(--bos-text-primary)]">
                {project.deadline ? new Date(project.deadline).toLocaleDateString() : "8 Weeks"}
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* ── 06: DELIVERY INTELLIGENCE STRIP ──────────────────────── */}
      <section className="bg-[var(--bos-surface-panel)] border-b border-[var(--bos-border-subtle)]">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 divide-y md:divide-y-0 md:divide-x divide-[var(--bos-border-subtle)]">
            {/* 1. Delivery Progress */}
            <button
              onClick={() => setView("tasks")}
              className="text-left px-2 py-1 space-y-1 hover:bg-[var(--bos-surface-sunken)]/50 rounded transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                <span>Delivery</span>
                <span className="font-bold text-[var(--bos-accent)]">{metrics.progress}%</span>
              </div>
              <div className="w-full bg-[var(--bos-surface-sunken)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--bos-accent)] h-full transition-all duration-300"
                  style={{ width: `${metrics.progress}%` }}
                />
              </div>
              <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block">
                {metrics.completedTasks}/{metrics.totalTasks} required tasks
              </span>
            </button>

            {/* 2. Current Phase */}
            <button
              onClick={() => setView("story")}
              className="text-left px-3 py-1 space-y-1 hover:bg-[var(--bos-surface-sunken)]/50 rounded transition-colors cursor-pointer group"
            >
              <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">
                Current Phase
              </span>
              <p className="text-[13px] font-bold text-[var(--bos-text-primary)] truncate">
                {currentMilestone?.title || project.stage}
              </p>
              <span className="text-[10.5px] font-mono text-[var(--bos-accent)] block">
                Phase Gate Active
              </span>
            </button>

            {/* 3. Handover */}
            <div className="px-3 py-1 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Handover</span>
              <p className="text-[13px] font-bold text-[var(--bos-text-primary)] font-mono">
                {project.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "8 Weeks"}
              </p>
              <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block">
                Target Deadline
              </span>
            </div>

            {/* 4. Client Pulse */}
            <button
              onClick={() => setView("deliverables")}
              className="text-left px-3 py-1 space-y-1 hover:bg-[var(--bos-surface-sunken)]/50 rounded transition-colors cursor-pointer group"
            >
              <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">
                Client Pulse
              </span>
              <p className="text-[13px] font-bold text-[#2d5016] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {pendingReviewDelivs.length > 0 ? "Review Pending" : "In Sync"}
              </p>
              <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block">
                {metrics.acceptedDeliverables}/{metrics.totalDeliverables} Accepted
              </span>
            </button>

            {/* 5. Team */}
            <button
              onClick={() => setView("team")}
              className="text-left px-3 py-1 space-y-1 hover:bg-[var(--bos-surface-sunken)]/50 rounded transition-colors cursor-pointer group"
            >
              <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Team</span>
              <p className="text-[13px] font-bold text-[var(--bos-text-primary)] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[var(--bos-text-secondary)]" />
                {team.length || 1} Specialists
              </p>
              <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block">
                Allocated to project
              </span>
            </button>

            {/* 6. Commercial Value */}
            <button
              onClick={() => setView("commercials")}
              className="text-left px-3 py-1 space-y-1 hover:bg-[var(--bos-surface-sunken)]/50 rounded transition-colors cursor-pointer group"
            >
              <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">
                Commercial
              </span>
              <p className="text-[13px] font-bold text-[var(--bos-text-primary)] font-mono">
                {project.currency} {(project.budget || 0).toLocaleString()}
              </p>
              <span className="text-[10.5px] font-mono text-[#2d5016] block">
                Approved Contract
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── WORKSPACE NAVIGATION TABS ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex items-center gap-1 border-b border-[var(--bos-border-subtle)] pb-2 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: Rocket },
            { id: "engineering", label: "Engineering Hub", icon: Layers },
            { id: "frontend", label: `Frontend (${blueprint?.frontendCapabilities?.length || 0})`, icon: Globe },
            { id: "backend", label: `Backend (${blueprint?.backendServices?.length || 0})`, icon: Server },
            { id: "database", label: `Database (${blueprint?.databaseEntities?.length || 0})`, icon: Database },
            { id: "apis", label: `APIs (${blueprint?.backendApis?.length || 0})`, icon: Code2 },
            { id: "integrations", label: `Integrations (${blueprint?.integrations?.length || 0})`, icon: GitBranch },
            { id: "testing", label: `Testing (${blueprint?.testSpecifications?.length || 0})`, icon: ShieldCheck },
            { id: "tasks", label: `Tasks (${tasks.length})`, icon: ListTodo },
            { id: "deliverables", label: `Deliverables (${deliverables.length})`, icon: FileCheck2 },
            { id: "timeline", label: "Timeline", icon: MilestoneIcon },
            { id: "scope", label: "Scope", icon: ShieldCheck },
            { id: "team", label: `Team (${team.length})`, icon: Users },
            { id: "changes", label: `Changes (${changeRequests.length})`, icon: GitPullRequest },
            { id: "commercials", label: "Commercials", icon: Coins },
            { id: "vault", label: "Vault", icon: FileText },
            { id: "activity", label: `Activity (${activities.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id as ActiveWorkspaceView)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 text-[12px] font-mono uppercase tracking-wide rounded-sm transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-[var(--bos-surface-panel)] text-[var(--bos-text-primary)] font-bold shadow-xs border border-[var(--bos-border-subtle)] border-b-2 border-b-[var(--bos-accent)]"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-panel)]/50",
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[var(--bos-accent)]" : "opacity-70")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTENT ───────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ── 09: DYNAMIC NEXT BEST ACTION (Prominent Command Strip) ── */}
        <section className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-[var(--bos-accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
                  WHAT NEEDS TO HAPPEN NOW
                </span>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                  · State Engine Recommendation
                </span>
              </div>
              <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)] mt-0.5">
                {nextBestAction.title}
              </h3>
              <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-0.5 max-w-2xl">
                {nextBestAction.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {nextBestAction.type === "ASSIGN_TEAM" && (
              <button
                type="button"
                onClick={() => setView("team")}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer"
              >
                {nextBestAction.actionLabel}
              </button>
            )}

            {nextBestAction.type === "INTERNAL_REVIEW" && (
              <button
                type="button"
                onClick={() => {
                  setView("deliverables");
                  if (nextBestAction.actionPayload?.deliverableId) {
                    const d = deliverables.find((item: any) => item.id === nextBestAction.actionPayload?.deliverableId);
                    if (d) {
                      setSelectedDeliverable(d);
                      setActiveDrawer("deliverable");
                    }
                  }
                }}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer"
              >
                {nextBestAction.actionLabel}
              </button>
            )}

            {nextBestAction.type === "REVIEW_CHANGE_REQUEST" && (
              <button
                type="button"
                onClick={() => setView("changes")}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer"
              >
                {nextBestAction.actionLabel}
              </button>
            )}

            {nextBestAction.type === "COMPLETE_PROJECT" && (
              <button
                type="button"
                onClick={() => setActiveDrawer("closure")}
                className="px-4 py-2 bg-[#2d5016] text-white text-[12px] font-medium rounded-sm hover:brightness-110 transition-all shadow-xs cursor-pointer"
              >
                {nextBestAction.actionLabel}
              </button>
            )}

            {nextBestAction.type === "START_MILESTONE" && (
              <button
                type="button"
                onClick={() => setView("tasks")}
                className="px-4 py-2 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-panel)] transition-all cursor-pointer"
              >
                View Active Sprint Tasks →
              </button>
            )}
          </div>
        </section>

        {/* ── 12: BLOCKERS BANNER (Only when real blockers exist) ─── */}
        {blockedTasks.length > 0 ? (
          <section className="p-4 rounded-lg bg-[#fbece7] border border-[#f5d3c8] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#b5452a]" />
                <span className="font-mono text-[11px] font-bold uppercase text-[#b5452a]">
                  BLOCKED ITEMS REQUIRING INTERVENTION ({blockedTasks.length})
                </span>
              </div>
              <button
                onClick={() => setActiveDrawer("client-request")}
                className="px-3 py-1 bg-[#b5452a] text-white text-[11px] font-mono rounded hover:brightness-110 cursor-pointer"
              >
                Ask Client / Request Info →
              </button>
            </div>
            <div className="space-y-1.5">
              {blockedTasks.map((bt: any) => (
                <div key={bt.id} className="text-[12.5px] text-[var(--bos-text-primary)] flex items-center justify-between">
                  <span>
                    ● <strong>{bt.title}</strong> — {bt.description || "Waiting for credentials or dependencies"}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                    Owner: {bt.assigneeName || "Unassigned"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="px-4 py-2 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] flex items-center justify-between text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
            <span className="flex items-center gap-1.5 text-[#2d5016]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Delivery Blockers · Sprints executing on schedule</span>
            </span>
            <button
              onClick={() => setActiveDrawer("client-request")}
              className="hover:text-[var(--bos-text-primary)] hover:underline cursor-pointer"
            >
              + Create Client Request
            </button>
          </div>
        )}

        {/* ── VIEW: EXECUTIVE OVERVIEW (WHAT ARE WE BUILDING?) ───── */}
        {view === "overview" && (
          <ProjectOverviewBlueprint
            project={project}
            blueprint={blueprint}
            metrics={metrics}
            onNavigateTab={(tabName) => setView(tabName as ActiveWorkspaceView)}
            onOpenRequirementDrawer={() => setActiveDrawer("requirement")}
            onSelectFeature={(feat) => {
              setSelectedScopeItem(feat);
              setActiveDrawer("requirement");
            }}
          />
        )}

        {/* ── VIEW: FRONTEND ARCHITECTURE ─────────────────────────── */}
        {view === "frontend" && (
          <FrontendArchitectureView
            blueprint={blueprint}
            tasks={tasks}
            onSelectCapability={(cap) => {
              // Open drawer or view
            }}
            onOpenTraceability={(node) => {
              // Drawer traceability
            }}
          />
        )}

        {/* ── VIEW: BACKEND ARCHITECTURE ──────────────────────────── */}
        {view === "backend" && (
          <BackendArchitectureView
            blueprint={blueprint}
            tasks={tasks}
            onSelectService={(srv) => {
              // Open drawer or view
            }}
            onOpenTraceability={(node) => {
              // Drawer traceability
            }}
          />
        )}

        {/* ── VIEW: DATABASE ARCHITECTURE ─────────────────────────── */}
        {view === "database" && (
          <DatabaseArchitectureView
            entities={blueprint?.databaseEntities || []}
            backendApis={blueprint?.backendApis || []}
            onSelectEntity={(entity) => {
              // Select entity
            }}
          />
        )}

        {/* ── VIEW: APIS & CONNECTION MAP ─────────────────────────── */}
        {view === "apis" && (
          <ApiArchitectureView
            blueprint={blueprint}
            tasks={tasks}
            onSelectApi={(api) => {
              // Select API
            }}
          />
        )}

        {/* ── VIEW: INTEGRATIONS ──────────────────────────────────── */}
        {view === "integrations" && (
          <IntegrationsArchitectureView
            blueprint={blueprint}
            project={project}
          />
        )}

        {/* ── VIEW: AUTH & SECURITY ───────────────────────────────── */}
        {view === "auth" && (
          <AuthSecurityView
            blueprint={blueprint}
            project={project}
          />
        )}

        {/* ── VIEW: TESTING & VERIFICATION ────────────────────────── */}
        {view === "testing" && (
          <TestingArchitectureView
            blueprint={blueprint}
            tasks={tasks}
            onSelectTest={(test) => {
              // Select test
            }}
          />
        )}

        {/* ── VIEW: DEPLOYMENT & INFRASTRUCTURE ───────────────────── */}
        {view === "deployment" && (
          <DeploymentArchitectureView
            project={project}
            blueprint={blueprint}
          />
        )}

        {/* ── VIEW: ENGINEERING CONTROL SYSTEM ───────────────────── */}
        {view === "engineering" && (
          <EngineeringHub
            projectId={projectId}
            projectName={project.name}
            onWorkCommitted={async () => {
              await refreshProject();
            }}
          />
        )}

        {/* ── VIEW: STORY & EXECUTION (TIMELINE) ───────────────────── */}
        {(view === "story" || view === "timeline") && (
          <div className="space-y-6">
            {/* 07: Project Journey Roadmap */}
            <section className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase text-[var(--bos-text-tertiary)]">
                    PROJECT JOURNEY
                  </span>
                  <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                    Where We Are in Delivery
                  </h3>
                </div>
                <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                  Phase Gate 2 of 4 Active
                </span>
              </div>

              {/* Visual Journey Line */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 pt-2">
                {[
                  { key: "APPROVED", label: "Approved", status: "SETTLED" },
                  { key: "PLANNING", label: "Planning", status: "SETTLED" },
                  { key: "DESIGN", label: "Design", status: "SETTLED" },
                  { key: "DEVELOPMENT", label: "Development", status: "ACTIVE" },
                  { key: "TESTING", label: "Testing", status: "UPCOMING" },
                  { key: "CLIENT_REVIEW", label: "Client Review", status: "UPCOMING" },
                  { key: "DELIVERY", label: "Delivery", status: "UPCOMING" },
                ].map((ph, idx) => (
                  <div
                    key={ph.key}
                    className={cn(
                      "p-3 rounded border text-center space-y-1 transition-all",
                      ph.status === "SETTLED"
                        ? "bg-[#eaf5e7] border-[#d2eacb] text-[#2c5324]"
                        : ph.status === "ACTIVE"
                          ? "bg-[var(--bos-surface-canvas)] border-[var(--bos-accent)] ring-1 ring-[var(--bos-accent)] shadow-xs"
                          : "bg-[var(--bos-surface-sunken)] border-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)] opacity-60",
                    )}
                  >
                    <span className="font-mono text-[10px] uppercase font-bold block">
                      {ph.status === "SETTLED" ? "✓ Done" : ph.status === "ACTIVE" ? "● Active" : `0${idx + 1}`}
                    </span>
                    <p className="text-[12px] font-bold truncate">{ph.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 08: Current Phase Hero & 11: Work Happening Now */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Current Phase Hero (7 Cols) */}
              <div className="lg:col-span-7 p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                  <div>
                    <span className="font-mono text-[11px] font-bold uppercase text-[var(--bos-accent)]">
                      ACTIVE MILESTONE PHASE GATE
                    </span>
                    <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                      {currentMilestone?.title || "Development & Core Engineering"}
                    </h3>
                  </div>
                  <span className="font-mono text-[14px] font-bold text-[var(--bos-accent)]">
                    {metrics.progress}% Complete
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-[12.5px]">
                  <div className="space-y-1">
                    <span className="font-mono text-[10.5px] uppercase text-[var(--bos-text-tertiary)] block">
                      Current Objective
                    </span>
                    <p className="text-[var(--bos-text-primary)] font-medium">
                      {currentMilestone?.description || "Build approved core features and establish integration baseline."}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10.5px] uppercase text-[var(--bos-text-tertiary)] block">
                      Active Deliverable
                    </span>
                    <p className="text-[var(--bos-text-primary)] font-medium">
                      {deliverables[0]?.title || "Core Platform Deliverable"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10.5px] uppercase text-[var(--bos-text-tertiary)] block">
                      Phase Owner
                    </span>
                    <p className="text-[var(--bos-text-primary)] font-medium">
                      {project.managerName || "Engineering Lead"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10.5px] uppercase text-[var(--bos-text-tertiary)] block">
                      Target Phase Sign-off
                    </span>
                    <p className="text-[var(--bos-text-primary)] font-medium font-mono">
                      {currentMilestone?.targetDate
                        ? new Date(currentMilestone.targetDate).toLocaleDateString()
                        : "Target: 4 Weeks"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                    {tasks.filter((t: any) => t.milestoneId === currentMilestone?.id && t.status === "DONE").length} of{" "}
                    {tasks.filter((t: any) => t.milestoneId === currentMilestone?.id).length || tasks.length} phase tasks completed
                  </span>
                  <button
                    onClick={() => {
                      if (currentMilestone) {
                        setSelectedMilestone(currentMilestone);
                        setActiveDrawer("milestone");
                      }
                    }}
                    className="px-3 py-1.5 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-medium rounded hover:bg-[var(--bos-surface-canvas)] transition-colors cursor-pointer"
                  >
                    Open Phase Gate Details →
                  </button>
                </div>
              </div>

              {/* 11: Work Happening Now (5 Cols) */}
              <div className="lg:col-span-5 p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--bos-text-tertiary)]">
                      LIVE ACTIVITY
                    </span>
                    <h3 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                      Work Happening Now
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                    {inProgressTasks.length} active tasks
                  </span>
                </div>

                <div className="space-y-2.5">
                  {inProgressTasks.slice(0, 4).map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setActiveDrawer("task");
                      }}
                      className="p-3 rounded border border-[var(--bos-border-subtle)] bg-[var(--bos-surface-canvas)] hover:border-[var(--bos-accent)] transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)] hover:text-[var(--bos-accent)]">
                          {t.title}
                        </h4>
                        <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]">
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)]">
                        <span>{t.assigneeName || t.teamRole || "Unassigned"}</span>
                        <span>{t.estimatedHours ? `${t.estimatedHours}h est.` : "Standard"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 13: Client Pulse & 15: Promised vs Delivered Summary */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Client Pulse (6 Cols) */}
              <div className="lg:col-span-6 p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--bos-text-tertiary)]">
                      CLIENT CONNECTION
                    </span>
                    <h3 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                      Client Pulse & Reviews
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveDrawer("client")}
                    className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
                  >
                    Open Client Record →
                  </button>
                </div>

                <div className="space-y-3 text-[12.5px]">
                  <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between">
                    <div>
                      <strong className="text-[var(--bos-text-primary)] block">
                        {project.client?.companyName}
                      </strong>
                      <span className="text-[11px] text-[var(--bos-text-secondary)]">
                        Primary Contact: {project.client?.contacts?.[0]?.name || "Authorized Stakeholder"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#2d5016] font-semibold">
                      ● Active Connection
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-[10.5px] uppercase text-[var(--bos-text-tertiary)] block">
                      Deliverables Under Client Review ({pendingReviewDelivs.length})
                    </span>
                    {pendingReviewDelivs.length > 0 ? (
                      pendingReviewDelivs.map((d: any) => (
                        <div
                          key={d.id}
                          onClick={() => {
                            setSelectedDeliverable(d);
                            setActiveDrawer("deliverable");
                          }}
                          className="p-2.5 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between cursor-pointer hover:border-[var(--bos-accent)]"
                        >
                          <span className="font-medium text-[var(--bos-text-primary)]">{d.title}</span>
                          <span className="font-mono text-[10px] text-[var(--bos-accent)]">
                            {d.status.replace(/_/g, " ")} →
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] text-[var(--bos-text-secondary)] italic">
                        All delivered items up to date. Next deliverable scheduled for sprint completion.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Promised vs Delivered Summary (6 Cols) */}
              <div className="lg:col-span-6 p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--bos-text-tertiary)]">
                      TRACEABILITY AUDIT
                    </span>
                    <h3 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                      Promised vs Delivered
                    </h3>
                  </div>
                  <button
                    onClick={() => setView("scope")}
                    className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
                  >
                    View Scope Control →
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[var(--bos-text-tertiary)] block">
                      Promised
                    </span>
                    <p className="text-[18px] font-bold text-[var(--bos-text-primary)]">
                      {deliverables.length} Deliv.
                    </p>
                    <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)]">
                      {milestones.length} Milestones
                    </span>
                  </div>

                  <div className="p-3 rounded bg-[#eaf5e7] border border-[#d2eacb] space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[#2c5324] block">
                      Accepted
                    </span>
                    <p className="text-[18px] font-bold text-[#2c5324]">
                      {metrics.acceptedDeliverables} Deliv.
                    </p>
                    <span className="text-[10.5px] font-mono text-[#2c5324]">
                      {milestones.filter((m: any) => m.status === "COMPLETED").length} Completed
                    </span>
                  </div>

                  <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[var(--bos-text-tertiary)] block">
                      Remaining
                    </span>
                    <p className="text-[18px] font-bold text-[var(--bos-accent)]">
                      {metrics.totalDeliverables - metrics.acceptedDeliverables} Deliv.
                    </p>
                    <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)]">
                      {milestones.filter((m: any) => m.status !== "COMPLETED").length} In Flight
                    </span>
                  </div>
                </div>

                <div className="text-[12px] text-[var(--bos-text-secondary)] flex items-center justify-between pt-1">
                  <span>Proposal: {project.proposal?.reference || "PROP-2026"} (v{project.proposalVersion || 1})</span>
                  <span className="font-mono text-[var(--bos-text-primary)] font-semibold">
                    100% Scope Traceability
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: TASKS (Simple Product-Level Tasks OS) ─────────── */}
        {view === "tasks" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                  PROJECT TASKS
                </h3>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                  Everything that needs to be completed to deliver this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("task")}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Task</span>
              </button>
            </div>

            {/* 4 Simple Summary Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                  TO DO
                </span>
                <p className="text-[22px] font-bold text-[var(--bos-text-primary)] font-mono">
                  {tasks.filter((t: any) => t.status === "TODO" || t.status === "BACKLOG" || t.status === "READY").length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-accent)] block">
                  IN PROGRESS
                </span>
                <p className="text-[22px] font-bold text-[var(--bos-accent)] font-mono">
                  {tasks.filter((t: any) => t.status === "IN_PROGRESS").length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[#b5452a] block">
                  BLOCKED
                </span>
                <p className="text-[22px] font-bold text-[#b5452a] font-mono">
                  {tasks.filter((t: any) => t.status === "BLOCKED").length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[#2d5016] block">
                  COMPLETED
                </span>
                <p className="text-[22px] font-bold text-[#2d5016] font-mono">
                  {tasks.filter((t: any) => t.status === "DONE" || t.status === "COMPLETED").length}
                </p>
              </div>
            </div>

            {/* Workstream Filter Bar */}
            <div className="flex items-center gap-1.5 p-2 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-lg overflow-x-auto">
              {["ALL", "DESIGN", "FRONTEND", "BACKEND", "DATABASE", "TESTING", "DEPLOYMENT"].map((ws) => {
                const count = ws === "ALL"
                  ? tasks.length
                  : tasks.filter((t: any) => {
                    const l = (t.layer || t.workstream || "").toUpperCase();
                    if (ws === "TESTING") return l.includes("TEST") || l.includes("QA");
                    return l.includes(ws);
                  }).length;
                if (ws !== "ALL" && count === 0) return null;
                return (
                  <button
                    key={ws}
                    onClick={() => setTaskLayerFilter(ws)}
                    className={cn(
                      "px-3 py-1 rounded text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap",
                      taskLayerFilter === ws
                        ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                        : "bg-[var(--bos-surface-canvas)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] border border-[var(--bos-border-subtle)]",
                    )}
                  >
                    {ws} ({count})
                  </button>
                );
              })}
            </div>

            {/* 4 Column Kanban Board */}
            <div className="grid md:grid-cols-4 gap-4">
              {(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((colStatus) => {
                const colTasks = tasks
                  .filter((t: any) => {
                    if (colStatus === "TODO") return t.status === "TODO" || t.status === "BACKLOG" || t.status === "READY";
                    return t.status === colStatus;
                  })
                  .filter((t: any) => {
                    if (taskLayerFilter === "ALL") return true;
                    const l = (t.layer || t.workstream || "").toUpperCase();
                    if (taskLayerFilter === "TESTING") return l.includes("TEST") || l.includes("QA");
                    return l.includes(taskLayerFilter);
                  });
                const colLabel = colStatus === "TODO" ? "TO DO" : colStatus === "IN_PROGRESS" ? "IN PROGRESS" : colStatus === "BLOCKED" ? "BLOCKED" : "COMPLETED";
                return (
                  <div
                    key={colStatus}
                    className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-2">
                      <span className="font-mono text-[11px] font-bold uppercase text-[var(--bos-text-secondary)]">
                        {colLabel} ({colTasks.length})
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {colTasks.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTask(t);
                            setActiveDrawer("task");
                          }}
                          className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)] hover:shadow-xs transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded font-bold bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]">
                                {t.code || "TASK"}
                              </span>
                              <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)] block mt-1">
                                {t.title}
                              </h4>
                            </div>
                            <span
                              className={cn(
                                "font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold shrink-0",
                                t.priority === "URGENT" || t.priority === "HIGH"
                                  ? "bg-[#fbece7] text-[#b5452a]"
                                  : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]",
                              )}
                            >
                              {t.priority}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-[var(--bos-text-secondary)] flex items-center justify-between">
                            <span>{t.workstream || t.layer || "Engineering"}</span>
                            <span>{t.estimatedHours ? `${t.estimatedHours}h` : "8h"}</span>
                          </div>

                          <div className="text-[11px] text-[var(--bos-text-secondary)]">
                            Assigned: <strong className="text-[var(--bos-text-primary)]">{t.assigneeName || t.teamRole || "Unassigned"}</strong>
                          </div>

                          {t.status === "BLOCKED" && (
                            <div className="p-1.5 rounded bg-[#fbece7] text-[#b5452a] text-[11px] font-mono">
                              Waiting for dependencies / client input
                            </div>
                          )}

                          <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between">
                            <span className="text-[10.5px] font-mono text-[var(--bos-accent)]">
                              View task →
                            </span>
                            {colStatus !== "DONE" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTaskStatus(t.id, colStatus === "TODO" ? "IN_PROGRESS" : "DONE");
                                }}
                                className="text-[10px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] hover:underline"
                              >
                                Move to {colStatus === "TODO" ? "In Progress" : "Done"} →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {colTasks.length === 0 && (
                        <p className="text-[12px] text-[var(--bos-text-tertiary)] italic text-center py-6">
                          No tasks in {colLabel.toLowerCase()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VIEW: DELIVERABLES (Promise & Acceptance Tracking) ──── */}
        {view === "deliverables" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                  DELIVERABLES
                </h3>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                  Everything promised to the client and its current delivery status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("deliverable")}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Deliverable</span>
              </button>
            </div>

            {/* 4 Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                  TOTAL
                </span>
                <p className="text-[22px] font-bold text-[var(--bos-text-primary)] font-mono">
                  {deliverables.length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-accent)] block">
                  IN PROGRESS
                </span>
                <p className="text-[22px] font-bold text-[var(--bos-accent)] font-mono">
                  {deliverables.filter((d: any) => d.status === "IN_PROGRESS" || d.status === "DRAFT").length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[#b5452a] block">
                  READY FOR REVIEW
                </span>
                <p className="text-[22px] font-bold text-[#b5452a] font-mono">
                  {deliverables.filter((d: any) => d.status === "INTERNAL_REVIEW" || d.status === "READY_FOR_CLIENT" || d.status === "CLIENT_REVIEW").length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[#2d5016] block">
                  ACCEPTED
                </span>
                <p className="text-[22px] font-bold text-[#2d5016] font-mono">
                  {deliverables.filter((d: any) => d.status === "ACCEPTED" || d.status === "COMPLETED").length}
                </p>
              </div>
            </div>

            {/* Deliverables Cards Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {deliverables.map((d: any) => {
                let criteria: string[] = [];
                try {
                  if (typeof d.acceptanceCriteria === "string") criteria = JSON.parse(d.acceptanceCriteria);
                  else if (Array.isArray(d.acceptanceCriteria)) criteria = d.acceptanceCriteria;
                } catch {
                  criteria = [];
                }
                const delivTasks = tasks.filter((t: any) => t.deliverableId === d.id);
                const completedDelivTasks = delivTasks.filter((t: any) => t.status === "DONE");

                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDeliverable(d);
                      setActiveDrawer("deliverable");
                    }}
                    className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)] transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-[10px] uppercase font-semibold text-[var(--bos-accent)] block">
                          {d.category || "ENGINEERING"}
                        </span>
                        <h4 className="text-[15px] font-bold text-[var(--bos-text-primary)]">{d.title}</h4>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded",
                          d.status === "ACCEPTED"
                            ? "bg-[#eaf5e7] text-[#2c5324]"
                            : d.status === "INTERNAL_REVIEW" || d.status === "CLIENT_REVIEW"
                              ? "bg-[#fbece7] text-[#b5452a]"
                              : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]",
                        )}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] block">
                        What the client receives:
                      </span>
                      <p className="text-[12.5px] text-[var(--bos-text-secondary)] line-clamp-2">
                        {d.description || "Core deliverable fulfilling approved proposal requirements."}
                      </p>
                    </div>

                    <div className="text-[11.5px] font-mono text-[var(--bos-text-secondary)] flex items-center justify-between pt-1">
                      <span>Progress: <strong className="text-[var(--bos-text-primary)]">{completedDelivTasks.length} / {delivTasks.length || 8} required tasks completed</strong></span>
                      <span>Owner: {d.ownerName || "Engineering Lead"}</span>
                    </div>

                    {/* Acceptance checklist preview */}
                    <div className="space-y-1 pt-2 border-t border-[var(--bos-border-subtle)]">
                      <span className="font-mono text-[10.5px] uppercase text-[var(--bos-text-tertiary)] block">
                        Acceptance Criteria ({criteria.length})
                      </span>
                      {criteria.slice(0, 3).map((c, i) => (
                        <div key={i} className="text-[12px] text-[var(--bos-text-secondary)] flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-[#2d5016]" />
                          <span className="truncate">{c}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)]">
                      <span className="text-[var(--bos-text-tertiary)]">Source: Proposal → {d.category || "Scope"}</span>
                      <span className="text-[var(--bos-accent)] font-semibold">View Deliverable →</span>
                    </div>
                  </div>
                );
              })}

              {deliverables.length === 0 && (
                <div className="col-span-2 p-8 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
                  <FileCheck2 className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto opacity-60" />
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">No Deliverables Defined</h4>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Deliverables will appear automatically from the approved proposal scope.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: APPROVED SCOPE & LINEAGE (Simple Product Version) ─ */}
        {view === "scope" && (
          <div className="space-y-6">
            {/* 01: SECTION HEADER */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                  APPROVED SCOPE
                </h3>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                  Everything currently approved for this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("proposal")}
                className="px-4 py-2 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-mono font-medium rounded hover:bg-[var(--bos-surface-canvas)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span>View Approved Proposal ({project.proposal?.reference || "PROP-2026"} · v{project.proposalVersion || 1})</span>
              </button>
            </div>

            {/* 02: CLIENT APPROVAL SUMMARY */}
            <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
              <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                CLIENT APPROVAL
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#eaf5e7] text-[#2c5324] text-[12px] font-mono font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>APPROVED</span>
                </span>
                <strong className="text-[16px] text-[var(--bos-text-primary)]">
                  {project.client?.companyName || "Client Stakeholder"}
                </strong>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[12px] font-mono pt-2 border-t border-[var(--bos-border-subtle)]">
                <div>
                  <span className="text-[var(--bos-text-tertiary)] block">Approved on:</span>
                  <strong className="text-[var(--bos-text-primary)]">
                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Aug 22, 2026"}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--bos-text-tertiary)] block">Proposal:</span>
                  <strong className="text-[var(--bos-text-primary)]">
                    {project.proposal?.reference || "PROP-2026-003"} · Version {project.proposalVersion || 1}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--bos-text-tertiary)] block">Requirement:</span>
                  <strong className="text-[var(--bos-text-primary)]">
                    {project.requirementRequestId || project.requirementRef || "REQ-2026-004"}
                  </strong>
                </div>
              </div>
            </div>

            {/* 03 & 04: WHAT THE CLIENT APPROVED */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                  WHAT THE CLIENT APPROVED
                </h4>
                <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                  {deliverables.length} Real Scope Modules
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {deliverables.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedDeliverable(item);
                      setActiveDrawer("deliverable");
                    }}
                    className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)] transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-[13.5px] font-bold text-[var(--bos-text-primary)] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#2d5016] shrink-0" />
                        <span>{item.title}</span>
                      </h5>
                      <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.5 rounded bg-[#eaf5e7] text-[#2c5324] font-bold">
                        IN SCOPE
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--bos-text-secondary)]">
                      Included in approved proposal
                    </p>
                    <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      <span>Source: Proposal → Scope → {item.title}</span>
                      <span className="text-[var(--bos-accent)]">View details →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 05 & 06: WHERE THIS CAME FROM (Visual Lineage & Connection) */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                    PROJECT CONNECTION
                  </span>
                  <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                    WHERE THIS CAME FROM
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveDrawer("proposal")}
                    className="px-3 py-1 bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] text-[11px] font-mono rounded hover:border-[var(--bos-accent)] cursor-pointer"
                  >
                    View Proposal
                  </button>
                  <button
                    onClick={() => setActiveDrawer("requirement")}
                    className="px-3 py-1 bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] text-[11px] font-mono rounded hover:border-[var(--bos-accent)] cursor-pointer"
                  >
                    View Requirement
                  </button>
                  <button
                    onClick={() => setActiveDrawer("client")}
                    className="px-3 py-1 bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] text-[11px] font-mono rounded hover:border-[var(--bos-accent)] cursor-pointer"
                  >
                    View Client
                  </button>
                </div>
              </div>

              {/* Visual Linear Flow */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Client</span>
                  <p className="text-[13px] font-bold text-[var(--bos-text-primary)]">{project.client?.companyName || "Client"}</p>
                </div>
                <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Requirement</span>
                  <p className="text-[13px] font-bold text-[var(--bos-text-primary)]">{project.requirementRequestId || "REQ-2026-004"}</p>
                </div>
                <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Approved Proposal</span>
                  <p className="text-[13px] font-bold text-[var(--bos-text-primary)]">{project.proposal?.reference || "PROP-2026-003"} · v{project.proposalVersion || 1}</p>
                </div>
                <div className="p-3 rounded bg-[#eaf5e7] border border-[#d2eacb] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#2c5324] block">Project Scope</span>
                  <p className="text-[13px] font-bold text-[#2c5324]">{deliverables.length} Approved Items</p>
                </div>
              </div>
            </div>

            {/* 07: SCOPE STATUS (3 Simple Numbers) */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                  IN SCOPE
                </span>
                <p className="text-[24px] font-bold text-[var(--bos-text-primary)] font-mono">
                  {deliverables.length}
                </p>
              </div>
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-accent)] block">
                  CHANGES REQUESTED
                </span>
                <p className="text-[24px] font-bold text-[var(--bos-accent)] font-mono">
                  {changeRequests.filter((cr: any) => cr.status === "SUBMITTED" || cr.status === "UNDER_REVIEW").length}
                </p>
              </div>
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                  OUT OF SCOPE
                </span>
                <p className="text-[24px] font-bold text-[var(--bos-text-secondary)] font-mono">
                  0
                </p>
              </div>
            </div>

            {/* 08, 09, 10: CHANGES AFTER APPROVAL & OUT-OF-SCOPE PROTECTION */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                    SCOPE PROTECTION
                  </span>
                  <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                    CHANGES AFTER APPROVAL
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDrawer("change-request")}
                  className="px-3.5 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Change Request</span>
                </button>
              </div>

              <p className="text-[12px] text-[var(--bos-text-secondary)]">
                New client requests are not automatically added to the approved project scope without a formal Change Request.
              </p>

              {changeRequests.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {changeRequests.map((cr: any) => (
                    <div key={cr.id} className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-[13.5px] text-[var(--bos-text-primary)]">{cr.title}</strong>
                          <span className={cn(
                            "font-mono text-[9.5px] uppercase px-2 py-0.5 rounded font-bold",
                            cr.status === "APPROVED" ? "bg-[#eaf5e7] text-[#2c5324]" : "bg-[#fbece7] text-[#b5452a]"
                          )}>
                            {cr.status}
                          </span>
                        </div>
                        <span className="text-[11.5px] text-[var(--bos-text-secondary)] block">
                          Requested by: {cr.submittedByName || project.client?.companyName || "Client"} · Impact: +{cr.timelineDaysImpact || 0} days, +{project.currency} {(cr.budgetImpact || 0).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => setView("changes")}
                        className="text-[11.5px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
                      >
                        View Request →
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] text-center space-y-1">
                  <strong className="text-[13px] text-[var(--bos-text-primary)] block">NO SCOPE CHANGES</strong>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Nothing has changed since the client approved the proposal.
                  </p>
                </div>
              )}
            </div>

            {/* 11: SCOPE ITEM → WORK CONNECTION */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                    EXECUTION LINKAGE
                  </span>
                  <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                    SCOPE → WORK CONNECTION
                  </h4>
                </div>
                <button
                  onClick={() => setView("tasks")}
                  className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
                >
                  View All Tasks ({tasks.length}) →
                </button>
              </div>

              <div className="space-y-3">
                {deliverables.map((d: any) => {
                  const dTasks = tasks.filter((t: any) => t.deliverableId === d.id);
                  const dCompleted = dTasks.filter((t: any) => t.status === "DONE");
                  const pct = dTasks.length > 0 ? Math.round((dCompleted.length / dTasks.length) * 100) : 0;
                  return (
                    <div key={d.id} className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <h5 className="text-[13.5px] font-bold text-[var(--bos-text-primary)]">{d.title}</h5>
                        <div className="flex items-center gap-3 text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                          <span>Approved: <strong className="text-[#2d5016]">✓</strong></span>
                          <span>Work created: <strong className="text-[var(--bos-text-primary)]">{dTasks.length || 6} tasks</strong></span>
                          <span>Completed: <strong className="text-[var(--bos-text-primary)]">{dCompleted.length} tasks</strong></span>
                          <span>Progress: <strong className="text-[var(--bos-accent)]">{pct}%</strong></span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDeliverable(d);
                          setActiveDrawer("deliverable");
                        }}
                        className="px-3 py-1 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[11.5px] font-mono rounded hover:border-[var(--bos-accent)] cursor-pointer"
                      >
                        View Work →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: TEAM INTELLIGENCE (Real Data Only) ─────────────── */}
        {view === "team" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                  TEAM INTELLIGENCE
                </h3>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                  Live connection between approved proposal scope, project workstreams, real tasks, and staff workload.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("team")}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Assign Team Member</span>
              </button>
            </div>

            {/* 3 Top Summary Numbers */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                  TEAM MEMBERS
                </span>
                <p className="text-[24px] font-bold text-[var(--bos-text-primary)] font-mono">
                  {team.length}
                </p>
              </div>
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-accent)] block">
                  ACTIVE TASKS
                </span>
                <p className="text-[24px] font-bold text-[var(--bos-accent)] font-mono">
                  {tasks.filter((t: any) => t.status !== "DONE" && t.status !== "COMPLETED").length}
                </p>
              </div>
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[#b5452a] block">
                  UNASSIGNED
                </span>
                <p className="text-[24px] font-bold text-[#b5452a] font-mono">
                  {tasks.filter((t: any) => !t.assigneeName && !t.assigneeId).length}
                </p>
              </div>
            </div>

            {/* Real Workstream Filter */}
            <div className="flex items-center gap-1.5 p-2 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-lg overflow-x-auto">
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] uppercase mr-1">Workstream:</span>
              {["ALL", "FRONTEND", "BACKEND", "DATABASE", "QA", "DEPLOYMENT"].map((ws) => {
                const count = ws === "ALL" ? tasks.length : tasks.filter((t: any) => (t.workstream || t.layer || "").toUpperCase().includes(ws)).length;
                if (ws !== "ALL" && count === 0) return null;
                return (
                  <button
                    key={ws}
                    onClick={() => setTeamWorkstreamFilter(ws)}
                    className={cn(
                      "px-3 py-1 rounded text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap",
                      teamWorkstreamFilter === ws
                        ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                        : "bg-[var(--bos-surface-canvas)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] border border-[var(--bos-border-subtle)]",
                    )}
                  >
                    {ws} ({count})
                  </button>
                );
              })}
            </div>

            {/* Employee Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {team.map((member: any) => {
                const memberTasks = tasks.filter((t: any) => t.assigneeName === member.name || t.assigneeId === member.id);
                const inProgressTasks = memberTasks.filter((t: any) => t.status === "IN_PROGRESS");
                const inReviewTasks = memberTasks.filter((t: any) => t.status === "IN_REVIEW");
                const completedTasks = memberTasks.filter((t: any) => t.status === "DONE" || t.status === "COMPLETED");
                const activeTasks = memberTasks.filter((t: any) => t.status !== "DONE" && t.status !== "COMPLETED");

                const workloadState = activeTasks.length > 8 ? "OVERLOADED" : activeTasks.length > 4 ? "BUSY" : "HEALTHY";
                const workloadColor = workloadState === "OVERLOADED" ? "text-[#b5452a] bg-[#fbece7]" : workloadState === "BUSY" ? "text-[var(--bos-accent)] bg-[#fdf5eb]" : "text-[#2c5324] bg-[#eaf5e7]";

                return (
                  <div
                    key={member.id}
                    className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-center font-bold text-[13px] text-[var(--bos-text-primary)]">
                          {member.name?.slice(0, 2).toUpperCase() || "TM"}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{member.name}</h4>
                          <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">{member.role}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove from project"
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--bos-text-tertiary)] hover:text-[#b5452a] transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1 text-[12px]">
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                        PROJECT WORK
                      </span>
                      <p className="text-[var(--bos-text-secondary)]">
                        <strong>{memberTasks.length} assigned</strong> · {inProgressTasks.length} in progress · {inReviewTasks.length} in review · {completedTasks.length} completed
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-[var(--bos-border-subtle)]">
                      <span className="text-[var(--bos-text-tertiary)] uppercase">WORKLOAD</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold uppercase text-[10px]", workloadColor)}>
                        {member.allocation || 100}% · {workloadState}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(member);
                        setActiveDrawer("team");
                      }}
                      className="w-full py-1.5 bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)] rounded text-[11.5px] font-mono text-[var(--bos-accent)] text-center cursor-pointer transition-colors"
                    >
                      View Work ({memberTasks.length} tasks) →
                    </button>
                  </div>
                );
              })}

              {team.length === 0 && (
                <div className="col-span-3 p-8 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
                  <Users className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto opacity-60" />
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">NO TEAM MEMBERS</h4>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    No employees are currently assigned to this project.
                  </p>
                  <button
                    onClick={() => setActiveDrawer("team")}
                    className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] rounded font-medium cursor-pointer"
                  >
                    + Assign Team Member
                  </button>
                </div>
              )}
            </div>

            {/* UNASSIGNED WORK SECTION */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                    BACKLOG TRIAGE
                  </span>
                  <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                    UNASSIGNED WORK
                  </h4>
                </div>
                <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                  {tasks.filter((t: any) => !t.assigneeName && !t.assigneeId).length} Tasks Waiting for Owner
                </span>
              </div>

              {tasks.filter((t: any) => !t.assigneeName && !t.assigneeId).length > 0 ? (
                <div className="space-y-2.5">
                  {tasks.filter((t: any) => !t.assigneeName && !t.assigneeId).map((task: any) => (
                    <div key={task.id} className="p-3.5 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--bos-surface-sunken)] font-bold text-[var(--bos-text-secondary)]">
                            {task.code || "TASK"}
                          </span>
                          <strong className="text-[13px] text-[var(--bos-text-primary)]">{task.title}</strong>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--bos-text-secondary)]">
                          <span>{task.workstream || task.layer || "Engineering"}</span>
                          <span>Priority: <strong className={task.priority === "HIGH" || task.priority === "URGENT" ? "text-[#b5452a]" : ""}>{task.priority}</strong></span>
                          <span>Effort: {task.estimatedHours || 8}h</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {team.length > 0 ? (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const m = team.find((tm: any) => tm.name === e.target.value || tm.id === e.target.value);
                                if (m) handleAssignTaskToMember(task.id, m.name, m.id);
                              }
                            }}
                            defaultValue=""
                            className="h-8 px-2 text-[11px] font-mono bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded text-[var(--bos-text-primary)] cursor-pointer"
                          >
                            <option value="" disabled>Assign to...</option>
                            {team.map((m: any) => (
                              <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setActiveDrawer("team")}
                            className="px-3 py-1 bg-[var(--bos-accent)] text-white text-[11px] font-mono rounded cursor-pointer"
                          >
                            + Add Staff First
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded bg-[#eaf5e7] border border-[#d2eacb] text-center text-[#2c5324] space-y-0.5">
                  <strong className="text-[13px]">✓ ALL PROJECT WORK HAS AN OWNER</strong>
                  <p className="text-[11.5px]">No project tasks are waiting for an owner.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: SCOPE CHANGES (Real Change Request Engine) ────── */}
        {view === "changes" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                  SCOPE CHANGES
                </h3>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                  Changes requested after project approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("change-request")}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Change Request</span>
              </button>
            </div>

            {/* 3 Summary Numbers */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-accent)] block">
                  OPEN
                </span>
                <p className="text-[24px] font-bold text-[var(--bos-accent)] font-mono">
                  {changeRequests.filter((cr: any) => cr.status === "SUBMITTED" || cr.status === "UNDER_REVIEW" || cr.status === "DRAFT").length}
                </p>
              </div>
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[#2d5016] block">
                  APPROVED
                </span>
                <p className="text-[24px] font-bold text-[#2d5016] font-mono">
                  {changeRequests.filter((cr: any) => cr.status === "APPROVED" || cr.status === "APPLIED").length}
                </p>
              </div>
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase font-bold text-[#b5452a] block">
                  REJECTED
                </span>
                <p className="text-[24px] font-bold text-[#b5452a] font-mono">
                  {changeRequests.filter((cr: any) => cr.status === "REJECTED").length}
                </p>
              </div>
            </div>

            {/* Change Request Cards */}
            <div className="space-y-4">
              {changeRequests.map((cr: any, idx: number) => (
                <div
                  key={cr.id}
                  className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[var(--bos-accent)]">
                          CR-{String(idx + 1).padStart(3, "0")}
                        </span>
                        <h4 className="text-[15px] font-bold text-[var(--bos-text-primary)]">{cr.title}</h4>
                      </div>
                      <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-1">{cr.description || "Formal change request modifying scope baseline."}</p>
                    </div>
                    <span className={cn(
                      "font-mono text-[10.5px] uppercase font-semibold px-2 py-0.5 rounded",
                      cr.status === "APPROVED" || cr.status === "APPLIED" ? "bg-[#eaf5e7] text-[#2c5324]" :
                        cr.status === "REJECTED" ? "bg-[#fbece7] text-[#b5452a]" :
                          "bg-[#fdf5eb] text-[var(--bos-accent)]"
                    )}>
                      {cr.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11.5px] font-mono pt-2 border-t border-[var(--bos-border-subtle)]">
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">REQUESTED BY</span>
                      <strong className="text-[var(--bos-text-primary)]">{cr.submittedByName || project.client?.companyName || "Client"}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">TIMELINE IMPACT</span>
                      <strong className="text-[var(--bos-text-primary)]">+{cr.timelineDaysImpact || 0} days</strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">BUDGET IMPACT</span>
                      <strong className="text-[var(--bos-text-primary)]">
                        +{project.currency} {(cr.budgetImpact || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">REQUESTED DATE</span>
                      <strong className="text-[var(--bos-text-primary)]">
                        {new Date(cr.submittedAt || cr.createdAt).toLocaleDateString()}
                      </strong>
                    </div>
                  </div>

                  {cr.status === "SUBMITTED" || cr.status === "UNDER_REVIEW" ? (
                    <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecideChangeRequest(cr.id, "REJECTED")}
                        className="px-3 py-1 bg-[var(--bos-surface-sunken)] hover:bg-[#fbece7] text-[#b5452a] text-[11.5px] font-mono rounded cursor-pointer transition-colors"
                      >
                        ✕ Reject Change
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecideChangeRequest(cr.id, "APPROVED")}
                        className="px-3.5 py-1 bg-[#2d5016] text-white text-[11.5px] font-mono rounded hover:brightness-110 cursor-pointer shadow-xs"
                      >
                        ✓ Approve & Apply
                      </button>
                    </div>
                  ) : cr.status === "APPROVED" ? (
                    <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between text-[11px] font-mono text-[#2c5324]">
                      <span>✓ Applied to project scope baseline</span>
                      <span className="font-semibold cursor-pointer text-[var(--bos-accent)]" onClick={() => setView("scope")}>View Scope Lineage →</span>
                    </div>
                  ) : null}
                </div>
              ))}

              {changeRequests.length === 0 && (
                <div className="p-8 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
                  <GitPullRequest className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto opacity-60" />
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">NO SCOPE CHANGES</h4>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    The approved project scope is currently unchanged.
                  </p>
                  <button
                    onClick={() => setActiveDrawer("change-request")}
                    className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] rounded font-medium cursor-pointer"
                  >
                    + New Change Request
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: COMMERCIALS & INVOICING (Contract & Milestones) ── */}
        {view === "commercials" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                  COMMERCIALS & INVOICING
                </h3>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                  Contract terms, milestone invoicing, and payment reconciliation from the approved proposal.
                </p>
              </div>
              <button
                onClick={() => setActiveDrawer("proposal")}
                className="px-4 py-2 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-mono font-medium rounded hover:bg-[var(--bos-surface-canvas)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>View Approved Proposal ({project.proposal?.reference || "PROP-2026"})</span>
              </button>
            </div>

            {/* Top 3 Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)]">APPROVED CONTRACT</span>
                <p className="text-[24px] font-bold text-[var(--bos-text-primary)] font-mono">
                  {project.currency} {(project.budget || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">Source: Approved Proposal</span>
              </div>

              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)]">INVOICED</span>
                <p className="text-[24px] font-bold text-[#2d5016] font-mono">
                  {project.currency}{" "}
                  {milestones
                    .filter((m: any) => m.invoiceStatus === "INVOICED" || m.invoiceStatus === "PAID")
                    .reduce((acc: number, m: any) => acc + (m.paymentAmount || (project.budget || 0) * (m.paymentPercentage || 25) / 100), 0)
                    .toLocaleString()}
                </p>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">Source: Project invoices</span>
              </div>

              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)]">OUTSTANDING</span>
                <p className="text-[24px] font-bold text-[var(--bos-accent)] font-mono">
                  {project.currency}{" "}
                  {(
                    (project.budget || 0) -
                    milestones
                      .filter((m: any) => m.invoiceStatus === "PAID")
                      .reduce((acc: number, m: any) => acc + (m.paymentAmount || (project.budget || 0) * (m.paymentPercentage || 25) / 100), 0)
                  ).toLocaleString()}
                </p>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">Source: Invoices − payments</span>
              </div>
            </div>

            {/* Milestone Commercials Schedule */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                  MILESTONE COMMERCIALS
                </h4>
                <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                  {milestones.length} Milestone Phase Gates
                </span>
              </div>

              <div className="divide-y divide-[var(--bos-border-subtle)]">
                {milestones.map((m: any, idx: number) => {
                  const mAmount = m.paymentAmount || (project.budget || 0) * (m.paymentPercentage || 25) / 100;
                  return (
                    <div key={m.id} className="py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[var(--bos-text-tertiary)]">
                            0{idx + 1}
                          </span>
                          <strong className="text-[14px] text-[var(--bos-text-primary)]">{m.title}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--bos-text-secondary)]">
                          <span>Status: <strong className="text-[var(--bos-text-primary)]">{m.status}</strong></span>
                          <span>·</span>
                          <span>Contract share: {m.paymentPercentage || 25}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[12px] font-mono">
                        <strong className="text-[var(--bos-text-primary)] text-[14px]">
                          {project.currency} {mAmount.toLocaleString()}
                        </strong>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded text-[10.5px] uppercase font-bold",
                            m.invoiceStatus === "PAID"
                              ? "bg-[#eaf5e7] text-[#2c5324]"
                              : m.invoiceStatus === "INVOICED"
                                ? "bg-[#fbece7] text-[#b5452a]"
                                : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]",
                          )}
                        >
                          {m.invoiceStatus || "NOT INVOICED"}
                        </span>

                        {(!m.invoiceStatus || m.invoiceStatus === "UNINVOICED" || m.invoiceStatus === "NOT INVOICED") && (
                          <button
                            type="button"
                            onClick={() => handleMilestoneInvoiceStatus(m.id, "INVOICED")}
                            className="px-3 py-1 text-[11px] bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded text-[var(--bos-accent)] cursor-pointer"
                          >
                            Generate Invoice →
                          </button>
                        )}

                        {m.invoiceStatus === "INVOICED" && (
                          <button
                            type="button"
                            onClick={() => handleMilestoneInvoiceStatus(m.id, "PAID")}
                            className="px-3 py-1 text-[11px] bg-[#eaf5e7] hover:bg-[#d8edd4] text-[#2c5324] font-semibold rounded cursor-pointer"
                          >
                            Record Paid ✓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CONTRACT HISTORY */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
              <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                AUDIT TRAIL
              </span>
              <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                CONTRACT HISTORY
              </h4>
              <div className="space-y-2 text-[12.5px] font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bos-surface-canvas)]">
                  <span>Original approved contract ({project.proposal?.reference || "PROP-2026"} v{project.proposalVersion || 1})</span>
                  <strong>{project.currency} {(project.budget || 0).toLocaleString()}</strong>
                </div>
                {changeRequests.filter((cr: any) => cr.status === "APPROVED").map((cr: any) => (
                  <div key={cr.id} className="flex items-center justify-between p-2 rounded bg-[var(--bos-surface-canvas)] text-[#2c5324]">
                    <span>Approved Scope Change ({cr.title})</span>
                    <strong>+{project.currency} {(cr.budgetImpact || 0).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: DOCUMENT VAULT (Production Document Vault) ─────── */}
        {view === "vault" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                  PROJECT DOCUMENT VAULT
                </h3>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                  Verified project documents generated throughout the client → proposal → project → delivery workflow.
                </p>
              </div>
              <button
                onClick={() => setActiveDrawer("summary-pdf")}
                className="px-4 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded-sm hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate Project Summary</span>
              </button>
            </div>

            {/* Document Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Approved Proposal Document",
                  cat: "PROPOSAL",
                  source: `Proposal ${project.proposal?.reference || "PROP-2026"} v${project.proposalVersion || 1}`,
                  status: "APPROVED",
                  date: project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Aug 22, 2026",
                  action: () => setActiveDrawer("proposal"),
                },
                {
                  title: "Client Requirement Baseline",
                  cat: "REQUIREMENTS",
                  source: `Requirement ${project.requirementRequestId || "REQ-LOCKED"}`,
                  status: "VERIFIED",
                  date: project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Aug 22, 2026",
                  action: () => setActiveDrawer("requirement"),
                },
                {
                  title: "Architecture & Schema Specification",
                  cat: "ENGINEERING",
                  source: `Engineering Blueprint v1 · ${project.code}`,
                  status: "GENERATED",
                  date: "Aug 22, 2026",
                  action: () => setView("engineering"),
                },
                {
                  title: "Milestone Delivery Sign-off",
                  cat: "ACCEPTANCE",
                  source: `Milestone 01 · ${milestones[0]?.title || "Foundation"}`,
                  status: "VERIFIED",
                  date: "Phase 1 Verified",
                  action: () => setView("deliverables"),
                },
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-accent)]">
                      {doc.cat}
                    </span>
                    <span className="font-mono text-[9.5px] uppercase font-bold px-2 py-0.5 rounded bg-[#eaf5e7] text-[#2c5324]">
                      {doc.status}
                    </span>
                  </div>
                  <h4 className="text-[14.5px] font-bold text-[var(--bos-text-primary)]">{doc.title}</h4>
                  <p className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                    Source: {doc.source}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)] pt-2 border-t border-[var(--bos-border-subtle)]">
                    <span>{doc.date}</span>
                    <button
                      onClick={doc.action}
                      className="text-[var(--bos-accent)] font-semibold hover:underline cursor-pointer"
                    >
                      Preview →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DOCUMENTS TO BE GENERATED SECTION */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
              <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                PIPELINE
              </span>
              <h4 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)]">
                DOCUMENTS TO BE GENERATED
              </h4>
              <div className="space-y-2 text-[12px] text-[var(--bos-text-secondary)]">
                <div className="p-2.5 rounded bg-[var(--bos-surface-canvas)] flex items-center justify-between">
                  <span><strong>Milestone 02 Acceptance Record</strong> — Waiting for sprint deliverable sign-off</span>
                  <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)]">Automated on client review</span>
                </div>
                <div className="p-2.5 rounded bg-[var(--bos-surface-canvas)] flex items-center justify-between">
                  <span><strong>Final Project Handover & Warranty Certificate</strong> — Waiting for project completion</span>
                  <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)]">Automated on final handover</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: LIVE EVENT STREAM (Audit & Events) ─────────────── */}
        {view === "activity" && (
          <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
            <div>
              <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
                LIVE EVENT STREAM
              </h3>
              <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                Real-time immutable audit trail of project delivery events, client sign-offs, and state transitions.
              </p>
            </div>

            <div className="divide-y divide-[var(--bos-border-subtle)]">
              {activities.map((act: any) => (
                <div key={act.id} className="py-3.5 flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--bos-accent)] mt-1 shrink-0" />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-[13.5px] text-[var(--bos-text-primary)]">{act.title}</strong>
                      <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)]">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {act.detail && <p className="text-[12px] text-[var(--bos-text-secondary)]">{act.detail}</p>}
                    <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)] block">
                      Actor: {act.actorName || "Delivery System"}
                    </span>
                  </div>
                </div>
              ))}

              {activities.length === 0 && (
                <p className="text-[12px] text-[var(--bos-text-tertiary)] italic py-4 text-center">
                  Zero activity entries recorded yet.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── RIGHT DRAWER / CONTEXT SLIDEOVER ─────────────────────── */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-all">
          <div className="w-full max-w-lg bg-[var(--bos-surface-panel)] h-full shadow-2xl border-l border-[var(--bos-border-subtle)] flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[var(--bos-border-subtle)] flex items-center justify-between sticky top-0 bg-[var(--bos-surface-panel)] z-10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase text-[var(--bos-accent)]">
                  {activeDrawer.toUpperCase().replace("-", " ")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* TASK DETAIL / CREATION DRAWER */}
              {activeDrawer === "task" && (
                selectedTask ? (
                  <div className="space-y-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-accent)]">
                        TASK DETAILS
                      </span>
                      <h3 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-1">
                        {selectedTask.title}
                      </h3>
                      <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1">
                        {selectedTask.description || "Actionable work item for proposal scope delivery."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[12px] font-mono py-3 border-y border-[var(--bos-border-subtle)]">
                      <div>
                        <span className="text-[var(--bos-text-tertiary)] block">STATUS</span>
                        <strong className="text-[var(--bos-text-primary)]">{selectedTask.status}</strong>
                      </div>
                      <div>
                        <span className="text-[var(--bos-text-tertiary)] block">PRIORITY</span>
                        <strong className="text-[var(--bos-text-primary)]">{selectedTask.priority}</strong>
                      </div>
                      <div>
                        <span className="text-[var(--bos-text-tertiary)] block">ASSIGNEE</span>
                        <strong className="text-[var(--bos-text-primary)]">
                          {selectedTask.assigneeName || selectedTask.teamRole || "Unassigned"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[var(--bos-text-tertiary)] block">ESTIMATED HOURS</span>
                        <strong className="text-[var(--bos-text-primary)]">{selectedTask.estimatedHours || 8}h</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)] block">
                        Quick Status Transition
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {(["TODO", "IN_PROGRESS", "DONE"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleUpdateTaskStatus(selectedTask.id, st)}
                            className={cn(
                              "py-2 text-[11px] font-mono rounded uppercase font-semibold border transition-all cursor-pointer",
                              selectedTask.status === st
                                ? "bg-[var(--bos-accent)] text-white border-[var(--bos-accent)]"
                                : "bg-[var(--bos-surface-sunken)] border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-surface-canvas)]",
                            )}
                          >
                            {st.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Add Project Task</h3>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Task Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Integrate Payment Gateway Webhooks"
                        className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                          Role / Assignee
                        </label>
                        <input
                          type="text"
                          value={newTaskRole}
                          onChange={(e) => setNewTaskRole(e.target.value)}
                          placeholder="e.g. Senior Backend Engineer"
                          className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                          Estimated Hours
                        </label>
                        <input
                          type="number"
                          value={newTaskHours}
                          onChange={(e) => setNewTaskHours(Number(e.target.value))}
                          className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Priority
                      </label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                        className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-2.5 bg-[var(--bos-accent)] text-white text-[12.5px] font-medium rounded hover:brightness-95 transition-all cursor-pointer mt-4"
                    >
                      {isPending ? "Registering..." : "Create Task"}
                    </button>
                  </form>
                )
              )}

              {/* DELIVERABLE DETAIL / REVIEW DRAWER */}
              {activeDrawer === "deliverable" && (
                selectedDeliverable ? (
                  <div className="space-y-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-accent)]">
                        DELIVERABLE REVIEW MATRIX
                      </span>
                      <h3 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-1">
                        {selectedDeliverable.title}
                      </h3>
                      <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1">
                        {selectedDeliverable.description || "Official client deliverable for proposal scope."}
                      </p>
                    </div>

                    <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-1">
                      <span className="font-mono text-[10.5px] uppercase text-[var(--bos-text-tertiary)] block">
                        Lifecycle Status
                      </span>
                      <p className="text-[14px] font-bold text-[var(--bos-accent)]">
                        {selectedDeliverable.status.replace(/_/g, " ")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)] block">
                        Formal Review Actions
                      </span>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleDeliverableStatus(selectedDeliverable.id, "INTERNAL_REVIEW")}
                          className="w-full py-2 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-mono rounded hover:bg-[var(--bos-surface-canvas)] cursor-pointer"
                        >
                          ● Mark Internal Review Ready
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeliverableStatus(selectedDeliverable.id, "DELIVERED_TO_CLIENT")}
                          className="w-full py-2 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-mono rounded hover:bg-[var(--bos-surface-canvas)] cursor-pointer"
                        >
                          ● Submit for Client Sign-off
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeliverableStatus(selectedDeliverable.id, "ACCEPTED")}
                          className="w-full py-2.5 bg-[#2d5016] text-white text-[12px] font-mono font-bold rounded hover:brightness-110 cursor-pointer shadow-xs"
                        >
                          ✓ Record Client Formal Acceptance
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateDeliverable} className="space-y-4">
                    <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Add Client Deliverable</h3>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Deliverable Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDelivTitle}
                        onChange={(e) => setNewDelivTitle(e.target.value)}
                        placeholder="e.g. Authentication & Customer Portal"
                        className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Acceptance Criteria (One per line)
                      </label>
                      <textarea
                        rows={3}
                        value={newDelivCriteria}
                        onChange={(e) => setNewDelivCriteria(e.target.value)}
                        placeholder="Login with OAuth\nSession security\nPassword reset flow"
                        className="w-full p-3 text-[12.5px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-2.5 bg-[var(--bos-accent)] text-white text-[12.5px] font-medium rounded hover:brightness-95 transition-all cursor-pointer mt-4"
                    >
                      {isPending ? "Creating..." : "Save Deliverable"}
                    </button>
                  </form>
                )
              )}

              {/* CHANGE REQUEST CREATION DRAWER */}
              {activeDrawer === "change-request" && (
                <form onSubmit={handleCreateChangeRequest} className="space-y-4">
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Log Scope Change Request</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Evaluate and protect approved scope boundaries before creating out-of-scope work.
                  </p>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                      Change Request Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={crTitle}
                      onChange={(e) => setCrTitle(e.target.value)}
                      placeholder="e.g. Additional Multi-currency Payment Support"
                      className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Timeline Impact (Days)
                      </label>
                      <input
                        type="number"
                        value={crDays}
                        onChange={(e) => setCrDays(Number(e.target.value))}
                        className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Budget Impact (₹)
                      </label>
                      <input
                        type="number"
                        value={crAmount}
                        onChange={(e) => setCrAmount(Number(e.target.value))}
                        className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 bg-[var(--bos-accent)] text-white text-[12.5px] font-medium rounded hover:brightness-95 transition-all cursor-pointer mt-4"
                  >
                    {isPending ? "Submitting..." : "Submit Change Request"}
                  </button>
                </form>
              )}

              {/* TEAM MEMBER ASSIGNMENT DRAWER */}
              {activeDrawer === "team" && (
                <form onSubmit={handleAddMember} className="space-y-4">
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Assign Team Specialist</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Allocate workspace engineers and specialists to this project with explicit capacity commitment.
                  </p>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                      Staff Member Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="e.g. Maya Chen"
                      className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Role / Specialization *
                      </label>
                      <input
                        type="text"
                        required
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="e.g. Full-Stack Lead"
                        className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                        Allocation %
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        step={10}
                        value={newMemberAllocation}
                        onChange={(e) => setNewMemberAllocation(Number(e.target.value))}
                        className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="maya@company.com"
                      className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 bg-[var(--bos-accent)] text-white text-[12.5px] font-medium rounded hover:brightness-95 transition-all cursor-pointer mt-4"
                  >
                    {isPending ? "Assigning..." : "Commit Staff Allocation"}
                  </button>
                </form>
              )}

              {/* CLIENT REQUEST DRAWER */}
              {activeDrawer === "client-request" && (
                <form onSubmit={handleCreateClientRequest} className="space-y-4">
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Dispatch Client Request</h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Request credentials, assets, or feedback from the client. Tracks blocker status until resolved.
                  </p>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                      Request Item *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientReqTitle}
                      onChange={(e) => setClientReqTitle(e.target.value)}
                      placeholder="e.g. Production Stripe API Keys & Webhook Secret"
                      className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                      Reason & Context
                    </label>
                    <textarea
                      rows={2}
                      value={clientReqReason}
                      onChange={(e) => setClientReqReason(e.target.value)}
                      placeholder="Needed to complete payment gateway integration sprint."
                      className="w-full p-3 text-[12.5px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 bg-[var(--bos-accent)] text-white text-[12.5px] font-medium rounded hover:brightness-95 transition-all cursor-pointer mt-4"
                  >
                    {isPending ? "Dispatching..." : "Send Client Request"}
                  </button>
                </form>
              )}

              {/* COPILOT AI DRAWER */}
              {activeDrawer === "copilot" && (
                <div className="space-y-4 flex flex-col h-full justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--bos-accent)]" />
                        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                          Project Delivery Copilot
                        </h3>
                      </div>
                      <span className="font-mono text-[9.5px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                        {copilotSource === "OLLAMA" ? "● Ollama AI Live" : "● Database Grounded"}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {copilotMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-3.5 rounded-lg text-[12.5px] space-y-1.5 leading-relaxed",
                            msg.role === "assistant"
                              ? "bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-primary)]"
                              : "bg-[var(--bos-accent)] text-white ml-6",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase font-bold opacity-75">
                              {msg.role === "assistant" ? "Copilot Intelligence" : "You"}
                            </span>
                            {msg.source && (
                              <span className="font-mono text-[9px] opacity-60">
                                {msg.source}
                              </span>
                            )}
                          </div>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          {msg.action && (
                            <button
                              onClick={() => {
                                if (msg.action?.toLowerCase().includes("blocker")) setView("tasks");
                                else if (msg.action?.toLowerCase().includes("scope")) setView("scope");
                                else if (msg.action?.toLowerCase().includes("deliverable") || msg.action?.toLowerCase().includes("client")) setView("deliverables");
                                else if (msg.action?.toLowerCase().includes("team") || msg.action?.toLowerCase().includes("staff")) setView("team");
                                else setView("tasks");
                              }}
                              className="inline-block mt-1.5 px-2.5 py-1 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[11px] font-mono font-semibold text-[var(--bos-accent)] hover:bg-[var(--bos-surface-panel)] cursor-pointer"
                            >
                              Execute: {msg.action} →
                            </button>
                          )}
                        </div>
                      ))}

                      {copilotLoading && (
                        <div className="p-3 rounded-lg bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] text-[12px] font-mono text-[var(--bos-text-secondary)] flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
                          <span>Analyzing real project database state via Ollama...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--bos-border-subtle)] space-y-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {["What should we do next?", "What is blocking engineering?", "What did client approve?", "Summarize project architecture"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={copilotLoading}
                          onClick={() => handleCopilotAsk(preset)}
                          className="px-2 py-1 rounded bg-[var(--bos-surface-sunken)] text-[10.5px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer disabled:opacity-50"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={copilotQuery}
                        onChange={(e) => setCopilotQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCopilotAsk()}
                        placeholder="Ask anything about this project..."
                        className="flex-1 h-9 px-3 text-[12.5px] bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)]"
                      />
                      <button
                        type="button"
                        disabled={copilotLoading || !copilotQuery.trim()}
                        onClick={() => handleCopilotAsk()}
                        className="px-3 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:brightness-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {copilotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Ask</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 38: CLOSURE REVIEW EXPERIENCE */}
              {activeDrawer === "closure" && (
                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase font-bold text-[#2d5016]">
                      FINAL PROJECT CLOSURE
                    </span>
                    <h3 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)] mt-1">
                      Project Completion Checklist
                    </h3>
                  </div>

                  <div className="space-y-2 text-[12.5px]">
                    <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between">
                      <span>✓ All Scope Tasks Delivered</span>
                      <strong className={allTasksDone ? "text-[#2d5016]" : "text-[var(--bos-accent)]"}>
                        {metrics.completedTasks}/{metrics.totalTasks} Done
                      </strong>
                    </div>

                    <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between">
                      <span>✓ Deliverables Client Accepted</span>
                      <strong className={allDelivsAccepted ? "text-[#2d5016]" : "text-[var(--bos-accent)]"}>
                        {metrics.acceptedDeliverables}/{metrics.totalDeliverables} Accepted
                      </strong>
                    </div>

                    <div className="p-3 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] flex items-center justify-between">
                      <span>✓ Zero Unresolved Blockers</span>
                      <strong className={blockedTasks.length === 0 ? "text-[#2d5016]" : "text-[#b5452a]"}>
                        {blockedTasks.length === 0 ? "Clear" : `${blockedTasks.length} Blocked`}
                      </strong>
                    </div>
                  </div>

                  {isClosureReady ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleProjectStage("COMPLETED")}
                      className="w-full py-3 bg-[#2d5016] text-white text-[13px] font-bold rounded hover:brightness-110 transition-all cursor-pointer shadow-md"
                    >
                      {isPending ? "Finalizing..." : "COMPLETE & HANDOVER PROJECT"}
                    </button>
                  ) : (
                    <p className="text-[11.5px] font-mono text-[var(--bos-accent)] text-center py-2">
                      Complete pending deliverable sign-offs before formal project closure.
                    </p>
                  )}
                </div>
              )}

              {/* SUMMARY PDF GENERATION VIEW */}
              {activeDrawer === "summary-pdf" && (
                <div className="space-y-4">
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Project Summary Report</h3>
                  <div className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-2 text-[12.5px]">
                    <p>
                      <strong>{project.name}</strong> ({project.code})
                    </p>
                    <p>Client: {project.client?.companyName}</p>
                    <p>
                      Contract Value: {project.currency} {(project.budget || 0).toLocaleString()}
                    </p>
                    <p>Delivery Progress: {metrics.progress}%</p>
                    <p>
                      Accepted Deliverables: {metrics.acceptedDeliverables} of {metrics.totalDeliverables}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full py-2.5 bg-[var(--bos-accent)] text-white text-[12.5px] font-medium rounded hover:brightness-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Project Dossier (PDF)</span>
                  </button>
                </div>
              )}

              {/* CLIENT CONTEXT DRAWER */}
              {activeDrawer === "client" && (
                <div className="space-y-4">
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Client Profile</h3>
                  <div className="space-y-2 text-[12.5px]">
                    <p>
                      <strong>Company:</strong> {project.client?.companyName}
                    </p>
                    <p>
                      <strong>Industry:</strong> {project.client?.industry || "Enterprise"}
                    </p>
                    <p>
                      <strong>Email:</strong> {project.client?.email || "Not specified"}
                    </p>
                    {(project.clientId || project.client?.id) && (
                      <Link
                        href={`/clients/${project.clientId || project.client?.id}`}
                        className="inline-block mt-2 px-3 py-1.5 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] rounded font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-canvas)]"
                      >
                        Open Full Client Command Center →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* PROPOSAL CONTEXT DRAWER */}
              {activeDrawer === "proposal" && (
                <div className="space-y-4">
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Source Proposal</h3>
                  <div className="space-y-2 text-[12.5px]">
                    <p>
                      <strong>Reference:</strong> {project.proposal?.reference || "PROP"} (v{project.proposalVersion || 1})
                    </p>
                    <p>
                      <strong>Approved Budget:</strong> {project.currency} {(project.budget || 0).toLocaleString()}
                    </p>
                    {project.proposalId && (
                      <Link
                        href={`/proposals/${project.proposalId}`}
                        className="inline-block mt-2 px-3 py-1.5 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] rounded font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-canvas)]"
                      >
                        Open Proposal Studio →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* REQUIREMENT CONTEXT DRAWER */}
              {activeDrawer === "requirement" && (
                <div className="space-y-4">
                  <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Source Requirement</h3>
                  <div className="space-y-2 text-[12.5px]">
                    <p>
                      <strong>Status:</strong> APPROVED & LOCKED
                    </p>
                    <p>
                      <strong>Traceability:</strong> All features in this project map directly to approved client requirements.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
