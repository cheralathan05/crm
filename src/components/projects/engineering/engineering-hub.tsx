"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  Database,
  Server,
  Globe,
  ShieldCheck,
  GitBranch,
  AlertTriangle,
  HelpCircle,
  Play,
  RefreshCw,
  Sparkles,
  Bot,
  Plus,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CapabilityMap } from "./capability-map";
import { DatabaseArchitectureView } from "./database-architecture-view";
import { BlueprintReview } from "./blueprint-review";
import { TraceabilityDrawer } from "./traceability-drawer";
import { WorkPlanModal } from "./work-plan-modal";
import { EvidenceModal } from "./evidence-modal";
import { AIAssistantModal } from "./ai-assistant-modal";

export type EngineeringHubProps = {
  projectId: string;
  projectName: string;
  onWorkCommitted?: () => void;
};

export type EngineeringTab =
  | "overview"
  | "map"
  | "database"
  | "backend"
  | "frontend"
  | "testing"
  | "dependencies"
  | "drift"
  | "clarifications";

export function EngineeringHub({
  projectId,
  projectName,
  onWorkCommitted,
}: EngineeringHubProps) {
  const [tab, setTab] = useState<EngineeringTab>("overview");
  const [blueprint, setBlueprint] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [showWorkPlanModal, setShowWorkPlanModal] = useState(false);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [evidenceTarget, setEvidenceTarget] = useState<any | null>(null);

  const loadBlueprintData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint`);
      const data = await res.json();
      if (data.ok) {
        setBlueprint(data.blueprint);
        setVersions(data.versions || []);
        setReadiness(data.readiness);
      } else {
        setError(data.message || "Could not load blueprint data.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading engineering data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlueprintData();
  }, [projectId]);

  const handleApproveBlueprint = async (blueprintId: string, comment?: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintId, comment }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice(data.message || "Blueprint approved successfully.");
        await loadBlueprintData();
      } else {
        setError(data.message || "Approval failed.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to approve blueprint.");
    }
  };

  const handleGenerateBlueprint = async (forceNewVersion = false) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceNewVersion }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice(data.message || "Engineering blueprint generated.");
        await loadBlueprintData();
      } else {
        setError(data.message || "Generation failed.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate blueprint.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[13px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-[11px] font-mono hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[13px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[11px] font-mono hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Engineering Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-bold text-[var(--bos-text-primary)]">
              Engineering Control Center
            </h1>
            {blueprint && (
              <span className="text-[12px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] font-semibold">
                Blueprint v{blueprint.version} ({blueprint.status})
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--bos-text-secondary)]">
            Traceable architectural engine connecting business intent to Frontend, Backend, Database, and automated verification.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAssistantModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[var(--bos-text-primary)] text-[12px] font-medium transition-all shadow-xs cursor-pointer"
          >
            <Bot className="w-4 h-4 text-[var(--bos-accent)]" />
            ✦ Ask AI Assistant
          </button>

          {blueprint?.status === "APPROVED" && (
            <button
              onClick={() => setShowWorkPlanModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-medium transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate Work Plan
            </button>
          )}

          <button
            onClick={() => loadBlueprintData()}
            disabled={loading}
            className="p-2 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
            title="Refresh state"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--bos-border)] overflow-x-auto pb-1">
        <button
          onClick={() => setTab("overview")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "overview"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <Layers className="w-4 h-4" />
          Blueprint Spec
        </button>

        <button
          onClick={() => setTab("map")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "map"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <GitBranch className="w-4 h-4" />
          Capability Map
        </button>

        <button
          onClick={() => setTab("database")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "database"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <Database className="w-4 h-4" />
          Database ({blueprint?.databaseEntities?.length || 0})
        </button>

        <button
          onClick={() => setTab("backend")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "backend"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <Server className="w-4 h-4" />
          APIs ({blueprint?.backendApis?.length || 0})
        </button>

        <button
          onClick={() => setTab("frontend")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "frontend"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <Globe className="w-4 h-4" />
          Frontend ({blueprint?.frontendCapabilities?.length || 0})
        </button>

        <button
          onClick={() => setTab("testing")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "testing"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Testing ({blueprint?.testSpecifications?.length || 0})
        </button>

        <button
          onClick={() => setTab("drift")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "drift"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Drift ({blueprint?.drifts?.length || 0})
        </button>

        <button
          onClick={() => setTab("clarifications")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap",
            tab === "clarifications"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <HelpCircle className="w-4 h-4" />
          Clarifications ({blueprint?.clarifications?.length || 0})
        </button>
      </div>

      {/* Main Tab Content */}
      {loading && !blueprint ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--bos-text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[13px] font-mono">Loading Engineering Blueprint & Relational Graph...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BLUEPRINT SPEC & PROGRESSIVE REVIEW */}
          {tab === "overview" && (
            <BlueprintReview
              blueprint={blueprint}
              versions={versions}
              readiness={readiness}
              projectId={projectId}
              onApprove={handleApproveBlueprint}
              onGenerate={handleGenerateBlueprint}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          )}

          {/* TAB 2: SYSTEM CAPABILITY MAP */}
          {tab === "map" && (
            <CapabilityMap
              blueprint={blueprint}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          )}

          {/* TAB 3: DATABASE ARCHITECTURE */}
          {tab === "database" && (
            <DatabaseArchitectureView
              entities={blueprint?.databaseEntities || []}
              backendApis={blueprint?.backendApis || []}
              onSelectEntity={(entity) => setSelectedNode({ type: "DB", id: entity.id, name: entity.name })}
            />
          )}

          {/* TAB 4: BACKEND APIS */}
          {tab === "backend" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
                <span className="text-[13px] font-medium text-[var(--bos-text-primary)]">
                  {blueprint?.backendApis?.length || 0} Formal API Contracts
                </span>
                <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                  Enforces authentication, authorization, and database dependency mapping.
                </span>
              </div>

              <div className="border border-[var(--bos-border)] rounded-xl overflow-hidden bg-[var(--bos-bg)]">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[var(--bos-surface)] border-b border-[var(--bos-border)] font-mono text-[11px] text-[var(--bos-text-secondary)]">
                    <tr>
                      <th className="p-3">Method & Path</th>
                      <th className="p-3">Requirement</th>
                      <th className="p-3">Purpose</th>
                      <th className="p-3">Service Handler</th>
                      <th className="p-3">Auth Guard</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bos-border)] font-mono text-[11px]">
                    {(blueprint?.backendApis || []).map((api: any) => (
                      <tr
                        key={api.id}
                        onClick={() => setSelectedNode({ type: "API", id: api.id, name: `${api.method} ${api.path}` })}
                        className="hover:bg-[var(--bos-surface)]/50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-semibold flex items-center gap-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px]",
                            api.method === "GET" ? "bg-blue-500/10 text-blue-600" :
                            api.method === "POST" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                          )}>
                            {api.method}
                          </span>
                          <span className="text-[var(--bos-text-primary)]">{api.path}</span>
                        </td>
                        <td className="p-3 text-[var(--bos-text-secondary)]">{api.requirementId}</td>
                        <td className="p-3 text-[var(--bos-text-secondary)] font-sans">{api.purpose}</td>
                        <td className="p-3 text-emerald-600">{api.service}</td>
                        <td className="p-3 text-[var(--bos-text-tertiary)]">{api.authorization || "Authenticated"}</td>
                        <td className="p-3 text-emerald-600 font-semibold">{api.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: FRONTEND CAPABILITIES */}
          {tab === "frontend" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
                <span className="text-[13px] font-medium text-[var(--bos-text-primary)]">
                  {blueprint?.frontendCapabilities?.length || 0} Frontend Capabilities
                </span>
                <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                  Pages, routes, dialogs, and components tied to approved business requirements.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(blueprint?.frontendCapabilities || []).map((fe: any) => (
                  <div
                    key={fe.id}
                    onClick={() => setSelectedNode({ type: "FE", id: fe.id, name: fe.name })}
                    className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-sky-500 rounded-xl transition-all cursor-pointer group space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 font-bold">
                          {fe.type}
                        </span>
                        <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)] group-hover:text-sky-600 transition-colors">
                          {fe.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{fe.requirementId}</span>
                    </div>
                    <p className="text-[12px] text-[var(--bos-text-secondary)]">{fe.description}</p>
                    <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      <span>Route: {fe.route || "N/A"}</span>
                      <span className="text-emerald-600 font-semibold">{fe.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: TESTING & VERIFICATION */}
          {tab === "testing" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
                <span className="text-[13px] font-medium text-[var(--bos-text-primary)]">
                  {blueprint?.testSpecifications?.length || 0} Automated Test Specifications
                </span>
                <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                  Every acceptance criterion is verified with automated or UAT test specifications.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(blueprint?.testSpecifications || []).map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedNode({ type: "TEST", id: t.id, name: t.name })}
                    className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-emerald-500 rounded-xl transition-all cursor-pointer group space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        {t.testType}
                      </span>
                      <span className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded font-bold",
                        t.status === "PASSED" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {t.status}
                      </span>
                    </div>
                    <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)] group-hover:text-emerald-600 transition-colors">
                      {t.name}
                    </h4>
                    <p className="text-[12px] text-[var(--bos-text-secondary)]">{t.description}</p>
                    <div className="pt-2 border-t border-[var(--bos-border)] text-[11px] text-[var(--bos-text-tertiary)]">
                      <span className="font-semibold text-[var(--bos-text-primary)]">Expected: </span>
                      {t.expectedOutcome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: ARCHITECTURE DRIFT */}
          {tab === "drift" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                    Architecture Drift Scanner
                  </h4>
                  <p className="text-[11px] text-[var(--bos-text-secondary)]">
                    Detects unplanned code, missing test coverage, or unmapped work items outside approved scope.
                  </p>
                </div>
                <button
                  onClick={() => loadBlueprintData()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[12px] hover:border-[var(--bos-border-strong)] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Run Live Scan
                </button>
              </div>

              {(blueprint?.drifts || []).length === 0 ? (
                <div className="p-8 text-center bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Zero Architecture Drift Detected</p>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    All current execution tasks, database models, and endpoints are 100% compliant with the approved blueprint.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {blueprint.drifts.map((drift: any) => (
                    <div
                      key={drift.id}
                      className="p-4 bg-[var(--bos-bg)] border border-amber-500/20 rounded-xl space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                          {drift.category}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">{drift.status}</span>
                      </div>
                      <h5 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">{drift.entityName}</h5>
                      <p className="text-[12px] text-[var(--bos-text-secondary)]">{drift.difference}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: CLARIFICATIONS */}
          {tab === "clarifications" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
                <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                  Ambiguity & Clarification Queue
                </h4>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  Decisions requiring human clarification before entering the approved engineering baseline.
                </p>
              </div>

              {(blueprint?.clarifications || []).length === 0 ? (
                <div className="p-8 text-center bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-[14px] font-semibold text-[var(--bos-text-primary)]">No Open Clarifications</p>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    All architectural requirements have been explicitly justified and verified.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blueprint.clarifications.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                          {c.priority} PRIORITY
                        </span>
                        <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">{c.status}</span>
                      </div>
                      <h5 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">{c.question}</h5>
                      {c.answer && (
                        <div className="p-2.5 bg-[var(--bos-surface)] rounded-lg text-[12px] text-emerald-600 font-mono">
                          Answer: {c.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Traceability Context Drawer */}
      <TraceabilityDrawer
        node={selectedNode}
        projectId={projectId}
        onClose={() => setSelectedNode(null)}
        onOpenEvidenceModal={(target) => setEvidenceTarget(target)}
      />

      {/* AI Work Plan Generator Modal */}
      <WorkPlanModal
        projectId={projectId}
        isOpen={showWorkPlanModal}
        onClose={() => setShowWorkPlanModal(false)}
        onCommitted={() => {
          setNotice("Production tasks successfully created from approved blueprint.");
          loadBlueprintData();
          onWorkCommitted?.();
        }}
      />

      {/* Evidence Recorder Modal */}
      <EvidenceModal
        projectId={projectId}
        isOpen={!!evidenceTarget}
        target={evidenceTarget}
        onClose={() => setEvidenceTarget(null)}
        onAttached={() => {
          setNotice("Verification proof attached to record.");
          loadBlueprintData();
        }}
      />

      {/* Project Grounded AI Assistant Modal */}
      <AIAssistantModal
        projectId={projectId}
        projectName={projectName}
        isOpen={showAssistantModal}
        onClose={() => setShowAssistantModal(false)}
      />
    </div>
  );
}
