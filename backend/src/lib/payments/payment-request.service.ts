import { db } from "@/lib/db";
import crypto from "crypto";
import { CreatePaymentRequestInput } from "./payment-types";
import { sendMail } from "@/lib/mail";
import QRCode from "qrcode";

/**
 * Generates sequential payment request reference: PR-2026-0001
 */
async function generatePaymentReference(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await db.paymentRequest.count();
  const seq = String(count + 1).padStart(4, "0");
  return `PR-${currentYear}-${seq}`;
}

/**
 * Generates a clean UPI QR URI payload according to NPCI specifications:
 * upi://pay?pa=<vpa>&pn=<name>&mc=<mcc>&tid=<txnId>&tr=<ref>&tn=<note>&am=<amount>&cu=INR
 */
export function generateUpiPayload(params: {
  upiId?: string;
  payeeName?: string;
  amount: number;
  reference: string;
  note: string;
}): string {
  const pa = encodeURIComponent(params.upiId || "businessos@upi");
  const pn = encodeURIComponent(params.payeeName || "Business OS");
  const am = params.amount.toFixed(2);
  const tn = encodeURIComponent(`${params.reference} - ${params.note}`.slice(0, 50));
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

export async function createPaymentRequest(input: CreatePaymentRequestInput) {
  // 1. Validate Client
  const client = await db.client.findUnique({
    where: { id: input.clientId },
    include: { workspace: true },
  });
  if (!client) {
    throw new Error("Client record not found.");
  }

  // 2. Validate Project if provided
  let project = null;
  if (input.projectId) {
    project = await db.clientProject.findUnique({
      where: { id: input.projectId },
    });
    if (!project) {
      throw new Error("Project not found.");
    }
    if (project.clientId !== client.id) {
      throw new Error("Project does not belong to the selected client.");
    }
  }

  // 3. Validate Milestone if provided
  let milestone = null;
  if (input.milestoneId) {
    milestone = await db.projectMilestone.findUnique({
      where: { id: input.milestoneId },
    });
    if (!milestone) {
      throw new Error("Milestone not found.");
    }
    if (project && milestone.projectId !== project.id) {
      throw new Error("Milestone does not belong to the selected project.");
    }
  }

  // 4. Duplicate Protection: Check if an active request already exists for this milestone
  if (milestone) {
    const activeExisting = await db.paymentRequest.findFirst({
      where: {
        milestoneId: milestone.id,
        status: { in: ["READY", "SENT", "VIEWED", "PAYMENT_STARTED", "PAYMENT_SUBMITTED", "AWAITING_VERIFICATION"] },
      },
    });
    if (activeExisting) {
      throw new Error(
        `An active payment request (${activeExisting.reference}) already exists for milestone "${milestone?.title}". Open or resolve the existing request instead of duplicating.`
      );
    }
  }

  // 5. Generate Reference & Secure Client Access Token
  const reference = await generatePaymentReference();
  const tokenHash = crypto.randomBytes(24).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const currency = input.currency || "INR";
  const amount = Number(input.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("A valid positive payment amount is required.");
  }

  const dueDate = input.dueDate ? new Date(input.dueDate) : null;
  const effectiveMobile = input.payeeMobile?.trim() || (client.workspace as any)?.phone || "+91 98765 43210";
  const effectiveUpiId = input.payeeUpi?.trim() || "businessos@hdfcbank";

  // 6. Create Payment Request Record
  const baseRequestData: any = {
    reference,
    clientId: client.id,
    projectId: project?.id ?? null,
    proposalId: input.proposalId ?? null,
    milestoneId: milestone?.id ?? null,
    title: input.title,
    reason: input.reason,
    amount,
    currency,
    dueDate,
    paymentRule: input.paymentRule || "FIXED",
    status: "SENT",
    tokenHash,
    tokenExpiresAt,
    sentAt: new Date(),
    createdById: input.createdById ?? null,
    createdByName: input.createdByName ?? "Admin",
  };

  let paymentRequest: any;
  try {
    paymentRequest = await db.paymentRequest.create({
      data: {
        ...baseRequestData,
        payeeMobile: effectiveMobile,
        payeeUpi: effectiveUpiId,
      },
    });
  } catch (fieldErr: any) {
    paymentRequest = await db.paymentRequest.create({
      data: baseRequestData,
    });
  }

  // 7. Create Payment Session with UPI QR
  const qrPayload = generateUpiPayload({
    upiId: effectiveUpiId,
    payeeName: client.workspace?.companyName || "Business OS",
    amount,
    reference,
    note: input.reason,
  });

  const baseSessionData: any = {
    requestId: paymentRequest.id,
    sessionToken: crypto.randomBytes(16).toString("hex"),
    amount,
    currency,
    provider: "UPI_QR",
    qrPayload,
    upiId: effectiveUpiId,
    status: "ACTIVE",
    expiresAt: tokenExpiresAt,
  };

  let session: any;
  try {
    session = await db.paymentSession.create({
      data: {
        ...baseSessionData,
        payeeMobile: effectiveMobile,
      },
    });
  } catch (sessErr: any) {
    session = await db.paymentSession.create({
      data: baseSessionData,
    });
  }

  // 8. Generate QR PNG Buffer for Email Attachment & Inline Display
  let qrBuffer: Buffer | null = null;
  try {
    qrBuffer = await QRCode.toBuffer(qrPayload, {
      type: "png",
      width: 320,
      margin: 2,
      color: {
        dark: "#1a1714",
        light: "#ffffff",
      },
    });
  } catch (qrErr) {
    console.warn("[payment-request] Could not generate QR buffer:", qrErr);
  }
  const qrBase64 = qrBuffer ? qrBuffer.toString("base64") : null;

  // 9. Financial Audit Log
  await db.financialAuditLog.create({
    data: {
      requestId: paymentRequest.id,
      actorName: input.createdByName || "Admin",
      action: "REQUEST_CREATED",
      entityType: "PAYMENT_REQUEST",
      entityId: paymentRequest.id,
      afterState: JSON.stringify({
        reference,
        amount,
        currency,
        client: client.companyName,
        project: project?.name,
        milestone: milestone?.title,
        payeeMobile: effectiveMobile,
      }),
      reason: input.reason,
    },
  });

  // 10. Send Client Notification Email with QR Attachment and Mobile Number
  const payUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/pay/${tokenHash}`;
  const primaryContact = await db.contact.findFirst({
    where: { clientId: client.id, isPrimary: true },
  }) || await db.contact.findFirst({
    where: { clientId: client.id },
  });

  const targetEmail = primaryContact?.email || "billing@zerotouch.internal";
  const formattedAmount = `${currency} ${amount.toLocaleString("en-IN")}`;

  await sendMail({
    to: targetEmail,
    subject: `Payment Request from ${client.workspace?.companyName || "Business OS"}: ${formattedAmount} (Ref: ${reference})`,
    attachments: qrBuffer
      ? [
          {
            filename: `${reference}-UPI-QR.png`,
            content: qrBuffer,
            contentType: "image/png",
          },
        ]
      : undefined,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; border: 1px solid #e7e2d8; border-radius: 8px; background: #fffdf9; color: #1a1714;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="background: #b5452a; color: white; padding: 4px 14px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
            Payment Request
          </span>
        </div>
        
        <h2 style="color: #1a1714; text-align: center; margin: 8px 0 4px 0; font-size: 24px;">${formattedAmount}</h2>
        <p style="text-align: center; font-size: 13px; color: #6b655c; margin: 0 0 20px 0;">Reference: <strong>${reference}</strong></p>

        <p style="font-size: 14px;">Dear ${primaryContact?.name || client.companyName},</p>
        <p style="font-size: 14px; color: #3d3935;">A new payment request has been issued for your account regarding <strong>${input.reason}</strong>.</p>
        
        <div style="background: #f5f2ec; padding: 18px; border-radius: 6px; margin: 20px 0; font-size: 13.5px;">
          <p style="margin: 4px 0;"><strong>Project:</strong> ${project?.name || "N/A"}</p>
          <p style="margin: 4px 0;"><strong>Reason:</strong> ${input.reason}</p>
          <p style="margin: 4px 0;"><strong>Amount Due:</strong> <span style="color: #b5452a; font-weight: bold;">${formattedAmount}</span></p>
          ${dueDate ? `<p style="margin: 4px 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>` : ""}
          <p style="margin: 4px 0;"><strong>Payment Rule:</strong> ${input.paymentRule === "PARTIAL_ALLOWED" ? "Partial payment accepted" : "Exact amount due"}</p>
        </div>

        <!-- QR Code & Direct Mobile Payment Box -->
        <div style="border: 2px dashed #b5452a; border-radius: 8px; padding: 20px; background: #ffffff; text-align: center; margin: 24px 0;">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #b5452a; text-transform: uppercase; letter-spacing: 0.04em;">
            Scan QR or Pay via Mobile Number
          </h3>

          ${
            qrBase64
              ? `<div style="margin: 14px auto;">
                  <img src="data:image/png;base64,${qrBase64}" alt="Scan to Pay QR Code" style="width: 200px; height: 200px; display: inline-block; border: 1px solid #e7e2d8; border-radius: 6px; padding: 6px; background: white;" />
                  <p style="font-size: 11.5px; color: #8a8377; margin: 6px 0 0 0;">(Official QR code is also attached to this email: <strong>${reference}-UPI-QR.png</strong>)</p>
                </div>`
              : ""
          }

          <div style="background: #faf7f2; border-radius: 6px; padding: 14px; margin-top: 14px; text-align: left; font-size: 13px; border: 1px solid #efeae0;">
            <div style="margin-bottom: 10px;">
              <span style="color: #6b655c; font-size: 12px; text-transform: uppercase; font-weight: bold;">UPI Mobile Number (GPay / PhonePe / Paytm):</span><br/>
              <strong style="font-family: monospace; font-size: 17px; color: #b5452a; letter-spacing: 0.03em;">${effectiveMobile}</strong>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="color: #6b655c; font-size: 12px; text-transform: uppercase; font-weight: bold;">UPI ID (VPA):</span><br/>
              <strong style="font-family: monospace; font-size: 15px; color: #1a1714;">${effectiveUpiId}</strong>
            </div>
            <div>
              <span style="color: #6b655c; font-size: 12px; text-transform: uppercase; font-weight: bold;">Payee Account Name:</span><br/>
              <strong style="font-size: 13.5px; color: #1a1714;">${client.workspace?.companyName || "Business OS"}</strong>
            </div>
          </div>

          <!-- Bank Transfer Alternative Details -->
          <div style="margin-top: 12px; padding: 12px; background: #f8f6f0; border-radius: 6px; text-align: left; font-size: 12px; border: 1px solid #e7e2d8;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #6b655c; text-transform: uppercase; font-size: 11px;">Direct Bank Wire (NEFT / IMPS / RTGS):</p>
            <p style="margin: 2px 0;"><strong>Bank:</strong> HDFC Bank</p>
            <p style="margin: 2px 0;"><strong>Account Name:</strong> ${client.workspace?.companyName || "Business OS Operating Account"}</p>
            <p style="margin: 2px 0;"><strong>Account Number:</strong> 50200084920192</p>
            <p style="margin: 2px 0;"><strong>IFSC Code:</strong> HDFC0000240</p>
          </div>
        </div>

        <div style="text-align: center; margin: 28px 0 16px 0;">
          <a href="${payUrl}" style="background: #b5452a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 14px;">
            Open Secure Payment Portal & Submit Proof
          </a>
        </div>

        <p style="font-size: 12px; color: #6b655c; text-align: center; margin-top: 20px;">
          After sending money via Mobile, QR Scan, or Bank Wire, open the portal button above to submit your transaction reference number (UTR) for immediate verification and official receipt generation.
        </p>
      </div>
    `,
  }).catch((err) => {
    console.error("[payment-request] Non-fatal notification error:", err);
  });

  return {
    paymentRequest,
    session,
    payUrl,
  };
}
