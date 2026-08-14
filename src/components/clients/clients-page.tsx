"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Plus, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip, TimeAgo } from "./kit";
import { CreateClientPanel } from "./create-client";

type Health = "HEALTHY" | "NEEDS_ATTENTION" | "AT_RISK" | "INACTIVE";

type Row = {
  id: string;
  companyName: string;
  industry: string | null;
  businessType: string | null;
  status: string;
  stage: string;
  health: Health;
  healthReasons: { kind: "ok" | "warn" | "risk"; text: string }[];
  ownerName: string | null;
  project: { name: string; progress: number; health: string } | null;
  requirementsOpen: number;
  proposalStatus: string | null;
  proposalAwaitingDays: number | null;
  pendingPayment: number;
  lastActivityLabel: string;
  nextAction: string | null;
};

type Strip = {
  total: number;
  active: number;
  leads: number;
  archived: number;
  needsAttention: number;
  pipeline: number;
  pipelineLabel: string;
};

const HEALTH_DOT: Record<Health, string> = {
  HEALTHY: "bg-[var(--bos-success)]",
  NEEDS_ATTENTION: "bg-[var(--bos-warning)]",
  AT_RISK: "bg-[var(--bos-error)]",
  INACTIVE: "bg-[var(--bos-text-tertiary)]",
};

const HEALTH_LABEL: Record<Health, string> = {
  HEALTHY: "Healthy",
  NEEDS_ATTENTION: "Needs Attention",
  AT_RISK: "At Risk",
  INACTIVE: "Inactive",
};

function formatINR(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${n}`;
}

function ClientRow({ row, onOpen }: { row: Row; onOpen: (id: string) => void }) {
  const risk = row.health !== "HEALTHY";
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      className="group w-full text-left rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] px-4 py-3.5 transition-all duration-150 hover:border-[var(--bos-border-strong)] hover:shadow-[var(--bos-shadow-sm)]"
    >
      <div className="flex items-start gap-4">
        {/* Health rail */}
        <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
          <span className={cn("w-2 h-2 rounded-full", HEALTH_DOT[row.health])} title={HEALTH_LABEL[row.health]} />
          <span className="w-px h-8 bg-[var(--bos-line)]" aria-hidden="true" />
        </div>

        {/* Identity + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
              {row.companyName}
            </span>
            <span className="text-[10px] text-[var(--bos-text-tertiary)]">
              {[row.industry, row.businessType].filter(Boolean).join(" · ") || "—"}
            </span>
            <StatusChip status={row.status} />
          </div>

          {/* Next action / health reason — the "what needs attention" line */}
          <div className="mt-1.5 flex items-center gap-2 min-w-0">
            <span className={cn("text-[11px] truncate", risk ? "text-[var(--bos-warning)]" : "text-[var(--bos-text-tertiary)]")}>
              {row.nextAction ?? (row.healthReasons[0]?.text ?? "Relationship healthy")}
            </span>
          </div>

          {/* Dense metric strip */}
          <div className="mt-2.5 flex items-center gap-x-4 gap-y-1 flex-wrap text-[10px]">
            {row.project && (
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--bos-text-tertiary)]">Project</span>
                <span className="text-[var(--bos-text-secondary)] font-medium">{row.project.name}</span>
                <span className="tabular-nums text-[var(--bos-text-secondary)]">{row.project.progress}%</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--bos-text-tertiary)]">Requirements</span>
              <span className="tabular-nums text-[var(--bos-text-secondary)]">
                {row.requirementsOpen > 0 ? `${row.requirementsOpen} open` : "none open"}
              </span>
            </span>
            {row.proposalStatus && (
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--bos-text-tertiary)]">Proposal</span>
                <span className="text-[var(--bos-text-secondary)]">
                  {row.proposalStatus.toLowerCase()}
                  {row.proposalAwaitingDays !== null && row.proposalAwaitingDays >= 0 ? ` · ${row.proposalAwaitingDays}d` : ""}
                </span>
              </span>
            )}
            {row.pendingPayment > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--bos-text-tertiary)]">Payment</span>
                <span className="text-[var(--bos-warning)] font-medium tabular-nums">{formatINR(row.pendingPayment)} pending</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--bos-text-tertiary)]">Last activity</span>
              <TimeAgo value={row.lastActivityLabel} />
            </span>
            {row.ownerName && (
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--bos-text-tertiary)]">Owner</span>
                <span className="text-[var(--bos-text-secondary)]">{row.ownerName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Stage + open */}
        <div className="flex items-center gap-3 shrink-0 pt-0.5">
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">
            {row.stage}
          </span>
          <ArrowUpRight className="w-4 h-4 text-[var(--bos-text-tertiary)] transition-colors duration-150 group-hover:text-[var(--bos-accent)]" />
        </div>
      </div>
    </button>
  );
}

function StripStat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex flex-col gap-0.5 rounded-sm border px-3.5 py-2.5 min-w-[96px] transition-colors duration-150",
        onClick && "cursor-pointer hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-overlay)]",
        active && "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]",
      )}
    >
      <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">{label}</span>
      <span className="text-lg font-semibold tracking-tight text-[var(--bos-text-primary)] tabular-nums">{value}</span>
    </Comp>
  );
}

export function ClientsPage({ initialNew = false }: { initialNew?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "all";
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [strip, setStrip] = useState<Strip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(initialNew);
  const seq = useRef(0);

  const fetchRows = useCallback(async () => {
    const mySeq = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      if (mySeq !== seq.current) return;
      if (!res.ok) throw new Error(data.message ?? "Failed to load clients.");
      setRows(data.rows);
      setStrip(data.strip);
    } catch (e) {
      if (mySeq === seq.current) setError(e instanceof Error ? e.message : "Failed to load clients.");
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

  const stripStats = useMemo(() => {
    if (!strip) return [];
    return [
      { label: "Total", value: strip.total, key: "all" },
      { label: "Active", value: strip.active, key: "active" },
      { label: "Leads", value: strip.leads, key: "leads" },
      { label: "Needs Attention", value: strip.needsAttention, key: "attention" },
      { label: "Pipeline", value: strip.pipelineLabel, key: "pipeline" },
    ];
  }, [strip]);

  const openClient = (id: string) => router.push(`/clients/${id}`);

  return (
    <div className="px-5 sm:px-8 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="section-number">
            <span className="opacity-30">—</span> CLIENTS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mt-1">
            Client Command Center
          </h1>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
            Your complete client relationship workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          New client
        </button>
      </div>

      {showCreate && (
        <div className="mt-5">
          <CreateClientPanel
            onCreated={(id) => router.push(`/clients/${id}`)}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Intelligence strip */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {stripStats.map((s) => (
          <StripStat
            key={s.key}
            label={s.label}
            value={s.value}
            active={s.key !== "pipeline" && view === s.key}
            onClick={
              s.key === "pipeline"
                ? undefined
                : () => router.push(`/clients?view=${s.key}`)
            }
          />
        ))}
      </div>

      {/* Search */}
      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients, companies, contacts, projects, requirements…"
            aria-label="Search clients"
            className="w-full h-10 pl-9 pr-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none transition-colors duration-150 focus:border-[var(--bos-border-strong)]"
          />
        </div>
      </div>

      {/* View filter chips */}
      <div className="mt-4 flex items-center gap-1.5">
        {[
          { key: "all", label: "All Clients" },
          { key: "active", label: "Active" },
          { key: "leads", label: "Leads" },
          { key: "archived", label: "Archived" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => router.push(`/clients?view=${f.key}`)}
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
            <div className="text-[13px] text-[var(--bos-text-secondary)]">
              {q ? `No clients match “${q}”.` : "No clients here yet."}
            </div>
            {!q && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Create your first client
              </button>
            )}
          </div>
        )}
        {rows.map((row) => (
          <ClientRow key={row.id} row={row} onOpen={openClient} />
        ))}
      </div>

      {!loading && !error && rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)]">
          <span>
            {strip?.total ?? 0} clients in workspace · {strip?.active ?? 0} active
          </span>
          <Link href="/clients" className="inline-flex items-center gap-1 hover:text-[var(--bos-text-secondary)] transition-colors duration-150">
            Manage fields <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
