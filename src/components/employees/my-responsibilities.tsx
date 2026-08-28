"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Database,
  FolderKanban,
  Layers,
  Link2,
  Loader2,
  Monitor,
  Server,
  TestTube,
  X,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { WorkstreamPagePreview } from "./workstream-page-preview";
import { WorkstreamDependencyGraph } from "./workstream-dependency-graph";

/* ════════════════════════════════════════════════════════════════════
   MY RESPONSIBILITIES — EMPLOYEE VIEW
   
   Shows the employee their assigned workstream responsibilities
   with product context: pages, APIs, dependencies, tasks, progress.
   
   ZERO MOCK DATA — everything from the real database via
   /api/employee/my-responsibilities
   ════════════════════════════════════════════════════════════════════ */

type PageDetail = {
  id: string;
  name: string;
  type: string;
  route: string | null;
  description: string | null;
  status: string;
  components: string[];
  apiDependencies: string[];
};

export function MyResponsibilities() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedResponsibility, setExpandedResponsibility] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageDetail | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/employee/my-responsibilities");
      const json = await res.json();
      if (json.ok) {
        setData(json);
        // Auto-expand first responsibility
        if (json.responsibilities?.length > 0) {
          setExpandedResponsibility(json.responsibilities[0].projectId);
        }
      } else {
        setError(json.message || "Failed to load responsibilities.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[var(--bos-accent)]" />
        <span className="text-[12px] font-mono text-[var(--bos-text-secondary)]">Loading your responsibilities...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-[13px] text-[var(--bos-text-secondary)]">{error || "No data available."}</p>
      </div>
    );
  }

  const { employee, responsibilities } = data;

  if (!responsibilities || responsibilities.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">My Responsibilities</h2>
          <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
            Your assigned workstream responsibilities will appear here.
          </p>
        </div>
        <div className="py-16 text-center p-8 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
          <FolderKanban className="w-10 h-10 text-[var(--bos-text-tertiary)] mx-auto mb-4" />
          <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">No responsibilities assigned</h3>
          <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1 max-w-md mx-auto">
            You have not been assigned to any project responsibilities yet.
            Your team lead will assign workstream responsibilities to you.
          </p>
        </div>
      </div>
    );
  }

  // Page Detail View
  if (selectedPage) {
    const resp = responsibilities.find((r: any) => r.pages.some((p: any) => p.id === selectedPage.id));
    const connectedApis = resp?.apis?.filter((a: any) =>
      selectedPage.apiDependencies.some((dep) => a.path.includes(dep) || dep.includes(a.path))
    ) || [];

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedPage(null)}
          className="text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] cursor-pointer flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to responsibilities
        </button>

        <div>
          <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold uppercase">{selectedPage.type}</span>
          <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-0.5">{selectedPage.name}</h2>
          {selectedPage.route && (
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">{selectedPage.route}</span>
          )}
        </div>

        {/* Page Preview */}
        <div className="max-w-md">
          <WorkstreamPagePreview page={{ ...selectedPage, order: 0 }} />
        </div>

        {/* Description */}
        {selectedPage.description && (
          <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
            <h3 className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase mb-2">What This Page Does</h3>
            <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">{selectedPage.description}</p>
          </div>
        )}

        {/* Components */}
        {selectedPage.components.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
            <h3 className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase mb-2">Components</h3>
            <div className="flex flex-wrap gap-1.5">
              {selectedPage.components.map((c, i) => (
                <span key={i} className="px-2 py-1 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[11px] font-mono text-[var(--bos-text-primary)]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Connected APIs */}
        {connectedApis.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
            <h3 className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase mb-2">API Connections</h3>
            <div className="space-y-1.5">
              {connectedApis.map((api: any) => (
                <div key={api.id} className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center gap-2">
                  <span className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                    api.method === "GET" ? "bg-emerald-500/10 text-emerald-600" :
                      api.method === "POST" ? "bg-sky-500/10 text-sky-600" :
                        "bg-amber-500/10 text-amber-600"
                  )}>
                    {api.method}
                  </span>
                  <span className="text-[11.5px] font-mono text-[var(--bos-text-primary)]">{api.path}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Dependencies (raw list if no match) */}
        {connectedApis.length === 0 && selectedPage.apiDependencies.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
            <h3 className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase mb-2">API Dependencies</h3>
            <div className="space-y-1">
              {selectedPage.apiDependencies.map((dep, i) => (
                <span key={i} className="block text-[11px] font-mono text-[var(--bos-text-secondary)]">{dep}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">My Responsibilities</h2>
        <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
          Your assigned workstream responsibilities across projects
        </p>
      </div>

      {/* Responsibility Cards */}
      <div className="space-y-4">
        {responsibilities.map((resp: any) => {
          const isExpanded = expandedResponsibility === resp.projectId;
          const progress = resp.progress;

          return (
            <div key={resp.projectId} className="rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] overflow-hidden shadow-sm">
              {/* Header */}
              <button
                type="button"
                onClick={() => setExpandedResponsibility(isExpanded ? null : resp.projectId)}
                className="w-full p-4 text-left flex items-center justify-between cursor-pointer hover:bg-[var(--bos-surface)]/50 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bos-accent-subtle)] flex items-center justify-center text-[var(--bos-accent)] shrink-0">
                    {resp.workstream === "FRONTEND" && <Monitor className="w-5 h-5" />}
                    {resp.workstream === "BACKEND" && <Server className="w-5 h-5" />}
                    {resp.workstream === "DATABASE" && <Database className="w-5 h-5" />}
                    {resp.workstream === "QA" && <TestTube className="w-5 h-5" />}
                    {!["FRONTEND", "BACKEND", "DATABASE", "QA"].includes(resp.workstream) && <Layers className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold uppercase block">
                      {resp.workstreamLabel}
                    </span>
                    <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)] truncate">{resp.projectName}</h3>
                    <span className="text-[11px] text-[var(--bos-text-secondary)]">{resp.clientName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Progress */}
                  <div className="text-right hidden sm:block">
                    <span className="text-[16px] font-bold text-[var(--bos-text-primary)]">{progress.overallPercent}%</span>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">Progress</span>
                  </div>
                  <ChevronRight className={cn(
                    "w-5 h-5 text-[var(--bos-text-tertiary)] transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                </div>
              </button>

              {/* Progress Bar */}
              <div className="px-4 pb-1">
                <div className="h-1.5 rounded-full bg-[var(--bos-surface-sunken)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--bos-accent)] transition-all duration-500"
                    style={{ width: `${progress.overallPercent}%` }}
                  />
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-5 pt-3 space-y-5 border-t border-[var(--bos-border)] mt-2">
                  {/* Progress Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Tasks", completed: progress.taskProgress.completed, total: progress.taskProgress.total, percent: progress.taskProgress.percent },
                      { label: "Pages", completed: progress.pageProgress.completed, total: progress.pageProgress.total, percent: progress.pageProgress.percent },
                      { label: "Deliverables", completed: progress.deliverableProgress.accepted, total: progress.deliverableProgress.total, percent: progress.deliverableProgress.percent },
                      { label: "Tests", completed: progress.testProgress.passed, total: progress.testProgress.total, percent: progress.testProgress.percent },
                    ].filter((p) => p.total > 0).map((p) => (
                      <div key={p.label} className="p-3 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-center">
                        <span className="text-[15px] font-bold text-[var(--bos-text-primary)] block">{p.completed}/{p.total}</span>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{p.label} · {p.percent}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Pages (Frontend) */}
                  {resp.pages.length > 0 && (
                    <div>
                      <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mb-2 flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                        PAGES
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resp.pages.filter((p: any) => p.type === "PAGE").map((page: any) => (
                          <WorkstreamPagePreview
                            key={page.id}
                            page={{ ...page, order: 0 }}
                            compact
                            onClick={() => setSelectedPage(page)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* APIs */}
                  {resp.apis.length > 0 && (
                    <div>
                      <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mb-2 flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-violet-500" />
                        API CONNECTIONS ({resp.apis.length})
                      </h4>
                      <div className="space-y-1">
                        {resp.apis.slice(0, 8).map((api: any) => (
                          <div key={api.id} className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                            <span className={cn(
                              "text-[8px] font-mono font-bold px-1 py-0.5 rounded",
                              api.method === "GET" ? "bg-emerald-500/10 text-emerald-600" :
                                api.method === "POST" ? "bg-sky-500/10 text-sky-600" :
                                  "bg-amber-500/10 text-amber-600"
                            )}>
                              {api.method}
                            </span>
                            <span className="font-mono text-[var(--bos-text-primary)] truncate">{api.path}</span>
                          </div>
                        ))}
                        {resp.apis.length > 8 && (
                          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] pl-2">
                            +{resp.apis.length - 8} more endpoints
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dependencies */}
                  {resp.dependencies.length > 0 && (
                    <div>
                      <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mb-2 flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                        DEPENDENCIES
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(resp.dependencies.map((d: any) => d.targetLayer))).map((layer: any) => (
                          <span key={layer} className="px-2 py-1 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[10px] font-mono text-[var(--bos-text-secondary)]">
                            {layer}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Tasks */}
                  <div>
                    <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mb-2 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                      MY ACTIVE WORK ({resp.tasks.filter((t: any) => t.status !== "DONE" && t.status !== "COMPLETED").length})
                    </h4>
                    {resp.tasks.filter((t: any) => t.status !== "DONE" && t.status !== "COMPLETED").length === 0 ? (
                      <p className="text-[11px] text-[var(--bos-text-tertiary)] italic pl-1">No active tasks.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {resp.tasks
                          .filter((t: any) => t.status !== "DONE" && t.status !== "COMPLETED")
                          .slice(0, 10)
                          .map((t: any) => (
                            <div key={t.id} className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-mono text-[var(--bos-accent)] font-bold">{t.code || "—"}</span>
                                  <span className={cn(
                                    "text-[8px] font-mono px-1 py-0.5 rounded",
                                    t.priority === "URGENT" ? "bg-rose-500/10 text-rose-600" :
                                      t.priority === "HIGH" ? "bg-amber-500/10 text-amber-600" :
                                        "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)]"
                                  )}>
                                    {t.priority}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-[var(--bos-text-primary)] truncate mt-0.5">{t.title}</p>
                              </div>
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2",
                                t.status === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-600" :
                                  t.status === "BLOCKED" ? "bg-rose-500/10 text-rose-600" :
                                    t.status === "IN_REVIEW" ? "bg-violet-500/10 text-violet-600" :
                                      "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)]"
                              )}>
                                {t.status.replace(/_/g, " ")}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
