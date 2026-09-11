"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Share2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/clients/kit";

/* ────────────────────────────────────────────────────────────────
   PROPOSALS — workspace list
   Every proposal with real statuses and amounts. Rows open the
   Proposal Studio where the document can be edited and finalized
   into a real PDF. No fake numbers — everything comes from the
   workspace's own proposal records.
──────────────────────────────────────────────────────────────── */

export type ProposalRow = {
  id: string;
  reference: string | null;
  title: string;
  status: string;
  amount: number | null;
  pdfPages: number | null;
  finalizedAt: string | null;
  clientId: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
};

type FilterStatus = "all" | "DRAFT" | "SENT" | "APPROVED";

export function ProposalsPage({
  rows,
  counts,
  clients = [],
}: {
  rows: ProposalRow[];
  counts: Record<string, number>;
  clients?: Array<{ id: string; companyName: string }>;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [newClientId, setNewClientId] = useState(clients[0]?.id ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = rows;

    if (statusFilter === "DRAFT") {
      result = result.filter((r) => r.status === "DRAFT");
    } else if (statusFilter === "SENT") {
      result = result.filter((r) => r.status === "SENT" || r.status === "VIEWED" || r.status === "DELIVERED");
    } else if (statusFilter === "APPROVED") {
      result = result.filter((r) => r.status === "APPROVED" || r.status === "ACCEPTED");
    }

    const query = q.trim().toLowerCase();
    if (!query) return result;

    return result.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.companyName.toLowerCase().includes(query) ||
        (r.reference ?? "").toLowerCase().includes(query),
    );
  }, [rows, q, statusFilter]);

  const stats = [
    { key: "all" as const, label: "Total", value: counts["all"] ?? 0 },
    { key: "DRAFT" as const, label: "Drafts", value: counts["DRAFT"] ?? 0 },
    { key: "SENT" as const, label: "Sent", value: (counts["SENT"] ?? 0) + (counts["VIEWED"] ?? 0) },
    { key: "APPROVED" as const, label: "Approved", value: counts["APPROVED"] ?? 0 },
  ];

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId) {
      setCreateError("Please select a client.");
      return;
    }
    if (!newTitle.trim()) {
      setCreateError("Please enter a proposal title.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: newClientId,
          title: newTitle.trim(),
          amount: newAmount ? Number(newAmount) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to create proposal.");
      }

      setModalOpen(false);
      setNewTitle("");
      setNewAmount("");
      router.push(`/proposals/${data.proposal.id}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create proposal.");
    } finally {
      setCreating(false);
    }
  };

  const copyClientLink = async (proposalId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCopyingId(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/client-link`);
      const data = await res.json();
      if (res.ok && data.ok && data.url) {
        await navigator.clipboard.writeText(data.url);
        setCopiedId(proposalId);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      // ignore
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-6 max-w-6xl w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <div className="section-number">
            <span className="opacity-30">—</span> PROPOSALS
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mt-1">
            Proposal Studio
          </h1>
          <p className="text-[12.5px] sm:text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
            Proposals built from approved requirements — edit the document, then finalize to a real PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!newClientId && clients.length > 0) {
              setNewClientId(clients[0].id);
            }
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 shadow-sm w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New Proposal</span>
        </button>
      </div>

      {/* Intelligence strip / Filter tabs */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s) => {
          const isActive = statusFilter === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatusFilter(isActive && s.key !== "all" ? "all" : s.key)}
              className={cn(
                "text-left rounded-sm border px-3.5 py-2.5 transition-all duration-150 cursor-pointer focus:outline-none",
                isActive
                  ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]/30 shadow-2xs"
                  : "border-[var(--bos-line)] bg-[var(--bos-bg)] hover:border-[var(--bos-border-strong)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[9px] font-mono uppercase tracking-[0.16em]",
                    isActive ? "text-[var(--bos-accent)] font-semibold" : "text-[var(--bos-text-tertiary)]",
                  )}
                >
                  {s.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" aria-hidden="true" />
                )}
              </div>
              <span className="block mt-0.5 text-lg font-semibold tracking-tight text-[var(--bos-text-primary)] tabular-nums">
                {s.value}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mt-5 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)]"
          aria-hidden="true"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, client or reference…"
          aria-label="Search proposals"
          className="w-full h-10 pl-9 pr-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none transition-colors duration-150 focus:border-[var(--bos-border-strong)]"
        />
      </div>

      {/* Active Filter Pill */}
      {statusFilter !== "all" && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[11px] text-[var(--bos-text-tertiary)]">Filtered by:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] text-[11px] font-medium">
            <span>{statusFilter}</span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="hover:opacity-75 focus:outline-none"
              aria-label="Clear filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Rows */}
      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 py-12 text-center">
            <FileText className="w-5 h-5 mx-auto text-[var(--bos-text-tertiary)]" aria-hidden="true" />
            <div className="mt-2 text-[13px] text-[var(--bos-text-secondary)]">
              {q || statusFilter !== "all" ? "No proposals match your search or filter." : "No proposals yet."}
            </div>
            {!q && statusFilter === "all" && (
              <div className="mt-1 text-[11px] text-[var(--bos-text-tertiary)]">
                Click &quot;New Proposal&quot; above or approve a requirement in the Requirement Command Center.
              </div>
            )}
          </div>
        )}
        {filtered.map((row) => (
          <div
            key={row.id}
            className="group rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] px-4 py-3.5 transition-all duration-150 hover:border-[var(--bos-border-strong)] hover:shadow-[var(--bos-shadow-sm)]"
          >
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {row.reference && (
                    <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)]">
                      {row.reference}
                    </span>
                  )}
                  <Link
                    href={`/proposals/${row.id}`}
                    className="text-[14.5px] sm:text-[15px] font-semibold tracking-tight text-[var(--bos-text-primary)] hover:text-[var(--bos-accent)] transition-colors duration-150 truncate"
                  >
                    {row.title}
                  </Link>
                  <StatusChip status={row.status} />
                </div>
                <div className="mt-1.5 flex items-center gap-x-4 gap-y-1 flex-wrap text-[10px]">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[var(--bos-text-tertiary)]">Client</span>
                    <span className="text-[var(--bos-text-secondary)] font-medium">{row.companyName}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[var(--bos-text-tertiary)]">Amount</span>
                    <span className="tabular-nums text-[var(--bos-text-secondary)]">
                      {row.amount !== null ? `₹${row.amount.toLocaleString("en-IN")}` : "—"}
                    </span>
                  </span>
                  {row.pdfPages !== null && row.finalizedAt && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[var(--bos-text-tertiary)]">PDF</span>
                      <span className="tabular-nums text-[var(--bos-text-secondary)]">{row.pdfPages} pages</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="text-[var(--bos-text-tertiary)]">Updated</span>
                    <span className="tabular-nums text-[var(--bos-text-secondary)]">
                      {new Date(row.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pt-2.5 sm:pt-0.5 border-t sm:border-t-0 border-[var(--bos-line)]/50 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
                <Link
                  href={`/proposals/${row.id}`}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60 text-[11px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
                  title="Open Proposal Studio"
                >
                  <FileText className="w-3 h-3 text-[var(--bos-accent)]" />
                  <span>Studio</span>
                </Link>

                <a
                  href={`/api/proposals/${row.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60 text-[11px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
                  title="Preview PDF document"
                >
                  <Eye className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                  <span>PDF</span>
                </a>

                <a
                  href={`/api/proposals/${row.id}/download`}
                  download
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60 text-[11px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
                  title="Download PDF attachment"
                >
                  <Download className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                <button
                  type="button"
                  onClick={(e) => copyClientLink(row.id, e)}
                  disabled={copyingId === row.id}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60 text-[11px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150 disabled:opacity-50"
                  title="Copy client review link"
                >
                  {copiedId === row.id ? (
                    <>
                      <Check className="w-3 h-3 text-[var(--bos-success)]" />
                      <span className="text-[var(--bos-success)]">Copied</span>
                    </>
                  ) : copyingId === row.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-[var(--bos-accent)]" />
                      <span>Link…</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                      <span className="hidden sm:inline">Client Link</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/proposals/${row.id}`}
                  className="flex items-center justify-center w-7 h-7 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors duration-150"
                  aria-label="Go to proposal"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Proposal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => !creating && setModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-5 z-10">
            <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--bos-text-primary)]">
                  Create New Proposal
                </h2>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  Initializes a priced proposal and builds the document in the studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={creating}
                className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1">
                  Client <span className="text-[var(--bos-error)]">*</span>
                </label>
                {clients.length > 0 ? (
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    required
                    className="w-full h-9 px-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[12px] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)]"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-[var(--bos-warning)]">
                    No clients found in workspace. Please add a client first.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1">
                  Proposal Title <span className="text-[var(--bos-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Enterprise Platform Modernization"
                  required
                  className="w-full h-9 px-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[12px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1">
                  Amount (₹ INR, Optional)
                </label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 250000"
                  min="0"
                  step="1000"
                  className="w-full h-9 px-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[12px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)]"
                />
              </div>

              {createError && (
                <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[11px] text-[var(--bos-error)]">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--bos-line)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={creating}
                  className="h-8 px-3 rounded-sm text-[11px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || clients.length === 0}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 shadow-sm"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{creating ? "Creating…" : "Create & Open Studio"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
