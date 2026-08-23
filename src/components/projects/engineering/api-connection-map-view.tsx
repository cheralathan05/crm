"use client";

import { useState } from "react";
import {
  Globe,
  Code2,
  Server,
  Database,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  HelpCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ApiConnectionMapViewProps = {
  blueprint: any;
  onSelectNode?: (node: any) => void;
};

export function ApiConnectionMapView({ blueprint, onSelectNode }: ApiConnectionMapViewProps) {
  const [filterQuery, setFilterQuery] = useState("");

  if (!blueprint) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl">
        <Zap className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
        <p className="text-[14px] font-bold text-[var(--bos-text-primary)]">No Active Engineering Blueprint</p>
        <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1">
          Generate an engineering blueprint to view the visual connection dependency map.
        </p>
      </div>
    );
  }

  const frontendCaps = (blueprint.frontendCapabilities || []) as Array<any>;
  const apis = (blueprint.backendApis || []) as Array<any>;
  const services = (blueprint.backendServices || []) as Array<any>;
  const entities = (blueprint.databaseEntities || []) as Array<any>;
  const integrations = (blueprint.integrations || []) as Array<any>;

  // Build connected execution chains
  type ConnectionChain = {
    id: string;
    requirementId: string;
    frontend: any | null;
    api: any | null;
    service: any | null;
    database: any | null;
    integration: any | null;
    status: "CONNECTED" | "INCOMPLETE";
    issues: string[];
  };

  const chains: ConnectionChain[] = [];

  // 1. Trace from Frontend Capabilities
  frontendCaps.forEach((fe, idx) => {
    const reqId = fe.requirementId || `REQ-${String(idx + 1).padStart(3, "0")}`;

    // Find linked API
    const matchedApi = apis.find(
      (a) => a.requirementId === reqId || (fe.apiDependencies && fe.apiDependencies.includes(a.path))
    );

    // Find linked Backend Service
    const matchedService = matchedApi
      ? services.find((s) => s.name && matchedApi.service?.includes(s.name))
      : services.find((s) => s.requirementId === reqId);

    // Find linked Database Entity
    const matchedDb = matchedApi
      ? entities.find((d) => d.name && (matchedApi.databaseDependencies?.includes(d.name) || matchedApi.service?.includes(d.name)))
      : entities.find((d) => d.requirementId === reqId);

    // Find linked Integration
    const matchedInt = integrations.find((i) => i.requirementId === reqId);

    const issues: string[] = [];
    if (!matchedApi) {
      issues.push(`${fe.name} cannot retrieve data because no corresponding API endpoint is mapped.`);
    }
    if (!matchedDb) {
      issues.push(`Data model for ${fe.name} is missing from the database layer.`);
    }

    chains.push({
      id: `chain-fe-${idx + 1}`,
      requirementId: reqId,
      frontend: fe,
      api: matchedApi || null,
      service: matchedService || null,
      database: matchedDb || null,
      integration: matchedInt || null,
      status: issues.length === 0 ? "CONNECTED" : "INCOMPLETE",
      issues,
    });
  });

  // 2. Add unmapped APIs if any
  apis.forEach((api, idx) => {
    if (!chains.some((c) => c.api?.id === api.id)) {
      const reqId = api.requirementId || `REQ-API-${idx + 1}`;
      const matchedDb = entities.find((d) => d.name && (api.databaseDependencies?.includes(d.name) || api.service?.includes(d.name)));
      const issues: string[] = [];
      if (!matchedDb) issues.push(`API ${api.method} ${api.path} does not have a linked database entity.`);

      chains.push({
        id: `chain-api-${idx + 1}`,
        requirementId: reqId,
        frontend: null,
        api,
        service: services.find((s) => s.name && api.service?.includes(s.name)) || null,
        database: matchedDb || null,
        integration: null,
        status: issues.length === 0 ? "CONNECTED" : "INCOMPLETE",
        issues,
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-amber-500 font-bold">
                VISUAL CONNECTION MAP
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · "What Talks To What?"
              </span>
            </div>
            <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Frontend ↔ API ↔ Backend ↔ Database Traceability
            </h3>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
              Automated connection engine verifying end-to-end relational continuity across all software layers.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] font-mono">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{chains.filter((c) => c.status === "CONNECTED").length} Connected</span>
            </span>
            {chains.filter((c) => c.status === "INCOMPLETE").length > 0 && (
              <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{chains.filter((c) => c.status === "INCOMPLETE").length} Incomplete</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Relational Flow Chains */}
      <section className="space-y-4">
        {chains.map((chain) => (
          <div
            key={chain.id}
            className={cn(
              "p-5 rounded-2xl border transition-all space-y-4 shadow-xs",
              chain.status === "CONNECTED"
                ? "bg-[var(--bos-surface-panel)] border-[var(--bos-border-subtle)]"
                : "bg-amber-500/5 border-amber-500/30"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--bos-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] font-semibold border border-[var(--bos-border-subtle)]">
                  {chain.requirementId}
                </span>
                <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                  {chain.frontend?.name || chain.api?.purpose || "System Capability Flow"}
                </h4>
              </div>

              <span
                className={cn(
                  "font-mono text-[11px] px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5",
                  chain.status === "CONNECTED"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                )}
              >
                {chain.status === "CONNECTED" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CONNECTED</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>⚠️ CONNECTION INCOMPLETE</span>
                  </>
                )}
              </span>
            </div>

            {/* Visual Flow Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch text-[12px] font-mono">
              {/* 1. Frontend */}
              <div
                onClick={() => chain.frontend && onSelectNode?.({ type: "FE", id: chain.frontend.id, name: chain.frontend.name })}
                className={cn(
                  "p-3 rounded-xl border flex flex-col justify-between space-y-2 cursor-pointer transition-all",
                  chain.frontend
                    ? "bg-[var(--bos-surface-sunken)] border-sky-500/30 hover:border-sky-500"
                    : "bg-rose-500/5 border-rose-500/30 text-rose-500 opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sky-500 font-bold uppercase flex items-center gap-1">
                    <Globe className="w-3 h-3" /> FRONTEND
                  </span>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    {chain.frontend ? "✓" : "Missing"}
                  </span>
                </div>
                <strong className="text-[12.5px] text-[var(--bos-text-primary)] truncate block">
                  {chain.frontend?.name || "Not Specified"}
                </strong>
                <span className="text-[10.5px] text-[var(--bos-text-tertiary)] truncate block">
                  Route: {chain.frontend?.route || "N/A"}
                </span>
              </div>

              {/* 2. API Endpoint */}
              <div
                onClick={() => chain.api && onSelectNode?.({ type: "API", id: chain.api.id, name: `${chain.api.method} ${chain.api.path}` })}
                className={cn(
                  "p-3 rounded-xl border flex flex-col justify-between space-y-2 cursor-pointer transition-all",
                  chain.api
                    ? "bg-[var(--bos-surface-sunken)] border-amber-500/30 hover:border-amber-500"
                    : "bg-rose-500/5 border-rose-500/30 text-rose-500 opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> API CONTRACT
                  </span>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    {chain.api ? "✓" : "Missing"}
                  </span>
                </div>
                <strong className="text-[12.5px] text-[var(--bos-text-primary)] truncate block">
                  {chain.api ? `${chain.api.method} ${chain.api.path}` : "Missing Endpoint"}
                </strong>
                <span className="text-[10.5px] text-[var(--bos-text-tertiary)] truncate block">
                  Auth: {chain.api?.authentication ? "Required" : "Public"}
                </span>
              </div>

              {/* 3. Backend Service */}
              <div
                className={cn(
                  "p-3 rounded-xl border flex flex-col justify-between space-y-2 transition-all",
                  chain.service || chain.api?.service
                    ? "bg-[var(--bos-surface-sunken)] border-indigo-500/30"
                    : "bg-rose-500/5 border-rose-500/30 text-rose-500 opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-500 font-bold uppercase flex items-center gap-1">
                    <Server className="w-3 h-3" /> BACKEND SERVICE
                  </span>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    {chain.service || chain.api?.service ? "✓" : "Missing"}
                  </span>
                </div>
                <strong className="text-[12.5px] text-[var(--bos-text-primary)] truncate block">
                  {chain.service?.name || chain.api?.service || "DomainService"}
                </strong>
                <span className="text-[10.5px] text-[var(--bos-text-tertiary)] truncate block">
                  Logic &amp; Validation
                </span>
              </div>

              {/* 4. Database Table */}
              <div
                onClick={() => chain.database && onSelectNode?.({ type: "DB", id: chain.database.id, name: chain.database.name })}
                className={cn(
                  "p-3 rounded-xl border flex flex-col justify-between space-y-2 cursor-pointer transition-all",
                  chain.database
                    ? "bg-[var(--bos-surface-sunken)] border-emerald-500/30 hover:border-emerald-500"
                    : "bg-rose-500/5 border-rose-500/30 text-rose-500 opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1">
                    <Database className="w-3 h-3" /> DATABASE
                  </span>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    {chain.database ? "✓" : "Missing"}
                  </span>
                </div>
                <strong className="text-[12.5px] text-[var(--bos-text-primary)] truncate block">
                  {chain.database?.tableName || chain.database?.name || "Missing Table"}
                </strong>
                <span className="text-[10.5px] text-[var(--bos-text-tertiary)] truncate block">
                  PostgreSQL / SQLite
                </span>
              </div>
            </div>

            {/* Diagnostic Alert if Incomplete */}
            {chain.issues.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[12px] space-y-1">
                <strong className="font-semibold block font-mono text-[11px] uppercase">
                  Connection Diagnostic Notice:
                </strong>
                {chain.issues.map((iss, iIdx) => (
                  <p key={iIdx}>• {iss}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
