import { db } from "@/lib/db";

export interface TraceabilityNode {
  proposalRef?: string;
  requirementTitle?: string;
  deliverableTitle?: string;
  taskCode: string;
  taskTitle: string;
  workstream: string;
  assigneeName?: string;
  proofUrl?: string;
  reviewStatus?: string;
  isComplete: boolean;
  hasTraceability: boolean;
  untraceableReason?: string;
}

export interface ScopeDriftItem {
  id: string;
  taskCode: string;
  taskTitle: string;
  projectName: string;
  clientName: string;
  category: "UNAPPROVED_ADDITION" | "ORPHANED_WORK" | "SPEC_MODIFIED" | "CHANGE_REQUEST_PENDING";
  description: string;
  flagText: "POTENTIAL SCOPE CHANGE" | "TRACEABILITY REQUIRED";
  severity: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  actionPayload: any;
}

export interface ScopeDriftReport {
  traceabilityRate: number; // e.g. 96%
  totalTasksAnalyzed: number;
  traceableTasksCount: number;
  untraceableTasksCount: number;
  driftItems: ScopeDriftItem[];
  sampleTraceChain: TraceabilityNode[];
}

/**
 * Compares approved proposal specifications against active execution items
 * to identify Scope Drift and Requirement Traceability gaps.
 */
export async function getScopeDriftAnalysis(
  workspaceId: string,
  projectId?: string,
): Promise<ScopeDriftReport> {
  const whereClause: any = { client: { workspaceId } };
  if (projectId) {
    whereClause.id = projectId;
  }

  const projects = await db.clientProject.findMany({
    where: whereClause,
    include: {
      client: true,
      proposal: true,
      deliverables: true,
      tasks: {
        include: {
          submissions: { take: 1, orderBy: { createdAt: "desc" } },
          reviews: { take: 1, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  const driftItems: ScopeDriftItem[] = [];
  const traceNodes: TraceabilityNode[] = [];
  let totalTasks = 0;
  let traceableCount = 0;

  for (const prj of projects) {
    const proposal = prj.proposal;

    for (const t of prj.tasks) {
      totalTasks++;

      // Check traceability DNA
      const hasProposalRef = Boolean(t.sourceProposalReference || t.sourceProposalId || proposal);
      const hasReqRef = Boolean(t.sourceRequirementId || t.sourceRequirementTitle);
      const hasDeliverableRef = Boolean(t.deliverableId || t.sourceDeliverableTitle);
      const isUntraced = t.isInvalidWork || (!hasProposalRef && !hasReqRef && !hasDeliverableRef);

      if (!isUntraced) {
        traceableCount++;
      } else {
        driftItems.push({
          id: `drift-${t.id}`,
          taskCode: t.code || "TASK",
          taskTitle: t.title,
          projectName: prj.name,
          clientName: prj.client.companyName,
          category: t.isInvalidWork ? "UNAPPROVED_ADDITION" : "ORPHANED_WORK",
          description: t.invalidReason || "Work item created outside approved proposal deliverables baseline.",
          flagText: t.isInvalidWork ? "POTENTIAL SCOPE CHANGE" : "TRACEABILITY REQUIRED",
          severity: t.status === "IN_PROGRESS" || t.status === "DONE" ? "HIGH" : "MEDIUM",
          createdAt: t.createdAt.toISOString(),
          actionPayload: { taskId: t.id, projectId: prj.id },
        });
      }

      // Record sample trace node
      if (traceNodes.length < 15) {
        traceNodes.push({
          proposalRef: t.sourceProposalReference || proposal?.reference || "PROP-2026-001",
          requirementTitle: t.sourceRequirementTitle || "Core Architecture Specification",
          deliverableTitle: t.sourceDeliverableTitle || prj.deliverables[0]?.title || "Architecture Foundation",
          taskCode: t.code || "TASK",
          taskTitle: t.title,
          workstream: t.workstream || t.layer || "Fullstack",
          assigneeName: t.assigneeName || "Assigned Engineer",
          proofUrl: t.proofUrl || t.submissions[0]?.proofUrl || undefined,
          reviewStatus: t.reviews[0]?.status || (t.status === "DONE" ? "PASSED" : undefined),
          isComplete: t.status === "DONE" || t.status === "COMPLETED",
          hasTraceability: !isUntraced,
          untraceableReason: isUntraced ? t.invalidReason || "No recorded requirement DNA" : undefined,
        });
      }
    }
  }

  const traceabilityRate = totalTasks > 0 ? Math.round((traceableCount / totalTasks) * 100) : 100;

  return {
    traceabilityRate,
    totalTasksAnalyzed: totalTasks,
    traceableTasksCount: traceableCount,
    untraceableTasksCount: driftItems.length,
    driftItems,
    sampleTraceChain: traceNodes,
  };
}
