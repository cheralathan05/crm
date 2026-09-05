import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;

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
    return NextResponse.json({ ok: false, message: "Payment link is invalid or expired." }, { status: 404 });
  }

  // Update viewed status if first time or still in SENT state
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

    await db.financialAuditLog.create({
      data: {
        requestId: request.id,
        actorName: request.client.companyName,
        action: "VIEWED",
        entityType: "PAYMENT_REQUEST",
        entityId: request.id,
        reason: "Client opened secure payment portal view",
      },
    });
  }

  // Calculate project financial metrics
  const totalProjectBudget = request.project?.budget || request.amount;
  const totalPaidTransactions = request.transactions.reduce((acc, t) => acc + t.amount, 0);
  const remainingProjectBalance = Math.max(0, totalProjectBudget - totalPaidTransactions);

  return NextResponse.json({
    ok: true,
    data: {
      id: request.id,
      reference: request.reference,
      title: request.title,
      reason: request.reason,
      amount: request.amount,
      currency: request.currency,
      status: request.status,
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
            upiId: request.sessions[0].upiId || request.payeeUpi || "businessos@hdfcbank",
            payeeMobile: request.sessions[0].payeeMobile || request.payeeMobile || "+91 98765 43210",
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
            clarificationPrompt: request.submissions[0].clarificationPrompt,
            rejectionReason: request.submissions[0].rejectionReason,
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
    },
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;

  const request = await db.paymentRequest.findUnique({
    where: { tokenHash: token },
  });

  if (!request) {
    return NextResponse.json({ ok: false, message: "Payment request not found." }, { status: 404 });
  }

  if (request.status === "CONFIRMED") {
    return NextResponse.json({ ok: false, message: "This payment request has already been confirmed." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { amountPaid, paymentDate, paymentMethod, transactionRef, note, proofPath, proofFileName } = body;

    if (!transactionRef || !transactionRef.trim()) {
      return NextResponse.json({ ok: false, message: "Bank transaction / UTR reference number is required." }, { status: 400 });
    }

    const amount = Number(amountPaid) || request.amount;

    const submission = await db.$transaction(async (tx) => {
      const sub = await tx.paymentSubmission.create({
        data: {
          requestId: request.id,
          amountPaid: amount,
          currency: request.currency,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod || "UPI",
          transactionRef: transactionRef.trim(),
          note: note ? String(note).trim() : null,
          proofPath: proofPath || null,
          proofFileName: proofFileName || null,
          status: "SUBMITTED",
        },
      });

      await tx.paymentRequest.update({
        where: { id: request.id },
        data: {
          status: "AWAITING_VERIFICATION",
          submittedAt: new Date(),
        },
      });

      await tx.financialAuditLog.create({
        data: {
          requestId: request.id,
          actorName: "Client",
          action: "SUBMISSION_RECEIVED",
          entityType: "SUBMISSION",
          entityId: sub.id,
          afterState: JSON.stringify({
            amountPaid: amount,
            transactionRef,
            paymentMethod,
          }),
          reason: "Client submitted payment reference for verification",
        },
      });

      return sub;
    });

    return NextResponse.json({ ok: true, data: submission });
  } catch (err: any) {
    console.error("[api/client/payments] POST error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to submit payment proof" }, { status: 400 });
  }
}
