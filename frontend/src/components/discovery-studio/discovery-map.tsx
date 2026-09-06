"use client";

import { useState } from "react";
import { Check, HelpCircle, Minus, Circle, Sparkles, CheckCircle2, AlertCircle, Clock, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopicAreaItem, TopicAreaKey, TopicAreaStatus, DiscoveryCoverageItem, CoverageStatus } from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   LEFT PANEL — DISCOVERY COVERAGE MATRIX & ADAPTIVE MAP (Rules 35 & 36)
   Authentic project understanding progress without fake progress bars.
   Statuses: Complete · In Progress · Needs Review · Not Yet Discussed · Not Applicable
   ──────────────────────────────────────────────────────────────────────────── */

interface DiscoveryMapProps {
  areas: TopicAreaItem[];
  coverage?: DiscoveryCoverageItem[];
  activeAreaKey: TopicAreaKey;
  onSelectArea: (key: TopicAreaKey) => void;
  completeness: number;
}

export function DiscoveryMap({
  areas,
  coverage = [],
  activeAreaKey,
  onSelectArea,
  completeness,
}: DiscoveryMapProps) {
  const [activeTab, setActiveTab] = useState<"coverage" | "topics">("coverage");

  const completeDimensions = coverage.filter((c) => c.status === "COMPLETE").length;
  const inProgressDimensions = coverage.filter((c) => c.status === "IN_PROGRESS").length;

  return (
    <aside className="w-full h-full flex flex-col border-r border-[var(--bos-line)] bg-[var(--bos-surface)]/30 select-none overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-primary)] font-semibold">
              Discovery Coverage
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--bos-accent)] font-medium">
            {completeDimensions}/{coverage.length || 12} Understood
          </span>
        </div>

        {/* Tab switch between Discovery Coverage & Topic Map */}
        <div className="mt-3 flex rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("coverage")}
            className={cn(
              "flex-1 py-1 text-[10px] font-mono uppercase tracking-wider rounded-xs transition-colors",
              activeTab === "coverage"
                ? "bg-[var(--bos-surface-panel)] text-[var(--bos-text-primary)] font-semibold shadow-xs"
                : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
            )}
          >
            Coverage Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("topics")}
            className={cn(
              "flex-1 py-1 text-[10px] font-mono uppercase tracking-wider rounded-xs transition-colors",
              activeTab === "topics"
                ? "bg-[var(--bos-surface-panel)] text-[var(--bos-text-primary)] font-semibold shadow-xs"
                : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
            )}
          >
            Topic Map
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
          <span className="text-emerald-600 font-medium">{completeDimensions} confirmed</span>
          <span className="text-amber-600 font-medium">{inProgressDimensions} in progress</span>
          <span>{coverage.length - completeDimensions - inProgressDimensions} open</span>
        </div>
      </div>

      {/* Coverage Matrix List (Rule 36) */}
      {activeTab === "coverage" ? (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {coverage.map((item) => (
            <div
              key={item.dimensionKey}
              className="p-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)]/80 hover:border-[var(--bos-border-strong)] transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--bos-text-primary)] truncate">
                  {item.label}
                </span>
                <CoverageStatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-[11px] text-[var(--bos-text-secondary)] leading-relaxed">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      ) : (
        /* Topic Areas List */
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {areas.map((area) => {
            const isActive = area.key === activeAreaKey;
            return (
              <button
                key={area.key}
                type="button"
                onClick={() => onSelectArea(area.key)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-sm text-left transition-all text-[12px]",
                  isActive
                    ? "bg-[var(--bos-surface-panel)] border border-[var(--bos-border-strong)] text-[var(--bos-text-primary)] font-medium shadow-sm"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)]/60 border border-transparent",
                )}
              >
                <span className="truncate pr-2">{area.label}</span>
                <TopicStatusBadge status={area.status} />
              </button>
            );
          })}
        </div>
      )}

      {/* Honest Status Legend (Rule 35) */}
      <div className="p-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface)]/20 text-[10px] text-[var(--bos-text-tertiary)] space-y-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-[9px]">✓</span>
          <span>Complete / Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-[9px]">◐</span>
          <span>In Progress / Inferred</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center font-bold text-[9px]">?</span>
          <span>Needs Review / Decision</span>
        </div>
      </div>
    </aside>
  );
}

function CoverageStatusBadge({ status }: { status: CoverageStatus }) {
  switch (status) {
    case "COMPLETE":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-medium shrink-0">
          <Check className="w-2.5 h-2.5" /> Complete
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-amber-500/10 text-amber-600 text-[10px] font-mono font-medium shrink-0">
          <span>◐</span> In Progress
        </span>
      );
    case "NEEDS_REVIEW":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-orange-500/10 text-orange-600 text-[10px] font-mono font-medium shrink-0">
          <AlertCircle className="w-2.5 h-2.5" /> Needs Review
        </span>
      );
    case "NOT_APPLICABLE":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)] text-[10px] font-mono shrink-0">
          <Circle className="w-2 h-2" /> N/A
        </span>
      );
    case "NOT_YET_DISCUSSED":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)] text-[10px] font-mono shrink-0">
          <Minus className="w-2.5 h-2.5" /> Not Discussed
        </span>
      );
  }
}

function TopicStatusBadge({ status }: { status: TopicAreaStatus }) {
  switch (status) {
    case "CONFIRMED":
      return <span className="text-emerald-600 font-bold text-[11px]">✓</span>;
    case "INFERRED":
      return <span className="text-amber-600 font-bold text-[11px]">◐</span>;
    case "NEEDS_CLARIFICATION":
      return <span className="text-orange-600 font-bold text-[11px]">?</span>;
    case "NOT_APPLICABLE":
      return <span className="text-[var(--bos-text-tertiary)] text-[10px]">○</span>;
    case "NOT_DISCUSSED":
    default:
      return <span className="text-[var(--bos-text-tertiary)] text-[10px]">—</span>;
  }
}
