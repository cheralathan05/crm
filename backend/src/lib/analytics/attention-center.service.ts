import { db } from "@/lib/db";

export type AttentionItemCategory =
  | "PAYMENT_CONFIRMATION"
  | "OVERDUE_PAYMENT"
  | "WORK_IN_REVIEW"
  | "BLOCKED_WORK"
  | "SCOPE_DRIFT"
  | "PROPOSAL_CHANGE"
  | "PROJECT_RISK"
  | "REQUIREMENT_CLARIFICATION";

export interface AttentionItem {
  id: string;
  category: AttentionItemCategory;
  title: string;
  why: string;
  impact: string;
  owner: string;
  age: string;
  ageHours: number;
  sourceType: string;
  sourceId: string;
  sourceReference?: string;
  actionLabel: string;
  actionType: string;
  actionPayload: any;
  priorityScore: number;
  priorityReason: string;
  projectName?: string;
  clientName?: string;
  financialAmount?: number;
}

export interface AttentionFilter {
  category?: string;
  projectId?: string;
  severity?: "ALL" | "CRITICAL" | "HIGH" | "MEDIUM";
}

/**
 * Priority Engine (Rule 04):
 * Evaluates real factors without mysterious AI scores:
 * - Downstream work blocked (+40 pts)
 * - Financial impact (>₹10,000 = +30 pts; >0 = +15 pts)
 * - Client impact / waiting (+25 pts)
 * - Deadline proximity / overdue (+35 pts)
 * - Age / waiting duration (+1 pt per hour, capped at 30)
 */
export function calculatePriority(params: {
  downstreamCount: number;
  financialAmount: number;
  isClientWaiting: boolean;
  isOverdue: boolean;
  ageHours: number;
  severityBonus?: number;
}): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  if (params.downstreamCount > 0) {
    const pts = Math.min(40, params.downstreamCount * 20);
    score += pts;
    reasons.push(`Stalls ${params.downstreamCount} downstream task${params.downstreamCount > 1 ? "s" : ""}`);
  }

  if (params.financialAmount > 0) {
    if (params.financialAmount >= 10000) {
      score += 30;
      reasons.push(`Direct financial value: ₹${params.financialAmount.toLocaleString()}`);
    } else {
      score += 15;
      reasons.push(`Financial transaction: ₹${params.financialAmount.toLocaleString()}`);
    }
  }

  if (params.isOverdue) {
    score += 35;
    reasons.push("Past scheduled commitment deadline");
  }

  if (params.isClientWaiting) {
    score += 25;
    reasons.push("Client is waiting for administrative review");
  }

  const agePts = Math.min(30, Math.floor(params.ageHours * 1));
  if (agePts > 0) {
    score += agePts;
    reasons.push(`Waiting duration: ${params.ageHours}h`);
  }

  if (params.severityBonus) {
    score += params.severityBonus;
  }

  return {
    score,
    reason: reasons.length > 0 ? reasons.join(" • ") : "Standard operational queue",
  };
}

/**
 * Gathers and ranks all 100% authentic Attention Center items across the workspace.
 */
export async function getAttentionCenterItems(
  workspaceId: string,
  filters?: AttentionFilter,
): Promise<{ items: AttentionItem[]; totalCount: number; criticalCount: number }> {
  const now = new Date();
  const items: AttentionItem[] = [];

  // 1. Fetch Payment Requests requiring confirmation or overdue
  const paymentRequests = await db.paymentRequest.findMany({
    where: { client: { workspaceId } },
    include: {
      submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      client: true,
      project: true,
    },
  });

  for (const pay of paymentRequests) {
    const ageHours = Math.max(
      1,
      Math.round((now.getTime() - new Date(pay.updatedAt).getTime()) / (1000 * 60 * 60)),
    );

    if (pay.status === "AWAITING_VERIFICATION" || pay.status === "PAYMENT_SUBMITTED") {
      const priority = calculatePriority({
        downstreamCount: 1, // Milestones held
        financialAmount: pay.amount,
        isClientWaiting: true,
        isOverdue: false,
        ageHours,
      });

      items.push({
        id: `attn-pay-${pay.id}`,
        category: "PAYMENT_CONFIRMATION",
        title: `PAYMENT CONFIRMATION REQUIRED — ${pay.currency} ${pay.amount.toLocaleString()}`,
        why: `Client "${pay.client.companyName}" submitted proof for "${pay.title}". Waiting for Admin verification to issue receipt.`,
        impact: `Releases project billing stage and credits verified workspace cash reserves.`,
        owner: "Admin",
        age: `${ageHours}h old`,
        ageHours,
        sourceType: "PAYMENT_REQUEST",
        sourceId: pay.id,
        sourceReference: pay.reference,
        actionLabel: "CONFIRM PAYMENT",
        actionType: "CONFIRM_PAYMENT",
        actionPayload: { paymentId: pay.id, amount: pay.amount, currency: pay.currency },
        priorityScore: priority.score,
        priorityReason: priority.reason,
        projectName: pay.project?.name,
        clientName: pay.client.companyName,
        financialAmount: pay.amount,
      });
    } else if (
      (pay.status === "READY" || pay.status === "SENT" || pay.status === "VIEWED") &&
      pay.dueDate &&
      new Date(pay.dueDate) < now
    ) {
      const priority = calculatePriority({
        downstreamCount: 0,
        financialAmount: pay.amount,
        isClientWaiting: false,
        isOverdue: true,
        ageHours,
      });

      items.push({
        id: `attn-overdue-${pay.id}`,
        category: "OVERDUE_PAYMENT",
        title: `OVERDUE PAYMENT — ${pay.currency} ${pay.amount.toLocaleString()}`,
        why: `Payment request "${pay.title}" for ${pay.client.companyName} reached maturity on ${new Date(pay.dueDate).toLocaleDateString()}.`,
        impact: "Accounts receivable aging increases; project working capital is impacted.",
        owner: "Finance / Admin",
        age: `${ageHours}h overdue`,
        ageHours,
        sourceType: "PAYMENT_REQUEST",
        sourceId: pay.id,
        sourceReference: pay.reference,
        actionLabel: "SEND PAYMENT REMINDER",
        actionType: "SEND_REMINDER",
        actionPayload: { paymentId: pay.id },
        priorityScore: priority.score,
        priorityReason: priority.reason,
        projectName: pay.project?.name,
        clientName: pay.client.companyName,
        financialAmount: pay.amount,
      });
    }
  }

  // 2. Fetch Tasks: Blocked or In Review
  const tasks = await db.clientTask.findMany({
    where: {
      client: { workspaceId },
      status: { in: ["BLOCKED", "IN_REVIEW"] },
    },
    include: {
      project: { include: { client: true } },
      dependentOnMe: { include: { task: true } },
      blockers: { where: { status: "ACTIVE" } },
      reviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  for (const t of tasks) {
    const ageHours = Math.max(
      1,
      Math.round(
        (now.getTime() - new Date(t.updatedAt || t.createdAt).getTime()) / (1000 * 60 * 60)),
    );
    const downstreamCount = t.dependentOnMe.length;
    const isOverdue = t.dueAt ? new Date(t.dueAt) < now : false;

    if (t.status === "BLOCKED") {
      const activeBlocker = t.blockers[0];
      const priority = calculatePriority({
        downstreamCount,
        financialAmount: 0,
        isClientWaiting: false,
        isOverdue,
        ageHours,
        severityBonus: 10,
      });

      items.push({
        id: `attn-blk-${t.id}`,
        category: "BLOCKED_WORK",
        title: `WORK BLOCKED: ${t.code || "TASK"} — ${t.title}`,
        why: activeBlocker
          ? `Blocked by: ${activeBlocker.reason} (Owner: ${activeBlocker.ownerName || activeBlocker.ownerRole})`
          : `Task has unresolved dependencies holding execution.`,
        impact:
          downstreamCount > 0
            ? `Directly stalling ${downstreamCount} dependent downstream task${downstreamCount > 1 ? "s" : ""}.`
            : "Impacting workstream flow efficiency and completion velocity.",
        owner: t.assigneeName || "Assigned Engineer",
        age: `${ageHours}h blocked`,
        ageHours,
        sourceType: "TASK",
        sourceId: t.id,
        sourceReference: t.code,
        actionLabel: "RESOLVE BLOCKER",
        actionType: "RESOLVE_BLOCKER",
        actionPayload: { taskId: t.id, blockerId: activeBlocker?.id },
        priorityScore: priority.score,
        priorityReason: priority.reason,
        projectName: t.project?.name,
        clientName: t.project?.client?.companyName,
      });
    } else if (t.status === "IN_REVIEW") {
      const priority = calculatePriority({
        downstreamCount,
        financialAmount: 0,
        isClientWaiting: false,
        isOverdue,
        ageHours,
      });

      items.push({
        id: `attn-rev-${t.id}`,
        category: "WORK_IN_REVIEW",
        title: `WORK AWAITING REVIEW: ${t.code || "TASK"} — ${t.title}`,
        why: `Engineer ${t.assigneeName || ""} submitted proof. Awaiting architectural and acceptance verification.`,
        impact:
          downstreamCount > 0
            ? `Unlocks ${downstreamCount} subsequent task${downstreamCount > 1 ? "s" : ""} upon approval.`
            : "Pre-requisite for deliverable acceptance gate.",
        owner: "Lead Engineer / Admin",
        age: `${ageHours}h waiting`,
        ageHours,
        sourceType: "TASK",
        sourceId: t.id,
        sourceReference: t.code,
        actionLabel: "APPROVE WORK",
        actionType: "APPROVE_TASK_REVIEW",
        actionPayload: { taskId: t.id },
        priorityScore: priority.score,
        priorityReason: priority.reason,
        projectName: t.project?.name,
        clientName: t.project?.client?.companyName,
      });
    }
  }

  // 3. Fetch Scope Drift / Untraced Tasks
  const untracedTasks = await db.clientTask.findMany({
    where: {
      client: { workspaceId },
      isInvalidWork: true,
      status: { notIn: ["COMPLETED", "DONE", "CANCELLED"] },
    },
    include: { project: { include: { client: true } } },
  });

  for (const ut of untracedTasks) {
    items.push({
      id: `attn-drift-${ut.id}`,
      category: "SCOPE_DRIFT",
      title: `POTENTIAL SCOPE CHANGE: ${ut.code || "TASK"} — ${ut.title}`,
      why: `Work item is not traceable to approved proposal scope (${ut.invalidReason || "UNTRACED_SCOPE"}).`,
      impact: "Creates scope drift and unauthorized delivery commitments without commercial alignment.",
      owner: "Admin / Project Lead",
      age: "Requires Scope Gate Review",
      ageHours: 12,
      sourceType: "TASK",
      sourceId: ut.id,
      sourceReference: ut.code,
      actionLabel: "APPROVE SCOPE CHANGE",
      actionType: "APPROVE_SCOPE_DRIFT",
      actionPayload: { taskId: ut.id },
      priorityScore: 70,
      priorityReason: "Scope integrity protection • Untraced work item",
      projectName: ut.project?.name,
      clientName: ut.project?.client?.companyName,
    });
  }

  // 4. Fetch Open Business Risks
  const risks = await db.businessRisk.findMany({
    where: { workspaceId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
  });

  for (const r of risks) {
    items.push({
      id: `attn-risk-${r.id}`,
      category: "PROJECT_RISK",
      title: `PROJECT RISK: ${r.title}`,
      why: r.reason,
      impact: r.impact,
      owner: r.owner || "Admin",
      age: "Active Risk Register",
      ageHours: 24,
      sourceType: "BUSINESS_RISK",
      sourceId: r.id,
      actionLabel: "MITIGATE RISK",
      actionType: "RESOLVE_RISK",
      actionPayload: { riskId: r.id },
      priorityScore: 65,
      priorityReason: `Operational risk • ${r.category}`,
    });
  }

  // Sort descending by priorityScore
  items.sort((a, b) => b.priorityScore - a.priorityScore);

  // Apply optional category or severity filters
  let filteredItems = items;
  if (filters?.category && filters.category !== "ALL") {
    filteredItems = filteredItems.filter((i) => i.category === filters.category);
  }
  if (filters?.projectId) {
    filteredItems = filteredItems.filter((i) => i.projectName?.includes(filters.projectId!));
  }
  if (filters?.severity === "CRITICAL") {
    filteredItems = filteredItems.filter((i) => i.priorityScore >= 80);
  } else if (filters?.severity === "HIGH") {
    filteredItems = filteredItems.filter((i) => i.priorityScore >= 60);
  }

  const criticalCount = items.filter((i) => i.priorityScore >= 80).length;

  return {
    items: filteredItems,
    totalCount: items.length,
    criticalCount,
  };
}
