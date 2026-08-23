"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  ExternalLink,
  Filter,
  FolderKanban,
  Layers,
  ListTodo,
  Loader2,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  code: string;
  stage: string;
  health: string;
  progress: number;
  budget: number | null;
  currency: string;
  managerName: string | null;
  deadline: string | null;
  startedAt: string | null;
  createdAt: string;
  client: {
    id: string;
    companyName: string;
    industry: string | null;
  };
  proposal: {
    id: string;
    reference: string | null;
    version: number;
    amount: number | null;
  } | null;
  metrics: {
    progress: number;
    completedTasks: number;
    totalTasks: number;
    acceptedDeliverables: number;
    totalDeliverables: number;
  };
};

type PortfolioStats = {
  totalCount: number;
  activeCount: number;
  onTrackCount: number;
  atRiskCount: number;
  totalValue: number;
};

export function ProjectsDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (stageFilter !== "ALL") params.set("stage", stageFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/projects?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.ok) {
        setProjects(json.projects);
        setStats(json.stats);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [stageFilter, search]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[var(--bos-border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold uppercase bg-[var(--bos-accent)] text-white">
              <FolderKanban className="w-3 h-3" /> Delivery OS
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
              Operational Delivery & Milestone Execution
            </span>
          </div>
          <h1 className="text-[26px] font-serif font-bold text-[var(--bos-text-primary)]">
            Projects Portfolio
          </h1>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1">
            Traceable projects executing approved proposal scopes with phase-gate milestones and client reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/proposals?view=approved"
            className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#3f6e35] text-white text-[12.5px] font-medium hover:brightness-95 transition-all shadow-sm"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Launch from Approved Proposal</span>
          </Link>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
            <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Active Projects</span>
            <p className="text-[22px] font-bold text-[var(--bos-text-primary)]">{stats.activeCount}</p>
            <span className="text-[11px] text-[var(--bos-text-secondary)]">Of {stats.totalCount} total portfolio projects</span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
            <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Delivery Health</span>
            <p className="text-[22px] font-bold text-[#3f6e35]">{stats.onTrackCount} On Track</p>
            <span className="text-[11px] text-[var(--bos-text-secondary)]">{stats.atRiskCount} requiring attention</span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
            <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Active Portfolio Value</span>
            <p className="text-[22px] font-bold text-[var(--bos-text-primary)] font-mono">
              ₹ {stats.totalValue.toLocaleString()}
            </p>
            <span className="text-[11px] text-[var(--bos-text-secondary)]">Across approved contracts</span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-1">
            <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Delivery Traceability</span>
            <p className="text-[22px] font-bold text-[#3f6e35] flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5" /> 100%
            </p>
            <span className="text-[11px] text-[var(--bos-text-secondary)]">Locked to client approvals</span>
          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH BAR ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bos-surface-panel)] p-1 rounded border border-[var(--bos-border-subtle)]">
          {["ALL", "PLANNING", "DEVELOPMENT", "TESTING", "DELIVERY", "COMPLETED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(st)}
              className={cn(
                "px-3 py-1.5 text-[11.5px] font-mono uppercase rounded transition-colors cursor-pointer",
                stageFilter === st
                  ? "bg-[var(--bos-accent)] text-white font-semibold shadow-xs"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--bos-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by project name, code, or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-[12.5px] bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
          />
        </div>
      </div>

      {/* ── PROJECTS LIST ────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[12px] font-mono text-[var(--bos-text-secondary)]">Loading Projects Portfolio…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-3">
          <FolderKanban className="w-10 h-10 text-[var(--bos-text-tertiary)] mx-auto opacity-50" />
          <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">No Delivery Projects Found</h3>
          <p className="text-[12.5px] text-[var(--bos-text-secondary)] max-w-md mx-auto">
            Projects are created automatically when a client approves a proposal. Head over to your approved proposals to launch delivery.
          </p>
          <Link
            href="/proposals"
            className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 rounded-sm bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors"
          >
            View Proposals Portfolio →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="p-5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)]/50 hover:shadow-xs transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                      {p.code}
                    </span>
                    <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)] hover:text-[var(--bos-accent)] transition-colors">
                      {p.name}
                    </h3>
                    <span className={cn(
                      "font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                      p.health === "ON_TRACK" ? "bg-[#eaf5e7] text-[#2c5324]" : "bg-[#fbece7] text-[#b5452a]"
                    )}>
                      ● {p.health.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[12.5px] text-[var(--bos-text-secondary)] flex-wrap">
                    <span>
                      Client: <strong className="text-[var(--bos-text-primary)]">{p.client.companyName}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Manager: <strong className="text-[var(--bos-text-primary)]">{p.managerName || "Unassigned"}</strong>
                    </span>
                    {p.proposal && (
                      <>
                        <span>·</span>
                        <span>
                          Proposal: <strong className="text-[var(--bos-text-primary)]">{p.proposal.reference || "PROP"} (v{p.proposal.version})</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[15px] font-bold font-mono text-[var(--bos-text-primary)] block">
                    {p.currency} {(p.budget || 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] block">
                    Target: {p.deadline ? new Date(p.deadline).toLocaleDateString() : "8 Weeks"}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Submetrics */}
              <div className="pt-3 border-t border-[var(--bos-border-subtle)] flex items-center justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[var(--bos-text-secondary)]">
                    <span>Delivery Progress</span>
                    <strong className="text-[var(--bos-accent)]">{p.metrics.progress}%</strong>
                  </div>
                  <div className="w-full bg-[var(--bos-surface-sunken)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--bos-accent)] h-full transition-all duration-300"
                      style={{ width: `${p.metrics.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                  <span>{p.metrics.completedTasks}/{p.metrics.totalTasks} Tasks</span>
                  <span>·</span>
                  <span>{p.metrics.acceptedDeliverables}/{p.metrics.totalDeliverables} Deliverables Accepted</span>
                  <span className="flex items-center gap-1 text-[var(--bos-accent)] font-semibold">
                    Open Command Center <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
