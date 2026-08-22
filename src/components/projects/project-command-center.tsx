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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextBestAction } from "@/lib/projects";
import { EngineeringHub } from "./engineering/engineering-hub";

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
  | "story"
  | "engineering"
  | "tasks"
  | "deliverables"
  | "scope"
  | "team"
  | "changes"
  | "commercials"
  | "vault"
  | "activity";

export function ProjectCommandCenter({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<ActiveWorkspaceView>("story");
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
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "Failed to load project.");
      setData(json);
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
            { id: "story", label: "Project Story & Execution", icon: Rocket },
            { id: "engineering", label: "Engineering Control Hub", icon: Layers },
            { id: "tasks", label: `Tasks (${tasks.length})`, icon: ListTodo },
            { id: "deliverables", label: `Deliverables (${deliverables.length})`, icon: FileCheck2 },
            { id: "scope", label: "Approved Scope & Lineage", icon: ShieldCheck },
            { id: "team", label: `Team Intelligence (${team.length})`, icon: Users },
            { id: "changes", label: `Scope Changes (${changeRequests.length})`, icon: GitPullRequest },
            { id: "commercials", label: "Commercials & Invoicing", icon: Coins },
            { id: "vault", label: "Document Vault", icon: FileText },
            { id: "activity", label: `Live Event Stream (${activities.length})`, icon: History },
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

        {/* ── VIEW: STORY & EXECUTION ─────────────────────────────── */}
        {view === "story" && (
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

        {/* ── VIEW: TASKS (Kanban & List Execution Board) ──────────── */}
        {view === "tasks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                  Task Execution Matrix
                </h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Actionable work items connected to proposal deliverables and milestone phase gates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("task")}
                className="px-3.5 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Layer Filter Toolbar */}
            <div className="flex items-center gap-1.5 p-2 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-lg overflow-x-auto">
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] uppercase mr-1">Layer View:</span>
              {[
                { id: "ALL", label: `All (${tasks.length})` },
                { id: "DATABASE", label: `Database (${tasks.filter((t: any) => t.layer === "DATABASE" || t.workstream === "DATABASE").length})` },
                { id: "BACKEND", label: `Backend (${tasks.filter((t: any) => t.layer === "BACKEND" || t.workstream === "BACKEND").length})` },
                { id: "FRONTEND", label: `Frontend (${tasks.filter((t: any) => t.layer === "FRONTEND" || t.workstream === "FRONTEND").length})` },
                { id: "TESTING", label: `Testing (${tasks.filter((t: any) => t.layer === "TESTING" || t.workstream === "TESTING" || t.workstream === "QA").length})` },
              ].map((filterTab) => (
                <button
                  key={filterTab.id}
                  onClick={() => setTaskLayerFilter(filterTab.id)}
                  className={cn(
                    "px-3 py-1 rounded text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap",
                    taskLayerFilter === filterTab.id
                      ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                      : "bg-[var(--bos-surface-canvas)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] border border-[var(--bos-border-subtle)]",
                  )}
                >
                  {filterTab.label}
                </button>
              ))}
            </div>

            {/* Kanban Columns */}
            <div className="grid md:grid-cols-3 gap-4">
              {(["TODO", "IN_PROGRESS", "DONE"] as const).map((colStatus) => {
                const colTasks = tasks
                  .filter((t: any) => t.status === colStatus)
                  .filter((t: any) => {
                    if (taskLayerFilter === "ALL") return true;
                    if (taskLayerFilter === "DATABASE") return t.layer === "DATABASE" || t.workstream === "DATABASE";
                    if (taskLayerFilter === "BACKEND") return t.layer === "BACKEND" || t.workstream === "BACKEND";
                    if (taskLayerFilter === "FRONTEND") return t.layer === "FRONTEND" || t.workstream === "FRONTEND";
                    if (taskLayerFilter === "TESTING") return t.layer === "TESTING" || t.workstream === "TESTING" || t.workstream === "QA";
                    return true;
                  });
                const colLabel = colStatus === "TODO" ? "To Do" : colStatus === "IN_PROGRESS" ? "In Progress" : "Completed";
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
                              {t.code && (
                                <span className={cn(
                                  "font-mono text-[9.5px] px-1.5 py-0.5 rounded font-bold mr-1.5",
                                  t.layer === "DATABASE" ? "bg-purple-500/10 text-purple-600" :
                                  t.layer === "BACKEND" ? "bg-emerald-500/10 text-emerald-600" :
                                  t.layer === "FRONTEND" ? "bg-sky-500/10 text-sky-600" : "bg-amber-500/10 text-amber-600"
                                )}>
                                  {t.code}
                                </span>
                              )}
                              <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)] inline">
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

                          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)]">
                            <span>{t.assigneeName || t.teamRole || "Unassigned"}</span>
                            <span>{t.estimatedHours ? `${t.estimatedHours}h` : "8h"}</span>
                          </div>

                          {/* Quick status button */}
                          <div className="pt-1.5 border-t border-[var(--bos-border-subtle)]/60 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                              {t.sourceRequirementId ? `REQ: ${t.sourceRequirementId}` : "Task Drawer"}
                            </span>
                            {colStatus !== "DONE" ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTaskStatus(t.id, colStatus === "TODO" ? "IN_PROGRESS" : "DONE");
                                }}
                                className="text-[10.5px] font-mono text-[var(--bos-accent)] hover:underline font-semibold"
                              >
                                Move to {colStatus === "TODO" ? "In Progress" : "Done"} →
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-[#2d5016] font-semibold">✓ Settled</span>
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

        {/* ── VIEW: DELIVERABLES ──────────────────────────────────── */}
        {view === "deliverables" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                  Deliverables & Formal Sign-offs
                </h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Agreed deliverables with acceptance criteria checklists and client sign-off lifecycle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("deliverable")}
                className="px-3.5 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deliverable</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {deliverables.map((d: any) => {
                let criteria: string[] = [];
                try {
                  if (typeof d.acceptanceCriteria === "string") criteria = JSON.parse(d.acceptanceCriteria);
                  else if (Array.isArray(d.acceptanceCriteria)) criteria = d.acceptanceCriteria;
                } catch {
                  criteria = [];
                }

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

                    <p className="text-[12.5px] text-[var(--bos-text-secondary)] line-clamp-2">
                      {d.description || "Core deliverable verifying approved proposal criteria."}
                    </p>

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
                      <span>Owner: {d.ownerName || "Engineering Lead"}</span>
                      <span className="text-[var(--bos-accent)] font-semibold">Open Review Matrix →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VIEW: SCOPE (Promised vs Delivered & Scope Control) ─── */}
        {view === "scope" && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase text-[var(--bos-text-tertiary)]">
                    APPROVED COMMITMENTS
                  </span>
                  <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                    What We Promised the Client
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDrawer("proposal")}
                  className="text-[12px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
                >
                  View Frozen Proposal (v{project.proposalVersion || 1}) →
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-2">
                  <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-text-primary)] block">
                    ✓ In-Scope Items ({deliverables.length})
                  </span>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Directly imported and locked from approved proposal document blocks and requirement criteria.
                  </p>
                </div>

                <div className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-2">
                  <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-text-primary)] block">
                    ○ Out-of-Scope Protection
                  </span>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Any new client requests outside approved scope require a formal Change Request (CR) with timeline & cost impact.
                  </p>
                </div>

                <div className="p-4 rounded bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] space-y-2">
                  <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-text-primary)] block">
                    ⚡ Change Requests ({changeRequests.length})
                  </span>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    {changeRequests.filter((cr: any) => cr.status === "APPROVED").length} approved,{" "}
                    {changeRequests.filter((cr: any) => cr.status === "SUBMITTED").length} under review.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDrawer("change-request")}
                  className="px-4 py-2 bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-medium rounded hover:bg-[var(--bos-surface-canvas)] transition-colors cursor-pointer"
                >
                  + Log Scope Change Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: TEAM INTELLIGENCE ─────────────────────────────── */}
        {view === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                  Team Intelligence & Workload
                </h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Real workspace staff assigned to project tasks and delivery phase gates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("team")}
                className="px-3.5 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Staff Member</span>
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {team.map((member: any) => {
                const memberTasks = tasks.filter((t: any) => t.assigneeName === member.name);
                const activeCount = memberTasks.filter((t: any) => t.status !== "DONE").length;
                const completedCount = memberTasks.filter((t: any) => t.status === "DONE").length;
                return (
                  <div
                    key={member.id}
                    className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-center font-bold text-[12px] text-[var(--bos-text-primary)]">
                          {member.name?.slice(0, 2).toUpperCase() || "TM"}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{member.name}</h4>
                          <span className="font-mono text-[10.5px] text-[var(--bos-text-secondary)]">{member.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[var(--bos-accent)]">
                          {member.allocation || 100}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          title="Remove from project"
                          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--bos-text-tertiary)] hover:text-[#b5452a] transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-mono py-2 border-y border-[var(--bos-border-subtle)]">
                      <div>
                        <span className="text-[var(--bos-text-tertiary)] block">ACTIVE</span>
                        <strong className="text-[var(--bos-text-primary)] text-[13px]">{activeCount} Tasks</strong>
                      </div>
                      <div>
                        <span className="text-[var(--bos-text-tertiary)] block">DONE</span>
                        <strong className="text-[#2d5016] text-[13px]">{completedCount} Tasks</strong>
                      </div>
                    </div>

                    <p className="text-[11.5px] text-[var(--bos-text-secondary)] truncate">
                      Focus: {memberTasks[0]?.title || "Assigned across sprint backlog"}
                    </p>
                  </div>
                );
              })}

              {team.length === 0 && (
                <div className="col-span-3 p-8 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
                  <Users className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto opacity-60" />
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">No Team Members Assigned</h4>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Assign workspace staff to activate team workload tracking.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: SCOPE CHANGES ─────────────────────────────────── */}
        {view === "changes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                  Scope Change Requests (CR)
                </h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Formal change requests assessing timeline days and commercial budget impacts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer("change-request")}
                className="px-3.5 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Change Request</span>
              </button>
            </div>

            <div className="space-y-3">
              {changeRequests.map((cr: any) => (
                <div
                  key={cr.id}
                  className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[var(--bos-accent)]">CR-001</span>
                        <h4 className="text-[15px] font-bold text-[var(--bos-text-primary)]">{cr.title}</h4>
                      </div>
                      <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-1">{cr.description}</p>
                    </div>
                    <span className={cn(
                      "font-mono text-[10.5px] uppercase font-semibold px-2 py-0.5 rounded",
                      cr.status === "APPROVED" ? "bg-[#eaf5e7] text-[#2c5324]" :
                      cr.status === "REJECTED" ? "bg-[#fbece7] text-[#b5452a]" :
                      "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)]"
                    )}>
                      {cr.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11.5px] font-mono pt-2 border-t border-[var(--bos-border-subtle)]">
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">TIMELINE IMPACT</span>
                      <strong className="text-[var(--bos-text-primary)]">+{cr.timelineDaysImpact || 0} Days</strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">BUDGET IMPACT</span>
                      <strong className="text-[var(--bos-text-primary)]">
                        +{project.currency} {(cr.budgetImpact || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">SUBMITTED BY</span>
                      <strong className="text-[var(--bos-text-primary)]">{cr.submittedByName || cr.submittedBy || "Client Request"}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--bos-text-tertiary)] block">DATE</span>
                      <strong className="text-[var(--bos-text-primary)]">
                        {new Date(cr.submittedAt || cr.createdAt).toLocaleDateString()}
                      </strong>
                    </div>
                  </div>

                  {cr.status === "SUBMITTED" && (
                    <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecideChangeRequest(cr.id, "REJECTED")}
                        className="px-3 py-1 bg-[var(--bos-surface-sunken)] hover:bg-[#fbece7] text-[#b5452a] text-[11.5px] font-mono rounded cursor-pointer transition-colors"
                      >
                        ✕ Reject CR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecideChangeRequest(cr.id, "APPROVED")}
                        className="px-3.5 py-1 bg-[#2d5016] text-white text-[11.5px] font-mono rounded hover:brightness-110 cursor-pointer shadow-xs"
                      >
                        ✓ Approve & Incorporate Scope
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {changeRequests.length === 0 && (
                <div className="p-8 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
                  <GitPullRequest className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto opacity-60" />
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">Zero Scope Changes</h4>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Delivery is strictly aligned with the approved proposal scope baseline.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: COMMERCIALS & INVOICING ───────────────────────── */}
        {view === "commercials" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)]">Approved Contract</span>
                <p className="text-[22px] font-bold text-[var(--bos-text-primary)] font-mono">
                  {project.currency} {(project.budget || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">Frozen from approved proposal</span>
              </div>

              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)]">Invoiced Milestones</span>
                <p className="text-[22px] font-bold text-[#2d5016] font-mono">
                  {project.currency}{" "}
                  {milestones
                    .filter((m: any) => m.invoiceStatus === "INVOICED" || m.invoiceStatus === "PAID")
                    .reduce((acc: number, m: any) => acc + (m.paymentAmount || (project.budget || 0) * (m.paymentPercentage || 25) / 100), 0)
                    .toLocaleString()}
                </p>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">Across signed-off phase gates</span>
              </div>

              <div className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="font-mono text-[11px] uppercase text-[var(--bos-text-tertiary)]">Payable Balance</span>
                <p className="text-[22px] font-bold text-[var(--bos-accent)] font-mono">
                  {project.currency}{" "}
                  {(
                    (project.budget || 0) -
                    milestones
                      .filter((m: any) => m.invoiceStatus === "INVOICED" || m.invoiceStatus === "PAID")
                      .reduce((acc: number, m: any) => acc + (m.paymentAmount || (project.budget || 0) * (m.paymentPercentage || 25) / 100), 0)
                  ).toLocaleString()}
                </p>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">Due on final delivery handover</span>
              </div>
            </div>

            {/* Milestones Payment Schedule */}
            <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
              <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                Milestone Commercial Phase Gates
              </h3>
              <div className="divide-y divide-[var(--bos-border-subtle)]">
                {milestones.map((m: any, idx: number) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-[var(--bos-text-tertiary)]">
                        0{idx + 1}
                      </span>
                      <strong className="text-[13.5px] text-[var(--bos-text-primary)] ml-2">{m.title}</strong>
                    </div>
                    <div className="flex items-center gap-4 text-[12px] font-mono">
                      <span>{m.paymentPercentage || 25}% Contract</span>
                      <strong className="text-[var(--bos-text-primary)]">
                        {project.currency} {(m.paymentAmount || (project.budget || 0) * (m.paymentPercentage || 25) / 100).toLocaleString()}
                      </strong>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10.5px] uppercase font-semibold",
                          m.invoiceStatus === "PAID"
                            ? "bg-[#eaf5e7] text-[#2c5324]"
                            : m.invoiceStatus === "INVOICED"
                              ? "bg-[#fbece7] text-[#b5452a]"
                              : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]",
                        )}
                      >
                        {m.invoiceStatus || "UNINVOICED"}
                      </span>

                      {m.invoiceStatus === "UNINVOICED" && (
                        <button
                          type="button"
                          onClick={() => handleMilestoneInvoiceStatus(m.id, "INVOICED")}
                          className="px-2.5 py-1 text-[11px] bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-canvas)] border border-[var(--bos-border-subtle)] rounded text-[var(--bos-accent)] cursor-pointer"
                        >
                          Generate Invoice →
                        </button>
                      )}

                      {m.invoiceStatus === "INVOICED" && (
                        <button
                          type="button"
                          onClick={() => handleMilestoneInvoiceStatus(m.id, "PAID")}
                          className="px-2.5 py-1 text-[11px] bg-[#eaf5e7] hover:bg-[#d8edd4] text-[#2c5324] font-semibold rounded cursor-pointer"
                        >
                          Record Paid ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: DOCUMENT VAULT ─────────────────────────────────── */}
        {view === "vault" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                  Project Document Vault
                </h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Centralized repository of verified specifications, proposals, test reports, and contracts.
                </p>
              </div>
              <button
                onClick={() => setActiveDrawer("summary-pdf")}
                className="px-3.5 py-1.5 bg-[var(--bos-accent)] text-white text-[12px] font-medium rounded hover:brightness-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate Project Summary</span>
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: "Approved Proposal Document", cat: "PROPOSAL", date: "Approved 19 Aug", size: "2.4 MB" },
                { title: "Client Requirement Baseline", cat: "REQUIREMENTS", date: "Verified 19 Aug", size: "1.1 MB" },
                { title: "Architecture & Schema Spec", cat: "ENGINEERING", date: "Generated 19 Aug", size: "840 KB" },
                { title: "Milestone Delivery Sign-off", cat: "ACCEPTANCE", date: "Phase 1 Verified", size: "450 KB" },
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-accent)]">
                      {doc.cat}
                    </span>
                    <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)]">{doc.size}</span>
                  </div>
                  <h4 className="text-[13.5px] font-bold text-[var(--bos-text-primary)]">{doc.title}</h4>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)] pt-2 border-t border-[var(--bos-border-subtle)]">
                    <span>{doc.date}</span>
                    <span className="text-[var(--bos-accent)] font-semibold cursor-pointer">Preview →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW: LIVE EVENT STREAM ─────────────────────────────── */}
        {view === "activity" && (
          <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
            <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
              Live Delivery Event Stream
            </h3>

            <div className="divide-y divide-[var(--bos-border-subtle)]">
              {activities.map((act: any) => (
                <div key={act.id} className="py-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--bos-accent)] mt-1.5 shrink-0" />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-[13px] text-[var(--bos-text-primary)]">{act.title}</strong>
                      <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)]">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
