"use client";

import { useState, useEffect } from "react";
import {
  GitCommit,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronRight,
  User,
  FileCode,
  Shield,
  RefreshCw,
  Play,
  FileCheck2,
} from "lucide-react";

interface ProductDeliveryGraphProps {
  projectId: string;
}

export function ProductDeliveryGraph({ projectId }: string | any) {
  const pId = typeof projectId === "string" ? projectId : projectId.projectId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<"MVP" | "PHASE_2">("MVP");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${pId}/product-execution`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load product graph:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProductEngine = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`/api/projects/${pId}/product-execution`, { method: "POST" });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to sync product engine:", err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (pId) {
      loadData();
    }
  }, [pId]);

  if (loading) {
    return (
      <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center font-mono text-xs text-[var(--bos-text-tertiary)] space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--bos-accent)]" />
        <p>CONNECTING REAL PRODUCT EXECUTION GRAPH...</p>
      </div>
    );
  }

  const { productModel, productAreas = [], gates = [], activeBlockers = [] } = data || {};
  const filteredAreas = productAreas.filter((pa: any) => pa.phase === selectedPhase);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── 1. PRODUCT TRUTH COMMAND HEADER (Section 40) ─────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">Product Delivery Execution Graph</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold uppercase">
                Zero AI Scope Invention
              </span>
            </div>
            <p className="text-xs font-mono text-[var(--bos-text-tertiary)] mt-1">
              Source: Approved Proposal {productModel?.commercialReference || "PROP-2026-001"} v{productModel?.version || 1}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Phase Selector */}
            <div className="flex items-center gap-1 p-1 bg-[var(--bos-surface)] rounded-2xl border border-[var(--bos-border)] font-mono text-xs">
              <button
                onClick={() => setSelectedPhase("MVP")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                  selectedPhase === "MVP"
                    ? "bg-[var(--bos-accent)] text-white shadow-xs"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                }`}
              >
                MVP SCOPE (4)
              </button>
              <button
                onClick={() => setSelectedPhase("PHASE_2")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                  selectedPhase === "PHASE_2"
                    ? "bg-[var(--bos-accent)] text-white shadow-xs"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                }`}
              >
                PHASE 2 (PLANNED)
              </button>
            </div>

            <button
              onClick={handleSyncProductEngine}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:bg-[var(--bos-surface-subtle)] text-xs font-mono font-bold text-[var(--bos-text-primary)] flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>SYNC PRODUCT ENGINE</span>
            </button>
          </div>
        </div>

        {/* Product Explanation & Progress Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="lg:col-span-2 p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--bos-accent)]">WHAT ARE WE BUILDING?</span>
            <p className="text-xs font-sans text-[var(--bos-text-primary)] leading-relaxed">
              {productModel?.explanation || "Approved client software product."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400">TRUE PRODUCT PROGRESS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--bos-text-primary)]">
                {productModel?.mvpProgressPercentage || 0}%
              </span>
              <span className="text-[10px] text-[var(--bos-text-tertiary)]">MVP Delivered</span>
            </div>
            <p className="text-[11px] text-[var(--bos-text-secondary)]">Calculated from verified product units</p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-blue-400">DELIVERY READINESS</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {productModel?.deliveryReadiness?.status || "IN_PROGRESS"}
            </span>
            <p className="text-[11px] text-[var(--bos-text-secondary)] truncate">
              {productModel?.deliveryReadiness?.reason || "Active technical development"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. INTERACTIVE PRODUCT DELIVERY GRAPH (Section 17) ────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--bos-text-primary)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--bos-accent)]" />
            <span>Product Area Execution Chain ({filteredAreas.length} Areas)</span>
          </h3>
          <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">
            Click any node to inspect lineage
          </span>
        </div>

        <div className="space-y-6">
          {filteredAreas.map((area: any) => (
            <div
              key={area.id}
              className="rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] overflow-hidden shadow-lg"
            >
              {/* Product Area Header Node */}
              <div className="p-5 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] flex flex-wrap items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-xs font-bold uppercase">
                    {area.code}
                  </span>
                  <h4 className="text-base font-bold text-[var(--bos-text-primary)]">{area.name}</h4>
                  <span className="text-xs text-[var(--bos-text-secondary)]">· {area.description}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--bos-text-tertiary)]">PHASE:</span>
                  <span className="font-bold text-[var(--bos-text-primary)]">{area.phase}</span>
                  <span className="text-[var(--bos-text-tertiary)] ml-2">STATUS:</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bos-surface-panel)] font-bold uppercase text-[var(--bos-accent)]">
                    {area.status}
                  </span>
                </div>
              </div>

              {/* Technical Responsibilities Chain */}
              <div className="p-6 space-y-4 font-mono text-xs">
                <div className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-bold tracking-wider">
                  TECHNICAL RESPONSIBILITIES & WORKSTREAM MAPPINGS
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(area.responsibilities || []).map((resp: any) => {
                    const workItem = resp.workItems?.[0];
                    const isCompleted = workItem?.status === "COMPLETED" || workItem?.status === "DONE" || workItem?.status === "APPROVED";
                    const isBlocked = workItem?.status === "BLOCKED";
                    const isInProgress = workItem?.status === "IN_PROGRESS";

                    return (
                      <div
                        key={resp.id}
                        onClick={() => setSelectedNode({ area, resp, workItem })}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                          isCompleted
                            ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500"
                            : isBlocked
                            ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500"
                            : isInProgress
                            ? "bg-blue-500/5 border-blue-500/30 hover:border-blue-500"
                            : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
                        }`}
                      >
                        {/* Workstream & Role Badge */}
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-[var(--bos-surface-panel)] text-[10px] font-bold uppercase text-[var(--bos-accent)]">
                            {resp.workstream}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              isCompleted
                                ? "text-emerald-400 bg-emerald-500/10"
                                : isBlocked
                                ? "text-rose-400 bg-rose-500/10"
                                : "text-[var(--bos-text-tertiary)]"
                            }`}
                          >
                            {workItem?.status || "PLANNED"}
                          </span>
                        </div>

                        {/* Title */}
                        <div>
                          <h5 className="font-bold text-xs text-[var(--bos-text-primary)] font-sans line-clamp-2">
                            {resp.title}
                          </h5>
                          <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1 font-mono">
                            Role: {resp.requiredRole}
                          </p>
                        </div>

                        {/* Assignee & Proof Requirement */}
                        <div className="pt-2 border-t border-[var(--bos-border)]/50 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
                          <span>Assignee: {workItem?.assigneeName || "Unassigned"}</span>
                          <span className="text-amber-400 font-bold">{resp.proofTypeRequired}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. NODE DETAIL DRAWER / MODAL (Section 17 Master Spec) ──── */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] p-6 sm:p-8 shadow-2xl space-y-6 font-mono text-xs animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)]">
              <div>
                <span className="text-[10px] text-[var(--bos-accent)] uppercase font-bold">
                  {selectedNode.area.code} · {selectedNode.resp.workstream} RESPONSIBILITY
                </span>
                <h3 className="text-lg font-bold text-[var(--bos-text-primary)]">{selectedNode.resp.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-bold hover:bg-[var(--bos-surface-subtle)] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Lineage Table */}
            <div className="space-y-2">
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-bold">
                END-TO-END TRACEABILITY LINEAGE
              </span>
              <div className="divide-y divide-[var(--bos-border)] bg-[var(--bos-surface)] p-4 rounded-2xl border border-[var(--bos-border)]">
                <div className="py-1.5 flex justify-between">
                  <span className="text-[var(--bos-text-tertiary)]">Proposal Reference</span>
                  <span className="font-bold text-[var(--bos-text-primary)]">PROP-2026-001 v1</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-[var(--bos-text-tertiary)]">Product Area</span>
                  <span className="font-bold text-[var(--bos-accent)]">{selectedNode.area.name}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-[var(--bos-text-tertiary)]">Required Role</span>
                  <span className="font-bold text-[var(--bos-text-primary)]">{selectedNode.resp.requiredRole}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-[var(--bos-text-tertiary)]">Assigned Employee</span>
                  <span className="font-bold text-[var(--bos-text-primary)]">{selectedNode.workItem?.assigneeName || "Unassigned"}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-[var(--bos-text-tertiary)]">Required Proof</span>
                  <span className="font-bold text-amber-400">{selectedNode.resp.proofTypeRequired}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-[var(--bos-text-tertiary)]">Execution State</span>
                  <span className="font-bold uppercase text-emerald-400">{selectedNode.workItem?.status || "TODO"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-bold">DELIVERABLE OUTCOME</span>
              <p className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-secondary)]">
                {selectedNode.resp.deliverableOutcome || "Verified component outcome."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
