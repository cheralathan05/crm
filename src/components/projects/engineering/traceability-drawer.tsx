"use client";

import { useEffect, useState } from "react";
import {
  X,
  Layers,
  ArrowRight,
  Database,
  Server,
  Globe,
  ShieldCheck,
  FileCheck,
  ExternalLink,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TraceabilityDrawerProps = {
  node: { type: "REQ" | "FE" | "API" | "DB" | "TEST" | "DELIV" | "TASK"; id: string; name: string } | null;
  projectId: string;
  onClose: () => void;
  onOpenEvidenceModal?: (target: { taskId?: string; deliverableId?: string; requirementId?: string; title: string }) => void;
};

export function TraceabilityDrawer({
  node,
  projectId,
  onClose,
  onOpenEvidenceModal,
}: TraceabilityDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<any | null>(null);

  useEffect(() => {
    if (!node) return;
    setLoading(true);

    // If it's a requirement ID
    const reqId = node.type === "REQ" ? node.id : node.name.startsWith("REQ-") ? node.name : "REQ-001";

    fetch(`/api/projects/${projectId}/blueprint`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.blueprint) {
          const bp = data.blueprint;
          const matchedFe = (bp.frontendCapabilities || []).filter((f: any) => f.requirementId === reqId || f.id === node.id);
          const matchedBe = (bp.backendApis || []).filter((b: any) => b.requirementId === reqId || b.id === node.id);
          const matchedDb = (bp.databaseEntities || []).filter((d: any) => d.requirementId === reqId || d.id === node.id);
          const matchedTests = (bp.testSpecifications || []).filter((t: any) => t.requirementId === reqId || t.id === node.id);

          setTraceData({
            reqId,
            fe: matchedFe,
            api: matchedBe,
            db: matchedDb,
            tests: matchedTests,
          });
        }
      })
      .catch((err) => console.error("[traceability-drawer] fetch failed", err))
      .finally(() => setLoading(false));
  }, [node, projectId]);

  if (!node) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-[var(--bos-bg)] border-l border-[var(--bos-border)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
              Engineering Traceability
            </h3>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
              Node: {node.type} · {node.name}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-border)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--bos-text-secondary)]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
            <p className="text-[12px] font-mono">Tracing graph lineage...</p>
          </div>
        ) : traceData ? (
          <>
            {/* Business Source Card */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-amber-600">BUSINESS PROVENANCE</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  {traceData.reqId}
                </span>
              </div>
              <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                Approved Requirement Scope
              </h4>
              <p className="text-[12px] text-[var(--bos-text-secondary)]">
                This engineering capability originates from approved proposal requirements with full operational justification.
              </p>
            </div>

            {/* Lineage Progression Flow */}
            <div className="space-y-4">
              <h4 className="text-[12px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-tertiary)]">
                Connected Engineering Graph
              </h4>

              {/* 1. Database Layer */}
              <div className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-600">
                    <Database className="w-4 h-4" />
                    <span className="text-[12px] font-bold">Database Persistence</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    {traceData.db.length} Tables
                  </span>
                </div>
                {traceData.db.map((d: any) => (
                  <div key={d.id} className="p-2 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] text-[12px]">
                    <span className="font-mono font-semibold text-[var(--bos-text-primary)]">{d.name}</span>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">{d.purpose}</p>
                  </div>
                ))}
              </div>

              {/* 2. Backend API Layer */}
              <div className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <Server className="w-4 h-4" />
                    <span className="text-[12px] font-bold">API Contracts & Services</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    {traceData.api.length} Endpoints
                  </span>
                </div>
                {traceData.api.map((api: any) => (
                  <div key={api.id} className="p-2 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] text-[12px] flex items-center justify-between font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        {api.method}
                      </span>
                      <span className="text-[var(--bos-text-primary)]">{api.path}</span>
                    </div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)]">{api.service}</span>
                  </div>
                ))}
              </div>

              {/* 3. Frontend Layer */}
              <div className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-600">
                    <Globe className="w-4 h-4" />
                    <span className="text-[12px] font-bold">Frontend Capabilities</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    {traceData.fe.length} Views
                  </span>
                </div>
                {traceData.fe.map((fe: any) => (
                  <div key={fe.id} className="p-2 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--bos-text-primary)]">{fe.name}</span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{fe.route || "Dialog"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 4. Automated Tests */}
              <div className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[12px] font-bold">Automated Test Specifications</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    {traceData.tests.length} Specs
                  </span>
                </div>
                {traceData.tests.map((t: any) => (
                  <div key={t.id} className="p-2 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--bos-text-primary)]">{t.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{t.expectedOutcome}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
        <button
          onClick={() => {
            onOpenEvidenceModal?.({
              requirementId: traceData?.reqId || "REQ-001",
              title: `Evidence for ${node.name}`,
            });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Attach Proof / Evidence
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-[12px] transition-colors cursor-pointer"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
