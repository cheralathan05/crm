import { db } from "@/lib/db";
import { PaymentStory } from "./payment-types";

export async function getPaymentStory(requestId: string): Promise<PaymentStory | null> {
  const request = await db.paymentRequest.findUnique({
    where: { id: requestId },
    include: {
      client: true,
      project: true,
      proposal: true,
      milestone: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 1 },
      submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      transactions: { orderBy: { confirmedAt: "desc" }, take: 1 },
      receipts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!request) return null;

  const session = request.sessions[0] || null;
  const submission = request.submissions[0] || null;
  const transaction = request.transactions[0] || null;
  const receipt = request.receipts[0] || null;

  return {
    why: {
      reason: request.reason,
      title: request.title,
      milestoneName: request.milestone?.title,
      proposalReference: request.proposal?.reference ?? undefined,
    },
    source: {
      type: request.milestone ? "MILESTONE" : request.proposal ? "COMMERCIAL_SCOPE" : "STANDALONE",
      reference: request.milestone?.phase || request.proposal?.reference || undefined,
      agreedValue: request.milestone?.paymentAmount || request.amount,
      currency: request.currency,
    },
    request: {
      id: request.id,
      reference: request.reference,
      amount: request.amount,
      currency: request.currency,
      status: request.status as any,
      dueDate: request.dueDate?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      tokenUrl: `/pay/${request.tokenHash}`,
    },
    session: session
      ? {
          id: session.id,
          qrPayload: session.qrPayload,
          upiId: session.upiId,
          status: session.status,
          expiresAt: session.expiresAt.toISOString(),
        }
      : null,
    submission: submission
      ? {
          id: submission.id,
          amountPaid: submission.amountPaid,
          paymentDate: submission.paymentDate.toISOString(),
          paymentMethod: submission.paymentMethod,
          transactionRef: submission.transactionRef,
          status: submission.status,
          proofPath: submission.proofPath,
          submittedAt: submission.submittedAt.toISOString(),
          clarificationPrompt: submission.clarificationPrompt,
          rejectionReason: submission.rejectionReason,
          note: submission.note,
        }
      : null,
    transaction: transaction
      ? {
          id: transaction.id,
          transactionNumber: transaction.transactionNumber,
          amount: transaction.amount,
          confirmedAt: transaction.confirmedAt.toISOString(),
          confirmedByName: transaction.confirmedByName,
          reference: transaction.reference,
        }
      : null,
    receipt: receipt
      ? {
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          confirmedAt: receipt.confirmedAt.toISOString(),
          downloadUrl: `/api/documents/${receipt.id}/file`,
        }
      : null,
  };
}

export async function getAdminPaymentDashboardData() {
  // 1. Action Required metrics
  const [
    awaitingVerificationRequests,
    confirmedTransactions,
    allRequests,
    receipts,
  ] = await Promise.all([
    db.paymentRequest.findMany({
      where: { status: { in: ["AWAITING_VERIFICATION", "PAYMENT_SUBMITTED"] } },
      include: {
        client: true,
        project: true,
        submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.paymentTransaction.findMany({
      include: { client: true, project: true, request: true },
      orderBy: { confirmedAt: "desc" },
      take: 20,
    }),
    db.paymentRequest.findMany({
      include: {
        client: true,
        project: true,
        milestone: true,
        submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
        receipts: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.paymentReceipt.findMany({
      include: { client: true, project: true, transaction: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // 2. Calculate Totals directly from DB
  const totalConfirmed = confirmedTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Total project budgets in workspace
  const projects = await db.clientProject.findMany({
    select: { budget: true, code: true, name: true, currency: true },
  });
  const totalAgreedValue = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const outstandingBalance = Math.max(0, totalAgreedValue - totalConfirmed);

  const awaitingAmount = awaitingVerificationRequests.reduce((acc, r) => acc + r.amount, 0);

  // 3. Money in Motion Pipeline
  const moneyInMotion = {
    requested: allRequests.filter((r) => r.status === "READY" || r.status === "SENT").length,
    viewed: allRequests.filter((r) => r.status === "VIEWED").length,
    started: allRequests.filter((r) => r.status === "PAYMENT_STARTED").length,
    awaitingVerification: awaitingVerificationRequests.length,
    confirmed: allRequests.filter((r) => r.status === "CONFIRMED").length,
    receiptIssued: receipts.length,
  };

  // 4. Overdue count
  const now = new Date();
  const overdueRequests = allRequests.filter(
    (r) => r.dueDate && new Date(r.dueDate) < now && r.status !== "CONFIRMED"
  );

  return {
    metrics: {
      totalAgreedValue,
      totalConfirmed,
      outstandingBalance,
      awaitingCount: awaitingVerificationRequests.length,
      awaitingAmount,
      overdueCount: overdueRequests.length,
      currency: "INR",
    },
    moneyInMotion,
    awaitingVerification: awaitingVerificationRequests.map((r) => ({
      id: r.id,
      reference: r.reference,
      title: r.title,
      reason: r.reason,
      amount: r.amount,
      currency: r.currency,
      clientName: r.client.companyName,
      projectName: r.project?.name,
      submittedAt: r.submittedAt?.toISOString() || r.updatedAt.toISOString(),
      submission: r.submissions[0]
        ? {
            id: r.submissions[0].id,
            amountPaid: r.submissions[0].amountPaid,
            transactionRef: r.submissions[0].transactionRef,
            paymentMethod: r.submissions[0].paymentMethod,
            paymentDate: r.submissions[0].paymentDate.toISOString(),
            proofPath: r.submissions[0].proofPath,
            note: r.submissions[0].note,
          }
        : null,
    })),
    recentTransactions: confirmedTransactions.map((t) => ({
      id: t.id,
      transactionNumber: t.transactionNumber,
      amount: t.amount,
      currency: t.currency,
      clientName: t.client.companyName,
      projectName: t.project?.name,
      paymentMethod: t.paymentMethod,
      reference: t.reference,
      confirmedAt: t.confirmedAt.toISOString(),
      confirmedByName: t.confirmedByName,
    })),
    requests: allRequests.map((r) => ({
      id: r.id,
      reference: r.reference,
      title: r.title,
      reason: r.reason,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      clientName: r.client.companyName,
      projectName: r.project?.name,
      milestoneTitle: r.milestone?.title,
      dueDate: r.dueDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      tokenHash: r.tokenHash,
      receiptNumber: r.receipts[0]?.receiptNumber,
    })),
    receipts: receipts.map((rec) => ({
      id: rec.id,
      receiptNumber: rec.receiptNumber,
      amount: rec.amount,
      currency: rec.currency,
      clientName: rec.client.companyName,
      projectName: rec.project?.name,
      paymentDate: rec.paymentDate.toISOString(),
      reference: rec.reference,
      confirmedByName: rec.confirmedByName,
      pdfPath: rec.pdfPath,
    })),
  };
}
