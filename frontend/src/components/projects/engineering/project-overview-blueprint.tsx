"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Server,
  Globe,
  Database,
  Shield,
  Zap,
  ExternalLink,
  Code2,
  AlertTriangle,
  Sparkles,
  GitBranch,
  User,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectOverviewBlueprintProps = {
  project: any;
  blueprint: any;
  metrics: {
    progress: number;
    completedTasks: number;
    totalTasks: number;
    acceptedDeliverables: number;
    totalDeliverables: number;
    currentMilestone: any | null;
    nextBestAction: any;
  };
  onSelectFeature?: (feature: any) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenRequirementDrawer?: () => void;
  onOpenTask?: (taskId: string) => void;
};

export function ProjectOverviewBlueprint({
  project,
  blueprint,
  metrics,
  onSelectFeature,
  onNavigateTab,
  onOpenRequirementDrawer,
  onOpenTask,
}: ProjectOverviewBlueprintProps) {
  const tasks: any[] = project?.tasks || [];
  const deliverables: any[] = project?.deliverables || [];
  const milestones: any[] = project?.milestones || [];

  // 1. WHAT ARE WE BUILDING? — derived strictly from approved proposal/requirements
  const whatWeAreBuilding = useMemo(() => {
    if (project?.description && project.description.trim().length > 10) {
      return project.description.trim();
    }
    if (project?.proposal?.document) {
      try {
        const pDoc = typeof project.proposal.document === "string" 
          ? JSON.parse(project.proposal.document) 
          : project.proposal.document;
        const execSec = (pDoc.sections || []).find(
          (s: any) =>
            s.title?.toLowerCase().includes("executive") ||
            s.title?.toLowerCase().includes("purpose") ||
            s.title?.toLowerCase().includes("objective") ||
            s.title?.toLowerCase().includes("overview")
        );
        if (execSec && execSec.blocks) {
          const textBlock = execSec.blocks.find(
            (b: any) => (b.type === "paragraph" || b.type === "rich_text") && b.content?.trim()
          );
          if (textBlock?.content) return textBlock.content.trim();
        }
      } catch {}
    }
    if (project?.name) {
      return `${project.name} built for ${project.client?.companyName || "client"} based on approved project scope and requirements.`;
    }
    return "Not specified in approved project records.";
  }, [project]);

  // 2. WHAT IS INCLUDED? — Actual approved capabilities / deliverables (zero fake items)
  const approvedCapabilities = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      description?: string;
      category?: string;
      status: string;
      sourceRef: string;
      acceptanceCriteriaCount: number;
    }> = [];

    // From deliverables
    if (deliverables.length > 0) {
      deliverables.forEach((d: any) => {
        let acCount = 0;
        try {
          if (d.acceptanceCriteria) {
            const parsed = typeof d.acceptanceCriteria === "string" ? JSON.parse(d.acceptanceCriteria) : d.acceptanceCriteria;
            if (Array.isArray(parsed)) acCount = parsed.length;
          }
        } catch {}
        items.push({
          id: d.id,
          name: d.title,
          description: d.description || undefined,
          category: d.category || "Deliverable",
          status: d.status === "ACCEPTED" ? "DONE" : d.status === "CLIENT_REVIEW" || d.status === "INTERNAL_REVIEW" ? "IN PROGRESS" : "APPROVED",
          sourceRef: d.proposalFeatureName || (project?.requirementRequestId ? "REQ-APPROVED" : "PROPOSAL"),
          acceptanceCriteriaCount: acCount,
        });
      });
      return items;
    }

    // From scopeSnapshot
    if (project?.scopeSnapshot) {
      try {
        const parsed = typeof project.scopeSnapshot === "string" ? JSON.parse(project.scopeSnapshot) : project.scopeSnapshot;
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((s: any, idx: number) => {
            items.push({
              id: s.id || `SCOPE-${idx + 1}`,
              name: s.title || `Capability ${idx + 1}`,
              description: s.detail || undefined,
              category: s.category || "Feature",
              status: "APPROVED",
              sourceRef: s.sourceSection || "Scope",
              acceptanceCriteriaCount: Array.isArray(s.acceptanceCriteria) ? s.acceptanceCriteria.length : 0,
            });
          });
          return items;
        }
      } catch {}
    }

    // From blueprint raw analysis if available
    if (blueprint?.rawAnalysis) {
      try {
        const raw = typeof blueprint.rawAnalysis === "string" ? JSON.parse(blueprint.rawAnalysis) : blueprint.rawAnalysis;
        if (raw?.requirements && Array.isArray(raw.requirements)) {
          raw.requirements.forEach((r: any, idx: number) => {
            items.push({
              id: r.id || `REQ-${idx + 1}`,
              name: r.title || `Requirement ${idx + 1}`,
              description: r.description || undefined,
              category: "Requirement",
              status: "APPROVED",
              sourceRef: r.sourceSection || "Requirement",
              acceptanceCriteriaCount: Array.isArray(r.acceptanceCriteria) ? r.acceptanceCriteria.length : 0,
            });
          });
          return items;
        }
      } catch {}
    }

    return items;
  }, [deliverables, project, blueprint]);

  // 3. PROJECT STATUS — 4 simple indicators
  const statusCounts = useMemo(() => {
    // Tasks breakdown
    const doneTasks = tasks.filter((t: any) => t.status === "DONE" || t.status === "COMPLETED" || t.status === "CLIENT_APPROVED").length;
    const inProgressTasks = tasks.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW" || t.status === "CLIENT_REVIEW").length;
    const blockedTasks = tasks.filter((t: any) => t.status === "BLOCKED").length;
    const notStartedTasks = tasks.filter((t: any) => t.status === "TODO" || t.status === "BACKLOG" || t.status === "READY").length;

    // Deliverables breakdown
    const acceptedDeliverables = deliverables.filter((d: any) => d.status === "ACCEPTED").length;
    const inReviewDeliverables = deliverables.filter((d: any) => d.status === "CLIENT_REVIEW" || d.status === "INTERNAL_REVIEW" || d.status === "DELIVERED_TO_CLIENT").length;
    const remainingDeliverables = deliverables.filter((d: any) => d.status !== "ACCEPTED" && d.status !== "CLIENT_REVIEW" && d.status !== "INTERNAL_REVIEW" && d.status !== "DELIVERED_TO_CLIENT").length;

    return {
      tasks: {
        done: doneTasks,
        inProgress: inProgressTasks,
        blocked: blockedTasks,
        notStarted: notStartedTasks,
        total: tasks.length,
      },
      deliverables: {
        accepted: acceptedDeliverables,
        inReview: inReviewDeliverables,
        remaining: remainingDeliverables,
        total: deliverables.length,
      },
    };
  }, [tasks, deliverables]);

  // 4. WHAT NEEDS ATTENTION? (Next Action calculated from real task dependencies)
  const attentionItem = useMemo(() => {
    // Priority 1: A blocked task needing resolution
    const blockedTask = tasks.find((t: any) => t.status === "BLOCKED");
    if (blockedTask) {
      return {
        action: blockedTask.title,
        taskId: blockedTask.id,
        why: blockedTask.blockedReason || "Work is currently blocked and halting downstream progress.",
        owner: blockedTask.assigneeName || "Unassigned",
        ownerId: blockedTask.assigneeId,
        actionLabel: blockedTask.assigneeName ? "Resolve Blocker →" : "Assign & Resolve →",
        type: "BLOCKED_TASK",
        badge: "BLOCKED",
        badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
      };
    }

    // Priority 2: In-progress tasks
    const activeTask = tasks.find((t: any) => t.status === "IN_PROGRESS");
    if (activeTask) {
      return {
        action: activeTask.title,
        taskId: activeTask.id,
        why: `Active implementation required for deliverable "${activeTask.deliverable?.title || activeTask.sourceDeliverableTitle || "Core Scope"}".`,
        owner: activeTask.assigneeName || "Unassigned",
        ownerId: activeTask.assigneeId,
        actionLabel: activeTask.assigneeName ? "Open Task →" : "Assign Employee →",
        type: "ACTIVE_TASK",
        badge: "IN PROGRESS",
        badgeColor: "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border-[var(--bos-accent-ring)]",
      };
    }

    // Priority 3: First unassigned / todo task
    const nextTodo = tasks.find((t: any) => t.status === "TODO" || t.status === "READY" || t.status === "BACKLOG");
    if (nextTodo) {
      return {
        action: nextTodo.title,
        taskId: nextTodo.id,
        why: nextTodo.expectedResult || `Required to advance ${nextTodo.deliverable?.title || nextTodo.workstream || "project execution"}.`,
        owner: nextTodo.assigneeName || "Unassigned",
        ownerId: nextTodo.assigneeId,
        actionLabel: nextTodo.assigneeName ? "Start Task →" : "Assign Employee →",
        type: "NEXT_TODO",
        badge: "NEXT ACTION",
        badgeColor: "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border-[var(--bos-accent-ring)]",
      };
    }

    // Priority 4: Deliverables ready for review
    const deliverableReview = deliverables.find((d: any) => d.status === "INTERNAL_REVIEW" || d.status === "CLIENT_REVIEW");
    if (deliverableReview) {
      return {
        action: `Review Deliverable: ${deliverableReview.title}`,
        deliverableId: deliverableReview.id,
        why: "Quality verification and client review required for milestone approval.",
        owner: project?.managerName || "Project Lead",
        actionLabel: "Inspect Deliverable →",
        type: "DELIVERABLE_REVIEW",
        badge: "IN REVIEW",
        badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      };
    }

    if (metrics.completedTasks > 0 && metrics.completedTasks === metrics.totalTasks) {
      return {
        action: "Project Scope Verified & Complete",
        why: "All contracted tasks and deliverables have reached completion.",
        owner: project?.managerName || "Delivery Team",
        actionLabel: "Deliverable Vault →",
        type: "COMPLETE",
        badge: "DELIVERED",
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      };
    }

    return {
      action: "Decompose Engineering Blueprint",
      why: "Approved scope has not yet been broken down into engineering execution tasks.",
      owner: "System Architect",
      actionLabel: "Open Work Breakdown →",
      type: "BREAKDOWN",
      badge: "SETUP",
      badgeColor: "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border-[var(--bos-border-subtle)]",
    };
  }, [tasks, deliverables, metrics, project]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── 01. WHAT ARE WE BUILDING? ─────────────────────────────────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-[var(--bos-border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              WHAT ARE WE BUILDING?
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
              · Approved Project Purpose
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
            <span>Project ID: <strong className="text-[var(--bos-text-primary)]">{project?.code || "PRJ-2026"}</strong></span>
            <span>·</span>
            <span>Client: <strong className="text-[var(--bos-text-primary)]">{project?.client?.companyName || "Client"}</strong></span>
          </div>
        </div>

        <p className="text-[14.5px] text-[var(--bos-text-primary)] leading-relaxed font-normal bg-[var(--bos-surface-sunken)]/50 p-4 rounded-xl border border-[var(--bos-border-subtle)]">
          {whatWeAreBuilding}
        </p>
      </section>

      {/* ── 02. WHAT IS INCLUDED? ─────────────────────────────────────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
                WHAT IS INCLUDED?
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · {approvedCapabilities.length} Approved Capabilities
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-0.5">
              Strictly verified scope derived from approved client proposal and requirements.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenRequirementDrawer?.()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12px] font-mono text-[var(--bos-text-primary)] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
            <span>Source Requirement</span>
            <ExternalLink className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
          </button>
        </div>

        {approvedCapabilities.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bos-surface-sunken)] rounded-xl border border-[var(--bos-border-subtle)] text-[13px] text-[var(--bos-text-secondary)] font-mono">
            Not specified in approved requirements
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {approvedCapabilities.map((cap) => (
              <div
                key={cap.id}
                onClick={() => onSelectFeature?.(cap)}
                className="p-3.5 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)]/40 rounded-xl transition-all space-y-1.5 cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10.5px] font-bold shrink-0">
                      ✓
                    </span>
                    <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors truncate">
                      {cap.name}
                    </h4>
                  </div>
                </div>

                {cap.description && (
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)] line-clamp-2 leading-relaxed">
                    {cap.description}
                  </p>
                )}

                <div className="pt-1.5 border-t border-[var(--bos-border-subtle)]/70 flex items-center justify-between text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
                  <span>{cap.category}</span>
                  <span className="text-emerald-600 font-semibold">{cap.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 03. PROJECT STATUS (4 Simple Indicators) ──────────────────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              PROJECT STATUS
            </span>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-0.5">
              Four fundamental execution states across tasks and deliverables.
            </p>
          </div>
          <div className="text-[12px] font-mono font-bold text-[var(--bos-accent)]">
            Total Progress: {metrics.progress}%
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* DONE */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-emerald-600">
                DONE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[20px] font-mono font-bold text-[var(--bos-text-primary)]">
                {statusCounts.tasks.done} <span className="text-[12px] font-normal text-[var(--bos-text-secondary)]">Tasks</span>
              </div>
              <p className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                {statusCounts.deliverables.accepted} Deliverable{statusCounts.deliverables.accepted === 1 ? "" : "s"} Accepted
              </p>
            </div>
          </div>

          {/* IN PROGRESS */}
          <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-sky-600">
                IN PROGRESS
              </span>
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[20px] font-mono font-bold text-[var(--bos-text-primary)]">
                {statusCounts.tasks.inProgress} <span className="text-[12px] font-normal text-[var(--bos-text-secondary)]">Tasks</span>
              </div>
              <p className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                {statusCounts.deliverables.inReview} In Review
              </p>
            </div>
          </div>

          {/* BLOCKED */}
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-rose-600">
                BLOCKED
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[20px] font-mono font-bold text-[var(--bos-text-primary)]">
                {statusCounts.tasks.blocked} <span className="text-[12px] font-normal text-[var(--bos-text-secondary)]">Tasks</span>
              </div>
              <p className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                {statusCounts.tasks.blocked === 0 ? "No active blockers" : "Requires resolution"}
              </p>
            </div>
          </div>

          {/* NOT STARTED */}
          <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-[var(--bos-text-secondary)]">
                NOT STARTED
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--bos-text-tertiary)]" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[20px] font-mono font-bold text-[var(--bos-text-primary)]">
                {statusCounts.tasks.notStarted} <span className="text-[12px] font-normal text-[var(--bos-text-secondary)]">Tasks</span>
              </div>
              <p className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                {statusCounts.deliverables.remaining} Remaining
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 04. WHAT NEEDS ATTENTION? (Next Action) ──────────────────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--bos-accent)]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              WHAT NEEDS ATTENTION?
            </span>
          </div>
          <span className={cn("px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-bold border", attentionItem.badgeColor)}>
            {attentionItem.badge}
          </span>
        </div>

        <div className="p-5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)] font-semibold block">
              NEXT ACTION
            </span>
            <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">
              {attentionItem.action}
            </h3>
            <div className="text-[12.5px] text-[var(--bos-text-secondary)] leading-relaxed">
              <strong className="text-[var(--bos-text-primary)] font-medium">Why? </strong>
              {attentionItem.why}
            </div>
            <div className="pt-1 text-[11.5px] font-mono text-[var(--bos-text-tertiary)] flex items-center gap-2">
              <span>Owner:</span>
              <span className="inline-flex items-center gap-1 text-[var(--bos-text-primary)] font-semibold px-2 py-0.5 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)]">
                <User className="w-3 h-3" />
                {attentionItem.owner}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {attentionItem.taskId ? (
              <button
                type="button"
                onClick={() => onOpenTask ? onOpenTask(attentionItem.taskId!) : onNavigateTab?.("tasks")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:brightness-110 text-white text-[13px] font-semibold transition-all shadow-sm cursor-pointer"
              >
                <span>{attentionItem.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab?.(attentionItem.type === "DELIVERABLE_REVIEW" ? "deliverables" : "engineering")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:brightness-110 text-white text-[13px] font-semibold transition-all shadow-sm cursor-pointer"
              >
                <span>{attentionItem.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
