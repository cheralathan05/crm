"use client";

import { Check, HelpCircle, Minus, Circle, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopicAreaItem, TopicAreaKey, TopicAreaStatus } from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   LEFT PANEL — ADAPTIVE DISCOVERY MAP (Screen 06 & 07)
   These are dynamic knowledge areas determined by Ollama, NOT a rigid wizard.
   Statuses: CONFIRMED (✓) · INFERRED (◐) · NEEDS CLARIFICATION (?) · NOT DISCUSSED (—) · NOT APPLICABLE (○)
   ──────────────────────────────────────────────────────────────────────────── */

interface DiscoveryMapProps {
  areas: TopicAreaItem[];
  activeAreaKey: TopicAreaKey;
  onSelectArea: (key: TopicAreaKey) => void;
  completeness: number;
}

export function DiscoveryMap({
  areas,
  activeAreaKey,
  onSelectArea,
  completeness,
}: DiscoveryMapProps) {
  const confirmedCount = areas.filter((a) => a.status === "CONFIRMED").length;
  const inferredCount = areas.filter((a) => a.status === "INFERRED").length;

  return (
    <aside className="w-full h-full flex flex-col border-r border-[var(--bos-line)] bg-[var(--bos-surface)]/40 select-none">
      {/* Map Header */}
      <div className="px-4 py-3.5 border-b border-[var(--bos-line)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">
            Discovery Map
          </span>
          <span className="text-[11px] font-mono tabular-nums text-[var(--bos-accent)]">
            {completeness}% modeled
          </span>
        </div>

        {/* Completeness mini-bar */}
        <div className="mt-2 w-full h-1 rounded-full bg-[var(--bos-line)] overflow-hidden">
          <div
            className="h-full bg-[var(--bos-accent)] transition-all duration-300"
            style={{ width: `${Math.max(5, completeness)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
          <span>{confirmedCount} confirmed</span>
          <span>{inferredCount} modeled</span>
        </div>
      </div>

      {/* Dynamic Areas List */}
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
              <StatusBadge status={area.status} />
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-[var(--bos-line)] text-[10px] text-[var(--bos-text-tertiary)] space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-[9px]">✓</span>
          <span>Confirmed by client</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-[9px]">◐</span>
          <span>Inferred from conversation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center font-bold text-[9px]">?</span>
          <span>Needs clarification</span>
        </div>
      </div>
    </aside>
  );
}

function StatusBadge({ status }: { status: TopicAreaStatus }) {
  switch (status) {
    case "CONFIRMED":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 shrink-0 font-medium">
          <Check className="w-3 h-3" />
        </span>
      );
    case "INFERRED":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-amber-600 shrink-0">
          <span>◐</span>
        </span>
      );
    case "NEEDS_CLARIFICATION":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-orange-600 shrink-0">
          <HelpCircle className="w-3 h-3" />
        </span>
      );
    case "NOT_APPLICABLE":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--bos-text-tertiary)] shrink-0">
          <Circle className="w-2.5 h-2.5" />
        </span>
      );
    case "NOT_DISCUSSED":
    default:
      return (
        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] shrink-0">
          <Minus className="w-2.5 h-2.5" />
        </span>
      );
  }
}
