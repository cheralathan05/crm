import { db } from "@/lib/db";

export interface CommercialMetric {
  proposalTotalValue: number;
  approvedChangesValue: number;
  currentContractValue: number;
  invoicedValue: number;
  confirmedPaymentsValue: number;
  outstandingValue: number;
  currency: string;
  profitabilityStatement: string; // "Profitability unavailable — cost data has not been recorded."
}

export interface CashflowItem {
  id: string;
  type: "ACTUAL_CONFIRMED" | "EXPECTED_INCOMING" | "OVERDUE";
  amount: number;
  currency: string;
  dueDateOrConfirmedDate: string;
  clientName: string;
  projectName?: string;
  reference: string;
  status: string;
}

export interface PaymentReconciliationItem {
  id: string;
  requestCode: string;
  title: string;
  clientName: string;
  requestedAmount: number;
  submittedAmount: number;
  difference: number;
  submissionDate: string;
  paymentMethod: string;
  status: "RECONCILIATION_REQUIRED" | "ALIGNED";
}

export interface DataLineageStep {
  label: string;
  amount: number;
  operator: "+" | "-" | "=";
  source: string;
}

export interface CommercialCashflowReport {
  commercial: CommercialMetric;
  cashflowTimeline: CashflowItem[];
  reconciliations: PaymentReconciliationItem[];
  outstandingLineage: DataLineageStep[];
}

/**
 * Computes Commercial Intelligence, Cashflow distribution, Payment Reconciliation,
 * and transparent Data Lineage from real database records.
 */
export async function getCommercialAndCashflow(
  workspaceId: string,
): Promise<CommercialCashflowReport> {
  const now = new Date();

  // 1. Proposals
  const proposals = await db.clientProposal.findMany({
    where: { client: { workspaceId } },
    include: { client: true },
  });

  // 2. Payment Requests & Submissions
  const paymentRequests = await db.paymentRequest.findMany({
    where: { client: { workspaceId } },
    include: {
      submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      transactions: true,
      client: true,
      project: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let proposalTotal = 0;
  let confirmedTotal = 0;
  let outstandingTotal = 0;
  let invoicedTotal = 0;

  for (const p of proposals) {
    proposalTotal += p.amount || 0;
  }

  const cashflowTimeline: CashflowItem[] = [];
  const reconciliations: PaymentReconciliationItem[] = [];

  for (const pr of paymentRequests) {
    invoicedTotal += pr.amount;

    if (pr.status === "CONFIRMED") {
      confirmedTotal += pr.amount;
      cashflowTimeline.push({
        id: `cf-act-${pr.id}`,
        type: "ACTUAL_CONFIRMED",
        amount: pr.amount,
        currency: pr.currency,
        dueDateOrConfirmedDate: pr.confirmedAt ? pr.confirmedAt.toISOString() : pr.updatedAt.toISOString(),
        clientName: pr.client.companyName,
        projectName: pr.project?.name,
        reference: pr.reference,
        status: "CONFIRMED",
      });
    } else {
      outstandingTotal += pr.amount;
      const isOverdue = pr.dueDate && new Date(pr.dueDate) < now;

      cashflowTimeline.push({
        id: `cf-exp-${pr.id}`,
        type: isOverdue ? "OVERDUE" : "EXPECTED_INCOMING",
        amount: pr.amount,
        currency: pr.currency,
        dueDateOrConfirmedDate: pr.dueDate ? pr.dueDate.toISOString() : pr.createdAt.toISOString(),
        clientName: pr.client.companyName,
        projectName: pr.project?.name,
        reference: pr.reference,
        status: pr.status,
      });

      // Check for reconciliation issues
      const sub = pr.submissions[0];
      if (sub) {
        const diff = sub.amountPaid - pr.amount;
        if (Math.abs(diff) > 0.01) {
          reconciliations.push({
            id: `rec-${pr.id}`,
            requestCode: pr.reference,
            title: pr.title,
            clientName: pr.client.companyName,
            requestedAmount: pr.amount,
            submittedAmount: sub.amountPaid,
            difference: diff,
            submissionDate: sub.submittedAt.toISOString(),
            paymentMethod: sub.paymentMethod,
            status: "RECONCILIATION_REQUIRED",
          });
        }
      }
    }
  }

  // Contract value = proposal value
  const currency = paymentRequests[0]?.currency || "INR";

  // Data Lineage for Outstanding
  const outstandingLineage: DataLineageStep[] = [
    {
      label: "Total Invoiced Billing Requests",
      amount: invoicedTotal,
      operator: "+",
      source: `Sum of ${paymentRequests.length} PaymentRequest records.`,
    },
    {
      label: "Confirmed Settled Cash",
      amount: confirmedTotal,
      operator: "-",
      source: `Sum of PaymentRequest records with status = CONFIRMED.`,
    },
    {
      label: "Net Outstanding Balance",
      amount: outstandingTotal,
      operator: "=",
      source: "Result of Invoiced minus Confirmed Cash.",
    },
  ];

  return {
    commercial: {
      proposalTotalValue: proposalTotal,
      approvedChangesValue: 0,
      currentContractValue: proposalTotal,
      invoicedValue: invoicedTotal,
      confirmedPaymentsValue: confirmedTotal,
      outstandingValue: outstandingTotal,
      currency,
      profitabilityStatement:
        "Profitability unavailable — cost data has not been recorded.", // Rule 36: NEVER GUESS COST.
    },
    cashflowTimeline,
    reconciliations,
    outstandingLineage,
  };
}
