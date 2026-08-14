import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { isDev } from "./utils";

let transporter: Transporter | null = null;
let resendClient: Resend | null = null;
let warnedFromMismatch = false;

/**
 * Resend client, created lazily from RESEND_API_KEY. When this key is set,
 * all verification and reset emails go through Resend (reliable, no SMTP
 * server to manage). Otherwise the SMTP path below is used.
 */
function getResendClient(): Resend | null {
  const key = env("RESEND_API_KEY");
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

/**
 * Resolve an env var with a fallback chain. The project documents EMAIL_*
 * variables, but earlier configs used SMTP_* — both are supported.
 */
function env(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim() !== "") return value;
  }
  return undefined;
}

function getTransporter(): Transporter | null {
  const host = env("EMAIL_HOST", "SMTP_HOST");
  if (!host) return null;
  if (!transporter) {
    const user = env("EMAIL_USER", "SMTP_USER");
    const pass = env("EMAIL_PASSWORD", "EMAIL_PASS", "SMTP_PASS");
    transporter = nodemailer.createTransport({
      host,
      port: Number(env("EMAIL_PORT", "SMTP_PORT") ?? 587),
      secure: env("EMAIL_SECURE", "SMTP_SECURE") === "true",
      // Only use auth when both user and password are configured.
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

/**
 * Resolve the SMTP sender address.
 *
 * ⚠️ Gmail root cause: Gmail rejects any message whose `From` header is not
 * the authenticated account (or an alias verified in the Google console).
 * If EMAIL_HOST is Gmail, the sender must therefore be EMAIL_USER — a
 * mismatched EMAIL_FROM silently breaks every send. We auto-correct for
 * Gmail and warn loudly in the server log instead of failing silently.
 */
function smtpFrom(host: string | undefined): string {
  const user = env("EMAIL_USER", "SMTP_USER");
  const configuredFrom = env("EMAIL_FROM", "MAIL_FROM");
  const isGmail = /gmail\.com$/i.test(host ?? "");

  if (isGmail && user && configuredFrom && configuredFrom.toLowerCase() !== user.toLowerCase()) {
    // Warn once per process — not once per message.
    if (!warnedFromMismatch) {
      warnedFromMismatch = true;
      console.warn(
        "[mail] EMAIL_FROM differs from EMAIL_USER while using Gmail SMTP. " +
          "Gmail rejects senders it does not own — using EMAIL_USER as the sender. " +
          "Fix .env by setting EMAIL_FROM to the same address as EMAIL_USER (or removing it).",
      );
    }
    return user;
  }
  return configuredFrom ?? user ?? `${appName()} <no-reply@businessos.app>`;
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
  if (/invalid login|535|auth/i.test(msg)) return "SMTP_AUTH_FAILED";
  if (/timed out|ETIMEDOUT|ESOCKET/i.test(msg)) return "SMTP_TIMEOUT";
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|connect/i.test(msg)) return "SMTP_CONNECT_FAILED";
  if (/TLS|STARTTLS|handshake|self signed|certificate/i.test(msg)) return "SMTP_TLS_ERROR";
  if (/5[0-9][0-9]|4[0-9][0-9]|rejected|refused by|spam|blocked/i.test(msg)) return "SMTP_REJECTED";
  return "SMTP_UNKNOWN";
}

export function appUrl(): string {
  return (env("FRONTEND_URL", "AUTH_URL", "NEXTAUTH_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}

export function appName(): string {
  return process.env.APP_NAME ?? "Business OS";
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailResult = { sent: true } | { sent: false; devUrl?: string };

async function send(input: SendEmailInput, devUrl?: string): Promise<MailResult> {
  // Preferred path: Resend (transactional email API). Falls back to SMTP below.
  const client = getResendClient();
  if (client) {
    // Resend sends to the account owner's inbox from this test sender without
    // needing a verified domain. Set RESEND_FROM once you verify a domain on
    // your Resend dashboard.
    const from = env("RESEND_FROM") ?? `${appName()} <onboarding@resend.dev>`;
    try {
      const { error } = await client.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      if (error) throw error;
      return { sent: true };
    } catch (err) {
      console.error("[mail:resend] delivery failed", err);
      // In development, still surface the link so the flow stays usable.
      if (isDev() && devUrl) {
        console.log(`[mail:dev] to=${input.to} subject="${input.subject}" url=${devUrl}`);
      }
      return { sent: false };
    }
  }

  // Fallback: SMTP transport (e.g. Gmail) when Resend is not configured.
  const transport = getTransporter();
  if (!transport) {
    if (isDev()) {
      console.log(`\n[mail:dev] to=${input.to} subject="${input.subject}" ${devUrl ? `url=${devUrl}` : ""}\n`);
    }
    return { sent: false, devUrl };
  }
  try {
    await transport.sendMail({
      from: smtpFrom(env("EMAIL_HOST", "SMTP_HOST")),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { sent: true };
  } catch (err) {
    // Delivery failed even though SMTP is configured. Categorize and log only
    // safe diagnostics — never credentials or full provider responses.
    console.error(`[mail:smtp] delivery failed (${categorizeMailError(err)})`);
    // In development, still surface the link so the flow stays usable until
    // the SMTP misconfiguration is fixed.
    if (isDev() && devUrl) {
      console.log(`[mail:dev] to=${input.to} subject="${input.subject}" url=${devUrl}`);
    }
    return { sent: false };
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
 * Attempt an SMTP connection + auth handshake WITHOUT sending mail.
 * Returns a safe diagnostic verdict; never leaks credentials.
 */
export async function verifyEmailConnection(): Promise<{
  ok: boolean;
  reason?: MailFailureReason;
}> {
  const transport = getTransporter();
  if (!transport) return { ok: false, reason: "SMTP_UNKNOWN" };
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: categorizeMailError(err) };
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
