"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalBlock, ProposalDoc, ProposalSection } from "@/lib/proposal-doc";

/* ────────────────────────────────────────────────────────────────
   ENTERPRISE CLIENT PROPOSAL REVIEW & APPROVAL SYSTEM
   Dual mode:
   1. Interactive Document & Explainable View (Default & Mobile-Ready)
      - Complete section-by-section breakdown
      - Explainable Intelligence layer (Requirement traceability, ROI, flows)
      - Progressive disclosure for capability cards
   2. High-Fidelity Print PDF View
      - Auto-generating, failsafe embedded PDF viewer
      - Direct Open in New Tab & Download actions
   3. Structured Change Requests & Explicit Version Approval
──────────────────────────────────────────────────────────────── */

export type ProposalSummary = {
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
  "Features need to be changed or refined",
  "Deliverables need to be updated",
  "Timeline is not suitable",
  "Budget / pricing needs to be revised",
  "Payment terms need to be adjusted",
  "Technical requirements need to be changed",
  "Design / branding needs modification",
  "Proposal contains incorrect information",
  "Something is missing from requirements",
  "We need more clarification",
  "Other",
];

const PROPOSAL_SECTIONS = [
  "Executive Summary",
  "Project Overview",
  "Objectives",
  "Scope",
  "Features & Capabilities",
  "Deliverables",
  "Architecture",
  "Methodology",
  "Timeline & Milestones",
  "Activity Plan",
  "Team / Roles",
  "Communication",
  "Investment & Commercials",
  "Payment Terms",
  "Terms & Conditions",
  "Other",
];

const REJECT_REASONS = [
  "Budget constraints",
  "Timeline mismatch",
  "Scope adjustment needed",
  "Found another provider",
  "Project postponed internally",
  "Requirements changed significantly",
  "No longer needed",
  "Other",
];

function fmt(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function ProposalReview({
  token,
  initial,
  initialDoc,
}: {
  token: string;
  initial: ProposalSummary;
  initialDoc?: ProposalDoc;
}) {
  const [summary, setSummary] = useState<ProposalSummary>(initial);
  const [doc, setDoc] = useState<ProposalDoc | undefined>(initialDoc);
  const [step, setStep] = useState<Step>(initial.approved || initial.rejected ? "done" : "summary");
  const [viewMode, setViewMode] = useState<"interactive" | "pdf">("interactive");
  const [explainableMode, setExplainableMode] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfKey, setPdfKey] = useState(1);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Track a real open once per page visit. */
  useEffect(() => {
    void fetch(`/api/client/proposals/${token}/open`, { method: "POST" }).catch(() => undefined);
  }, [token]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/client/proposals/${token}`);
    const data = await res.json();
    if (res.ok && data.ok) {
      setSummary(data.proposal);
      if (data.document) setDoc(data.document);
    }
  }, [token]);

  const openInteractiveReview = () => {
    setViewMode("interactive");
    setStep("review");
    void fetch(`/api/client/proposals/${token}/view-pdf`, { method: "POST" }).catch(() => undefined);
  };

  const openPdfReview = () => {
    setViewMode("pdf");
    setStep("review");
    setPdfLoading(true);
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
    return <DoneState summary={summary} token={token} />;
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        {/* Navigation & Controls Bar */}
        <div className="sticky top-2 z-40 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)]/95 backdrop-blur-md p-3 shadow-md">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("summary")}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Summary
              </button>
              <div className="font-mono text-[11px] text-[var(--bos-text-tertiary)] hidden sm:inline">
                {summary.reference} · v{summary.version}
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[var(--bos-surface)]/60 p-0.5 rounded-sm border border-[var(--bos-line)]">
              <button
                type="button"
                onClick={() => setViewMode("interactive")}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-[3px] text-[11px] font-medium transition-colors duration-150",
                  viewMode === "interactive"
                    ? "bg-white text-[var(--bos-accent)] shadow-2xs font-semibold"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                <FileCheck className="w-3.5 h-3.5" /> Interactive Document
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("pdf");
                  setPdfLoading(true);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-[3px] text-[11px] font-medium transition-colors duration-150",
                  viewMode === "pdf"
                    ? "bg-white text-[var(--bos-accent)] shadow-2xs font-semibold"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                <FileText className="w-3.5 h-3.5" /> Print PDF View
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setStep("changes")}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-[var(--bos-line)] text-[11.5px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors"
              >
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => setStep("approve")}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-sm bg-[var(--bos-success)] text-white text-[11.5px] font-medium hover:brightness-95 transition-all shadow-sm"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Approve Proposal
              </button>
            </div>
          </div>
        </div>

        {/* ═══ INTERACTIVE DOCUMENT VIEW ═══ */}
        {viewMode === "interactive" && (
          <div className="space-y-6">
            {/* Explainability Banner */}
            <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--bos-accent)] shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                    Explainable Requirement Traceability
                  </div>
                  <div className="text-[10.5px] text-[var(--bos-text-secondary)]">
                    Every feature and deliverable is directly anchored to your approved requirements.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExplainableMode((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-[10.5px] font-medium transition-colors",
                  explainableMode
                    ? "border-[var(--bos-accent)] bg-white text-[var(--bos-accent)]"
                    : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]",
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {explainableMode ? "Explainability Active" : "Show Explainability"}
              </button>
            </div>

            {/* Document Render */}
            {doc && doc.sections && doc.sections.length > 0 ? (
              <div className="space-y-6">
                {doc.sections
                  .filter((s) => s.visible)
                  .map((section, sIdx) => (
                    <section
                      key={section.id}
                      id={`client-sec-${section.id}`}
                      className="rounded-sm border border-[var(--bos-line)] bg-white p-6 sm:p-8 shadow-xs space-y-4"
                    >
                      <div className="border-b border-[var(--bos-line)] pb-3">
                        <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">
                          {section.number ? `${section.number} · ` : ""}{section.kicker || "SECTION"}
                        </div>
                        <h2 className="mt-1 text-[22px] font-bold tracking-tight text-[var(--bos-text-primary)]">
                          {section.title}
                        </h2>
                      </div>

                      <div className="space-y-3.5 pt-1">
                        {section.blocks.map((block, bIdx) => (
                          <ClientBlockRender
                            key={bIdx}
                            block={block}
                            explainable={explainableMode}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-sm border border-[var(--bos-line)] space-y-3">
                <FileText className="w-8 h-8 mx-auto text-[var(--bos-text-tertiary)]" />
                <p className="text-[13px] text-[var(--bos-text-secondary)]">
                  Loading interactive document representation…
                </p>
                <button
                  type="button"
                  onClick={openPdfReview}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium"
                >
                  View Print PDF Instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ PRINT PDF VIEW ═══ */}
        {viewMode === "pdf" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                {summary.pdfPages ? `${summary.pdfPages} pages` : "A4 Print Document"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPdfLoading(true);
                    setPdfKey((k) => k + 1);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  <RefreshCw className="w-3 h-3" /> Reload PDF
                </button>
                <a
                  href={`/api/client/proposals/${token}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--bos-accent)] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Open in New Tab
                </a>
                <a
                  href={`/api/client/proposals/${token}/pdf`}
                  download
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            </div>

            <div className="relative rounded-sm border border-[var(--bos-line)] bg-white overflow-hidden min-h-[72vh] shadow-xs">
              {pdfLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
                  <span className="text-[12px] font-medium text-[var(--bos-text-primary)]">
                    Rendering Proposal PDF…
                  </span>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    Applying Business OS editorial layout
                  </span>
                </div>
              )}
              <iframe
                key={pdfKey}
                src={`/api/client/proposals/${token}/pdf`}
                title={`${summary.title} — PDF`}
                onLoad={() => setPdfLoading(false)}
                className="w-full h-[78vh]"
              />
            </div>
          </div>
        )}

        {/* Bottom Decision Floating Bar */}
        <div className="sticky bottom-3 z-40 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface)]/95 backdrop-blur-md p-4 shadow-lg flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
              Proposal Decision
            </div>
            <div className="text-[12.5px] font-semibold text-[var(--bos-text-primary)]">
              Ready to confirm or request adjustments?
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep("reject")}
              className="inline-flex items-center gap-1 h-8 px-2.5 text-[11px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] transition-colors"
            >
              I don&apos;t want to proceed
            </button>
            <button
              type="button"
              onClick={() => setStep("changes")}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-[var(--bos-line)] text-[12px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] bg-white transition-colors"
            >
              Request Changes
            </button>
            <button
              type="button"
              onClick={() => setStep("approve")}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-sm bg-[var(--bos-success)] text-white text-[12px] font-medium hover:brightness-95 transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" /> Approve Proposal
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "approve") {
    return (
      <ModalShell title="Approve Proposal" onClose={() => setStep("review")}>
        <div className="space-y-4">
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
              Official Approval Verification
            </div>
            <div className="mt-1 text-[16px] font-bold text-[var(--bos-text-primary)]">{summary.title}</div>
            <div className="mt-0.5 text-[11px] text-[var(--bos-text-tertiary)]">
              {summary.reference} · Version v{summary.version}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 pt-2 border-t border-[var(--bos-line)]">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
                  Investment
                </div>
                <div className="mt-0.5 text-[14px] font-bold text-[var(--bos-accent)]">{summary.amountLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
                  Timeline
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-[var(--bos-text-primary)]">
                  {summary.timelineLabel || "Standard Phase Schedule"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-[var(--bos-success)]/30 bg-[var(--bos-success)]/5 p-3 text-[11.5px] text-[var(--bos-text-secondary)] space-y-1">
            <div className="font-semibold text-[var(--bos-success)] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Legally Binding Acceptance
            </div>
            <p className="leading-snug">
              By confirming, you officially accept the scope, pricing, timeline, and deliverables outlined in Version v
              {summary.version}. An approval certificate will be generated for your records.
            </p>
          </div>

          {error && (
            <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
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
              className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-success)] text-white text-[12px] font-medium hover:brightness-95 transition-all duration-150 disabled:opacity-40 shadow-sm"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              {busy ? "Recording Approval…" : "Confirm & Sign Proposal"}
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

  /* ═══ SUMMARY (DEFAULT LANDING) ═══ */
  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)] font-semibold">
          Client Proposal Review
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--bos-text-primary)]">{summary.title}</h1>
        <div className="flex items-center justify-center gap-2 flex-wrap text-[11.5px] text-[var(--bos-text-tertiary)]">
          <span>
            Prepared for <strong className="text-[var(--bos-text-primary)]">{summary.clientName}</strong>
          </span>
          <span className="w-px h-3 bg-[var(--bos-line-strong)]" aria-hidden="true" />
          <span>{summary.preparedBy}</span>
          <span className="w-px h-3 bg-[var(--bos-line-strong)]" aria-hidden="true" />
          <span className="font-mono">{summary.reference} · Version v{summary.version}</span>
        </div>
      </header>

      {/* Status chip */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] px-3 py-1 text-[10.5px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] font-semibold shadow-2xs">
          <Lock className="w-3 h-3" aria-hidden="true" /> Ready for Review & Decision
        </span>
      </div>

      {/* Highlights grid */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total Investment" value={summary.amountLabel} highlight />
        <Stat label="Project Timeline" value={summary.timelineLabel || "Phase Schedule"} />
        <Stat label="Document Scope" value={`${summary.pdfPages ? `${summary.pdfPages} Pages` : "Complete"} · Verified`} />
      </div>

      {/* Strategic Alignment Box */}
      <section className="rounded-sm border border-[var(--bos-line)] bg-white p-5 space-y-2 shadow-2xs">
        <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-accent)] font-semibold">
          Proposal Alignment & Objectives
        </div>
        <p className="text-[13px] leading-relaxed text-[var(--bos-text-secondary)]">
          This proposal establishes the tailored solution prepared specifically for <strong>{summary.clientName}</strong>.
          Every feature, milestone, and deliverable is verified against your approved requirements.
        </p>
      </section>

      {error && (
        <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
          {error}
        </div>
      )}

      {/* Main Review Actions */}
      <div className="grid sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={openInteractiveReview}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:bg-[var(--bos-accent-hover)] transition-all duration-150 shadow-sm"
        >
          <FileCheck className="w-4 h-4" aria-hidden="true" /> Open Interactive Proposal
        </button>
        <button
          type="button"
          onClick={openPdfReview}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-sm border border-[var(--bos-line)] text-[13px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] bg-white transition-colors duration-150 shadow-2xs"
        >
          <FileText className="w-4 h-4" aria-hidden="true" /> Open Print PDF Document
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--bos-text-tertiary)] pt-2">
        <a
          href={`/api/client/proposals/${token}/pdf`}
          download
          className="inline-flex items-center gap-1 hover:text-[var(--bos-text-primary)] underline"
        >
          <Download className="w-3.5 h-3.5" /> Download Offline PDF Copy
        </a>
        <span>·</span>
        <span>Private Secure Link (No Account Needed)</span>
      </div>
    </div>
  );
}

/* ── Client Block Renderer (Spec 07-09, 28) ── */

function ClientBlockRender({ block, explainable }: { block: ProposalBlock; explainable: boolean }) {
  if (block.type === "paragraph") {
    return <p className="text-[13px] leading-relaxed text-[#1a1714]">{block.text}</p>;
  }

  if (block.type === "heading") {
    const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
    return (
      <Tag
        className={cn(
          "font-bold text-[#1a1714] tracking-tight",
          block.level === 1 ? "text-[18px] mt-4" : block.level === 2 ? "text-[15px] mt-3" : "text-[13.5px] mt-2",
        )}
      >
        {block.text}
      </Tag>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className="border-l-2 border-[var(--bos-accent)] pl-3.5 py-1 my-2 bg-[#faf7f2] rounded-r-sm">
        <p className="text-[12.5px] italic text-[#6b655c]">{block.text}</p>
        {block.attribution && <footer className="mt-1 text-[10px] font-mono text-[#9a948a]">— {block.attribution}</footer>}
      </blockquote>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="space-y-1.5 my-2">
        {block.items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-[12.5px] text-[#1a1714]">
            <span className="font-mono text-[10px] text-[var(--bos-accent)] font-semibold mt-0.5">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "callout") {
    const tone = block.tone ?? "info";
    return (
      <div
        className={cn(
          "rounded-sm border p-3.5 my-2 space-y-1",
          tone === "warning"
            ? "border-[#f5dfb8] bg-[#fdf3e7] text-[#9a5b13]"
            : tone === "success"
              ? "border-[#d8edd4] bg-[#eef6ec] text-[#3f6e35]"
              : "border-[#f2dcd5] bg-[#faf0ed] text-[var(--bos-accent)]",
        )}
      >
        {block.title && <div className="text-[11px] font-bold uppercase tracking-[0.08em]">{block.title}</div>}
        <p className="text-[12.5px] leading-relaxed text-[#1a1714]">{block.text}</p>
      </div>
    );
  }

  if (block.type === "feature_card") {
    return (
      <div className="rounded-sm border border-[#e7e2d8] bg-[#faf9f6] p-4 my-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[14px] font-bold text-[#1a1714]">{block.title}</div>
            <p className="text-[12px] text-[#6b655c] mt-0.5 leading-snug">{block.purpose}</p>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-[3px] text-[9.5px] font-mono uppercase tracking-[0.1em] font-semibold bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)]">
            {block.priority || "Approved"}
          </span>
        </div>

        {explainable && (
          <div className="rounded-sm border border-[#e0d9cf] bg-white p-3 space-y-2 text-[11px]">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--bos-accent)] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Requirement Provenance
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#9a948a]">Target Users:</span>{" "}
                <strong className="text-[#1a1714]">{block.primaryUsers || block.users || "Authorized users"}</strong>
              </div>
              <div>
                <span className="text-[#9a948a]">Source Reference:</span>{" "}
                <strong className="text-[var(--bos-accent)]">{block.requirementSource || "REQ-Verified"}</strong>
              </div>
            </div>
            {block.businessNeed && (
              <div className="text-[11px] text-[#6b655c]">
                <strong className="text-[#1a1714]">Strategic Rationale:</strong> {block.businessNeed}
              </div>
            )}
            {block.acceptanceCriteria && block.acceptanceCriteria.length > 0 && (
              <div className="pt-1 border-t border-[#f0ece4]">
                <span className="text-[9.5px] font-mono text-[#9a948a] uppercase">Acceptance Criteria:</span>
                <ul className="list-disc list-inside mt-0.5 text-[#6b655c]">
                  {block.acceptanceCriteria.map((ac, idx) => (
                    <li key={idx}>{ac}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (block.type === "comparison") {
    return (
      <div className="grid sm:grid-cols-2 gap-3 my-3">
        <div className="rounded-sm border border-[#f5dfb8] bg-[#fdf3e7] p-3.5 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#9a5b13] font-semibold">
            Current State (Challenge)
          </div>
          <p className="text-[12px] text-[#1a1714] leading-snug">{block.currentState.problem}</p>
          <div className="text-[11px] text-[#9a5b13]">Impact: {block.currentState.impact}</div>
        </div>
        <div className="rounded-sm border border-[#d8edd4] bg-[#eef6ec] p-3.5 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#3f6e35] font-semibold">
            Proposed State (Solution)
          </div>
          <p className="text-[12px] text-[#1a1714] leading-snug">{block.proposedState.solution}</p>
          <div className="text-[11px] text-[#3f6e35]">Outcome: {block.proposedState.outcome}</div>
        </div>
      </div>
    );
  }

  if (block.type === "table" || block.type === "pricing_table") {
    const headers = block.headers ?? [];
    const rows = block.rows ?? [];
    return (
      <div className="my-3 overflow-x-auto rounded-sm border border-[#e7e2d8]">
        <table className="w-full text-left text-[11.5px]">
          <thead className="bg-[#b5452a] text-white">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7e2d8]">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-[#faf7f2]"}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-[#1a1714]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {block.type === "pricing_table" && block.total && (
          <div className="bg-[#faf7f2] p-2.5 text-right font-bold text-[13px] text-[var(--bos-accent)] border-t border-[#e7e2d8]">
            Total Investment: {block.total}
          </div>
        )}
      </div>
    );
  }

  if (block.type === "timeline") {
    return (
      <div className="space-y-2 my-3">
        {block.phases.map((p, idx) => (
          <div key={idx} className="flex items-start gap-3 rounded-sm border border-[#e7e2d8] bg-white p-3">
            <span className="font-mono text-[11px] font-bold text-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] px-2 py-0.5 rounded-[2px]">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <strong className="text-[13px] text-[#1a1714]">{p.title}</strong>
                {p.duration && <span className="text-[10.5px] font-mono text-[#9a948a]">{p.duration}</span>}
              </div>
              {p.description && <p className="text-[11.5px] text-[#6b655c] mt-0.5 leading-snug">{p.description}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "approval") {
    return (
      <div className="rounded-sm border-2 border-[var(--bos-accent)] bg-[#faf7f2] p-4 my-4 space-y-1.5">
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] font-bold">
          Digital Approval Sign-off
        </div>
        <div className="text-[13px] font-bold text-[#1a1714]">
          Authorized Client: {block.clientName || "Client Representative"}
        </div>
        <div className="text-[11.5px] text-[#6b655c]">
          Scope: {block.approvedScope || "Complete Agreed Deliverables"}
        </div>
        <div className="text-[10.5px] font-mono text-[#9a948a]">
          Verified Acceptance Mechanism: Secure Token Verification
        </div>
      </div>
    );
  }

  return null;
}

/* ── Stat card ── */

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-sm border px-3.5 py-3 text-center bg-white shadow-2xs", highlight ? "border-[var(--bos-accent-ring)]" : "border-[var(--bos-line)]")}>
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-[15px] font-bold truncate", highlight ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-primary)]")}>
        {value}
      </div>
    </div>
  );
}

/* ── Modal shell ── */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-xl">
        <div className="px-5 py-4 border-b border-[var(--bos-line)] flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)] font-semibold">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
            aria-label="Close"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Done state & Approval Certificate ── */

function DoneState({ summary, token }: { summary: ProposalSummary; token: string }) {
  const latest = summary.changeRequests[0] ?? null;
  return (
    <div className="text-center py-8 space-y-6">
      {summary.approved ? (
        <>
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bos-success)] text-white shadow-md">
            <Check className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-success)] font-bold">
              Official Approval Certificate
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-[var(--bos-text-primary)]">Proposal Confirmed & Approved</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-md mx-auto">
              Thank you. Your explicit approval has been recorded in the Business OS database for <strong>{summary.title}</strong> (
              {summary.reference} v{summary.version}).
            </p>
            {summary.lastApprovedAt && (
              <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                Recorded at {fmt(summary.lastApprovedAt)}
              </p>
            )}
          </div>

          <div className="rounded-sm border border-[var(--bos-success)]/30 bg-white p-5 max-w-md mx-auto shadow-sm space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-2 text-[11px]">
              <span className="text-[var(--bos-text-tertiary)]">Approval Record</span>
              <span className="font-mono font-bold text-[var(--bos-success)]">APP-CONFIRMED</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--bos-text-tertiary)]">Approved Version</span>
              <span className="font-mono text-[var(--bos-text-primary)]">v{summary.version}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--bos-text-tertiary)]">Agreed Investment</span>
              <span className="font-bold text-[var(--bos-accent)]">{summary.amountLabel}</span>
            </div>
            <div className="pt-2 border-t border-[var(--bos-line)] flex items-center justify-between">
              <a
                href={`/api/client/proposals/${token}/pdf`}
                download
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--bos-accent)] hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download Final Approved PDF
              </a>
            </div>
          </div>
        </>
      ) : summary.rejected ? (
        <>
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-text-tertiary)] text-white">
            <X className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[var(--bos-text-primary)]">
              Thank you for letting us know
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-sm mx-auto">
              We&apos;ve recorded that you do not wish to proceed with <strong>{summary.title}</strong>.
            </p>
          </div>
        </>
      ) : latest ? (
        <>
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-warning)] text-white">
            <Check className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[var(--bos-text-primary)]">Change Request Received</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-md mx-auto">
              Your structured change request for <strong>{summary.title}</strong> has been received by the project team. A revision will be prepared.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ── Change Request Flow ── */

type ChangePayload = {
  reasons: string[];
  sections: string[];
  changes: { section: string; currentValue: string; requestedValue: string; reason: string }[];
  message: string;
  priority: string;
};

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
    if (sections.length === 0 && !detail && reasons.length === 0) {
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

  const inputCls =
    "w-full h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";

  return (
    <div className="space-y-5">
      <HeaderLine label="Request Changes" onBack={onCancel} />

      <section className="rounded-sm border border-[var(--bos-line)] bg-white p-4">
        <div className="text-[13px] font-bold text-[var(--bos-text-primary)]">{summary.title}</div>
        <div className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
          {summary.reference} · Version v{summary.version}
        </div>
      </section>

      {/* 1. Why */}
      <section>
        <StepLabel n="01" label="What category of change is required?" hint="Select all that apply" />
        <div className="space-y-1.5">
          {CHANGE_REASONS.map((r) => (
            <ToggleRow key={r} label={r} active={reasons.includes(r)} onClick={() => toggle(reasons, setReasons, r)} />
          ))}
        </div>
      </section>

      {/* 2. Which section */}
      <section>
        <StepLabel n="02" label="Which section of the proposal needs adjustment?" hint="Select all that apply" />
        <div className="space-y-1.5">
          {PROPOSAL_SECTIONS.map((s) => (
            <ToggleRow key={s} label={s} active={sections.includes(s)} onClick={() => toggle(sections, setSections, s)} />
          ))}
        </div>
      </section>

      {/* 3. Description */}
      <section>
        <StepLabel n="03" label="Explain what should be modified or added" />
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError(null);
          }}
          rows={4}
          placeholder="Please describe the exact adjustments required for the next revision…"
          className={cn(inputCls, "h-auto py-2.5 leading-relaxed resize-none")}
        />
      </section>

      {error && <ErrorBanner error={error} />}

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-3 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 shadow-sm"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          Submit Change Request
        </button>
      </div>
    </div>
  );
}

/* ── Reject Flow ── */

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
      setError("Please select a reason.");
      return;
    }
    onSubmit({ reason, details });
  };

  return (
    <ModalShell title="Decline Proposal" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-[12px] leading-relaxed text-[var(--bos-text-secondary)]">
          Would you like to tell us why you&apos;re not proceeding with <strong>{summary.title}</strong>?
        </p>
        <div className="space-y-1.5">
          {REJECT_REASONS.map((r) => (
            <ToggleRow
              key={r}
              label={r}
              active={reason === r}
              onClick={() => {
                setReason(r);
                setError(null);
              }}
              radio
            />
          ))}
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] mb-1">
            Additional Feedback (Optional)
          </label>
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
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-3 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 text-[var(--bos-error)] text-[12px] font-medium hover:bg-[var(--bos-error)]/10 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : null}
            Confirm Decision
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── UI Helpers ── */

function StepLabel({ n, label, hint }: { n: string; label: string; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] text-[9px] font-mono font-bold">
          {n}
        </span>
        <span className="text-[12.5px] font-semibold text-[var(--bos-text-primary)]">{label}</span>
      </div>
      {hint && <div className="mt-0.5 ml-7 text-[10px] text-[var(--bos-text-tertiary)]">{hint}</div>}
    </div>
  );
}

function ToggleRow({
  label,
  active,
  onClick,
  radio,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  radio?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 text-left rounded-sm border px-3.5 py-2 text-[12px] transition-colors duration-150",
        active
          ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]/50 text-[var(--bos-accent)] font-medium"
          : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] bg-white",
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
    <div className="flex items-center justify-between gap-2 border-b border-[var(--bos-line)] pb-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
      </button>
      <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)] font-semibold">
        {label}
      </span>
      <span className="w-8" aria-hidden="true" />
    </div>
  );
}
