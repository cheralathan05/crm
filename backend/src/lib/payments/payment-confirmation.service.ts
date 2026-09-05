import { db } from "@/lib/db";
import { ConfirmPaymentInput } from "./payment-types";
import { generateReceiptPdf } from "./receipt-pdf.service";
import { sendMail } from "@/lib/mail";

async function generateTransactionNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await db.paymentTransaction.count();
  const seq = String(count + 1).padStart(6, "0");
  return `TXN-${currentYear}-${seq}`;
}

async function generateReceiptNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await db.paymentReceipt.count();
  const seq = String(count + 1).padStart(6, "0");
  return `REC-${currentYear}-${seq}`;
}

export async function confirmPayment(input: ConfirmPaymentInput) {
  // 1. Fetch Request with all relations
  const request = await db.paymentRequest.findUnique({
    where: { id: input.requestId },
    include: {
      client: { include: { workspace: true } },
      project: true,
      milestone: true,
      submissions: {
        where: input.submissionId ? { id: input.submissionId } : undefined,
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!request) {
    throw new Error("Payment request not found.");
  }

  if (request.status === "CONFIRMED") {
    throw new Error("Payment request is already confirmed.");
  }

  const submission = request.submissions[0] || null;
  const confirmedByName = input.confirmedByName || "Admin";
  const confirmedAt = new Date();

  const transactionNumber = await generateTransactionNumber();
  const receiptNumber = await generateReceiptNumber();

  const amount = submission ? submission.amountPaid : request.amount;
  const currency = submission ? submission.currency : request.currency;
  const reference = submission ? submission.transactionRef : `OFFLINE-${Date.now()}`;
  const paymentMethod = submission ? submission.paymentMethod : "DIRECT_CONFIRMATION";

  // 2. Run Atomic Prisma Transaction
  const result = await db.$transaction(async (tx) => {
    // A. Create Confirmed Transaction
    const transaction = await tx.paymentTransaction.create({
      data: {
        transactionNumber,
        clientId: request.clientId,
        projectId: request.projectId,
        requestId: request.id,
        submissionId: submission?.id ?? null,
        amount,
        currency,
        allocatedAmount: amount,
        paymentMethod,
        reference,
        confirmedAt,
        confirmedById: input.confirmedById ?? null,
        confirmedByName,
        status: "CONFIRMED",
      },
    });

    // B. Create Payment Allocation
    const allocation = await tx.paymentAllocation.create({
      data: {
        transactionId: transaction.id,
        requestId: request.id,
        milestoneId: request.milestoneId,
        amount,
        currency,
        allocatedAt: confirmedAt,
      },
    });

    // C. Update Payment Request
    const updatedRequest = await tx.paymentRequest.update({
      where: { id: request.id },
      data: {
        status: "CONFIRMED",
        confirmedAt,
      },
    });

    // D. Update Submission if present
    if (submission) {
      await tx.paymentSubmission.update({
        where: { id: submission.id },
        data: {
          status: "VERIFIED",
          reviewedAt: confirmedAt,
          reviewedByName: confirmedByName,
        },
      });
    }

    // E. Update Project Milestone to PAID if linked
    if (request.milestoneId) {
      await tx.projectMilestone.update({
        where: { id: request.milestoneId },
        data: {
          invoiceStatus: "PAID",
          status: "COMPLETED",
          completedAt: confirmedAt,
        },
      });
    }

    // F. Create Receipt Record
    const receipt = await tx.paymentReceipt.create({
      data: {
        receiptNumber,
        transactionId: transaction.id,
        clientId: request.clientId,
        projectId: request.projectId,
        requestId: request.id,
        amount,
        currency,
        paymentDate: submission?.paymentDate || confirmedAt,
        paymentMethod,
        reference,
        confirmedByName,
        confirmedAt,
        status: "ISSUED",
      },
    });

    // G. Audit Log
    await tx.financialAuditLog.create({
      data: {
        requestId: request.id,
        actorName: confirmedByName,
        action: "CONFIRMED",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        beforeState: JSON.stringify({ status: request.status }),
        afterState: JSON.stringify({
          status: "CONFIRMED",
          transactionNumber,
          receiptNumber,
          amount,
        }),
        reason: input.note || "Admin confirmed payment receipt into official ledger",
      },
    });

    return { transaction, allocation, updatedRequest, receipt };
  });

  // 3. Post-Transaction: Generate Official Receipt PDF
  let pdfResult: { storagePath: string; size: number; pageCount: number } | null = null;
  try {
    pdfResult = await generateReceiptPdf({
      receiptNumber,
      transactionNumber,
      paymentDate: submission?.paymentDate || confirmedAt,
      confirmedAt,
      confirmedByName,
      clientName: request.client.companyName,
      projectName: request.project?.name,
      projectCode: request.project?.code,
      reason: request.reason,
      amount,
      currency,
      paymentMethod,
      reference,
      companyName: request.client.workspace?.companyName,
    });

    // Update receipt with storage path
    await db.paymentReceipt.update({
      where: { id: result.receipt.id },
      data: { pdfPath: pdfResult.storagePath },
    });
  } catch (pdfErr) {
    console.error("[payment-confirmation] Receipt PDF generation failed:", pdfErr);
    await db.paymentReceipt.update({
      where: { id: result.receipt.id },
      data: { status: "GENERATION_FAILED" },
    });
  }

  // 4. Register Receipt into the Document Operating Layer
  if (pdfResult) {
    try {
      const bDoc = await db.businessDocument.create({
        data: {
          title: `Payment Receipt — ${receiptNumber}`,
          reference: receiptNumber,
          fileName: `${receiptNumber}.pdf`,
          category: "PAYMENT_RECEIPT",
          status: "APPROVED",
          healthState: "READY",
          storagePath: pdfResult.storagePath,
          mimeType: "application/pdf",
          fileSize: pdfResult.size,
          pageCount: 1,
          version: 1,
          isCurrentVersion: true,
          sourceType: "PAYMENT_RECEIPT",
          sourceId: result.receipt.id,
          clientId: request.clientId,
          projectId: request.projectId,
          proposalId: request.proposalId,
          summary: `Official confirmed payment receipt for ${request.reason} (${currency} ${amount.toLocaleString("en-IN")})`,
          createdByName: confirmedByName,
        },
      });

      await db.documentVersionRecord.create({
        data: {
          documentId: bDoc.id,
          version: 1,
          title: `Official Receipt — ${receiptNumber}`,
          fileName: `${receiptNumber}.pdf`,
          storagePath: pdfResult.storagePath,
          fileSize: pdfResult.size,
          pageCount: 1,
          status: "APPROVED",
          isCurrent: true,
          createdByName: confirmedByName,
        },
      });
    } catch (docErr) {
      console.error("[payment-confirmation] Failed to register receipt in Document Operating Layer:", docErr);
    }
  }

  // 5. Send Client Confirmation Email with PDF Download Link & Attached PDF
  try {
    const primaryContact = await db.contact.findFirst({
      where: { clientId: request.clientId, isPrimary: true },
    }) || await db.contact.findFirst({
      where: { clientId: request.clientId },
    });

    const targetEmail = primaryContact?.email || "billing@zerotouch.internal";
    const receiptUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/pay/${request.tokenHash}?receipt=${receiptNumber}`;
    const formattedAmount = `${currency} ${amount.toLocaleString("en-IN")}`;

    // Read PDF file as attachment if it exists
    let attachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined = undefined;
    if (pdfResult?.storagePath) {
      try {
        const fs = await import("fs");
        if (fs.existsSync(pdfResult.storagePath)) {
          const buffer = await fs.promises.readFile(pdfResult.storagePath);
          attachments = [
            {
              filename: `${receiptNumber}.pdf`,
              content: buffer,
              contentType: "application/pdf",
            },
          ];
        }
      } catch (attachErr) {
        console.warn("[payment-confirmation] Could not read PDF for email attachment:", attachErr);
      }
    }

    await sendMail({
      to: targetEmail,
      subject: `Payment Confirmed: ${formattedAmount} — ${request.client.workspace?.companyName || "Business OS"} (Receipt: ${receiptNumber})`,
      attachments,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e7e2d8; border-radius: 8px; background: #fffdf9;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background: #2b7a4b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
              Payment Confirmed
            </span>
          </div>
          <h2 style="color: #1a1714; text-align: center; margin-top: 8px;">Receipt: ${receiptNumber}</h2>
          <p style="text-align: center; font-size: 24px; font-weight: bold; color: #b5452a; margin: 8px 0 24px 0;">${formattedAmount}</p>
          <p>Dear ${primaryContact?.name || request.client.companyName},</p>
          <p>We are pleased to confirm that your payment has been received, verified, and officially reconciled into your account ledger.</p>
          
          <div style="background: #f5f2ec; padding: 18px; border-radius: 6px; margin: 20px 0; font-size: 13px;">
            <p style="margin: 4px 0;"><strong>Project:</strong> ${request.project?.name || "N/A"}</p>
            <p style="margin: 4px 0;"><strong>Reason:</strong> ${request.reason}</p>
            <p style="margin: 4px 0;"><strong>Transaction Ref:</strong> ${reference}</p>
            <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${transactionNumber}</p>
            <p style="margin: 4px 0;"><strong>Confirmed By:</strong> ${confirmedByName}</p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${confirmedAt.toLocaleDateString()}</p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${receiptUrl}" style="background: #b5452a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
              Download Official PDF Receipt
            </a>
          </div>
          
          <p style="font-size: 12px; color: #6b655c; text-align: center;">
            This receipt is permanently archived in your Business OS Client Document Center.
          </p>
        </div>
      `,
    });
  } catch (mailErr) {
    console.error("[payment-confirmation] Email notification failed (non-fatal):", mailErr);
  }

  return {
    success: true,
    transaction: result.transaction,
    receipt: result.receipt,
    pdfPath: pdfResult?.storagePath,
  };
}
