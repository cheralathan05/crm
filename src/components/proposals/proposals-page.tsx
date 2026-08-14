"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/clients/kit";

/* ────────────────────────────────────────────────────────────────
   PROPOSALS — workspace list
   Every proposal with real statuses and amounts. Rows open the
   Proposal Studio where the document can be edited and finalized
   into a real PDF. No fake numbers — everything comes from the
   workspace's own proposal records.
──────────────────────────────────────────────────────────────── */

type Row = {
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

export function ProposalsPage({ rows, counts }: { rows: Row[]; counts: Record<string, number> }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.companyName.toLowerCase().includes(query) ||
        (r.reference ?? "").toLowerCase().includes(query),
    );
  }, [rows, q]);

  const stats = [
    { label: "Total", value: counts["all"] ?? 0 },
    { label: "Drafts", value: counts["DRAFT"] ?? 0 },
    { label: "Sent", value: (counts["SENT"] ?? 0) + (counts["VIEWED"] ?? 0) },
    { label: "Approved", value: counts["APPROVED"] ?? 0 },
  ];

  return (
    <div className="px-5 sm:px-8 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="section-number">
            <span className="opacity-30">—</span> PROPOSALS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mt-1">
            Proposal Studio
          </h1>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
            Proposals built from approved requirements — edit the document, then finalize to a real PDF.
          </p>
        </div>
      </div>

      {/* Intelligence strip */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">{s.label}</span>
            <span className="block mt-0.5 text-lg font-semibold tracking-tight text-[var(--bos-text-primary)] tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, client or reference…"
          aria-label="Search proposals"
          className="w-full h-10 pl-9 pr-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none transition-colors duration-150 focus:border-[var(--bos-border-strong)]"
        />
      </div>

      {/* Rows */}
      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 py-12 text-center">
            <FileText className="w-5 h-5 mx-auto text-[var(--bos-text-tertiary)]" aria-hidden="true" />
            <div className="mt-2 text-[13px] text-[var(--bos-text-secondary)]">
              {q ? `No proposals match “${q}”.` : "No proposals yet."}
            </div>
            {!q && (
              <div className="mt-1 text-[11px] text-[var(--bos-text-tertiary)]">
                Approve a requirement, then create its proposal from the Requirement Command Center.
              </div>
            )}
          </div>
        )}
        {filtered.map((row) => (
          <Link
            key={row.id}
            href={`/proposals/${row.id}`}
            className="group block rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] px-4 py-3.5 transition-all duration-150 hover:border-[var(--bos-border-strong)] hover:shadow-[var(--bos-shadow-sm)]"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {row.reference && (
                    <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)]">{row.reference}</span>
                  )}
                  <span className="text-[15px] font-semibold tracking-tight text-[var(--bos-text-primary)] truncate">{row.title}</span>
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
              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <span
                  className={cn(
                    "text-[9px] font-mono uppercase tracking-[0.14em]",
                    row.finalizedAt ? "text-[var(--bos-success)]" : "text-[var(--bos-text-tertiary)]",
                  )}
                >
                  {row.finalizedAt ? "Finalized" : "In progress"}
                </span>
                <ArrowUpRight className="w-4 h-4 text-[var(--bos-text-tertiary)] transition-colors duration-150 group-hover:text-[var(--bos-accent)]" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
