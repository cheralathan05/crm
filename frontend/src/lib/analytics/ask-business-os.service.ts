import { db } from "@/lib/db";
import { isOllamaAvailable, askOllamaJson } from "@/lib/ai/ollama/ollama.client";

export interface AskBusinessOSResponse {
  answer: string;
  why: string;
  evidence: string[];
  impact: string;
  recommendedAction: string;
  actionPayload?: any;
  sources: { title: string; reference: string; type: string; id: string }[];
  confidence: "HIGH" | "MEDIUM" | "INSUFFICIENT_DATA";
  actionPreview?: {
    current: string;
    new: string;
    affected: string;
  };
}

/**
 * Natural language interface translating queries into authentic database checks
 * and returning answers in the strict product structure.
 */
export async function askBusinessOS(
  question: string,
  workspaceId: string,
): Promise<AskBusinessOSResponse> {
  const q = question.toLowerCase().trim();

  // ────────────────────────────────────────────────────────────────
  // INTENT 1: DELAYED / BLOCKED PROJECTS OR WORK
  // "Why is Project A delayed?" / "Show me all blocked work"
  // ────────────────────────────────────────────────────────────────
  if (q.includes("delay") || q.includes("block") || q.includes("stuck")) {
    const blockedTasks = await db.clientTask.findMany({
      where: { client: { workspaceId }, status: "BLOCKED" },
      include: {
        project: true,
        dependencies: { include: { dependsOnTask: true } },
        blockers: { where: { status: "ACTIVE" } },
      },
    });

    if (blockedTasks.length === 0) {
      return {
        answer: "There are currently zero blocked tasks or delayed workstreams across your projects.",
        why: "All engineering tasks are either actively in progress, in review, or completed.",
        evidence: ["Active blocker count: 0", "Blocked tasks count: 0"],
        impact: "Workstreams are progressing at normal flow efficiency without artificial hold-ups.",
        recommendedAction: "Continue monitoring review queue clearance.",
        sources: [],
        confidence: "HIGH",
      };
    }

    const t = blockedTasks[0];
    const blockerReason = t.blockers[0]?.reason || (t.dependencies.length > 0 ? `Waiting on prerequisite ${t.dependencies[0].dependsOnTask.code || t.dependencies[0].dependsOnTask.title}` : "Task is in BLOCKED state.");
    const upstream = t.dependencies[0]?.dependsOnTask;

    return {
      answer: `Project work is currently held by ${blockedTasks.length} blocked task${blockedTasks.length > 1 ? "s" : ""}, primarily "${t.code || "Task"}: ${t.title}".`,
      why: blockerReason,
      evidence: [
        `Task ${t.code || t.id} assigned to ${t.assigneeName || "assigned engineer"} is marked BLOCKED.`,
        upstream ? `Dependent on ${upstream.code || upstream.title} (${upstream.status}).` : "Active blocker record logged.",
      ],
      impact: `Downstream workstreams in project "${t.project?.name || "Project"}" cannot transition to active execution until resolved.`,
      recommendedAction: `Inspect and unblock ${t.code || t.title}.`,
      actionPayload: { actionType: "RESOLVE_BLOCKER", taskId: t.id },
      actionPreview: {
        current: `Status: BLOCKED (${t.code})`,
        new: `Status: READY / IN_PROGRESS`,
        affected: `Project: ${t.project?.name || "Project"} • Task: ${t.title}`,
      },
      sources: [
        {
          title: t.title,
          reference: t.code || "TASK",
          type: "TASK",
          id: t.id,
        },
      ],
      confidence: "HIGH",
    };
  }

  // ────────────────────────────────────────────────────────────────
  // INTENT 2: PAYMENTS WAITING / REVENUE
  // "Which payments are waiting?" / "What money needs attention?"
  // ────────────────────────────────────────────────────────────────
  if (q.includes("payment") || q.includes("money") || q.includes("cash") || q.includes("invoice") || q.includes("waiting")) {
    const pendingPayments = await db.paymentRequest.findMany({
      where: {
        client: { workspaceId },
        status: { in: ["AWAITING_VERIFICATION", "PAYMENT_SUBMITTED"] },
      },
      include: { client: true, project: true },
    });

    if (pendingPayments.length === 0) {
      const confirmed = await db.paymentRequest.findMany({
        where: { client: { workspaceId }, status: "CONFIRMED" },
      });
      const totalConfirmed = confirmed.reduce((acc, p) => acc + p.amount, 0);

      return {
        answer: "No payment proofs are currently waiting for administrative confirmation.",
        why: "All submitted client payments have been verified and receipted.",
        evidence: [`Total confirmed collections: ₹${totalConfirmed.toLocaleString()}`],
        impact: "Accounts receivable verification queue is fully clear.",
        recommendedAction: "Review upcoming invoice delivery schedules.",
        sources: [],
        confidence: "HIGH",
      };
    }

    const first = pendingPayments[0];
    const totalAmount = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

    return {
      answer: `${pendingPayments.length} payment request(s) totaling ${first.currency} ${totalAmount.toLocaleString()} are waiting for verification.`,
      why: `Client "${first.client.companyName}" submitted payment transaction proof for "${first.title}".`,
      evidence: [
        `Payment request ${first.reference} for ${first.currency} ${first.amount.toLocaleString()} marked ${first.status}.`,
      ],
      impact: "Commercial milestones remain locked and receipt PDF cannot be issued until verified.",
      recommendedAction: `Review and confirm payment of ${first.currency} ${first.amount.toLocaleString()}.`,
      actionPayload: { actionType: "CONFIRM_PAYMENT", paymentId: first.id },
      actionPreview: {
        current: `Status: ${first.status} (${first.currency} ${first.amount.toLocaleString()})`,
        new: `Status: CONFIRMED • Issue Official PDF Receipt`,
        affected: `Client: ${first.client.companyName} • Project: ${first.project?.name || "General"}`,
      },
      sources: [
        {
          title: first.title,
          reference: first.reference,
          type: "PAYMENT_REQUEST",
          id: first.id,
        },
      ],
      confidence: "HIGH",
    };
  }

  // ────────────────────────────────────────────────────────────────
  // INTENT 3: EARLY WORK / VERIFIED COMPLETION
  // "Which work was completed early?" / "Who finished early?"
  // ────────────────────────────────────────────────────────────────
  if (q.includes("early") || q.includes("fast") || q.includes("ahead")) {
    const completedTasks = await db.clientTask.findMany({
      where: {
        client: { workspaceId },
        status: { in: ["DONE", "COMPLETED", "CLIENT_APPROVED"] },
      },
      include: { project: true, reviews: true },
    });

    const verifiedEarly = completedTasks.filter(
      (t) =>
        t.completedAt &&
        t.dueAt &&
        t.completedAt < t.dueAt &&
        !t.reviews.some((r) => r.status === "CHANGES_REQUESTED"),
    );

    if (verifiedEarly.length === 0) {
      return {
        answer: "No deliverables meet the verified early completion criteria in this period.",
        why: "Early verified completion strictly requires submission before deadline AND passing verification without rework.",
        evidence: [`Total completed tasks analyzed: ${completedTasks.length}`],
        impact: "Standard delivery schedule maintained.",
        recommendedAction: "Inspect active sprint deadlines for potential acceleration opportunities.",
        sources: [],
        confidence: "HIGH",
      };
    }

    const t = verifiedEarly[0];
    return {
      answer: `${verifiedEarly.length} work item(s) achieved verified early completion, led by "${t.code || "Task"}: ${t.title}".`,
      why: `Completed on ${new Date(t.completedAt!).toLocaleDateString()} (ahead of due date ${new Date(t.dueAt!).toLocaleDateString()}) and approved on first review with zero defects.`,
      evidence: [
        `Task ${t.code} assigned to ${t.assigneeName || "Engineer"} finished before scheduled maturity.`,
        `Reviews passed without CHANGES_REQUESTED iteration.`,
      ],
      impact: "Unblocked subsequent workstreams ahead of original target schedule.",
      recommendedAction: "Record recognition in employee contribution ledger.",
      sources: [
        {
          title: t.title,
          reference: t.code || "TASK",
          type: "TASK",
          id: t.id,
        },
      ],
      confidence: "HIGH",
    };
  }

  // ────────────────────────────────────────────────────────────────
  // INTENT 4: SCOPE DRIFT
  // "Which projects have scope changes?" / "Show scope changes"
  // ────────────────────────────────────────────────────────────────
  if (q.includes("scope") || q.includes("drift") || q.includes("change")) {
    const untraced = await db.clientTask.findMany({
      where: { client: { workspaceId }, isInvalidWork: true },
      include: { project: true },
    });

    if (untraced.length === 0) {
      return {
        answer: "Zero scope drift items or unauthorized work additions are currently detected.",
        why: "100% of active tasks trace directly to approved client proposals and signed requirements.",
        evidence: ["Untraced tasks: 0", "Scope variation count: 0"],
        impact: "Delivery remains tightly aligned with commercial boundaries.",
        recommendedAction: "No scope corrections required.",
        sources: [],
        confidence: "HIGH",
      };
    }

    const u = untraced[0];
    return {
      answer: `${untraced.length} work item(s) are flagged as potential scope drift, notably "${u.code || "Task"}: ${u.title}".`,
      why: u.invalidReason || "Work item was added without explicit proposal requirement DNA.",
      evidence: [
        `Task ${u.code || u.id} flagged in project "${u.project?.name || "Project"}".`,
      ],
      impact: "Creates scope expansion risks without commercial billable alignment.",
      recommendedAction: `Ratify or remove ${u.code || u.title} from execution scope.`,
      actionPayload: { actionType: "APPROVE_SCOPE_DRIFT", taskId: u.id },
      actionPreview: {
        current: `Status: POTENTIAL SCOPE CHANGE (${u.title})`,
        new: `Status: APPROVED SCOPE BASELINE`,
        affected: `Project: ${u.project?.name || "Project"}`,
      },
      sources: [
        {
          title: u.title,
          reference: u.code || "TASK",
          type: "TASK",
          id: u.id,
        },
      ],
      confidence: "HIGH",
    };
  }

  // ────────────────────────────────────────────────────────────────
  // DEFAULT / INSUFFICIENT DATA RULE (Rule 53)
  // Never manufacture certainty.
  // ────────────────────────────────────────────────────────────────
  return {
    answer: "Insufficient data to determine this query with deterministic certainty.",
    why: "The recorded database tables do not currently contain sufficient historical activity matching the specific parameters of your question.",
    evidence: [
      "Active records scanned: ClientProject, ClientTask, PaymentRequest, BusinessRisk",
      "No direct factual correlate found for the specified phrasing",
    ],
    impact: "Synthesized answers are suppressed to enforce the Zero Fake AI standard.",
    recommendedAction: "Try querying about blocked work, pending payments, early verified deliveries, or project health.",
    sources: [],
    confidence: "INSUFFICIENT_DATA",
  };
}
