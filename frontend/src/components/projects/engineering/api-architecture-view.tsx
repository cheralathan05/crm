"use client";

import { useState } from "react";
import {
  Code2,
  Server,
  Database,
  Globe,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiConnectionMapView } from "./api-connection-map-view";

export type ApiArchitectureViewProps = {
  blueprint: any;
  tasks?: any[];
  onSelectApi?: (api: any) => void;
  onOpenTraceability?: (node: any) => void;
};

export function ApiArchitectureView({
  blueprint,
  tasks = [],
  onSelectApi,
  onOpenTraceability,
}: ApiArchitectureViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"contracts" | "connection-map">("contracts");
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const apis = (blueprint?.backendApis || []) as Array<any>;

  if (!blueprint || apis.length === 0) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3">
        <Code2 className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">APIs Not Generated</h3>
        <p className="text-[13px] text-[var(--bos-text-secondary)] max-w-md mx-auto">
          Generate an engineering blueprint from the approved proposal to view structured REST API contracts and connection maps.
        </p>
      </div>
    );
  }

  // Filtered APIs
  const filteredApis = apis.filter((api) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      api.path.toLowerCase().includes(q) ||
      api.purpose.toLowerCase().includes(q) ||
      api.method.toLowerCase().includes(q) ||
      (api.requirementId && api.requirementId.toLowerCase().includes(q))
    );
  });

  // Calculate real metrics
  const getCount = apis.filter((a) => a.method === "GET").length;
  const postCount = apis.filter((a) => a.method === "POST").length;
  const putPatchCount = apis.filter((a) => a.method === "PUT" || a.method === "PATCH").length;
  const deleteCount = apis.filter((a) => a.method === "DELETE").length;

  const selectedApi = apis.find((a) => a.id === selectedApiId) || filteredApis[0];

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[var(--bos-border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-amber-500 font-bold">
                API CONNECTION &amp; CONTRACTS
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · {apis.length} Formal HTTP Endpoints
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              API Specifications &amp; Relational Map
            </h2>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-[var(--bos-surface-sunken)] p-1 rounded-xl border border-[var(--bos-border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveSubTab("contracts")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[12px] font-mono font-medium transition-all cursor-pointer",
                activeSubTab === "contracts"
                  ? "bg-[var(--bos-surface-panel)] text-[var(--bos-text-primary)] shadow-xs font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              API Contracts ({apis.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("connection-map")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[12px] font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === "connection-map"
                  ? "bg-[var(--bos-surface-panel)] text-[var(--bos-text-primary)] shadow-xs font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Connection Map &amp; Diagnostics</span>
            </button>
          </div>
        </div>

        {/* Method Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] font-mono">
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">GET (READ)</span>
            <strong className="text-[14px] text-blue-600">{getCount} Endpoints</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">POST (CREATE)</span>
            <strong className="text-[14px] text-emerald-600">{postCount} Endpoints</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">PUT/PATCH (UPDATE)</span>
            <strong className="text-[14px] text-amber-600">{putPatchCount} Endpoints</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">DELETE (REMOVE)</span>
            <strong className="text-[14px] text-rose-600">{deleteCount} Endpoints</strong>
          </div>
        </div>
      </section>

      {/* VIEW 1: API CONTRACTS */}
      {activeSubTab === "contracts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Table / List */}
          <div className="lg:col-span-2 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bos-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search endpoints by route, purpose, or requirement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-xl text-[12.5px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Endpoints Table */}
            <div className="border border-[var(--bos-border-subtle)] rounded-2xl overflow-hidden bg-[var(--bos-surface-panel)] shadow-xs">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[var(--bos-surface-sunken)] border-b border-[var(--bos-border-subtle)] font-mono text-[11px] text-[var(--bos-text-secondary)]">
                  <tr>
                    <th className="p-3.5">Method &amp; Path</th>
                    <th className="p-3.5">Purpose</th>
                    <th className="p-3.5">Service</th>
                    <th className="p-3.5">Req</th>
                    <th className="p-3.5">Auth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bos-border-subtle)] font-mono text-[11.5px]">
                  {filteredApis.map((api) => {
                    const isSelected = selectedApi?.id === api.id;
                    return (
                      <tr
                        key={api.id}
                        onClick={() => {
                          setSelectedApiId(api.id);
                          onSelectApi?.(api);
                        }}
                        className={cn(
                          "transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[var(--bos-surface-sunken)] font-semibold"
                            : "hover:bg-[var(--bos-surface-sunken)]/60"
                        )}
                      >
                        <td className="p-3.5 flex items-center gap-2">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              api.method === "GET"
                                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                : api.method === "POST"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : api.method === "DELETE"
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            )}
                          >
                            {api.method}
                          </span>
                          <span className="text-[var(--bos-text-primary)]">{api.path}</span>
                        </td>
                        <td className="p-3.5 text-[var(--bos-text-secondary)] font-sans max-w-xs truncate">
                          {api.purpose}
                        </td>
                        <td className="p-3.5 text-indigo-600 truncate">{api.service || "Handler"}</td>
                        <td className="p-3.5 text-[var(--bos-text-tertiary)]">{api.requirementId || "REQ"}</td>
                        <td className="p-3.5 text-[var(--bos-text-secondary)]">
                          {api.authentication ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Lock className="w-3 h-3" />
                              <span>Required</span>
                            </span>
                          ) : (
                            <span className="text-[var(--bos-text-tertiary)]">Public</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Detail Pane */}
          {selectedApi && (
            <div className="p-5 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border-subtle)]">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-mono font-bold",
                      selectedApi.method === "GET"
                        ? "bg-blue-500/10 text-blue-600"
                        : selectedApi.method === "POST"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    )}
                  >
                    {selectedApi.method}
                  </span>
                  <h4 className="text-[13px] font-mono font-bold text-[var(--bos-text-primary)]">
                    {selectedApi.path}
                  </h4>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]">
                  {selectedApi.requirementId}
                </span>
              </div>

              {/* Purpose */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] font-semibold">
                  Purpose
                </span>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)] leading-relaxed">
                  {selectedApi.purpose}
                </p>
              </div>

              {/* Full Relational Chain */}
              <div className="space-y-2 pt-2 border-t border-[var(--bos-border-subtle)] font-mono text-[11.5px]">
                <span className="text-[10px] uppercase text-[var(--bos-text-tertiary)] font-semibold block">
                  Relational Execution Trace:
                </span>
                <div className="p-3 bg-[var(--bos-surface-sunken)] rounded-xl border border-[var(--bos-border-subtle)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bos-text-tertiary)]">Frontend Consumer:</span>
                    <strong className="text-[var(--bos-text-primary)]">
                      {selectedApi.frontendConsumer || "Workspace Console"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bos-text-tertiary)]">Backend Service:</span>
                    <strong className="text-indigo-600">{selectedApi.service || "DomainService"}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bos-text-tertiary)]">Database Dependencies:</span>
                    <strong className="text-emerald-600">
                      {(() => {
                        try {
                          if (selectedApi.databaseDependencies) {
                            const d = JSON.parse(selectedApi.databaseDependencies);
                            return Array.isArray(d) ? d.join(", ") : d;
                          }
                        } catch {}
                        return "PostgreSQL Table";
                      })()}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bos-text-tertiary)]">Auth Guard:</span>
                    <strong className="text-[var(--bos-text-primary)]">
                      {selectedApi.authorization || "AUTHENTICATED_USER"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Request / Response Schemas */}
              <div className="space-y-2 pt-2 border-t border-[var(--bos-border-subtle)] font-mono text-[11px]">
                <span className="text-[10px] uppercase text-[var(--bos-text-tertiary)] font-semibold block">
                  Request Schema:
                </span>
                <pre className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] overflow-x-auto text-[10.5px]">
                  {selectedApi.requestSchema
                    ? typeof selectedApi.requestSchema === "string"
                      ? selectedApi.requestSchema
                      : JSON.stringify(selectedApi.requestSchema, null, 2)
                    : "{}"}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: VISUAL API CONNECTION MAP */}
      {activeSubTab === "connection-map" && (
        <ApiConnectionMapView blueprint={blueprint} onSelectNode={onOpenTraceability} />
      )}
    </div>
  );
}
