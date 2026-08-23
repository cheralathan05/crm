import { CheckCircle2 } from "lucide-react";
import { BusinessOSMark } from "@/components/business-os-mark";

/* ── Submission complete — calm, confident, no over-animation ── */

export function SuccessScreen({
  reference,
  revision,
  resubmitted,
}: {
  reference: string;
  revision: number;
  resubmitted?: boolean;
}) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16 bg-[var(--bos-bg)]">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <BusinessOSMark size="md" />
        </div>

        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full border-2 border-[var(--bos-success)]/30 bg-[var(--bos-success)]/8">
          <CheckCircle2 className="w-8 h-8 text-[var(--bos-success)]" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
          {resubmitted ? "Requirements resubmitted" : "Requirements submitted"}
        </h1>
        <p className="mt-2 text-[14px] text-[var(--bos-text-secondary)]">
          Your project information has been securely submitted{resubmitted ? ` (revision ${revision})` : ""}.
        </p>

        <div className="mt-8 rounded-sm border border-[var(--bos-line-strong)] divide-y divide-[var(--bos-line)] text-left">
          <dl className="flex items-center justify-between px-5 py-3.5">
            <dt className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Reference</dt>
            <dd className="font-mono text-[13px] font-medium text-[var(--bos-text-primary)]">{reference}</dd>
          </dl>
          <dl className="flex items-center justify-between px-5 py-3.5">
            <dt className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Submitted</dt>
            <dd className="text-[13px] text-[var(--bos-text-primary)]">
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </dd>
          </dl>
          <dl className="flex items-center justify-between px-5 py-3.5">
            <dt className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Status</dt>
            <dd>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[var(--bos-warning)]/10 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-warning)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-warning)]" aria-hidden="true" />
                Under review
              </span>
            </dd>
          </dl>
        </div>

        <p className="mt-6 text-[13px] text-[var(--bos-text-secondary)]">
          We&apos;ll review the information and contact you if clarification is required.
        </p>
        <p className="mt-2 text-[11px] text-[var(--bos-text-tertiary)]">You can close this page — your submission is safe.</p>
      </div>
    </main>
  );
}
