"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────
   CLIENT PROPOSAL REVIEW — the secure review experience.
   The client sees the real proposal, opens the real PDF, and decides:
   approve (explicit confirmation), request changes (structured, with
   reasons + affected sections + current → requested values), or not
   proceed. Every decision is stored and reflected back to the admin.
──────────────────────────────────────────────────────────────── */

type ProposalSummary = {
  id: string;
  reference: string;
  title: string;
  version: number;
  status: string;
  amount: number | null;
  amountLabel: string;
  timelineLabel: string;
  pdfPages: number | null;
  clientName: string;
  preparedBy: string;
  sentAt: string | null;
  viewedAt: string | null;
  lastApprovedAt: string | null;
  approved: boolean;
  rejected: boolean;
  changeRequests: {
    id: string;
    reference: string;
    status: string;
    message: string;
    adminResponse: string | null;
    submittedAt: string;
    reasons: string[];
    sections: string[];
  }[];
  deliveryCount: number;
};

type Step = "summary" | "review" | "approve" | "changes" | "reject" | "done";

const CHANGE_REASONS = [
  "Scope is different from what we expected",
  "Features need to be changed",
  "Deliverables need to be changed",
  "Timeline is not suitable",
  "Budget / pricing needs to be revised",
  "Payment terms need to be revised",
  "Technical requirements need to be changed",
  "Design / branding needs to be changed",
  "Proposal contains incorrect information",
  "Something is missing",
  "We need more clarification",
  "Other",
];

const PROPOSAL_SECTIONS = [
  "Executive Summary",
  "Project Overview",
  "Objectives",
  "Scope",
  "Features",
  "Deliverables",
  "Methodology",
  "Timeline",
  "Activity Plan",
  "Team / Roles",
  "Communication",
  "Investment",
  "Payment Terms",
  "Terms & Conditions",
  "Other",
];

const REJECT_REASONS = [
  "Budget",
  "Timeline",
  "Scope",
  "Found another provider",
  "Project postponed",
  "Requirements changed",
  "No longer needed",
  "Other",
];

function fmt(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function ProposalReview({ token, initial }: { token: string; initial: ProposalSummary }) {
  const [summary, setSummary] = useState<ProposalSummary>(initial);
  const [step, setStep] = useState<Step>(initial.approved || initial.rejected ? "done" : "summary");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Track a real open once per page visit. */
  useEffect(() => {
    void fetch(`/api/client/proposals/${token}/open`, { method: "POST" }).catch(() => undefined);
  }, [token]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/client/proposals/${token}`);
    const data = await res.json();
    if (res.ok && data.ok) setSummary(data.proposal);
  }, [token]);

  const openPdf = () => {
    setPdfOpen(true);
    setStep("review");
    void fetch(`/api/client/proposals/${token}/view-pdf`, { method: "POST" }).catch(() => undefined);
  };

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/proposals/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: summary.clientName }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Unable to record your approval.");
      await refresh();
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record your approval.");
    } finally {
      setBusy(false);
    }
  };

  const postDecision = async (path: string, payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/proposals/${token}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Unable to submit your response.");
      await refresh();
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit your response.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done") {
    return <DoneState summary={summary} />;
  }

  if (step === "review" && pdfOpen) {
    return (
      <div className="req-enter">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={() => setPdfOpen(false)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to summary
          </button>
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">
            {summary.reference} · v{summary.version} · {summary.pdfPages ?? "—"} pages
          </div>
        </div>

        <div className="rounded-sm border border-[var(--bos-line)] bg-white overflow-hidden">
          <iframe
            src={`/api/client/proposals/${token}/pdf`}
            title={`${summary.title} — PDF`}
            className="w-full h-[70vh]"
          />
        </div>

        {/* Decision bar — only after the client has had the chance to review */}
        <div className="mt-4 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface)]/60 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-2">
            Have you reviewed this proposal?
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setPdfOpen(false); setStep("changes"); }}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-sm border border-[var(--bos-line)] text-[12px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              Request Changes
            </button>
            <button
              type="button"
              onClick={() => { setPdfOpen(false); setStep("approve"); }}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-sm bg-[var(--bos-success)] text-white text-[12px] font-medium hover:brightness-95 transition-all duration-150"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" /> Approve Proposal
            </button>
            <button
              type="button"
              onClick={() => { setPdfOpen(false); setStep("reject"); }}
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] transition-colors duration-150"
            >
              I don&apos;t want to proceed
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "approve") {
    return (
      <ModalShell title="Approve proposal" onClose={() => setStep("review")}>
        <div className="space-y-4">
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">Proposal</div>
            <div className="mt-1 text-[15px] font-semibold text-[var(--bos-text-primary)]">{summary.title}</div>
            <div className="mt-0.5 text-[11px] text-[var(--bos-text-tertiary)]">{summary.reference} · v{summary.version}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Investment</div>
                <div className="mt-0.5 text-[13px] font-medium text-[var(--bos-text-primary)]">{summary.amountLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Timeline</div>
                <div className="mt-0.5 text-[13px] font-medium text-[var(--bos-text-primary)]">{summary.timelineLabel || "—"}</div>
              </div>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-[var(--bos-text-secondary)]">
            By continuing, you confirm that you have reviewed and accepted this proposal.
          </p>
          {error && (
            <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep("review")}
              className="h-9 px-3 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void approve()}
              disabled={busy}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-success)] text-white text-[12px] font-medium hover:brightness-95 transition-all duration-150 disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              {busy ? "Recording…" : "Confirm Approval"}
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (step === "changes") {
    return (
      <ChangeRequestFlow
        summary={summary}
        onCancel={() => setStep("review")}
        onSubmit={(payload) => postDecision("request-changes", payload)}
        busy={busy}
        error={error}
        setError={setError}
      />
    );
  }

  if (step === "reject") {
    return (
      <RejectFlow
        summary={summary}
        onCancel={() => setStep("review")}
        onSubmit={(payload) => postDecision("reject", payload)}
        busy={busy}
        error={error}
        setError={setError}
      />
    );
  }

  /* ── Summary (default) ── */
  return (
    <div className="req-enter space-y-5">
      <header className="text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">Your proposal</div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-[var(--bos-text-primary)]">{summary.title}</h1>
        <div className="mt-1.5 flex items-center justify-center gap-2 flex-wrap text-[11px] text-[var(--bos-text-tertiary)]">
          <span>Prepared for <span className="font-medium text-[var(--bos-text-secondary)]">{summary.clientName}</span></span>
          <span className="w-px h-3 bg-[var(--bos-line-strong)]" aria-hidden="true" />
          <span>{summary.preparedBy}</span>
          <span className="w-px h-3 bg-[var(--bos-line-strong)]" aria-hidden="true" />
          <span>{summary.reference} · v{summary.version}</span>
        </div>
      </header>

      {/* Status */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
          <Lock className="w-3 h-3" aria-hidden="true" /> Ready for review
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Timeline" value={summary.timelineLabel || "—"} />
        <Stat label="Investment" value={summary.amountLabel} />
        <Stat label="Pages" value={summary.pdfPages !== null ? String(summary.pdfPages) : "—"} />
      </div>

      {/* What to expect */}
      <section className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-5">
        <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">What to expect</div>
        <p className="text-[13px] leading-relaxed text-[var(--bos-text-secondary)]">
          This proposal summarises how we understand your project, what will be delivered, the timeline and the
          investment. Open the document to review it, then approve or request changes.
        </p>
      </section>

      {error && (
        <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={openPdf}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
        >
          <FileText className="w-4 h-4" aria-hidden="true" /> Open Proposal
        </button>
        <a
          href={`/api/client/proposals/${token}/pdf`}
          download
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-sm border border-[var(--bos-line)] text-[13px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> Download PDF
        </a>
      </div>

      <p className="text-center text-[10px] text-[var(--bos-text-tertiary)]">
        This is a private, secure link — you don&apos;t need an account to review it.
      </p>
    </div>
  );
}

/* ── Stat card ── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[var(--bos-line)] px-3 py-3 text-center">
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">{label}</div>
      <div className="mt-1 text-[14px] font-semibold text-[var(--bos-text-primary)] truncate">{value}</div>
    </div>
  );
}

/* ── Modal shell ── */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-lg">
        <div className="px-5 py-4 border-b border-[var(--bos-line)] flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">{title}</div>
          <button type="button" onClick={onClose} className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Done state ── */

function DoneState({ summary }: { summary: ProposalSummary }) {
  const latest = summary.changeRequests[0] ?? null;
  return (
    <div className="text-center py-10 req-enter space-y-6">
      {summary.approved ? (
        <>
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-success)] text-white">
            <Check className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Proposal approved</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-sm mx-auto">
              Thank you. Your approval has been recorded for <strong>{summary.title}</strong> ({summary.reference}).
            </p>
            {summary.lastApprovedAt && (
              <p className="mt-1 text-[11px] text-[var(--bos-text-tertiary)]">Approved {fmt(summary.lastApprovedAt)}</p>
            )}
          </div>
          <div className="rounded-sm border border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6 px-4 py-3 max-w-sm mx-auto">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-success)]">Next step</div>
            <p className="mt-1 text-[12px] text-[var(--bos-text-secondary)]">
              The project team will now prepare the project setup.
            </p>
          </div>
        </>
      ) : summary.rejected ? (
        <>
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-text-tertiary)] text-white">
            <X className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Thank you for letting us know</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-sm mx-auto">
              We&apos;ve noted that you do not wish to proceed with <strong>{summary.title}</strong>. If anything changes, we&apos;d be happy to revisit it.
            </p>
          </div>
        </>
      ) : latest ? (
        <>
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-warning)] text-white">
            <Check className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Change request sent</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-sm mx-auto">
              Your requested changes for <strong>{summary.title}</strong> have been sent to the project team.
            </p>
          </div>
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-4 max-w-sm mx-auto text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">{latest.reference}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[3px] border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-warning)]">
                {latest.status.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] leading-snug">{latest.message}</p>
            {latest.adminResponse && (
              <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 px-3 py-2">
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] mb-0.5">From the team</div>
                <p className="text-[12px] text-[var(--bos-text-primary)] leading-snug">{latest.adminResponse}</p>
              </div>
            )}
            <p className="text-[11px] text-[var(--bos-text-tertiary)]">Submitted {fmt(latest.submittedAt)}</p>
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-success)] text-white">
            <Check className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Thank you</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-sm mx-auto">
              Your response has been recorded for <strong>{summary.title}</strong>.
            </p>
          </div>
        </>
      )}
      <div className="h-px w-24 mx-auto bg-[var(--bos-line-strong)]" aria-hidden="true" />
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">{summary.reference}</p>
    </div>
  );
}

/* ── Change request flow ── */

type ChangePayload = { reasons: string[]; sections: string[]; changes: { section: string; currentValue: string; requestedValue: string; reason: string }[]; message: string; priority: string };

function ChangeRequestFlow({
  summary,
  onCancel,
  onSubmit,
  busy,
  error,
  setError,
}: {
  summary: ProposalSummary;
  onCancel: () => void;
  onSubmit: (payload: ChangePayload) => void;
  busy: boolean;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [changes, setChanges] = useState<Record<string, { currentValue: string; requestedValue: string; reason: string }>>({});
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [reviewing, setReviewing] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = () => {
    const detail = message.trim();
    if (sections.length === 0 && !detail) {
      setError("Select the sections that need to change, or describe your request.");
      return;
    }
    setReviewing(true);
    setError(null);
  };

  const confirm = () => {
    onSubmit({
      reasons,
      sections,
      changes: sections
        .map((s) => ({ section: s, ...(changes[s] ?? { currentValue: "", requestedValue: "", reason: "" }) }))
        .filter((c) => c.requestedValue || c.reason),
      message,
      priority,
    });
  };

  if (reviewing) {
    return (
      <div className="req-enter space-y-5">
        <HeaderLine label="Review your request" onBack={() => setReviewing(false)} />
        <div className="rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface)]/60 p-5 space-y-4">
          {reasons.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-1.5">Reasons</div>
              <div className="flex flex-wrap gap-1.5">
                {reasons.map((r) => (
                  <span key={r} className="inline-flex items-center px-2 py-0.5 rounded-[3px] border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)]">{r}</span>
                ))}
              </div>
            </div>
          )}
          {sections.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-1.5">Affected sections</div>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((s) => (
                  <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-[3px] border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)]">{s}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-1.5">Priority</div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--bos-warning)]">{priority}</span>
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-1.5">Request</div>
            <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">{message.trim() || "—"}</p>
          </div>
          {Object.entries(changes).filter(([, c]) => c.requestedValue || c.reason).length > 0 && (
            <div className="space-y-2">
              <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">Specific changes</div>
              {Object.entries(changes)
                .filter(([, c]) => c.requestedValue || c.reason)
                .map(([section, c]) => (
                  <div key={section} className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]/60 p-3">
                    <div className="text-[11px] font-medium text-[var(--bos-text-primary)]">{section}</div>
                    <div className="mt-1 grid sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="text-[var(--bos-text-tertiary)]">Current: <span className="text-[var(--bos-text-secondary)]">{c.currentValue || "—"}</span></div>
                      <div className="text-[var(--bos-text-tertiary)]">Requested: <span className="text-[var(--bos-accent)]">{c.requestedValue || "—"}</span></div>
                    </div>
                    {c.reason && <div className="mt-1 text-[11px] text-[var(--bos-text-tertiary)]">{c.reason}</div>}
                  </div>
                ))}
            </div>
          )}
        </div>
        {error && <ErrorBanner error={error} />}
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setReviewing(false)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
            {busy ? "Submitting…" : "Submit Change Request"}
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";

  return (
    <div className="req-enter space-y-5">
      <HeaderLine label="Request changes" onBack={onCancel} />

      <section className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-4 py-3">
        <div className="text-[12px] font-medium text-[var(--bos-text-primary)]">{summary.title}</div>
        <div className="text-[10px] text-[var(--bos-text-tertiary)]">{summary.reference} · v{summary.version}</div>
      </section>

      {/* 1. Why */}
      <section>
        <StepLabel n="01" label="What would you like to change?" hint="Select all that apply" />
        <div className="space-y-1.5">
          {CHANGE_REASONS.map((r) => (
            <ToggleRow key={r} label={r} active={reasons.includes(r)} onClick={() => toggle(reasons, setReasons, r)} />
          ))}
        </div>
      </section>

      {/* 2. Which section */}
      <section>
        <StepLabel n="02" label="Which part of the proposal needs to change?" hint="Select all that apply" />
        <div className="space-y-1.5">
          {PROPOSAL_SECTIONS.map((s) => (
            <ToggleRow key={s} label={s} active={sections.includes(s)} onClick={() => toggle(sections, setSections, s)} />
          ))}
        </div>
      </section>

      {/* 3. Specific changes per section */}
      {sections.length > 0 && (
        <section className="space-y-3">
          <StepLabel n="03" label="What needs to change?" hint="Current value → requested value" />
          {sections.map((s) => {
            const c = changes[s] ?? { currentValue: "", requestedValue: "", reason: "" };
            return (
              <div key={s} className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-3.5">
                <div className="text-[11px] font-medium text-[var(--bos-text-primary)] mb-2">{s}</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="bos-label">Current</label>
                    <input value={c.currentValue} onChange={(e) => setChanges({ ...changes, [s]: { ...c, currentValue: e.target.value } })} placeholder="e.g. 8 weeks" className={inputCls} />
                  </div>
                  <div>
                    <label className="bos-label">Requested</label>
                    <input value={c.requestedValue} onChange={(e) => setChanges({ ...changes, [s]: { ...c, requestedValue: e.target.value } })} placeholder="e.g. 10 weeks" className={inputCls} />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="bos-label">Why?</label>
                  <input value={c.reason} onChange={(e) => setChanges({ ...changes, [s]: { ...c, reason: e.target.value } })} placeholder="e.g. we need more time for internal testing" className={inputCls} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 4. Priority */}
      <section>
        <StepLabel n="04" label="How important is this change?" hint="Your feedback — the team will decide final priorities" />
        <div className="flex gap-2">
          {["LOW", "MEDIUM", "HIGH", "BLOCKING"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "flex-1 h-9 rounded-sm border text-[11px] font-mono uppercase tracking-[0.1em] transition-colors duration-150",
                priority === p
                  ? p === "BLOCKING" ? "border-[var(--bos-error)] bg-[var(--bos-error)] text-white" : "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white"
                  : "border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:border-[var(--bos-border-strong)]",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* 5. Message */}
      <section>
        <StepLabel n="05" label="Anything else we should know?" hint="Optional" />
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setError(null); }}
          rows={4}
          placeholder="Tell us what you expected, what needs to change, or what is missing."
          className={cn(inputCls, "h-auto py-2.5 leading-relaxed resize-none")}
        />
      </section>

      {error && <ErrorBanner error={error} />}

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onCancel} className="h-9 px-3 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)]"
        >
          Review request <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ── Reject flow ── */

function RejectFlow({
  summary,
  onCancel,
  onSubmit,
  busy,
  error,
  setError,
}: {
  summary: ProposalSummary;
  onCancel: () => void;
  onSubmit: (payload: { reason: string; details: string }) => void;
  busy: boolean;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const submit = () => {
    if (!reason) {
      setError("Tell us why you're not proceeding.");
      return;
    }
    onSubmit({ reason, details });
  };

  return (
    <ModalShell title="We're sorry to hear that" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-[12px] leading-relaxed text-[var(--bos-text-secondary)]">
          Would you like to tell us why you&apos;re not proceeding with <strong>{summary.title}</strong>?
        </p>
        <div className="space-y-1.5">
          {REJECT_REASONS.map((r) => (
            <ToggleRow key={r} label={r} active={reason === r} onClick={() => { setReason(r); setError(null); }} radio />
          ))}
        </div>
        <div>
          <label className="bos-label">Additional feedback (optional)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Anything else you'd like to share…"
            className="w-full rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 py-2 text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] resize-none"
          />
        </div>
        {error && <ErrorBanner error={error} />}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 px-3 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 text-[var(--bos-error)] text-[12px] font-medium hover:bg-[var(--bos-error)]/10 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Confirming…" : "Confirm"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Small shared pieces ── */

function StepLabel({ n, label, hint }: { n: string; label: string; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] text-[9px] font-mono">{n}</span>
        <span className="text-[12px] font-medium text-[var(--bos-text-primary)]">{label}</span>
      </div>
      {hint && <div className="mt-1 ml-7 text-[10px] text-[var(--bos-text-tertiary)]">{hint}</div>}
    </div>
  );
}

function ToggleRow({ label, active, onClick, radio }: { label: string; active: boolean; onClick: () => void; radio?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 text-left rounded-sm border px-3.5 py-2.5 text-[12.5px] transition-colors duration-150",
        active ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium" : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center w-4 h-4 shrink-0",
          radio ? "rounded-full border" : "rounded-sm border",
          active ? "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white" : "border-[var(--bos-border-strong)]",
        )}
      >
        {active && <Check className="w-3 h-3" aria-hidden="true" />}
      </span>
      {label}
    </button>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)] flex items-center gap-2">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {error}
    </div>
  );
}

function HeaderLine({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
      </button>
      <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">{label}</span>
      <span className="w-8" aria-hidden="true" />
    </div>
  );
}

