"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  GitCompare,
  History,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalDeliveryBundle } from "@/lib/proposal-delivery";
import type { ProposalVersionDiff } from "@/lib/proposal-doc";
import { StatusChip } from "@/components/clients/kit";
import type { StudioInitial } from "./types";

/* ────────────────────────────────────────────────────────────────
   FINALIZE + DELIVERY + VERSION COMPARISON FLOWS
   Honest state, zero fake data, client-ready business delivery.
──────────────────────────────────────────────────────────────── */

export const GENERATION_STEPS = [
  "Preparing content",
  "Applying Business OS template",
  "Rendering pages",
  "Validating layout",
  "Generating PDF",
  "Saving document",
];

/* ═══ Finalize check ═══ */

export function FinalCheck({
  quality,
  onClose,
  onFinalize,
}: {
  quality: { total: number; items: { label: string; ok: boolean; note: string }[] };
  onClose: () => void;
  onFinalize: () => void;
}) {
  const blockers = quality.items.filter((i) => !i.ok);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)]"
      >
        <div className="px-5 py-4 border-b border-[var(--bos-line)]">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">Final Proposal Verification</div>
          <button type="button" onClick={onClose} className="absolute right-4 top-4 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {quality.items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={cn("flex items-center justify-center w-4 h-4 rounded-full", item.ok ? "bg-[var(--bos-success)] text-white" : "bg-[var(--bos-warning)] text-white")}>
                  {item.ok ? <Check className="w-2.5 h-2.5" aria-hidden="true" /> : <span className="text-[9px] font-bold">!</span>}
                </span>
                <span className="text-[12px] text-[var(--bos-text-primary)]">{item.label}</span>
                {!item.ok && <span className="text-[10px] text-[var(--bos-text-tertiary)] ml-auto">{item.note}</span>}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--bos-success)] text-white">
                <Check className="w-2.5 h-2.5" aria-hidden="true" />
              </span>
              <span className="text-[12px] text-[var(--bos-text-primary)]">Editorial Template</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--bos-success)] text-white">
                <Check className="w-2.5 h-2.5" aria-hidden="true" />
              </span>
              <span className="text-[12px] text-[var(--bos-text-primary)]">PDF Layout Engine</span>
            </div>
          </div>

          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-3.5 py-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--bos-text-secondary)]">Proposal Readiness</span>
              <span className={cn("font-semibold tabular-nums", quality.total >= 80 ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>{quality.total}%</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
              <div className={cn("h-full rounded-full transition-[width] duration-500", quality.total >= 80 ? "bg-[var(--bos-success)]" : "bg-[var(--bos-warning)]")} style={{ width: `${quality.total}%` }} />
            </div>
          </div>

          {blockers.length > 0 && (
            <div className="rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/5 p-3 text-[11px] text-[var(--bos-warning)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Review Recommendations:</strong>
                <p className="mt-0.5 text-[10.5px] text-[var(--bos-text-secondary)]">
                  {blockers.map((b) => b.note).join(" · ")}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--bos-line)] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-7 px-3 rounded-sm text-[11px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]">
            Back to Editor
          </button>
          <button
            type="button"
            onClick={onFinalize}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
          >
            <FileText className="w-3 h-3" aria-hidden="true" /> Confirm & Finalize
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Generating overlay ═══ */

export function GeneratingOverlay({ step }: { step: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-6"
      >
        <div className="text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">Generating your proposal</div>
          <div className="mt-3 space-y-2 text-left">
            {GENERATION_STEPS.map((s, i) => (
              <div key={s} className={cn("flex items-center gap-2.5 text-[12px]", i <= step ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-text-tertiary)]")}>
                <span className={cn("flex items-center justify-center w-4 h-4 rounded-full border text-[8px]", i < step ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white" : i === step ? "border-[var(--bos-accent)] text-[var(--bos-accent)]" : "border-[var(--bos-border-strong)] text-transparent")}>
                  {i < step ? <Check className="w-2.5 h-2.5" aria-hidden="true" /> : i === step ? <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" /> : ""}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Ready overlay ═══ */

export function ReadyOverlay({
  info,
  proposalId,
  onClose,
}: {
  info: { reference: string | null; pages: number; generatedAt: string };
  proposalId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-6 text-center"
      >
        <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-success)] text-white">
          <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-[18px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Proposal ready</h3>
        <div className="mt-2 space-y-1 text-[11px] text-[var(--bos-text-tertiary)]">
          <div className="font-mono text-[var(--bos-text-secondary)]">{info.reference ?? "PROP"}</div>
          <div>{info.pages} pages</div>
          <div>Generated {new Date(info.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <a
            href={`/api/proposals/${proposalId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]"
          >
            <Eye className="w-3 h-3" aria-hidden="true" /> View PDF
          </a>
          <a
            href={`/api/proposals/${proposalId}/pdf`}
            download
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
          >
            <FileText className="w-3 h-3" aria-hidden="true" /> Download
          </a>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Compare Versions Modal (Spec 42) ═══ */

export function CompareDialog({
  proposalId,
  currentVersion,
  onClose,
}: {
  proposalId: string;
  currentVersion: number;
  onClose: () => void;
}) {
  const [vA, setVA] = useState(1);
  const [vB, setVB] = useState(currentVersion);
  const [loading, setLoading] = useState(true);
  const [diffData, setDiffData] = useState<{ diff: ProposalVersionDiff; availableVersions: { version: number; label: string }[] } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/proposals/${proposalId}/compare?vA=${vA}&vB=${vB}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok) {
          setDiffData(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [proposalId, vA, vB]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] flex flex-col max-h-[85vh]"
      >
        <div className="px-5 py-4 border-b border-[var(--bos-line)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[var(--bos-accent)]" />
            <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Compare Proposal Versions</span>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Selectors */}
        <div className="px-5 py-3 border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/30 flex items-center gap-3 shrink-0">
          <div className="flex-1">
            <label className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] block mb-1">Base Version</label>
            <select
              value={vA}
              onChange={(e) => setVA(Number(e.target.value))}
              className="w-full h-8 px-2.5 text-[11px] rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] outline-none cursor-pointer"
            >
              {(diffData?.availableVersions ?? [{ version: 1, label: "v1" }]).map((v) => (
                <option key={v.version} value={v.version}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="text-[12px] text-[var(--bos-text-tertiary)] font-bold pt-4">vs</div>
          <div className="flex-1">
            <label className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] block mb-1">Target Version</label>
            <select
              value={vB}
              onChange={(e) => setVB(Number(e.target.value))}
              className="w-full h-8 px-2.5 text-[11px] rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] outline-none cursor-pointer"
            >
              {(diffData?.availableVersions ?? [{ version: currentVersion, label: `v${currentVersion}` }]).map((v) => (
                <option key={v.version} value={v.version}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-[12px] text-[var(--bos-text-tertiary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" /> Computing version diff…
            </div>
          ) : diffData?.diff ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-sm border border-[var(--bos-line)] bg-[#faf7f2] p-2.5 text-center">
                  <div className="text-[16px] font-bold text-[var(--bos-text-primary)]">{diffData.diff.wordsDiff >= 0 ? `+${diffData.diff.wordsDiff}` : diffData.diff.wordsDiff}</div>
                  <div className="text-[9px] font-mono uppercase text-[var(--bos-text-tertiary)]">Words Diff</div>
                </div>
                <div className="rounded-sm border border-[var(--bos-line)] bg-[#faf7f2] p-2.5 text-center">
                  <div className="text-[16px] font-bold text-[var(--bos-success)]">+{diffData.diff.sectionsAdded}</div>
                  <div className="text-[9px] font-mono uppercase text-[var(--bos-text-tertiary)]">Sections Added</div>
                </div>
                <div className="rounded-sm border border-[var(--bos-line)] bg-[#faf7f2] p-2.5 text-center">
                  <div className="text-[16px] font-bold text-[var(--bos-warning)]">{diffData.diff.sectionsModified}</div>
                  <div className="text-[9px] font-mono uppercase text-[var(--bos-text-tertiary)]">Modified</div>
                </div>
                <div className="rounded-sm border border-[var(--bos-line)] bg-[#faf7f2] p-2.5 text-center">
                  <div className="text-[16px] font-bold text-[var(--bos-error)]">-{diffData.diff.sectionsRemoved}</div>
                  <div className="text-[9px] font-mono uppercase text-[var(--bos-text-tertiary)]">Removed</div>
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-3 text-[11px]">
                <span className={cn("px-2 py-0.5 rounded-[2px] font-medium", diffData.diff.scopeChanged ? "bg-[var(--bos-warning)]/15 text-[var(--bos-warning)]" : "bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)]")}>
                  {diffData.diff.scopeChanged ? "Scope modified" : "Scope unchanged"}
                </span>
                <span className={cn("px-2 py-0.5 rounded-[2px] font-medium", diffData.diff.commercialChanged ? "bg-[var(--bos-warning)]/15 text-[var(--bos-warning)]" : "bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)]")}>
                  {diffData.diff.commercialChanged ? "Commercials updated" : "Commercials unchanged"}
                </span>
              </div>

              {/* Section Diff List */}
              <div className="space-y-2">
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Section Breakdown</div>
                {diffData.diff.sectionDiffs.map((sd) => (
                  <div key={sd.id} className="rounded-sm border border-[var(--bos-line)] p-2.5 flex items-center justify-between text-[11.5px]">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={cn("px-1.5 py-0.5 rounded-[2px] text-[8.5px] font-mono uppercase tracking-[0.1em] font-semibold", sd.status === "added" ? "bg-[var(--bos-success)]/15 text-[var(--bos-success)]" : sd.status === "modified" ? "bg-[var(--bos-warning)]/15 text-[var(--bos-warning)]" : sd.status === "removed" ? "bg-[var(--bos-error)]/15 text-[var(--bos-error)]" : "bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)]")}>
                        {sd.status}
                      </span>
                      <span className="font-medium text-[var(--bos-text-primary)] truncate">{sd.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10.5px] text-[var(--bos-text-tertiary)] shrink-0 font-mono">
                      {sd.addedBlocks > 0 && <span className="text-[var(--bos-success)]">+{sd.addedBlocks} blk</span>}
                      {sd.wordsDiff !== 0 && <span>{sd.wordsDiff > 0 ? `+${sd.wordsDiff}` : sd.wordsDiff} w</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-[12px] text-[var(--bos-text-tertiary)]">Diff calculation unavailable.</div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--bos-line)] flex items-center justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="h-7 px-3 rounded-sm text-[11px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Send to client ═══ */

export function SendDialog({
  proposal,
  client,
  delivery,
  busy,
  onClose,
  onSend,
}: {
  proposal: StudioInitial["proposal"];
  client: StudioInitial["client"];
  delivery: ProposalDeliveryBundle;
  busy: boolean;
  onClose: () => void;
  onSend: (recipientEmail?: string) => void;
}) {
  const initialEmail = delivery.proposal.sentTo ?? client?.email ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [recipientName, setRecipientName] = useState(delivery.proposal.sentToName ?? client?.companyName ?? "Client");
  const canSend = Boolean(email.trim() && email.includes("@"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)]"
      >
        <div className="px-5 py-4 border-b border-[var(--bos-line)] flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
          <div>
            <div className="text-[14px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Send proposal to client</div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">The finalized PDF is emailed with a secure client review link.</div>
          </div>
          <button type="button" onClick={onClose} className="ml-auto text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5 space-y-1.5">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Recipient Email</div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full h-8 px-2 rounded-sm border border-[var(--bos-line-strong)] bg-white text-[12px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)]"
              />
              <div className="text-[9px] text-[var(--bos-text-tertiary)] truncate">Name: {recipientName}</div>
            </div>
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Attachment</div>
              <div className="mt-0.5 text-[12px] font-medium text-[var(--bos-text-primary)]">{proposal.pdfPages ? `${proposal.pdfPages} page PDF` : "PDF"}</div>
              <div className="text-[10px] text-[var(--bos-text-secondary)]">v{delivery.proposal.version} (Locked)</div>
            </div>
          </div>
          {delivery.proposal.sentAt && (
            <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-overlay)]/40 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)]">
              Already sent {formatDateTime(delivery.proposal.sentAt)} — sending again re-issues a fresh secure link.
            </div>
          )}
          {!canSend && (
            <div className="rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/5 px-3 py-2 text-[11px] text-[var(--bos-warning)] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Enter a valid client email address above to deliver the proposal.</span>
            </div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--bos-line)] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-7 px-3 rounded-sm text-[11px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSend(email.trim())}
            disabled={busy || !canSend}
            className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 shadow-sm"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Send className="w-3 h-3" aria-hidden="true" />}
            {busy ? "Delivering…" : "Send proposal"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Delivery panel ═══ */

const CR_STATUS_TONE: Record<string, string> = {
  SUBMITTED: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
  ACCEPTED: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
  DECLINED: "text-[var(--bos-error)] border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6",
  CLARIFICATION_REQUIRED: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
  IMPLEMENTED: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
  RESOLVED: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
};

export function DeliveryPanel({
  delivery,
  onClose,
  onRefresh,
  onDecide,
  onCreateRevision,
}: {
  delivery: ProposalDeliveryBundle;
  onClose: () => void;
  onRefresh: () => void;
  onDecide: (changeRequestId: string, decision: "accept" | "decline" | "clarification", response?: string) => void;
  onCreateRevision: () => void;
}) {
  const [response, setResponse] = useState<Record<string, string>>({});
  const p = delivery.proposal;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative w-full max-w-xl h-full bg-[var(--bos-bg)] border-l border-[var(--bos-border-strong)] shadow-[var(--bos-shadow-lg)] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-[var(--bos-line)] flex items-center gap-2.5">
          <ClipboardList className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
          <div>
            <div className="text-[14px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Delivery</div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">v{p.version} · {p.reference ?? "PROP"}</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)]"
              aria-label="Refresh delivery state"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button type="button" onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="rounded-sm border border-[var(--bos-line)] p-4">
            <div className="flex items-center justify-between gap-2">
              <StatusChip status={p.status} />
              {p.sentAt && <span className="text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">Sent {formatDateTime(p.sentAt)}</span>}
            </div>
            <div className="mt-2.5 text-[13px] font-medium text-[var(--bos-text-primary)]">{delivery.nextAction.title}</div>
            <p className="mt-0.5 text-[11px] text-[var(--bos-text-secondary)] leading-snug">{delivery.nextAction.detail}</p>

            {(p.status === "CHANGES_REQUESTED" || p.status === "REVISION_IN_PROGRESS") && (
              <button
                type="button"
                onClick={onCreateRevision}
                className="mt-3 inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
              >
                <History className="w-3 h-3" aria-hidden="true" /> Start revision v{p.version + 1}
              </button>
            )}
          </div>

          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Deliveries</div>
            {delivery.deliveries.length === 0 ? (
              <p className="text-[11px] text-[var(--bos-text-tertiary)]">Not sent yet — finalize the PDF and send it to the client.</p>
            ) : (
              <div className="space-y-2">
                {delivery.deliveries.map((d) => (
                  <div key={d.id} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={cn("px-1.5 py-0.5 rounded-[3px] font-mono uppercase tracking-[0.1em]", d.status === "FAILED" ? "text-[var(--bos-error)] bg-[var(--bos-error)]/8" : "text-[var(--bos-success)] bg-[var(--bos-success)]/8")}>
                        {d.status}
                      </span>
                      <span className="text-[var(--bos-text-secondary)] font-medium">{d.kind.replace(/_/g, " ").toLowerCase()}</span>
                      <span className="text-[var(--bos-text-tertiary)] ml-auto tabular-nums">{formatDateTime(d.sentAt ?? d.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--bos-text-secondary)]">
                      To {d.recipientName} · {d.recipient} · v{d.version}
                    </div>
                    {d.failedAt && (
                      <div className="mt-1 text-[10px] text-[var(--bos-error)]">{d.failureReason ?? "Delivery failed."}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {delivery.views.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Client activity</div>
              <div className="space-y-2">
                {delivery.views.map((v) => (
                  <div key={v.id} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5 text-[11px] text-[var(--bos-text-secondary)]">
                    <span className="font-medium text-[var(--bos-text-primary)]">{v.viewCount}×</span> opened · last {formatDateTime(v.lastViewedAt)}
                    {v.pdfOpened && <span className="ml-2 text-[var(--bos-info)]">PDF opened</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {delivery.approvals.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Approvals</div>
              <div className="space-y-2">
                {delivery.approvals.map((a) => (
                  <div key={a.id} className="rounded-sm border border-[var(--bos-success)]/25 bg-[var(--bos-success)]/5 px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--bos-success)]">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Approved · v{a.version}
                      <span className="ml-auto text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(a.approvedAt)}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--bos-text-secondary)]">by {a.clientName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Change requests</div>
            {delivery.changeRequests.length === 0 ? (
              <p className="text-[11px] text-[var(--bos-text-tertiary)]">No change requests.</p>
            ) : (
              <div className="space-y-3">
                {delivery.changeRequests.map((cr) => (
                  <div key={cr.id} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)]">{cr.reference}</span>
                      <span className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.1em]", CR_STATUS_TONE[cr.status] ?? "text-[var(--bos-text-secondary)] bg-[var(--bos-overlay)]")}>
                        {cr.status.replace(/_/g, " ")}
                      </span>
                      <span className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)] bg-[var(--bos-overlay)]")}>{cr.priority}</span>
                      <span className="ml-auto text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(cr.submittedAt)}</span>
                    </div>
                    <p className="mt-2 text-[12px] text-[var(--bos-text-primary)] leading-snug">{cr.message}</p>
                    {cr.reasons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {cr.reasons.map((r) => (
                          <span key={r} className="px-1.5 py-0.5 rounded-sm bg-[var(--bos-overlay)] text-[9px] text-[var(--bos-text-tertiary)]">{r}</span>
                        ))}
                      </div>
                    )}
                    {cr.sections.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {cr.sections.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded-sm border border-[var(--bos-line)] text-[9px] text-[var(--bos-text-secondary)]">{s}</span>
                        ))}
                      </div>
                    )}
                    {cr.items.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {cr.items.map((item) => (
                          <div key={item.id} className="rounded-sm bg-[var(--bos-surface)]/60 border border-[var(--bos-line)] px-2.5 py-2 text-[11px]">
                            <div className="font-medium text-[var(--bos-text-primary)]">{item.section}{item.field ? ` · ${item.field}` : ""}</div>
                            {item.currentValue && <div className="text-[10px] text-[var(--bos-text-tertiary)] line-through decoration-[var(--bos-error)]/50">{item.currentValue}</div>}
                            {item.requestedValue && <div className="text-[10px] text-[var(--bos-success)]">→ {item.requestedValue}</div>}
                            {item.reason && <div className="text-[10px] text-[var(--bos-text-secondary)] mt-0.5">{item.reason}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {cr.adminResponse && (
                      <div className="mt-2 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 px-2.5 py-2 text-[11px] text-[var(--bos-text-secondary)]">
                        <span className="font-medium text-[var(--bos-accent)]">Your response:</span> {cr.adminResponse}
                      </div>
                    )}
                    {(cr.status === "SUBMITTED" || cr.status === "CLARIFICATION_REQUIRED") && (
                      <div className="mt-2.5">
                        <textarea
                          value={response[cr.id] ?? ""}
                          onChange={(e) => setResponse((r) => ({ ...r, [cr.id]: e.target.value }))}
                          rows={2}
                          placeholder="Note for the client (optional)…"
                          className="w-full px-2.5 py-1.5 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[11px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] resize-none"
                        />
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDecide(cr.id, "accept", response[cr.id])}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-sm bg-[var(--bos-success)] text-white text-[10px] font-medium hover:opacity-90"
                          >
                            <ThumbsUp className="w-2.5 h-2.5" aria-hidden="true" /> Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => onDecide(cr.id, "decline", response[cr.id])}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-sm bg-[var(--bos-error)] text-white text-[10px] font-medium hover:opacity-90"
                          >
                            <ThumbsDown className="w-2.5 h-2.5" aria-hidden="true" /> Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => onDecide(cr.id, "clarification", response[cr.id])}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-sm border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]"
                          >
                            <Mail className="w-2.5 h-2.5" aria-hidden="true" /> Clarify
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Versions</div>
            <div className="space-y-1.5">
              {delivery.versions.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-sm border border-[var(--bos-line)] px-3 py-2">
                  <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)]">v{v.version}</span>
                  <StatusChip status={v.status} />
                  {v.basedOnVersion && <span className="text-[10px] text-[var(--bos-text-tertiary)]">based on v{v.basedOnVersion}</span>}
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
                    {v.finalizedAt && <span className="flex items-center gap-1"><FileText className="w-2.5 h-2.5" aria-hidden="true" />{v.pdfPages ?? ""}p</span>}
                    {v.sentAt && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" aria-hidden="true" />{formatDateTime(v.sentAt)}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
