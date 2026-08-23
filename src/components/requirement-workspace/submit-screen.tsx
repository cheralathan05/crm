"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicBundle } from "./types";

/* ── Submission — with backend-validated confirmation ───────── */

export function SubmitScreen({
  bundle,
  token,
  onBack,
  onSubmitted,
}: {
  bundle: PublicBundle;
  token: string;
  onBack: () => void;
  onSubmitted: (reference: string, revision: number) => void;
}) {
  const [name, setName] = useState(bundle.responder.name ?? "");
  const [role, setRole] = useState(bundle.responder.role ?? "");
  const [email, setEmail] = useState(bundle.responder.email ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmed && name.trim().length > 0;

  async function submit() {
    if (!canSubmit || state === "submitting") return;
    setState("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/public/requirements/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          responderName: name.trim(),
          responderRole: role.trim() || undefined,
          responderEmail: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState("error");
        setError(data.message ?? "Unable to submit. Please try again.");
        return;
      }
      if (data.submitted) {
        onSubmitted(data.reference, data.revision);
      } else if (data.reason === "NO_CHANGES") {
        // Already submitted with identical data — show the success state.
        onSubmitted(bundle.request.reference, bundle.request.revision);
      }
    } catch {
      setState("error");
      setError("Network error — please try again.");
    }
  }

  const inputCls =
    "w-full h-11 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[14px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="section-number">SUBMISSION</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">Ready to submit?</h2>
      <p className="mt-2 text-[14px] text-[var(--bos-text-secondary)]">
        You&apos;ve given us the information needed to understand your project. Submitting is secure and
        sends everything to the team that prepared this workspace.
      </p>

      <div className="mt-8 rounded-sm border border-[var(--bos-line-strong)] p-5 space-y-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Who&apos;s completing this?</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="r-name" className="bos-label">Your name</label>
            <input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label htmlFor="r-role" className="bos-label">Your role</label>
            <input id="r-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Founder, Product Manager" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="r-email" className="bos-label">Work email</label>
            <input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={inputCls} />
          </div>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-sm border border-[var(--bos-line-strong)] p-4 cursor-pointer hover:border-[var(--bos-border-strong)] transition-colors duration-150">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[var(--bos-accent)]"
        />
        <span className="text-[13px] text-[var(--bos-text-secondary)]">
          I confirm that the information provided is accurate to the best of my knowledge.
        </span>
      </label>

      {error && (
        <div className="mt-4 rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-4 py-3 text-[12px] text-[var(--bos-error)]">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 h-11 px-4 rounded-sm text-[13px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
        >
          ← Back to review
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit || state === "submitting"}
          className={cn(
            "inline-flex items-center gap-2 h-12 px-6 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium transition-colors duration-150",
            "hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {state === "submitting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Submitting…
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" aria-hidden="true" /> Submit project requirements <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
        <Check className="w-3 h-3" aria-hidden="true" />
        Your answers are saved. You can close this page at any time and return later.
      </p>
    </div>
  );
}
