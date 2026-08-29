"use client";

import { useState, useEffect } from "react";
import {
  X,
  Layers,
  Server,
  Database,
  TestTube,
  CheckCircle2,
  Play,
  FileCode,
  Shield,
  ArrowRight,
  ExternalLink,
  Code2,
  Sparkles,
  Zap,
  Globe,
  Terminal,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  initialCapabilityId?: string | null;
  workstream: string;
  projectRole: string;
  employeeId?: string;
}

export function EmployeeBuildModeModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  initialCapabilityId,
  workstream,
  projectRole,
  employeeId,
}: BuildModeModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCapId, setSelectedCapId] = useState<string | null>(initialCapabilityId || null);
  const [activeTab, setActiveTab] = useState<string>("SPEC");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      setLoading(true);
      try {
        const url = `/api/employee/build-mode?projectId=${projectId}${selectedCapId ? `&capabilityId=${selectedCapId}` : ""}${employeeId ? `&previewEmployeeId=${employeeId}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.ok) {
          setData(json.data);
          if (!selectedCapId && json.data.capabilities?.[0]?.id) {
            setSelectedCapId(json.data.capabilities[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading build mode:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, projectId, selectedCapId, employeeId]);

  if (!isOpen) return null;

  const capability = data?.selectedCapability || data?.capabilities?.find((c: any) => c.id === selectedCapId) || data?.capabilities?.[0];
  const normWs = (workstream || "FRONTEND").toUpperCase();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-2xl h-[90vh] shadow-2xl flex flex-col font-sans overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
                  BUILD MODE WORKSPACE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent)]/20 uppercase font-semibold">
                  {normWs}
                </span>
              </div>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                {projectName} • Active Engineer: {projectRole}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-header & Capability Selector */}
        <div className="px-6 py-3 border-b border-[var(--bos-border)] bg-[var(--bos-surface-subtle)]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            <span className="font-mono text-[var(--bos-text-secondary)] uppercase text-[10px] whitespace-nowrap">
              TARGET CAPABILITY:
            </span>
            {data?.capabilities?.length > 0 ? (
              <div className="flex gap-1.5 overflow-x-auto py-0.5">
                {data.capabilities.map((cap: any) => (
                  <button
                    key={cap.id}
                    onClick={() => setSelectedCapId(cap.id)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap",
                      selectedCapId === cap.id || (!selectedCapId && data.capabilities[0]?.id === cap.id)
                        ? "bg-[var(--bos-accent)] text-white font-bold shadow-sm"
                        : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                    )}
                  >
                    {cap.name}
                  </button>
                ))}
              </div>
            ) : (
              <span className="font-mono text-[var(--bos-text-primary)]">{projectName} Core</span>
            )}
          </div>

          {/* Tab switchers */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            {["SPEC", "CONTRACTS", "DATA", "TASKS"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all cursor-pointer",
                  activeTab === tab
                    ? "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] font-bold shadow-xs border border-[var(--bos-border)]"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
              <span>PREPARING BUILD ENVIRONMENT...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: SPECIFICATION & DESIGN */}
              {activeTab === "SPEC" && (
                <div className="space-y-6">
                  {/* Overview Card */}
                  <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--bos-accent)]" />
                        {capability?.name || "Feature Overview"}
                      </h3>
                      {capability?.route && (
                        <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-emerald-400">
                          {capability.route}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                      {capability?.description || "Approved implementation specification for this project capability."}
                    </p>
                  </div>

                  {/* Role-Specific Workspace Content */}
                  {normWs === "FRONTEND" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* UI States & Components */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                          REQUIRED UI STATES
                        </span>
                        <div className="space-y-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                            <span className="font-semibold text-[var(--bos-text-primary)] block">1. Populated State</span>
                            <span className="text-[11px] text-[var(--bos-text-secondary)]">
                              Render items dynamically with pagination, search filter, and row actions.
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                            <span className="font-semibold text-[var(--bos-text-primary)] block">2. Loading / Skeleton</span>
                            <span className="text-[11px] text-[var(--bos-text-secondary)]">
                              Non-blocking skeleton cards while fetching API endpoints.
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                            <span className="font-semibold text-[var(--bos-text-primary)] block">3. Empty State</span>
                            <span className="text-[11px] text-[var(--bos-text-secondary)]">
                              Clear graphic, "No entries found" copy, and primary creation CTA button.
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                            <span className="font-semibold text-[var(--bos-text-primary)] block">4. Error State</span>
                            <span className="text-[11px] text-[var(--bos-text-secondary)]">
                              Inline banner with retry action for 4xx/5xx responses.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Component Architecture */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block">
                          COMPONENT TREE
                        </span>
                        <div className="p-3 rounded-lg bg-[var(--bos-bg)] font-mono text-[11.5px] text-[var(--bos-text-secondary)] space-y-1.5 border border-[var(--bos-border)]">
                          <p className="text-indigo-400">&lt;{capability?.name?.replace(/\s+/g, "") || "Feature"}Page&gt;</p>
                          <p className="pl-4 text-emerald-400">├── &lt;PageHeader title="..." action="..." /&gt;</p>
                          <p className="pl-4 text-emerald-400">├── &lt;FilterBar search="..." filter="..." /&gt;</p>
                          <p className="pl-4 text-emerald-400">├── &lt;DataTable items=&#123;data&#125; loading=&#123;isLoading&#125; /&gt;</p>
                          <p className="pl-4 text-emerald-400">└── &lt;CreateDrawer isOpen=&#123;isOpen&#125; /&gt;</p>
                          <p className="text-indigo-400">&lt;/{capability?.name?.replace(/\s+/g, "") || "Feature"}Page&gt;</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {normWs === "BACKEND" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Business Rules */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 block">
                          BUSINESS RULES & VALIDATION
                        </span>
                        <ul className="space-y-2 text-xs text-[var(--bos-text-primary)]">
                          <li className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                            <span className="font-semibold block">1. Authentication & Tenant Scoping</span>
                            <span className="text-[11px] text-[var(--bos-text-secondary)]">All requests must resolve active session and enforce workspace isolation.</span>
                          </li>
                          <li className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                            <span className="font-semibold block">2. Input Validation (Zod Schema)</span>
                            <span className="text-[11px] text-[var(--bos-text-secondary)]">Strict payload schema validation returning 400 on invalid types or missing fields.</span>
                          </li>
                          <li className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                            <span className="font-semibold block">3. Transaction Boundary</span>
                            <span className="text-[11px] text-[var(--bos-text-secondary)]">Atomic database operations with rollback safety on multi-entity mutations.</span>
                          </li>
                        </ul>
                      </div>

                      {/* Service Execution Scaffold */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                          SERVICE CONTRACT
                        </span>
                        <div className="p-3 rounded-lg bg-[var(--bos-bg)] font-mono text-[11px] text-[var(--bos-text-secondary)] space-y-1 border border-[var(--bos-border)]">
                          <p className="text-amber-400">// {capability?.name || "Feature"} Service</p>
                          <p className="text-purple-400">export async function execute{capability?.name?.replace(/\s+/g, "") || "Feature"}(payload) &#123;</p>
                          <p className="pl-4 text-emerald-400">const validated = Schema.parse(payload);</p>
                          <p className="pl-4 text-blue-400">return await db.$transaction(async (tx) =&gt; &#123;</p>
                          <p className="pl-8 text-zinc-300">// Verified database transaction</p>
                          <p className="pl-4 text-blue-400">&#125;);</p>
                          <p className="text-purple-400">&#125;</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {normWs === "DATABASE" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Relational Schema */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                          ENTITY & TABLE SPECIFICATION
                        </span>
                        <div className="space-y-2 text-xs">
                          {(data?.databaseEntities || []).slice(0, 3).map((ent: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[var(--bos-text-primary)]">{ent.name}</span>
                                <span className="font-mono text-[10px] text-[var(--bos-accent)]">table: {ent.tableName}</span>
                              </div>
                              <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{ent.purpose || "Persistent entity"}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Integrity Constraints & Indexes */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 block">
                          INTEGRITY CONSTRAINTS & INDEXES
                        </span>
                        <ul className="space-y-1.5 text-xs text-[var(--bos-text-secondary)] font-mono">
                          <li className="p-2 rounded bg-[var(--bos-surface-subtle)]">✓ Primary Key: id (cuid/uuid)</li>
                          <li className="p-2 rounded bg-[var(--bos-surface-subtle)]">✓ Foreign Key Indexing on all relation columns</li>
                          <li className="p-2 rounded bg-[var(--bos-surface-subtle)]">✓ Unique Constraints on business identifiers</li>
                          <li className="p-2 rounded bg-[var(--bos-surface-subtle)]">✓ Timestamps: createdAt, updatedAt</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {normWs === "QA" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Test Specs */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 block">
                          TEST SPECIFICATIONS
                        </span>
                        <div className="space-y-2 text-xs">
                          {(data?.testSpecs || []).slice(0, 3).map((ts: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)]">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[var(--bos-text-primary)]">{ts.name}</span>
                                <span className="font-mono text-[10px] text-purple-400">{ts.testType}</span>
                              </div>
                              <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{ts.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Verification Checklist */}
                      <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                          ACCEPTANCE CRITERIA
                        </span>
                        <ul className="space-y-2 text-xs text-[var(--bos-text-primary)]">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Happy path workflow executes with 200 OK and expected DB mutation.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Invalid inputs trigger proper client and server validation errors.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Authentication and unauthorized access attempts are blocked.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: API CONTRACTS */}
              {activeTab === "CONTRACTS" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    CONNECTED API ENDPOINTS ({data?.apis?.length || 0})
                  </h4>
                  <div className="space-y-3">
                    {(data?.apis || []).map((api: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-mono text-xs font-bold px-2 py-0.5 rounded",
                                api.method === "GET"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : api.method === "POST"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              )}
                            >
                              {api.method}
                            </span>
                            <span className="font-mono text-xs font-bold text-[var(--bos-text-primary)]">
                              {api.path}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)]">
                            {api.status || "PLANNED"}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--bos-text-secondary)]">{api.purpose}</p>
                        {api.requestSchema && api.requestSchema !== "{}" && (
                          <div className="mt-2 p-2 rounded bg-[var(--bos-bg)] font-mono text-[10.5px] text-[var(--bos-text-tertiary)] overflow-x-auto">
                            Request Schema: {api.requestSchema}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: DATA SCHEMAS */}
              {activeTab === "DATA" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    DATABASE ENTITIES & TABLES ({data?.databaseEntities?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(data?.databaseEntities || []).map((ent: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--bos-text-primary)] text-sm">{ent.name}</span>
                          <span className="font-mono text-[10px] text-cyan-400">table: {ent.tableName}</span>
                        </div>
                        <p className="text-xs text-[var(--bos-text-secondary)]">{ent.purpose}</p>
                        {ent.fields && (
                          <div className="p-2 rounded bg-[var(--bos-bg)] font-mono text-[10.5px] text-[var(--bos-text-tertiary)] max-h-24 overflow-y-auto">
                            Fields: {ent.fields}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: TASKS */}
              {activeTab === "TASKS" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    ACTIVE TASKS ({data?.linkedTasks?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {(data?.linkedTasks || []).map((t: any) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[var(--bos-accent)] font-bold">
                              {t.code || "TASK"}
                            </span>
                            <span className="font-semibold text-[var(--bos-text-primary)]">{t.title}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                            Layer: {t.layer || workstream} • Priority: {t.priority}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)]">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between text-xs">
          <span className="text-[var(--bos-text-tertiary)] font-mono">
            Directly connected to project database • Live synchronization enabled
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] font-mono text-xs font-semibold rounded-xl hover:bg-[var(--bos-surface)] transition-all cursor-pointer"
          >
            Close Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
