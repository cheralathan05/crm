"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Server,
  Globe,
  ShieldCheck,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkTreeViewProps = {
  tasks: any[];
  deliverables?: any[];
  onSelectTask: (task: any) => void;
  onNewTaskUnderReq?: (reqId: string, layer: string) => void;
};

export function WorkTreeView({
  tasks = [],
  deliverables = [],
  onSelectTask,
  onNewTaskUnderReq,
}: WorkTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "REQ-ALL": true,
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Group tasks by Requirement -> Layer
  const reqGroups: Record<
    string,
    {
      reqId: string;
      title: string;
      deliverable?: any;
      layers: {
        DATABASE: any[];
        BACKEND: any[];
        FRONTEND: any[];
        TESTING: any[];
        OTHER: any[];
      };
    }
  > = {};

  tasks.forEach((t) => {
    const reqId = t.sourceRequirementId || t.code?.split("-")[0] || "REQ-001";
    if (!reqGroups[reqId]) {
      const matchedDeliv = deliverables.find(
        (d: any) => d.id === t.deliverableId || d.title?.toLowerCase().includes(reqId.toLowerCase()),
      );
      reqGroups[reqId] = {
        reqId,
        title: t.sourceRequirementTitle || `Requirement ${reqId}`,
        deliverable: matchedDeliv,
        layers: {
          DATABASE: [],
          BACKEND: [],
          FRONTEND: [],
          TESTING: [],
          OTHER: [],
        },
      };
    }

    const layerKey = (t.layer || t.workstream || "").toUpperCase();
    if (layerKey === "DATABASE") reqGroups[reqId].layers.DATABASE.push(t);
    else if (layerKey === "BACKEND") reqGroups[reqId].layers.BACKEND.push(t);
    else if (layerKey === "FRONTEND") reqGroups[reqId].layers.FRONTEND.push(t);
    else if (layerKey === "TESTING" || layerKey === "QA") reqGroups[reqId].layers.TESTING.push(t);
    else reqGroups[reqId].layers.OTHER.push(t);
  });

  const reqList = Object.values(reqGroups);

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
        <Layers className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
        <p className="text-[13px] font-medium text-[var(--bos-text-primary)]">No Work Tree Available</p>
        <p className="text-[11px] text-[var(--bos-text-secondary)]">Decompose an approved proposal to generate the hierarchical execution tree.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
            Project Work Tree & Capability Breakdown
          </h3>
          <p className="text-[11px] text-[var(--bos-text-secondary)]">
            Hierarchical decomposition from approved business requirement to technical implementation layers.
          </p>
        </div>
        <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
          {reqList.length} Scope Groups · {tasks.length} Execution Tasks
        </span>
      </div>

      {/* Work Tree Nodes */}
      <div className="space-y-3">
        {reqList.map((rg) => {
          const isExpanded = expandedNodes[rg.reqId] !== false;
          const totalTasksInReq =
            rg.layers.DATABASE.length +
            rg.layers.BACKEND.length +
            rg.layers.FRONTEND.length +
            rg.layers.TESTING.length +
            rg.layers.OTHER.length;
          const completedCount = [
            ...rg.layers.DATABASE,
            ...rg.layers.BACKEND,
            ...rg.layers.FRONTEND,
            ...rg.layers.TESTING,
            ...rg.layers.OTHER,
          ].filter((t) => t.status === "DONE" || t.status === "COMPLETED").length;

          return (
            <div
              key={rg.reqId}
              className="border border-[var(--bos-border)] rounded-xl bg-[var(--bos-bg)] overflow-hidden shadow-xs"
            >
              {/* Requirement Level Row */}
              <div
                onClick={() => toggleNode(rg.reqId)}
                className="p-3.5 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] flex items-center justify-between cursor-pointer hover:bg-[var(--bos-surface)]/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1 rounded text-[var(--bos-text-tertiary)]">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]">
                    {rg.reqId}
                  </span>
                  <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">
                    {rg.title}
                  </h4>
                  {rg.deliverable && (
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] hidden sm:inline">
                      ({rg.deliverable.title})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                    {completedCount}/{totalTasksInReq} completed
                  </span>
                  <div className="w-16 h-1.5 bg-[var(--bos-border)] rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${Math.round((completedCount / (totalTasksInReq || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Layer Sections inside Requirement */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Database Layer */}
                  {rg.layers.DATABASE.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2 border-purple-500/40">
                      <div className="flex items-center gap-1.5 text-purple-600 font-mono text-[11px] font-bold">
                        <Database className="w-3.5 h-3.5" />
                        <span>DATABASE PERSISTENCE ({rg.layers.DATABASE.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {rg.layers.DATABASE.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask(t)}
                            className="p-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-purple-500 rounded-lg flex items-center justify-between cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{t.code || "DB"}</span>
                              <span className="text-[12px] font-medium text-[var(--bos-text-primary)] group-hover:text-purple-600 transition-colors">
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] font-mono">
                              <span className="text-[var(--bos-text-secondary)]">{t.assigneeName || "Unassigned"}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[var(--bos-bg)] text-purple-600 font-bold">{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Backend API Layer */}
                  {rg.layers.BACKEND.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2 border-emerald-500/40">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-mono text-[11px] font-bold">
                        <Server className="w-3.5 h-3.5" />
                        <span>API CONTRACTS & SERVICES ({rg.layers.BACKEND.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {rg.layers.BACKEND.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask(t)}
                            className="p-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-emerald-500 rounded-lg flex items-center justify-between cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{t.code || "BE"}</span>
                              <span className="text-[12px] font-medium text-[var(--bos-text-primary)] group-hover:text-emerald-600 transition-colors">
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] font-mono">
                              <span className="text-[var(--bos-text-secondary)]">{t.assigneeName || "Unassigned"}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[var(--bos-bg)] text-emerald-600 font-bold">{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frontend Layer */}
                  {rg.layers.FRONTEND.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2 border-sky-500/40">
                      <div className="flex items-center gap-1.5 text-sky-600 font-mono text-[11px] font-bold">
                        <Globe className="w-3.5 h-3.5" />
                        <span>FRONTEND CAPABILITIES ({rg.layers.FRONTEND.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {rg.layers.FRONTEND.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask(t)}
                            className="p-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-sky-500 rounded-lg flex items-center justify-between cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{t.code || "FE"}</span>
                              <span className="text-[12px] font-medium text-[var(--bos-text-primary)] group-hover:text-sky-600 transition-colors">
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] font-mono">
                              <span className="text-[var(--bos-text-secondary)]">{t.assigneeName || "Unassigned"}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[var(--bos-bg)] text-sky-600 font-bold">{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Testing Layer */}
                  {rg.layers.TESTING.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2 border-amber-500/40">
                      <div className="flex items-center gap-1.5 text-amber-600 font-mono text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>TESTING & VERIFICATION ({rg.layers.TESTING.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {rg.layers.TESTING.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask(t)}
                            className="p-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-amber-500 rounded-lg flex items-center justify-between cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{t.code || "QA"}</span>
                              <span className="text-[12px] font-medium text-[var(--bos-text-primary)] group-hover:text-amber-600 transition-colors">
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] font-mono">
                              <span className="text-[var(--bos-text-secondary)]">{t.assigneeName || "Unassigned"}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[var(--bos-bg)] text-amber-600 font-bold">{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
