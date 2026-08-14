"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ClipboardList, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip, TimeAgo } from "@/components/clients/kit";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENTS — ADMIN DASHBOARD
   Every requirement request in the workspace, with real counts and
   statuses. Each row opens the client's Command Center where the full
   Requirement Command Center lives. No fake numbers — everything is
   queried from the workspace's actual records.
──────────────────────────────────────────────────────────────── */

type Row = {
  id: string;
  reference: string;
  title: string;
  projectType: string;
  status: string;
  statusLabel: string;
  clientId: string;
  companyName: string;
  completeness: number;
  readiness: number;
  revision: number;
  responderName: string | null;
  sentTo: string | null;
  lastOpenedAt: string | null;
  submittedAt: string | null;
  updatedAt: string;
};

const VIEWS = [
  { key: "all", label: "All" },
  { key: "needs-review", label: "Needs Review" },
  { key: "in-progress", label: "In Progress" },
  { key: "changes-requested", label: "Changes Requested" },
  { key: "approved", label: "Approved" },
  { key: "draft", label: "Draft" },
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function RequirementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "all";
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const fetchRows = useCallback(async () => {
    const mySeq = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/requirements?${params}`);
      const data = await res.json();
      if (mySeq !== seq.current) return;
      if (!res.ok) throw new Error(data.message ?? "Failed to load requirements.");
      setRows(data.rows);
      setCounts(data.counts ?? {});
    } catch (e) {
      if (mySeq === seq.current) setError(e instanceof Error ? e.message : "Failed to load requirements.");
    } finally {
      if (mySeq === seq.current) setLoading(false);
    }
  }, [view, debouncedQ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows();
  }, [fetchRows]);

  const needsReview = (counts["SUBMITTED"] ?? 0) + (counts["REVISION_SUBMITTED"] ?? 0) + (counts["CHANGES_REQUESTED"] ?? 0);

  const stripStats = useMemo(
    () => [
      { label: "Total", value: counts["all"] ?? 0, key: "all" },
      { label: "Needs Review", value: needsReview, key: "needs-review" },
      { label: "In Progress", value: (counts["SENT"] ?? 0) + (counts["IN_PROGRESS"] ?? 0), key: "in-progress" },
      { label: "Approved", value: counts["APPROVED"] ?? 0, key: "approved" },
      { label: "Draft", value: counts["DRAFT"] ?? 0, key: "draft" },
    ],
    [counts, needsReview],
  );

  return (
    <div className="px-5 sm:px-8 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="section-number">
            <span className="opacity-30">—</span> REQUIREMENTS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mt-1">
            Requirement Command Center
          </h1>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
            Every client discovery workspace, from submission to approval.
          </p>
        </div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
        >
          <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
          Request requirements
        </Link>
      </div>

      {/* Intelligence strip */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {stripStats.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => router.push(`/requirements?view=${s.key}`)}
            className={cn(
              "flex flex-col gap-0.5 rounded-sm border px-3.5 py-2.5 min-w-[96px] transition-colors duration-150",
              view === s.key
                ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]"
                : "hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-overlay)]",
            )}
          >
            <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">{s.label}</span>
            <span className="text-lg font-semibold tracking-tight text-[var(--bos-text-primary)] tabular-nums">{s.value}</span>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mt-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, reference or client…"
            aria-label="Search requirements"
            className="w-full h-10 pl-9 pr-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none transition-colors duration-150 focus:border-[var(--bos-border-strong)]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {VIEWS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => router.push(`/requirements?view=${f.key}`)}
              className={cn(
                "px-2.5 py-1 rounded-sm text-[11px] border transition-colors duration-150",
                view === f.key
                  ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                  : "border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-secondary)]",
              )}
            >
              {f.label}
            </button>
          ))}
          {q && (
            <span className="ml-auto text-[11px] text-[var(--bos-text-tertiary)]">
              {rows.length} result{rows.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="mt-4 space-y-2">
        {loading && rows.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-sm border border-[var(--bos-line)] animate-pulse bg-[var(--bos-surface)]/50" />
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-4 py-3 text-[12px] text-[var(--bos-error)]">
            {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 py-12 text-center">
            <ClipboardList className="w-5 h-5 mx-auto text-[var(--bos-text-tertiary)]" aria-hidden="true" />
            <div className="mt-2 text-[13px] text-[var(--bos-text-secondary)]">
              {q ? `No requirements match “${q}”.` : "No requirement requests here yet."}
            </div>
            {!q && (
              <div className="mt-3">
                <Link href="/clients" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]">
                  <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                  Open a client to request requirements
                </Link>
              </div>
            )}
          </div>
        )}
        {rows.map((row) => (
          <RequirementRow key={row.id} row={row} onOpen={() => router.push(`/clients/${row.clientId}#requirement-requests`)} />
        ))}
      </div>

      {!loading && !error && rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)]">
          <span>
            {counts["all"] ?? 0} request{counts["all"] === 1 ? "" : "s"} in workspace · {needsReview} need review
          </span>
          <span className="font-mono uppercase tracking-[0.1em]">Discovery · Review · Proposal</span>
        </div>
      )}
    </div>
  );
}

function RequirementRow({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const statusTone =
    row.status === "APPROVED"
      ? "text-[var(--bos-success)]"
      : ["SUBMITTED", "REVISION_SUBMITTED", "CHANGES_REQUESTED"].includes(row.status)
        ? "text-[var(--bos-warning)]"
        : "text-[var(--bos-text-tertiary)]";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full text-left rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] px-4 py-3.5 transition-all duration-150 hover:border-[var(--bos-border-strong)] hover:shadow-[var(--bos-shadow-sm)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)]">{row.reference}</span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--bos-text-primary)] truncate">{row.title}</span>
            <StatusChip status={row.status} />
          </div>

          <div className="mt-1.5 flex items-center gap-2 min-w-0">
            <span className={cn("text-[11px] truncate", statusTone)}>
              {row.status === "SUBMITTED" && "Client submitted — awaiting review"}
              {row.status === "REVISION_SUBMITTED" && "Client resubmitted — review the changes"}
              {row.status === "CHANGES_REQUESTED" && "Clarification sent — waiting for the client"}
              {row.status === "APPROVED" && "Approved — ready for a proposal"}
              {row.status === "IN_PROGRESS" && "Client is working through the workspace"}
              {row.status === "SENT" && "Link sent — waiting for the client to open it"}
              {row.status === "DRAFT" && "Not sent yet"}
              {row.status === "REVOKED" && "Access revoked"}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-x-4 gap-y-1 flex-wrap text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--bos-text-tertiary)]">Client</span>
              <span className="text-[var(--bos-text-secondary)] font-medium">{row.companyName}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--bos-text-tertiary)]">Completeness</span>
              <span className="tabular-nums text-[var(--bos-text-secondary)]">{row.completeness}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--bos-text-tertiary)]">Readiness</span>
              <span className="tabular-nums text-[var(--bos-text-secondary)]">{row.readiness}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--bos-text-tertiary)]">Revision</span>
              <span className="tabular-nums text-[var(--bos-text-secondary)]">{row.revision}</span>
            </span>
            {row.responderName && (
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--bos-text-tertiary)]">Respondent</span>
                <span className="text-[var(--bos-text-secondary)]">{row.responderName}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--bos-text-tertiary)]">Updated</span>
              <TimeAgo value={formatDate(row.updatedAt)} />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-0.5">
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">
            {row.projectType.replace("_", " ")}
          </span>
          <ArrowUpRight className="w-4 h-4 text-[var(--bos-text-tertiary)] transition-colors duration-150 group-hover:text-[var(--bos-accent)]" />
        </div>
      </div>
    </button>
  );
}
