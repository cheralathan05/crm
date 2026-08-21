"use client";

import { useState } from "react";
import {
  ArrowRight,
  Database,
  Globe,
  Layers,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ExternalLink,
  ChevronRight,
  Activity,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CapabilityMapProps = {
  blueprint: any;
  deliverables?: any[];
  onSelectNode: (node: { type: "REQ" | "FE" | "API" | "DB" | "TEST" | "DELIV"; id: string; name: string }) => void;
};

export function CapabilityMap({ blueprint, deliverables = [], onSelectNode }: CapabilityMapProps) {
  const [activeReqId, setActiveReqId] = useState<string | null>(null);

  if (!blueprint) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
        <Layers className="w-8 h-8 mx-auto text-[var(--bos-text-tertiary)] mb-2" />
        <p className="text-[14px] font-medium text-[var(--bos-text-primary)]">No Active Engineering Blueprint</p>
        <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1">
          Generate an engineering blueprint from the approved proposal to view the interactive capability map.
        </p>
      </div>
    );
  }

  // Group technical items by requirement
  const reqMap = new Map<string, {
    reqId: string;
    title: string;
    fe: any[];
    api: any[];
    db: any[];
    tests: any[];
  }>();

  // Extract from database entities
  (blueprint.databaseEntities || []).forEach((d: any) => {
    const reqId = d.requirementId || "REQ-001";
    if (!reqMap.has(reqId)) {
      reqMap.set(reqId, { reqId, title: `Requirement ${reqId}`, fe: [], api: [], db: [], tests: [] });
    }
    reqMap.get(reqId)!.db.push(d);
  });

  // Extract from backend APIs
  (blueprint.backendApis || []).forEach((b: any) => {
    const reqId = b.requirementId || "REQ-001";
    if (!reqMap.has(reqId)) {
      reqMap.set(reqId, { reqId, title: `Requirement ${reqId}`, fe: [], api: [], db: [], tests: [] });
    }
    reqMap.get(reqId)!.api.push(b);
  });

  // Extract from frontend capabilities
  (blueprint.frontendCapabilities || []).forEach((f: any) => {
    const reqId = f.requirementId || "REQ-001";
    if (!reqMap.has(reqId)) {
      reqMap.set(reqId, { reqId, title: `Requirement ${reqId}`, fe: [], api: [], db: [], tests: [] });
    }
    reqMap.get(reqId)!.fe.push(f);
  });

  // Extract from test specifications
  (blueprint.testSpecifications || []).forEach((t: any) => {
    const reqId = t.requirementId || "REQ-001";
    if (!reqMap.has(reqId)) {
      reqMap.set(reqId, { reqId, title: `Requirement ${reqId}`, fe: [], api: [], db: [], tests: [] });
    }
    reqMap.get(reqId)!.tests.push(t);
  });

  const reqList = Array.from(reqMap.values());
  const selectedGroup = activeReqId ? reqMap.get(activeReqId) || reqList[0] : reqList[0];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--bos-accent)]" />
            <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">System Capability Map</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bos-border)] text-[var(--bos-text-secondary)]">
              Blueprint v{blueprint.version}
            </span>
          </div>
          <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
            Dynamic relational flow from Business Requirements → Presentation UI → REST APIs → Database Entities → Automated Tests.
          </p>
        </div>

        {/* Filter selector */}
        {reqList.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] uppercase">Filter Scope:</span>
            {reqList.map((rg) => (
              <button
                key={rg.reqId}
                onClick={() => setActiveReqId(rg.reqId)}
                className={cn(
                  "text-[11px] font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer",
                  (selectedGroup?.reqId === rg.reqId)
                    ? "bg-[var(--bos-accent)] text-white border-[var(--bos-accent)] shadow-xs"
                    : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] border-[var(--bos-border)] hover:border-[var(--bos-border-strong)]",
                )}
              >
                {rg.reqId}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Relational Flow */}
      {selectedGroup ? (
        <div className="bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl p-5 shadow-xs overflow-x-auto">
          <div className="min-w-[760px] flex items-stretch justify-between gap-4">
            
            {/* Column 1: Business Requirement */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-[var(--bos-border)]">
                <FileCheck2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-secondary)]">
                  Requirement
                </span>
              </div>
              <button
                onClick={() => onSelectNode({ type: "REQ", id: selectedGroup.reqId, name: selectedGroup.title })}
                className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-lg text-left transition-all group cursor-pointer"
              >
                <span className="text-[11px] font-mono text-[var(--bos-accent)] font-semibold">{selectedGroup.reqId}</span>
                <h4 className="text-[13px] font-medium text-[var(--bos-text-primary)] mt-1 group-hover:text-[var(--bos-accent)] transition-colors">
                  {selectedGroup.title}
                </h4>
                <div className="mt-2.5 pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)]">
                  <span>Scope Item</span>
                  <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-center text-[var(--bos-text-tertiary)] pt-6">
              <ArrowRight className="w-4 h-4 opacity-40" />
            </div>

            {/* Column 2: Frontend Capabilities */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-[var(--bos-border)]">
                <Globe className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-secondary)]">
                  Frontend ({selectedGroup.fe.length})
                </span>
              </div>
              <div className="space-y-2">
                {selectedGroup.fe.map((fe) => (
                  <button
                    key={fe.id}
                    onClick={() => onSelectNode({ type: "FE", id: fe.id, name: fe.name })}
                    className="w-full p-3 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-sky-500 rounded-lg text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        {fe.type}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{fe.route || "Component"}</span>
                    </div>
                    <p className="text-[12px] font-medium text-[var(--bos-text-primary)] mt-1.5 truncate group-hover:text-sky-600 transition-colors">
                      {fe.name}
                    </p>
                  </button>
                ))}
                {selectedGroup.fe.length === 0 && (
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] italic p-2">No frontend components linked</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center text-[var(--bos-text-tertiary)] pt-6">
              <ArrowRight className="w-4 h-4 opacity-40" />
            </div>

            {/* Column 3: Backend API Contract */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-[var(--bos-border)]">
                <Server className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-secondary)]">
                  API Contract ({selectedGroup.api.length})
                </span>
              </div>
              <div className="space-y-2">
                {selectedGroup.api.map((api) => (
                  <button
                    key={api.id}
                    onClick={() => onSelectNode({ type: "API", id: api.id, name: `${api.method} ${api.path}` })}
                    className="w-full p-3 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-emerald-500 rounded-lg text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                        api.method === "GET" ? "bg-blue-500/10 text-blue-600" :
                        api.method === "POST" ? "bg-emerald-500/10 text-emerald-600" :
                        api.method === "DELETE" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {api.method}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--bos-text-primary)] truncate">{api.path}</span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1.5 line-clamp-1">
                      {api.purpose}
                    </p>
                  </button>
                ))}
                {selectedGroup.api.length === 0 && (
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] italic p-2">No API contracts linked</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center text-[var(--bos-text-tertiary)] pt-6">
              <ArrowRight className="w-4 h-4 opacity-40" />
            </div>

            {/* Column 4: Database Entities */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-[var(--bos-border)]">
                <Database className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-secondary)]">
                  Database ({selectedGroup.db.length})
                </span>
              </div>
              <div className="space-y-2">
                {selectedGroup.db.map((dbEntity) => (
                  <button
                    key={dbEntity.id}
                    onClick={() => onSelectNode({ type: "DB", id: dbEntity.id, name: dbEntity.name })}
                    className="w-full p-3 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-purple-500 rounded-lg text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-mono font-semibold text-[var(--bos-text-primary)] group-hover:text-purple-600 transition-colors">
                        {dbEntity.name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{dbEntity.tableName}</span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1 line-clamp-1">
                      {dbEntity.purpose}
                    </p>
                  </button>
                ))}
                {selectedGroup.db.length === 0 && (
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] italic p-2">No database entities linked</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center text-[var(--bos-text-tertiary)] pt-6">
              <ArrowRight className="w-4 h-4 opacity-40" />
            </div>

            {/* Column 5: Automated Tests & Verification */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-[var(--bos-border)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-secondary)]">
                  Tests & QA ({selectedGroup.tests.length})
                </span>
              </div>
              <div className="space-y-2">
                {selectedGroup.tests.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectNode({ type: "TEST", id: t.id, name: t.name })}
                    className="w-full p-3 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-emerald-600 rounded-lg text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        {t.testType}
                      </span>
                      <span className={cn(
                        "text-[10px] font-mono font-medium",
                        t.status === "PASSED" ? "text-emerald-600" : t.status === "FAILING" ? "text-rose-600" : "text-amber-600"
                      )}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-[var(--bos-text-primary)] mt-1.5 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {t.name}
                    </p>
                  </button>
                ))}
                {selectedGroup.tests.length === 0 && (
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] italic p-2">No tests configured</p>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
