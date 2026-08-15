"use client";

import { useState } from "react";
import { Check, Loader2, Mail, MailX, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────
   EMAIL SETTINGS — SENDING STATUS + TEST
   Shows the real, non-secret email configuration and lets the owner
   send a test message to verify it. Never claims "connected" when it
   isn't — the state comes from the server's emailConfigStatus.
──────────────────────────────────────────────────────────────── */

export type EmailConfig = {
  ok: boolean;
  configured: boolean;
  channel: "resend" | "smtp" | "none";
  from: string | null;
  host: string | null;
  port: number | null;
  companyName: string | null;
};

export function EmailSettings({ initial }: { initial: EmailConfig }) {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const sendTest = async () => {
    if (!to.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim() }),
      });
      const data = await res.json();
      setResult({
        ok: res.ok && data.ok,
        message: data.message ?? (res.ok ? "Test email sent." : "Test email failed."),
      });
    } catch {
      setResult({ ok: false, message: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <section className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
            Email sending
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.12em]",
              initial.configured
                ? "bg-[var(--bos-success)]/8 text-[var(--bos-success)]"
                : "bg-[var(--bos-warning)]/8 text-[var(--bos-warning)]",
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", initial.configured ? "bg-[var(--bos-success)]" : "bg-[var(--bos-warning)]")} aria-hidden="true" />
            {initial.configured ? "Connected" : "Not configured"}
          </span>
        </div>

        {initial.configured ? (
          <dl className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-[12px]">
            <div>
              <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">From</dt>
              <dd className="mt-0.5 text-[var(--bos-text-primary)]">{initial.from ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Provider</dt>
              <dd className="mt-0.5 capitalize text-[var(--bos-text-primary)]">
                {initial.channel === "resend" ? "Resend" : initial.channel === "smtp" ? `SMTP${initial.host ? ` · ${initial.host}` : ""}` : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-4 rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-warning)]">
              <MailX className="w-3.5 h-3.5" aria-hidden="true" /> Email not configured
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--bos-text-secondary)]">
              You need to connect an email provider before sending client communications. Add the provider
              credentials to your server environment variables (<span className="font-mono text-[var(--bos-text-primary)]">RESEND_API_KEY</span>, or{" "}
              <span className="font-mono text-[var(--bos-text-primary)]">EMAIL_HOST / EMAIL_USER / EMAIL_PASS</span> for SMTP), then restart the server.
            </p>
          </div>
        )}
      </section>

      {/* Test email */}
      <section className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 p-5">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
          <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Send test email
        </div>
        <p className="mt-1.5 text-[12px] text-[var(--bos-text-tertiary)]">
          Verify the configured provider end-to-end. The result reflects what the provider actually confirmed.
        </p>
        <div className="mt-3 flex items-center gap-2 max-w-md">
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@company.com"
            className="flex-1 h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
          />
          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={busy || !to.trim()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
            Send test
          </button>
        </div>
        {result && (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-[12px]",
              result.ok ? "border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6 text-[var(--bos-success)]" : "border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6 text-[var(--bos-error)]",
            )}
          >
            {result.ok ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <MailX className="w-3.5 h-3.5" aria-hidden="true" />}
            {result.message}
          </div>
        )}
      </section>
    </div>
  );
}
