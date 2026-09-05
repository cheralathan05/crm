import { ClientPaymentView } from "@/components/payments/client/client-payment-view";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Pre-fetch initial data server-side
  const request = await db.paymentRequest.findUnique({
    where: { tokenHash: token },
    include: {
      client: { select: { id: true, companyName: true, email: true } },
      project: { select: { id: true, name: true, code: true, budget: true, currency: true } },
      milestone: { select: { id: true, title: true, phase: true, paymentAmount: true, invoiceStatus: true } },
      sessions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
      submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      receipts: { orderBy: { createdAt: "desc" }, take: 1 },
      transactions: { orderBy: { confirmedAt: "desc" } },
    },
  });

  if (!request) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-3">
          <h2 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
            Invalid Payment Link
          </h2>
          <p className="text-[13px] text-[var(--bos-text-secondary)]">
            This payment link does not exist or has expired.
          </p>
        </div>
      </div>
    );
  }

  // Update viewed status if first time
  if (request.status === "SENT" || request.status === "READY") {
    await db.paymentRequest.update({
      where: { id: request.id },
      data: {
        status: "VIEWED",
        firstViewedAt: request.firstViewedAt || new Date(),
        lastViewedAt: new Date(),
        viewCount: { increment: 1 },
      },
    });
  }

  const totalProjectBudget = request.project?.budget || request.amount;
  const totalPaidTransactions = request.transactions.reduce((acc, t) => acc + t.amount, 0);
  const remainingProjectBalance = Math.max(0, totalProjectBudget - totalPaidTransactions);

  const initialData = {
    id: request.id,
    reference: request.reference,
    title: request.title,
    reason: request.reason,
    amount: request.amount,
    currency: request.currency,
    status: request.status === "SENT" || request.status === "READY" ? "VIEWED" : request.status,
    dueDate: request.dueDate?.toISOString() ?? null,
    client: request.client,
    project: request.project,
    milestone: request.milestone,
    financials: {
      agreedTotal: totalProjectBudget,
      paidSoFar: totalPaidTransactions,
      thisPayment: request.amount,
      remainingBalance: remainingProjectBalance,
    },
    session: request.sessions[0]
      ? {
          id: request.sessions[0].id,
          qrPayload: request.sessions[0].qrPayload,
          upiId: request.sessions[0].upiId,
          expiresAt: request.sessions[0].expiresAt.toISOString(),
        }
      : null,
    submission: request.submissions[0]
      ? {
          id: request.submissions[0].id,
          amountPaid: request.submissions[0].amountPaid,
          paymentDate: request.submissions[0].paymentDate.toISOString(),
          paymentMethod: request.submissions[0].paymentMethod,
          transactionRef: request.submissions[0].transactionRef,
          status: request.submissions[0].status,
          note: request.submissions[0].note,
          proofPath: request.submissions[0].proofPath,
          submittedAt: request.submissions[0].submittedAt.toISOString(),
        }
      : null,
    receipt: request.receipts[0]
      ? {
          id: request.receipts[0].id,
          receiptNumber: request.receipts[0].receiptNumber,
          confirmedAt: request.receipts[0].confirmedAt.toISOString(),
          confirmedByName: request.receipts[0].confirmedByName,
          pdfPath: request.receipts[0].pdfPath,
        }
      : null,
  };

  return <ClientPaymentView token={token} initialData={initialData} />;
}
