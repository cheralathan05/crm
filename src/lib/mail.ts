import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { isDev } from "./utils";

let transporter: Transporter | null = null;
let transporterSignature = "";
let resendClient: Resend | null = null;
let resendSignature = "";
let warnedFromMismatch = false;

/**
 * Resend client, created lazily from RESEND_API_KEY. When this key is set,
 * all verification and reset emails go through Resend (reliable, no SMTP
 * server to manage). Otherwise the SMTP path below is used.
 */
function getResendClient(): Resend | null {
  const key = env("RESEND_API_KEY");
  if (!key) return null;
  if (!resendClient || resendSignature !== key) {
    resendClient = new Resend(key);
    resendSignature = key;
  }
  return resendClient;
}

/**
 * Resolve an env var with a fallback chain. The project documents EMAIL_*
 * variables, but earlier configs used SMTP_* — both are supported.
 */
function env(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim() !== "") return value.trim();
  }
  return undefined;
}

function getTransporter(): Transporter | null {
  const host = env("EMAIL_HOST", "SMTP_HOST");
  if (!host) return null;

  const user = env("EMAIL_USER", "SMTP_USER");
  const pass = env("EMAIL_PASSWORD", "EMAIL_PASS", "SMTP_PASS");
  const port = Number(env("EMAIL_PORT", "SMTP_PORT") ?? (host === "smtp.gmail.com" ? 587 : 587));
  const secureEnv = env("EMAIL_SECURE", "SMTP_SECURE");
  const secure = secureEnv !== undefined ? secureEnv === "true" : port === 465;
  const isGmail = /gmail\.com$/i.test(host);

  const sig = `${host}:${port}:${secure}:${user}:${pass ? "has_pass" : "no_pass"}`;
  if (!transporter || transporterSignature !== sig) {
    transporterSignature = sig;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      tls: {
        rejectUnauthorized: env("EMAIL_REJECT_UNAUTHORIZED", "SMTP_REJECT_UNAUTHORIZED") !== "false",
      },
      ...(isGmail ? { service: "gmail" } : {}),
    } as nodemailer.TransportOptions);
  }
  return transporter;
}

/**
 * Extract bare email address from a string that might be in "Name <email@example.com>" format.
 */
function extractEmail(address: string): string {
  const match = address.match(/<([^>]+)>/);
  return (match ? match[1] : address).trim().toLowerCase();
}

/**
 * Resolve the SMTP sender address.
 *
 * ⚠️ Gmail root cause: Gmail rejects any message whose `From` header is not
 * the authenticated account (or an alias verified in the Google console).
 * If EMAIL_HOST is Gmail, the sender must therefore match EMAIL_USER.
 */
function smtpFrom(host: string | undefined): string {
  const user = env("EMAIL_USER", "SMTP_USER");
  const configuredFrom = env("EMAIL_FROM", "MAIL_FROM");
  const isGmail = /gmail\.com$/i.test(host ?? "");

  if (configuredFrom) {
    const rawEmail = extractEmail(configuredFrom);
    if (isGmail && user && rawEmail !== user.toLowerCase()) {
      if (!warnedFromMismatch) {
        warnedFromMismatch = true;
        console.warn(
          "[mail] EMAIL_FROM differs from EMAIL_USER while using Gmail SMTP. " +
            "Gmail rejects senders it does not own — using EMAIL_USER as the sender. " +
            "Fix .env by setting EMAIL_FROM to the same address as EMAIL_USER.",
        );
      }
      return `${appName()} <${user}>`;
    }
    return configuredFrom;
  }

  if (user) {
    return `${appName()} <${user}>`;
  }

  return `${appName()} <no-reply@businessos.app>`;
}

/**
 * Categorize a nodemailer error into a safe, loggable reason.
 * Never includes credentials, tokens, or full stack traces.
 */
export type MailFailureReason =
  | "SMTP_AUTH_FAILED"
  | "SMTP_TIMEOUT"
  | "SMTP_CONNECT_FAILED"
  | "SMTP_TLS_ERROR"
  | "SMTP_REJECTED"
  | "SMTP_UNKNOWN";

export function categorizeMailError(err: unknown): MailFailureReason {
  const msg = String(err && typeof err === "object" && "message" in err ? (err as { message: string }).message : err);
  if (/invalid login|535|username and password not accepted|auth/i.test(msg)) return "SMTP_AUTH_FAILED";
  if (/timed out|ETIMEDOUT|ESOCKET|greeting/i.test(msg)) return "SMTP_TIMEOUT";
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|connect/i.test(msg)) return "SMTP_CONNECT_FAILED";
  if (/TLS|STARTTLS|handshake|self signed|certificate|wrong version number/i.test(msg)) return "SMTP_TLS_ERROR";
  if (/5[0-9][0-9]|4[0-9][0-9]|rejected|refused by|spam|blocked/i.test(msg)) return "SMTP_REJECTED";
  return "SMTP_UNKNOWN";
}

export function appUrl(): string {
  return (env("FRONTEND_URL", "AUTH_URL", "NEXTAUTH_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}

export function appName(): string {
  return process.env.APP_NAME ?? "Business OS";
}

type SendAttachment = { filename: string; content: Buffer; contentType?: string };

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: SendAttachment[];
};

export type MailResult = { sent: boolean; devUrl?: string; messageId?: string; error?: string };

async function send(input: SendEmailInput, devUrl?: string): Promise<MailResult> {
  // Preferred path: Resend (transactional email API). Falls back to SMTP below.
  const client = getResendClient();
  if (client) {
    const from = env("RESEND_FROM") ?? `${appName()} <onboarding@resend.dev>`;
    try {
      const res = await client.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(input.attachments?.length
          ? { attachments: input.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
          : {}),
      });
      if (res.error) {
        const errorMsg = res.error.message || JSON.stringify(res.error);
        console.error("[mail:resend] delivery failed:", errorMsg);
        if (isDev() && devUrl) {
          console.log(`[mail:dev] to=${input.to} subject="${input.subject}" url=${devUrl}`);
        }
        return { sent: false, error: `Resend error: ${errorMsg}` };
      }
      return { sent: true, messageId: res.data?.id };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error("[mail:resend] delivery exception:", errorMsg);
      if (isDev() && devUrl) {
        console.log(`[mail:dev] to=${input.to} subject="${input.subject}" url=${devUrl}`);
      }
      return { sent: false, error: `Resend exception: ${errorMsg}` };
    }
  }

  // Fallback: SMTP transport (e.g. Gmail) when Resend is not configured.
  const transport = getTransporter();
  if (!transport) {
    if (isDev()) {
      console.log(`\n[mail:dev] to=${input.to} subject="${input.subject}" ${devUrl ? `url=${devUrl}` : ""}\n`);
    }
    return {
      sent: false,
      devUrl,
      error: "No email provider configured. Please set EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD (or RESEND_API_KEY) in .env",
    };
  }

  try {
    const info = await transport.sendMail({
      from: smtpFrom(env("EMAIL_HOST", "SMTP_HOST")),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(input.attachments?.length
        ? { attachments: input.attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) }
        : {}),
    });
    return { sent: true, messageId: info.messageId };
  } catch (err: any) {
    const reason = categorizeMailError(err);
    const errorMsg = err?.message || String(err);
    console.error(`[mail:smtp] delivery failed (${reason}):`, errorMsg);
    if (isDev() && devUrl) {
      console.log(`[mail:dev] to=${input.to} subject="${input.subject}" url=${devUrl}`);
    }
    return { sent: false, error: `${reason}: ${errorMsg}` };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f2ec;font-family:Manrope,Inter,system-ui,sans-serif;color:#23201c;padding:48px 24px;"><div style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e7e2d8;border-radius:4px;padding:40px;">
<p style="font-size:11px;letter-spacing:.18em;color:#8a8377;margin:0 0 24px;">${escapeHtml(appName()).toUpperCase()} — SECURE WORKSPACE</p>
${inner}
<p style="font-size:11px;color:#8a8377;margin:32px 0 0;border-top:1px solid #efeae0;padding-top:16px;">This is an automated message. If you did not request this, you can safely ignore it. Never share your verification or reset links with anyone.</p>
</div></div></body></html>`;
}

function actionButton(url: string, label: string): string {
  return `<table role="presentation" style="margin:8px 0 0;"><tr><td style="border-radius:3px;background:#b5452a;padding:14px 28px;"><a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.02em;">${label}</a></td></tr></table>`;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
  options?: { expiresInHours?: number },
): Promise<MailResult> {
  const hours = options?.expiresInHours ?? 24;
  const url = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return send(
    {
      to,
      subject: "Verify your account",
      text: `Hi ${name},\n\nYou created a ${appName()} account with this email address. Verify your account to finish setting up your workspace:\n\n${url}\n\nThis link is valid for ${hours} hours and can only be used once.`,
      html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 8px;">Verify your account</p>
<p style="font-size:14px;color:#55504a;margin:0 0 8px;">Hi ${escapeHtml(name)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 24px;">Thanks for creating a ${escapeHtml(appName())} account. Confirm your email address to activate your workspace.</p>
${actionButton(url, "Verify My Email")}
<p style="font-size:12px;color:#8a8377;margin:16px 0 0;">Or open this link directly: <a href="${url}" style="color:#b5452a;">${url}</a></p>
<p style="font-size:12px;color:#8a8377;margin:12px 0 0;">This verification link expires in <strong>${hours} hours</strong> and can only be used once.</p>`),
    },
    url,
  );
}

export async function sendTestEmail(
  to: string,
): Promise<MailResult> {
  const text = `This is a test message from ${appName()}. If you received it, email delivery is working.`;
  return send({
    to,
    subject: `${appName()} — email test`,
    text,
    html: shell(
      `<p style="font-size:20px;font-weight:700;margin:0 0 8px;">Email delivery works ✓</p>` +
        `<p style="font-size:14px;color:#55504a;margin:0;">This test message confirms ${escapeHtml(appName())} can send email through the configured provider.</p>`,
    ),
  });
}

/**
 * Attempt an SMTP/Resend connection + auth handshake WITHOUT sending mail.
 * Returns a safe diagnostic verdict; never leaks credentials.
 */
export async function verifyEmailConnection(): Promise<{
  ok: boolean;
  reason?: MailFailureReason;
  error?: string;
}> {
  const client = getResendClient();
  if (client) {
    return { ok: true };
  }
  const transport = getTransporter();
  if (!transport) {
    return {
      ok: false,
      reason: "SMTP_UNKNOWN",
      error: "No email provider configured. Set EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD or RESEND_API_KEY.",
    };
  }
  try {
    await transport.verify();
    return { ok: true };
  } catch (err: any) {
    const reason = categorizeMailError(err);
    return { ok: false, reason, error: err?.message || String(err) };
  }
}

/**
 * Safe, non-secret summary of the current email configuration. Used by the
 * dev-only health endpoint — never includes passwords or tokens.
 */
export function emailConfigStatus() {
  const client = getResendClient();
  if (client) return { channel: "resend", host: "api.resend.com", port: 443 } as const;
  const host = env("EMAIL_HOST", "SMTP_HOST");
  if (!host) return { channel: "none" } as const;
  return {
    channel: "smtp",
    host,
    port: Number(env("EMAIL_PORT", "SMTP_PORT") ?? 587),
    secure: env("EMAIL_SECURE", "SMTP_SECURE") === "true",
    from: smtpFrom(host),
  } as const;
}

export async function sendRequirementRequestEmail(input: {
  to: string;
  subject: string;
  message: string;
  link: string;
  projectTitle: string;
  companyName: string;
}): Promise<MailResult> {
  const { to, subject, message, link, projectTitle, companyName } = input;
  const safeMessage = message.trim() ? escapeHtml(message).replace(/\n/g, "<br/>") : "";
  return send(
    {
      to,
      subject,
      text: `Hi,\n\n${safeMessage || `We're collecting a few details about the ${projectTitle} project to make sure we build the right thing.`}\n\nOpen your private project workspace to begin:\n\n${link}\n\nThis link is secure and expires automatically. You can save your progress and continue later.`,
      html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 8px;">${escapeHtml(projectTitle)} — project discovery</p>
<p style="font-size:14px;color:#55504a;margin:0 0 16px;">${escapeHtml(companyName)} has prepared a private workspace for you. We'll guide you through a few focused steps to understand your business, goals and requirements. You can save progress and return any time.</p>
${safeMessage ? `<p style="font-size:13px;color:#55504a;border-left:3px solid #e7e2d8;padding:10px 14px;background:#faf7f1;margin:0 0 16px;">${safeMessage}</p>` : ""}
${actionButton(link, "Open Project Workspace")}
<p style="font-size:12px;color:#8a8377;margin:16px 0 0;">Or open this link directly: <a href="${link}" style="color:#b5452a;">${link}</a></p>
<p style="font-size:12px;color:#8a8377;margin:12px 0 0;">This link is secure, expires automatically, and is only valid for ${escapeHtml(companyName)}'s project discovery workspace.</p>`),
    },
    link,
  );
}

/* ── Clarification emails — the Ask the Client loop ────────── */

type ClarificationEmailInput = {
  to: string;
  clientName: string;
  projectTitle: string;
  sectionLabel: string;
  question: string;
  link: string;
  companyName: string;
  senderName: string;
  senderEmail?: string | null;
};

/**
 * Send the initial clarification question to the client. The identity used
 * is the workspace's company — never a system/notification persona. The only
 * actionable element is the secure response link (token-based, no internal
 * ids in the URL).
 */
export async function sendClarificationQuestionEmail(input: ClarificationEmailInput): Promise<MailResult> {
  const { to, clientName, projectTitle, sectionLabel, question, link, companyName, senderName, senderEmail } = input;
  const signOff = senderEmail ? `${escapeHtml(senderName)}<br/>${escapeHtml(companyName)} · ${escapeHtml(senderEmail)}` : `${escapeHtml(senderName)}<br/>${escapeHtml(companyName)}`;
  return send(
    {
      to,
      subject: `Clarification needed for ${projectTitle}`,
      text: `Hi ${clientName},\n\nWe're currently reviewing the requirements for:\n\n${projectTitle}\n\nBefore we can finalize the ${sectionLabel} section, we need one clarification:\n\n“${question}”\n\nRespond securely here:\n${link}\n\nThank you,\n${senderName}\n${companyName}`,
      html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 4px;">Requirement clarification</p>
<p style="font-size:12px;color:#8a8377;margin:0 0 20px;">${escapeHtml(projectTitle)} · ${escapeHtml(sectionLabel)}</p>
<p style="font-size:14px;color:#55504a;margin:0 0 10px;">Hi ${escapeHtml(clientName)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 6px;">We're currently reviewing the requirements for <strong>${escapeHtml(projectTitle)}</strong>. Before we can finalize the ${escapeHtml(sectionLabel)} section, we need one clarification:</p>
<p style="font-size:14px;color:#23201c;border-left:3px solid #b5452a;background:#faf7f1;padding:12px 14px;margin:14px 0 18px;">${escapeHtml(question)}</p>
${actionButton(link, "Respond to this question")}
<p style="font-size:12px;color:#8a8377;margin:16px 0 0;">You can respond securely using the button above — no account needed.</p>
<p style="font-size:13px;color:#55504a;margin:22px 0 0;">Thank you,<br/>${signOff}</p>`),
    },
    link,
  );
}

/** Send a gentle reminder about an existing clarification question. */
export async function sendClarificationReminderEmail(input: ClarificationEmailInput): Promise<MailResult> {
  const { to, clientName, projectTitle, sectionLabel, question, link, companyName, senderName, senderEmail } = input;
  const signOff = senderEmail ? `${escapeHtml(senderName)}<br/>${escapeHtml(companyName)} · ${escapeHtml(senderEmail)}` : `${escapeHtml(senderName)}<br/>${escapeHtml(companyName)}`;
  return send(
    {
      to,
      subject: `Reminder — clarification needed for ${projectTitle}`,
      text: `Hi ${clientName},\n\nThis is a quick reminder that we're waiting on one clarification before we can finalize the ${sectionLabel} section of ${projectTitle}:\n\n“${question}”\n\nRespond securely here:\n${link}\n\nThank you,\n${senderName}\n${companyName}`,
      html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 4px;">Reminder — requirement clarification</p>
<p style="font-size:12px;color:#8a8377;margin:0 0 20px;">${escapeHtml(projectTitle)} · ${escapeHtml(sectionLabel)}</p>
<p style="font-size:14px;color:#55504a;margin:0 0 10px;">Hi ${escapeHtml(clientName)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 6px;">A quick reminder that we're waiting on your answer before we can finalize the ${escapeHtml(sectionLabel)} section of <strong>${escapeHtml(projectTitle)}</strong>:</p>
<p style="font-size:14px;color:#23201c;border-left:3px solid #b5452a;background:#faf7f1;padding:12px 14px;margin:14px 0 18px;">${escapeHtml(question)}</p>
${actionButton(link, "Respond to this question")}
<p style="font-size:12px;color:#8a8377;margin:16px 0 0;">You can respond securely using the button above — no account needed.</p>
<p style="font-size:13px;color:#55504a;margin:22px 0 0;">Thank you,<br/>${signOff}</p>`),
    },
    link,
  );
}

/* ── Proposal delivery emails ───────────────────────────────── */

type ProposalEmailInput = {
  to: string;
  clientName: string;
  projectTitle: string;
  proposalReference: string;
  companyName: string;
  timelineLabel?: string;
  amountLabel?: string;
  link: string;
  senderName: string;
  pdf?: { filename: string; buffer: Buffer };
  version?: number;
  revision?: boolean;
};

/**
 * Send the finalized proposal to the client. The only actionable element is
 * the secure token link — internal ids never appear. The stored PDF is
 * attached exactly as generated; nothing is regenerated at send time.
 */
export async function sendProposalEmail(input: ProposalEmailInput): Promise<MailResult> {
  const { to, clientName, projectTitle, proposalReference, companyName, link, senderName, pdf, version, revision } = input;
  const versionNote = version && version > 1 ? ` (v${version})` : "";
  const subject = revision
    ? `Your revised proposal is ready — ${projectTitle}`
    : `Proposal for ${projectTitle} — ${companyName}`;
  const headline = revision ? "Your revised proposal is ready" : "Proposal ready for your review";
  const metaRows = [
    proposalReference ? `Proposal: <strong>${escapeHtml(proposalReference)}</strong>` : null,
    version && version > 1 ? `<strong>Version: v${version}</strong>` : null,
    input.timelineLabel ? `Timeline: <strong>${escapeHtml(input.timelineLabel)}</strong>` : null,
    input.amountLabel ? `Investment: <strong>${escapeHtml(input.amountLabel)}</strong>` : null,
  ].filter(Boolean).join("<br/>");
  return send(
    {
      to,
      subject,
      text: `Hi ${clientName},\n\n${revision ? "Thank you for your feedback. We've updated the proposal based on your requested changes." : `Your proposal for:\n\n${projectTitle}${versionNote}\n\nis ready for review.`}\n\n${proposalReference ? `Proposal: ${proposalReference}` : ""}\n${input.timelineLabel ? `Timeline: ${input.timelineLabel}` : ""}\n${input.amountLabel ? `Investment: ${input.amountLabel}` : ""}\n\nReview and respond securely here:\n${link}\n\nThe finalized proposal PDF is attached.\n\nRegards,\n${senderName}\n${companyName}`,
      html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 4px;">${headline}</p>
<p style="font-size:12px;color:#8a8377;margin:0 0 20px;">${escapeHtml(projectTitle)}${versionNote}</p>
<p style="font-size:14px;color:#55504a;margin:0 0 10px;">Hi ${escapeHtml(clientName)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 6px;">${revision ? "Thank you for your feedback — we've updated the proposal based on your requested changes." : "Your proposal is ready for review."}</p>
${metaRows ? `<p style="font-size:14px;color:#55504a;margin:10px 0 4px;">${metaRows}</p>` : ""}
${actionButton(link, revision ? "Review Revised Proposal" : "View Proposal")}
<p style="font-size:12px;color:#8a8377;margin:16px 0 0;">The finalized proposal PDF is attached to this email. You can also review it online or download it from the secure proposal page.</p>
<p style="font-size:13px;color:#55504a;margin:22px 0 0;">Regards,<br/>${escapeHtml(senderName)}<br/>${escapeHtml(companyName)}</p>`),
      ...(pdf
        ? { attachments: [{ filename: pdf.filename, content: pdf.buffer, contentType: "application/pdf" }] }
        : {}),
    },
    link,
  );
}

/** Confirmation sent to the client after they approve a proposal. */
export async function sendProposalApprovalConfirmationEmail(input: {
  to: string;
  clientName: string;
  projectTitle: string;
  proposalReference: string;
  companyName: string;
  version?: number;
}): Promise<MailResult> {
  const { to, clientName, projectTitle, proposalReference, companyName, version } = input;
  const versionNote = version && version > 1 ? ` (v${version})` : "";
  return send({
    to,
    subject: `Proposal approved — ${projectTitle}`,
    text: `Hi ${clientName},\n\nThank you.\n\nYour proposal for:\n\n${projectTitle}${versionNote}\n\nhas been approved successfully.\n\n${proposalReference ? `Proposal: ${proposalReference}` : ""}\n\nThe project team will now proceed with the next stage of project setup.\n\nRegards,\n${companyName}`,
    html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 8px;">Proposal approved ✓</p>
<p style="font-size:14px;color:#55504a;margin:0 0 8px;">Hi ${escapeHtml(clientName)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 6px;">Thank you — your proposal for <strong>${escapeHtml(projectTitle)}</strong>${versionNote} has been approved successfully.</p>
${proposalReference ? `<p style="font-size:13px;color:#8a8377;margin:10px 0 0;">Proposal: ${escapeHtml(proposalReference)}</p>` : ""}
<p style="font-size:14px;color:#55504a;margin:16px 0 0;">The project team will now proceed with the next stage of project setup.</p>
<p style="font-size:13px;color:#55504a;margin:22px 0 0;">Regards,<br/>${escapeHtml(companyName)}</p>`),
  });
}

/** Confirmation that the client's change request was received. */
export async function sendProposalChangeRequestReceivedEmail(input: {
  to: string;
  clientName: string;
  projectTitle: string;
  proposalReference: string;
  companyName: string;
  version?: number;
  link: string;
}): Promise<MailResult> {
  const { to, clientName, projectTitle, proposalReference, version, link } = input;
  return send({
    to,
    subject: `Change request received — ${projectTitle}`,
    text: `Hi ${clientName},\n\nWe've received your requested changes for:\n\n${projectTitle}${version && version > 1 ? ` (v${version})` : ""}\n\n${proposalReference ? `Proposal: ${proposalReference}` : ""}\n\nStatus: Under review\n\nWe'll review your feedback and prepare a revised proposal if required.\n\nTrack your request here:\n${link}`,
    html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 8px;">Change request received</p>
<p style="font-size:14px;color:#55504a;margin:0 0 8px;">Hi ${escapeHtml(clientName)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 6px;">We've received your requested changes for <strong>${escapeHtml(projectTitle)}</strong>${version && version > 1 ? ` (v${version})` : ""}.</p>
${proposalReference ? `<p style="font-size:13px;color:#8a8377;margin:10px 0 0;">Proposal: ${escapeHtml(proposalReference)}</p>` : ""}
<p style="font-size:13px;color:#8a8377;margin:6px 0 0;">Status: <strong>Under review</strong></p>
<p style="font-size:14px;color:#55504a;margin:16px 0 0;">We'll review your feedback and prepare a revised proposal if required.</p>
${actionButton(link, "View Your Request")}`),
    },
    link,
  );
}

/** Update sent to the client when a change request is accepted or declined. */
export async function sendProposalChangeRequestDecisionEmail(input: {
  to: string;
  clientName: string;
  projectTitle: string;
  proposalReference: string;
  companyName: string;
  accepted: boolean;
  response?: string | null;
  link: string;
}): Promise<MailResult> {
  const { to, clientName, projectTitle, proposalReference, accepted, response, link } = input;
  return send({
    to,
    subject: accepted ? `Change request accepted — ${projectTitle}` : `Change request update — ${projectTitle}`,
    text: `Hi ${clientName},\n\n${accepted
      ? `We've reviewed your requested changes for ${projectTitle}. The accepted changes will be included in a revised proposal.`
      : `One of your requested changes for ${projectTitle} could not be included in the current proposal.`}
\n${proposalReference ? `Proposal: ${proposalReference}` : ""}\n${response ? `\n${response}` : ""}\n\nView the full details here:\n${link}`,
    html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 8px;">${accepted ? "Change request accepted" : "Change request update"}</p>
<p style="font-size:14px;color:#55504a;margin:0 0 8px;">Hi ${escapeHtml(clientName)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 6px;">${accepted
      ? `We've reviewed your requested changes for <strong>${escapeHtml(projectTitle)}</strong>. The accepted changes will be included in a revised proposal.`
      : `One of your requested changes for <strong>${escapeHtml(projectTitle)}</strong> could not be included in the current proposal.`}</p>
${proposalReference ? `<p style="font-size:13px;color:#8a8377;margin:10px 0 0;">Proposal: ${escapeHtml(proposalReference)}</p>` : ""}
${response ? `<p style="font-size:13px;color:#55504a;border-left:3px solid #e7e2d8;padding:10px 14px;background:#faf7f1;margin:12px 0 0;">${escapeHtml(response)}</p>` : ""}
${actionButton(link, "View Details")}`),
    },
    link,
  );
}

/** Sent to the client when their proposal is declined outright (they chose not to proceed). */
export async function sendProposalRejectedAckEmail(input: {
  to: string;
  clientName: string;
  projectTitle: string;
  companyName: string;
}): Promise<MailResult> {
  const { to, clientName, projectTitle, companyName } = input;
  return send({
    to,
    subject: `We've received your response — ${projectTitle}`,
    text: `Hi ${clientName},\n\nThank you for letting us know. We've noted that you do not wish to proceed with ${projectTitle} at this time.\n\nIf anything changes, we'd be happy to revisit it.\n\nRegards,\n${companyName}`,
    html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 8px;">Thank you for letting us know</p>
<p style="font-size:14px;color:#55504a;margin:0 0 8px;">Hi ${escapeHtml(clientName)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 6px;">We've noted that you do not wish to proceed with <strong>${escapeHtml(projectTitle)}</strong> at this time.</p>
<p style="font-size:14px;color:#55504a;margin:16px 0 0;">If anything changes, we'd be happy to revisit it.</p>
<p style="font-size:13px;color:#55504a;margin:22px 0 0;">Regards,<br/>${escapeHtml(companyName)}</p>`),
  });
}

export async function sendResetEmail(
  to: string,
  name: string,
  token: string,
  options?: { expiresInHours?: number },
): Promise<MailResult> {
  const hours = options?.expiresInHours ?? 1;
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return send(
    {
      to,
      subject: "Reset your password",
      text: `Hi ${name},\n\nWe received a request to reset your ${appName()} password. Create a new password with this secure link:\n\n${url}\n\nThis link is valid for ${hours} hour(s) and can only be used once. If you didn't request this, you can safely ignore this email.`,
      html: shell(`<p style="font-size:20px;font-weight:700;margin:0 0 8px;">Reset your password</p>
<p style="font-size:14px;color:#55504a;margin:0 0 8px;">Hi ${escapeHtml(name)},</p>
<p style="font-size:14px;color:#55504a;margin:0 0 24px;">We received a request to reset your ${escapeHtml(appName())} password. Use the button below to create a new one.</p>
${actionButton(url, "Reset Password")}
<p style="font-size:12px;color:#8a8377;margin:16px 0 0;">Or open this link directly: <a href="${url}" style="color:#b5452a;">${url}</a></p>
<p style="font-size:12px;color:#8a8377;margin:12px 0 0;">This reset link expires in <strong>${hours} hour${hours === 1 ? "" : "s"}</strong> and can only be used once.</p>`),
    },
    url,
  );
}

/**
 * Generic email dispatcher with real status return.
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text?: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await send({
      to: input.to,
      subject: input.subject,
      text: input.text || input.subject,
      html: input.html,
    });
    return { success: result.sent, error: result.error };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send email." };
  }
}

