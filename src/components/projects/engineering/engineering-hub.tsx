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
  Code2,
  Lock,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CapabilityMap } from "./capability-map";
import { DatabaseArchitectureView } from "./database-architecture-view";
import { FrontendArchitectureView } from "./frontend-architecture-view";
import { BackendArchitectureView } from "./backend-architecture-view";
import { ApiArchitectureView } from "./api-architecture-view";
import { IntegrationsArchitectureView } from "./integrations-architecture-view";
import { AuthSecurityView } from "./auth-security-view";
import { TestingArchitectureView } from "./testing-architecture-view";
import { DeploymentArchitectureView } from "./deployment-architecture-view";
import { DependencyEngineView } from "./dependency-engine-view";
import { BlueprintReview } from "./blueprint-review";
import { TraceabilityDrawer } from "./traceability-drawer";
import { WorkPlanModal } from "./work-plan-modal";
import { EvidenceModal } from "./evidence-modal";
import { AIAssistantModal } from "./ai-assistant-modal";

export type EngineeringHubProps = {
  projectId: string;
  projectName: string;
  initialTab?: EngineeringTab;
  onWorkCommitted?: () => void;
};

export type EngineeringTab =
  | "overview"
  | "map"
  | "frontend"
  | "backend"
  | "database"
  | "apis"
  | "integrations"
  | "auth"
  | "testing"
  | "deployment"
  | "dependencies"
  | "drift"
  | "clarifications";

export function EngineeringHub({
  projectId,
  projectName,
  initialTab = "overview",
  onWorkCommitted,
}: EngineeringHubProps) {
  const [tab, setTab] = useState<EngineeringTab>(initialTab);
  const [blueprint, setBlueprint] = useState<any | null>(null);
  const [projectData, setProjectData] = useState<any | null>(null);
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

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const loadBlueprintData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resBp, resPrj] = await Promise.all([
        fetch(`/api/projects/${projectId}/blueprint`),
        fetch(`/api/projects/${projectId}`),
      ]);
      const dataBp = await resBp.json();
      const dataPrj = await resPrj.json();

      if (dataBp.ok) {
        setBlueprint(dataBp.blueprint);
        setVersions(dataBp.versions || []);
        setReadiness(dataBp.readiness);
      } else {
        setError(dataBp.message || "Could not load blueprint data.");
      }

      if (dataPrj.ok && dataPrj.project) {
        setProjectData(dataPrj.project);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)]">
              Engineering Control Hub
            </h2>
            {blueprint && (
              <span className="text-[11.5px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-primary)] font-semibold">
                Blueprint v{blueprint.version} ({blueprint.status})
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
            Traceable architectural engine connecting business intent to Frontend, Backend, Database, and automated verification.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAssistantModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)] text-[var(--bos-text-primary)] text-[12px] font-medium transition-all shadow-xs cursor-pointer"
          >
            <Bot className="w-4 h-4 text-[var(--bos-accent)]" />
            ✦ Ask AI Assistant
          </button>

          {blueprint?.status === "APPROVED" && (
            <button
              onClick={() => setShowWorkPlanModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:brightness-110 text-white text-[12px] font-medium transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate Work Plan
            </button>
          )}

          <button
            onClick={() => loadBlueprintData()}
            disabled={loading}
            className="p-2 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
            title="Refresh state"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--bos-border-subtle)] overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Blueprint Spec", icon: Layers },
          { id: "map", label: "Capability Map", icon: GitBranch },
          { id: "frontend", label: `Frontend (${blueprint?.frontendCapabilities?.length || 0})`, icon: Globe },
          { id: "backend", label: `Backend (${blueprint?.backendServices?.length || 0})`, icon: Server },
          { id: "database", label: `Database (${blueprint?.databaseEntities?.length || 0})`, icon: Database },
          { id: "apis", label: `APIs (${blueprint?.backendApis?.length || 0})`, icon: Code2 },
          { id: "integrations", label: `Integrations (${blueprint?.integrations?.length || 0})`, icon: GitBranch },
          { id: "auth", label: "Auth & Security", icon: Lock },
          { id: "testing", label: `Testing (${blueprint?.testSpecifications?.length || 0})`, icon: ShieldCheck },
          { id: "deployment", label: "Deployment", icon: Cloud },
          { id: "dependencies", label: "Dependency Cascade", icon: Layers },
          { id: "drift", label: `Drift (${blueprint?.drifts?.length || 0})`, icon: AlertTriangle },
          { id: "clarifications", label: `Clarifications (${blueprint?.clarifications?.length || 0})`, icon: HelpCircle },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as EngineeringTab)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-[12px] font-mono uppercase tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap",
                isActive
                  ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-bold bg-[var(--bos-surface-panel)] rounded-t"
                  : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      {loading && !blueprint ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--bos-text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[13px] font-mono">Loading Engineering Blueprint &amp; Relational Graph...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BLUEPRINT SPEC */}
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

          {/* TAB 3: FRONTEND */}
          {tab === "frontend" && (
            <FrontendArchitectureView
              blueprint={blueprint}
              tasks={projectData?.tasks || []}
              onOpenTraceability={(node) => setSelectedNode(node)}
            />
          )}

          {/* TAB 4: BACKEND */}
          {tab === "backend" && (
            <BackendArchitectureView
              blueprint={blueprint}
              tasks={projectData?.tasks || []}
              onOpenTraceability={(node) => setSelectedNode(node)}
            />
          )}

          {/* TAB 5: DATABASE ARCHITECTURE */}
          {tab === "database" && (
            <DatabaseArchitectureView
              entities={blueprint?.databaseEntities || []}
              backendApis={blueprint?.backendApis || []}
              onSelectEntity={(entity) => setSelectedNode({ type: "DB", id: entity.id, name: entity.name })}
            />
          )}

          {/* TAB 6: APIS */}
          {tab === "apis" && (
            <ApiArchitectureView
              blueprint={blueprint}
              tasks={projectData?.tasks || []}
              onOpenTraceability={(node) => setSelectedNode(node)}
            />
          )}

          {/* TAB 7: INTEGRATIONS */}
          {tab === "integrations" && (
            <IntegrationsArchitectureView
              blueprint={blueprint}
              project={projectData || {}}
            />
          )}

          {/* TAB 8: AUTH & SECURITY */}
          {tab === "auth" && (
            <AuthSecurityView
              blueprint={blueprint}
              project={projectData || {}}
            />
          )}

          {/* TAB 9: TESTING */}
          {tab === "testing" && (
            <TestingArchitectureView
              blueprint={blueprint}
              tasks={projectData?.tasks || []}
              onOpenTraceability={(node) => setSelectedNode(node)}
            />
          )}

          {/* TAB 10: DEPLOYMENT */}
          {tab === "deployment" && (
            <DeploymentArchitectureView
              project={projectData || {}}
              blueprint={blueprint}
            />
          )}

          {/* TAB 11: DEPENDENCIES */}
          {tab === "dependencies" && (
            <DependencyEngineView
              blueprint={blueprint}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          )}

          {/* TAB 12: ARCHITECTURE DRIFT */}
          {tab === "drift" && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                    Architecture Drift Scanner
                  </h4>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    Detects unplanned code, missing test coverage, or unmapped work items outside approved scope.
                  </p>
                </div>
                <button
                  onClick={() => loadBlueprintData()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px] hover:border-[var(--bos-border-strong)] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Run Live Scan
                </button>
              </div>

              {(blueprint?.drifts || []).length === 0 ? (
                <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-[14px] font-bold text-[var(--bos-text-primary)]">Zero Architecture Drift Detected</p>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    All current execution tasks, database models, and endpoints are 100% compliant with the approved blueprint.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {blueprint.drifts.map((drift: any) => (
                    <div
                      key={drift.id}
                      className="p-4 bg-[var(--bos-surface-panel)] border border-amber-500/20 rounded-2xl space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                          {drift.category}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">{drift.status}</span>
                      </div>
                      <h5 className="text-[13px] font-bold text-[var(--bos-text-primary)]">{drift.entityName}</h5>
                      <p className="text-[12px] text-[var(--bos-text-secondary)]">{drift.difference}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 13: CLARIFICATIONS */}
          {tab === "clarifications" && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl">
                <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                  Ambiguity &amp; Clarification Queue
                </h4>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Decisions requiring human clarification before entering the approved engineering baseline.
                </p>
              </div>

              {(blueprint?.clarifications || []).length === 0 ? (
                <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-[14px] font-bold text-[var(--bos-text-primary)]">No Open Clarifications</p>
                  <p className="text-[12px] text-[var(--bos-text-secondary)]">
                    All architectural requirements have been explicitly justified and verified.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blueprint.clarifications.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-4 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                          {c.priority} PRIORITY
                        </span>
                        <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">{c.status}</span>
                      </div>
                      <h5 className="text-[13px] font-bold text-[var(--bos-text-primary)]">{c.question}</h5>
                      {c.answer && (
                        <div className="p-2.5 bg-[var(--bos-surface-sunken)] rounded-lg text-[12px] text-emerald-600 font-mono">
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
