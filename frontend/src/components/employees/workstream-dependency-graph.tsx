"use client";

import { cn } from "@/lib/utils";
import {
  Monitor,
  Server,
  Database,
  TestTube,
  ArrowDown,
  Link2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

/* ════════════════════════════════════════════════════════════════════
   WORKSTREAM DEPENDENCY GRAPH
   Visual dependency chain: FRONTEND → API → BACKEND → DATABASE → QA
   Data from real EngineeringDependency records.
   ════════════════════════════════════════════════════════════════════ */

type DependencyNode = {
  layer: string;
  label: string;
  items: Array<{
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetName: string;
    targetLayer: string;
    dependencyType: string;
  }>;
};

type Props = {
  chain: DependencyNode[];
  activeLayer?: string;
  onLayerClick?: (layer: string) => void;
};

const LAYER_ICONS: Record<string, typeof Monitor> = {
  FRONTEND: Monitor,
  BACKEND: Server,
  DATABASE: Database,
  TESTING: TestTube,
  INTEGRATION: Link2,
  QA: TestTube,
};

const LAYER_COLORS: Record<string, string> = {
  FRONTEND: "border-sky-500/40 bg-sky-500/5 text-sky-600",
  BACKEND: "border-violet-500/40 bg-violet-500/5 text-violet-600",
  DATABASE: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600",
  TESTING: "border-amber-500/40 bg-amber-500/5 text-amber-600",
  QA: "border-amber-500/40 bg-amber-500/5 text-amber-600",
  INTEGRATION: "border-indigo-500/40 bg-indigo-500/5 text-indigo-600",
};

const LAYER_DARK_COLORS: Record<string, string> = {
  FRONTEND: "border-sky-400/30 bg-sky-400/8 text-sky-400",
  BACKEND: "border-violet-400/30 bg-violet-400/8 text-violet-400",
  DATABASE: "border-emerald-400/30 bg-emerald-400/8 text-emerald-400",
  TESTING: "border-amber-400/30 bg-amber-400/8 text-amber-400",
  QA: "border-amber-400/30 bg-amber-400/8 text-amber-400",
  INTEGRATION: "border-indigo-400/30 bg-indigo-400/8 text-indigo-400",
};

export function WorkstreamDependencyGraph({ chain, activeLayer, onLayerClick }: Props) {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

  if (chain.length === 0) {
    return (
      <div className="p-6 text-center text-[12px] text-[var(--bos-text-tertiary)] font-mono italic">
        No dependency data available for this project.
      </div>
    );
  }

  const toggleLayer = (layer: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      {chain.map((node, idx) => {
        const LayerIcon = LAYER_ICONS[node.layer] || Link2;
        const isActive = activeLayer === node.layer;
        const isExpanded = expandedLayers.has(node.layer);
        const colorClass = LAYER_COLORS[node.layer] || "border-[var(--bos-border)] bg-[var(--bos-bg)] text-[var(--bos-text-secondary)]";

        return (
          <div key={node.layer}>
            {/* Connector line */}
            {idx > 0 && (
              <div className="flex justify-center py-1">
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-[var(--bos-border-strong)]" />
                  <ArrowDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />
                  <div className="w-px h-1 bg-[var(--bos-border-strong)]" />
                </div>
              </div>
            )}

            {/* Layer node */}
            <button
              type="button"
              onClick={() => {
                toggleLayer(node.layer);
                onLayerClick?.(node.layer);
              }}
              className={cn(
                "w-full p-3 rounded-xl border-2 transition-all text-left",
                colorClass,
                isActive && "ring-2 ring-[var(--bos-accent)]/30 shadow-md",
                "hover:shadow-sm cursor-pointer"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <LayerIcon className="w-4 h-4" />
                  <div>
                    <span className="text-[13px] font-bold block">{node.label}</span>
                    <span className="text-[10px] font-mono opacity-70">
                      {node.items.length > 0
                        ? `${node.items.length} connection${node.items.length !== 1 ? "s" : ""}`
                        : "No dependencies mapped"}
                    </span>
                  </div>
                </div>
                {node.items.length > 0 && (
                  isExpanded
                    ? <ChevronDown className="w-4 h-4 opacity-60" />
                    : <ChevronRight className="w-4 h-4 opacity-60" />
                )}
              </div>
            </button>

            {/* Expanded items */}
            {isExpanded && node.items.length > 0 && (
              <div className="ml-6 mt-1 space-y-1 border-l-2 border-[var(--bos-border)] pl-3 py-1">
                {node.items.map((item, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 text-[var(--bos-text-primary)] font-medium">
                      <span>{item.sourceName}</span>
                      <ArrowDown className="w-3 h-3 text-[var(--bos-text-tertiary)] rotate-[-90deg]" />
                      <span>{item.targetName}</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--bos-text-tertiary)] mt-0.5 block">
                      {item.dependencyType} → {item.targetLayer}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
