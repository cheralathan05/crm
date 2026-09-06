"use client";

import { useEffect, useState } from "react";
import {
  X,
  Layers,
  ArrowDown,
  ArrowRight,
  Database,
  Server,
  Globe,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  Plus,
  HelpCircle,
  Briefcase,
  GitCommit,
  CheckCircle,
  AlertCircle,
  Workflow,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FullLineageChain, LineageCertainty } from "@/lib/lineage-engine";

export type TraceabilityDrawerProps = {
  node: { type: "REQ" | "FE" | "API" | "DB" | "TEST" | "DELIV" | "TASK"; id: string; name: string } | null;
  projectId: string;
  onClose: () => void;
  onOpenEvidenceModal?: (target: { taskId?: string; deliverableId?: string; requirementId?: string; title: string }) => void;
};

function CertaintyBadge({ certainty }: { certainty: LineageCertainty }) {
  const styles: Record<LineageCertainty, { label: string; bg: string; text: string; border: string }> = {
    CONFIRMED: {
      label: "CONFIRMED",
      bg: "bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-500/20",
    },
    APPROVED: {
      label: "APPROVED",
      bg: "bg-blue-500/10",
      text: "text-blue-700 dark:text-blue-400",
      border: "border-blue-500/20",
    },
    INFERRED: {
      label: "INFERRED",
      bg: "bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-500/20",
    },
    RECOMMENDED: {
      label: "RECOMMENDED",
      bg: "bg-purple-500/10",
      text: "text-purple-700 dark:text-purple-400",
      border: "border-purple-500/20",
    },
    UNKNOWN: {
      label: "UNKNOWN",
      bg: "bg-zinc-500/10",
      text: "text-zinc-600 dark:text-zinc-400",
      border: "border-zinc-500/20",
    },
    WAITING_FOR_CLIENT: {
      label: "WAITING FOR CLIENT",
      bg: "bg-orange-500/10",
      text: "text-orange-700 dark:text-orange-400",
      border: "border-orange-500/20",
    },
    WAITING_FOR_INTERNAL_DECISION: {
      label: "INTERNAL DECISION",
      bg: "bg-indigo-500/10",
      text: "text-indigo-700 dark:text-indigo-400",
      border: "border-indigo-500/20",
    },
    REJECTED: {
      label: "REJECTED",
      bg: "bg-rose-500/10",
      text: "text-rose-700 dark:text-rose-400",
      border: "border-rose-500/20",
    },
    SUPERSEDED: {
      label: "SUPERSEDED",
      bg: "bg-zinc-500/10",
      text: "text-zinc-500",
      border: "border-zinc-500/20",
    },
  };

  const s = styles[certainty] || styles.INFERRED;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border",
        s.bg,
        s.text,
        s.border
      )}
    >
      {s.label}
    </span>
  );
}

export function TraceabilityDrawer({
  node,
  projectId,
  onClose,
  onOpenEvidenceModal,
}: TraceabilityDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [lineage, setLineage] = useState<FullLineageChain | null>(null);
  const [activeTab, setActiveTab] = useState<"chain" | "layers">("chain");

  useEffect(() => {
    if (!node) return;
    setLoading(true);

    const reqTarget = node.type === "REQ" ? node.id : node.name;
    const url = projectId
      ? `/api/projects/${projectId}/lineage?reqId=${encodeURIComponent(reqTarget)}`
      : `/api/requirements/${encodeURIComponent(node.id)}/lineage?feature=${encodeURIComponent(node.name)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.lineage) {
          setLineage(data.lineage);
        }
      })
      .catch((err) => console.error("[traceability-drawer] fetch failed", err))
      .finally(() => setLoading(false));
  }, [node, projectId]);

  if (!node) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[var(--bos-bg)] border-l border-[var(--bos-border)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                Complete Requirement Lineage
              </h3>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]">
                Rule 26 & 27
              </span>
            </div>
            <p className="text-[11px] text-[var(--bos-text-secondary)] font-mono mt-0.5">
              Target: {node.type} · {node.name}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-border)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center border-b border-[var(--bos-border)] bg-[var(--bos-surface)] px-4 gap-4">
        <button
          onClick={() => setActiveTab("chain")}
          className={cn(
            "py-2.5 text-[12px] font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5",
            activeTab === "chain"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)]"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
          )}
        >
          <Workflow className="w-3.5 h-3.5" />
          11-Link Lineage Chain
        </button>
        <button
          onClick={() => setActiveTab("layers")}
          className={cn(
            "py-2.5 text-[12px] font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5",
            activeTab === "layers"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)]"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          Multi-Workstream Breakdown
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--bos-text-secondary)]">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--bos-accent)]" />
            <p className="text-[13px] font-mono">Tracing unbroken provenance graph...</p>
          </div>
        ) : lineage ? (
          <>
            {/* "WHY DOES THIS WORK EXIST?" Header Rationale */}
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                  RULE 25: WHY DOES THIS WORK EXIST?
                </span>
                <span className="text-[11px] font-mono font-bold text-[var(--bos-text-primary)]">
                  {lineage.requirementCode}
                </span>
              </div>
              <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">
                {lineage.title}
              </h4>
              <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
                This execution traces directly backward to confirmed client need and forward into verified engineering deliverables with zero invented scope.
              </p>
            </div>

            {activeTab === "chain" ? (
              /* 11-Stage Linear Chain */
              <div className="space-y-3 relative pl-3">
                <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-[var(--bos-border)]" />
                {lineage.chain.map((step) => (
                  <div
                    key={step.stepIndex}
                    className="relative flex items-start gap-3.5 p-3 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] hover:border-[var(--bos-accent)] transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-[var(--bos-surface)] border-2 border-[var(--bos-accent)] text-[10px] font-bold font-mono flex items-center justify-center text-[var(--bos-accent)] shrink-0 z-10 shadow-xs">
                      {step.stepIndex}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-tertiary)]">
                          {step.level.replace("_", " ")}
                        </span>
                        <CertaintyBadge certainty={step.certainty} />
                      </div>
                      <h5 className="text-[13px] font-semibold text-[var(--bos-text-primary)] truncate">
                        {step.name}
                      </h5>
                      <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
                        {step.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Multi-Workstream Breakdown */
              <div className="space-y-4">
                {/* Database Layer */}
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-[13px]">
                      <Database className="w-4 h-4" />
                      Database Persistence Layer (DB)
                    </div>
                    <CertaintyBadge certainty={lineage.chain[7].certainty} />
                  </div>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    {lineage.chain[7].summary}
                  </p>
                </div>

                {/* Backend Layer */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[13px]">
                      <Server className="w-4 h-4" />
                      Backend API & State Machine (BE)
                    </div>
                    <CertaintyBadge certainty={lineage.chain[6].certainty} />
                  </div>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    {lineage.chain[6].summary}
                  </p>
                </div>

                {/* Frontend Layer */}
                <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-[13px]">
                      <Globe className="w-4 h-4" />
                      Frontend User Interface (FE)
                    </div>
                    <CertaintyBadge certainty={lineage.chain[5].certainty} />
                  </div>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    {lineage.chain[5].summary}
                  </p>
                </div>

                {/* QA Layer */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-[13px]">
                      <ShieldCheck className="w-4 h-4" />
                      QA Automated Verification (QA)
                    </div>
                    <CertaintyBadge certainty={lineage.chain[8].certainty} />
                  </div>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    {lineage.chain[8].summary}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center text-[var(--bos-text-secondary)] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
            <p className="text-[13px] font-medium">No active requirement lineage found for this node.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
        <button
          onClick={() => {
            onOpenEvidenceModal?.({
              requirementId: lineage?.requirementCode || "REQ-001",
              title: `Evidence for ${lineage?.title || node.name}`,
            });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Attach Verification Proof
        </button>
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-lg border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-[12px] font-medium transition-colors cursor-pointer"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
