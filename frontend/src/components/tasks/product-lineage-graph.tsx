"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  FileCheck2,
  FileCode2,
  FileText,
  GitCommit,
  GitPullRequest,
  Globe,
  Layers,
  Layout,
  ListTodo,
  Server,
  ShieldCheck,
  Sparkles,
  TestTube2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LineageNode } from "@/lib/tasks";

export type ProductLineageGraphProps = {
  lineage: LineageNode[];
};

export function ProductLineageGraph({ lineage }: ProductLineageGraphProps) {
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);

  if (!lineage || lineage.length === 0) return null;

  const getNodeIcon = (type: LineageNode["type"]) => {
    switch (type) {
      case "REQUIREMENT":
        return <FileText className="w-3.5 h-3.5" />;
      case "DELIVERABLE":
        return <Layers className="w-3.5 h-3.5" />;
      case "FEATURE":
        return <Sparkles className="w-3.5 h-3.5" />;
      case "PAGE":
        return <Layout className="w-3.5 h-3.5" />;
      case "TASK":
        return <ListTodo className="w-3.5 h-3.5" />;
      case "API":
        return <Server className="w-3.5 h-3.5" />;
      case "DATABASE":
        return <Database className="w-3.5 h-3.5" />;
      case "TEST":
        return <TestTube2 className="w-3.5 h-3.5" />;
      case "EVIDENCE":
        return <FileCheck2 className="w-3.5 h-3.5" />;
      case "VERIFIED":
        return <ShieldCheck className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
      case "COMPLETED":
      case "PASSED":
      case "VERIFIED":
      case "DONE":
        return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
      case "IN_PROGRESS":
      case "RUNNING":
        return "text-amber-500 border-amber-500/30 bg-amber-500/10";
      case "BLOCKED":
      case "FAILED":
        return "text-rose-500 border-rose-500/30 bg-rose-500/10";
      default:
        return "text-[var(--bos-text-muted)] border-[var(--bos-border)] bg-[var(--bos-surface)]";
    }
  };

  return (
    <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--bos-accent)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            HOW THIS CONNECTS (PRODUCT LINEAGE)
          </h3>
          <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
            Full end-to-end trace from approved requirement down to code, API, database, and verification proof.
          </p>
        </div>
        <span className="text-[10px] font-mono text-[var(--bos-text-muted)]">
          Click any node to inspect record
        </span>
      </div>

      {/* Horizontal Flow Pipeline */}
      <div className="overflow-x-auto pb-2 pt-1">
        <div className="flex items-center gap-1 min-w-max">
          {lineage.map((node, index) => {
            const isLast = index === lineage.length - 1;
            const isCurrentTask = node.type === "TASK";
            const isSelected = selectedNode?.id === node.id;

            return (
              <div key={node.id} className="flex items-center">
                <button
                  onClick={() => setSelectedNode(node)}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-left transition-all font-mono group cursor-pointer flex flex-col justify-between min-w-[130px] max-w-[160px]",
                    isSelected
                      ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/10 ring-2 ring-[var(--bos-accent)]/20 shadow-md"
                      : isCurrentTask
                      ? "border-[var(--bos-accent)] bg-[var(--bos-surface-elevated)] shadow-sm"
                      : "border-[var(--bos-border)] bg-[var(--bos-bg)] hover:border-[var(--bos-border-hover)] hover:bg-[var(--bos-surface)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-1 w-full text-[9px] uppercase tracking-wider text-[var(--bos-text-muted)]">
                    <span className="flex items-center gap-1">
                      {getNodeIcon(node.type)}
                      {node.label}
                    </span>
                    <span className={cn("w-1.5 h-1.5 rounded-full", node.status === "APPROVED" || node.status === "COMPLETED" || node.status === "VERIFIED" ? "bg-emerald-500" : "bg-amber-500")} />
                  </div>

                  <div className="mt-1 text-xs font-bold text-[var(--bos-text-primary)] truncate w-full" title={node.title}>
                    {node.title}
                  </div>

                  {node.subtitle && (
                    <div className="mt-0.5 text-[10px] text-[var(--bos-text-muted)] truncate w-full">
                      {node.subtitle}
                    </div>
                  )}

                  <div className="mt-1.5 pt-1 border-t border-[var(--bos-border)]/50 flex items-center justify-between text-[9px]">
                    <span className={cn("px-1.5 py-0.2 rounded border font-semibold", getStatusColor(node.status))}>
                      {node.status}
                    </span>
                  </div>
                </button>

                {!isLast && (
                  <div className="px-1 text-[var(--bos-text-muted)] opacity-40">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector Drawer / Box */}
      {selectedNode && (
        <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-accent)]/40 rounded-xl relative space-y-2 animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-[10px] font-mono font-bold uppercase">
              {selectedNode.type} RECORD
            </span>
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase", getStatusColor(selectedNode.status))}>
              {selectedNode.status}
            </span>
            {selectedNode.recordId && (
              <span className="text-[10px] font-mono text-[var(--bos-text-muted)]">
                ID: {selectedNode.recordId}
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
            {selectedNode.title}
          </h4>

          {selectedNode.subtitle && (
            <p className="text-xs text-[var(--bos-text-secondary)]">
              {selectedNode.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
