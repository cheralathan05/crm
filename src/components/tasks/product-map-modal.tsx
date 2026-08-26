"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  ExternalLink,
  Globe,
  Layers,
  LayoutGrid,
  ListTodo,
  Loader2,
  Maximize2,
  Server,
  ShieldCheck,
  Sparkles,
  Table,
  TestTube2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectProductMap, ProductMapNode } from "@/lib/tasks";

export type ProductMapModalProps = {
  projectId: string;
  onClose: () => void;
  onSelectTask?: (taskId: string) => void;
};

export function ProductMapModal({
  projectId,
  onClose,
  onSelectTask,
}: ProductMapModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProjectProductMap | null>(null);
  const [selectedPage, setSelectedPage] = useState<ProductMapNode | null>(null);

  useEffect(() => {
    async function loadProductMap() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/product-map`);
        const json = await res.json();
        if (json.ok && json.productMap) {
          setData(json.productMap);
          if (json.productMap.pages.length > 0) {
            setSelectedPage(json.productMap.pages[0]);
          }
        }
      } catch {
        // Resilient
      } finally {
        setLoading(false);
      }
    }
    if (projectId) {
      loadProductMap();
    }
  }, [projectId]);

  if (loading && !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 font-mono text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-xs tracking-wider uppercase">Loading Product Architecture...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { project, navigation, pages } = data;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-between overflow-hidden">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--bos-accent)]/10 text-[var(--bos-accent)]">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-[var(--bos-accent)] font-bold tracking-wider uppercase">
              PRODUCT MAP &bull; REAL LIVE ARCHITECTURE
            </div>
            <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
              {project.name}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Discovered Product Pages Tree */}
        <div className="w-80 border-r border-[var(--bos-border)] bg-[var(--bos-surface)] p-4 overflow-y-auto space-y-3">
          <div className="text-[10px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider px-2">
            Discovered Pages ({pages.length})
          </div>

          <div className="space-y-1.5">
            {pages.map((p) => {
              const isSelected = selectedPage?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPage(p)}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition-all font-mono space-y-1 cursor-pointer block",
                    isSelected
                      ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/10 shadow-sm"
                      : "border-[var(--bos-border)] bg-[var(--bos-bg)] hover:bg-[var(--bos-surface-hover)]"
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--bos-text-primary)]">
                    <span className="truncate">{p.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bos-surface)] text-[var(--bos-text-muted)] border border-[var(--bos-border)]">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--bos-text-muted)] line-clamp-1 font-sans">
                    {p.purpose}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[9px] text-[var(--bos-text-muted)]">
                    <span>{p.taskCount} Tasks</span>
                    <span>{p.apiCount} APIs</span>
                    <span>{p.entityCount} Entities</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area: Dedicated Product Page View */}
        <div className="flex-1 bg-[var(--bos-bg)] overflow-y-auto p-8 space-y-6">
          {selectedPage ? (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Breadcrumb Header */}
              <div className="space-y-1">
                <div className="text-xs font-mono text-[var(--bos-accent)] uppercase tracking-wider">
                  {project.name} &rsaquo; {selectedPage.type} &rsaquo; {selectedPage.name}
                </div>
                <h1 className="text-2xl font-bold text-[var(--bos-text-primary)] tracking-tight">
                  {selectedPage.name}
                </h1>
                <p className="text-sm text-[var(--bos-text-secondary)]">
                  {selectedPage.purpose}
                </p>
              </div>

              {/* Large Product Preview Canvas */}
              <div className="rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] overflow-hidden shadow-xl">
                <div className="px-4 py-2 bg-[var(--bos-bg)] border-b border-[var(--bos-border)] flex items-center justify-between text-xs font-mono text-[var(--bos-text-muted)]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                    <span>{selectedPage.route}</span>
                  </div>
                  <span>Status: {selectedPage.status}</span>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--bos-text-primary)]">{selectedPage.name}</h3>
                      <p className="text-xs text-[var(--bos-text-secondary)]">{selectedPage.purpose}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedPage.components.slice(0, 3).map((comp, idx) => (
                        <button
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bos-surface-elevated)] border border-[var(--bos-border)] text-xs font-mono font-medium text-[var(--bos-text-primary)]"
                        >
                          {comp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Authentic Empty State Table */}
                  <div className="p-12 text-center rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-2">
                    <Table className="w-8 h-8 text-[var(--bos-text-muted)] mx-auto opacity-40" />
                    <p className="text-xs font-mono font-bold text-[var(--bos-text-secondary)]">
                      No records created yet in {selectedPage.name}
                    </p>
                    <p className="text-[11px] text-[var(--bos-text-muted)] font-mono">
                      Bound to {selectedPage.apiCount} APIs and {selectedPage.entityCount} database entities.
                    </p>
                  </div>
                </div>
              </div>

              {/* What the Page Uses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Database Entities */}
                <div className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--bos-accent)] uppercase">
                    <Database className="w-4 h-4" />
                    Database Entities ({selectedPage.entities.length})
                  </div>
                  {selectedPage.entities.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedPage.entities.map((e) => (
                        <div key={e.id} className="p-2 bg-[var(--bos-bg)] rounded-lg text-xs font-mono">
                          <div className="font-bold text-[var(--bos-text-primary)]">{e.name}</div>
                          <div className="text-[10px] text-[var(--bos-text-muted)]">{e.tableName} &bull; {e.fieldsCount} columns</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--bos-text-muted)] font-mono">Standard entity mapping</p>
                  )}
                </div>

                {/* API Endpoints */}
                <div className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-500 uppercase">
                    <Server className="w-4 h-4" />
                    API Endpoints ({selectedPage.apis.length})
                  </div>
                  {selectedPage.apis.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedPage.apis.map((a) => (
                        <div key={a.id} className="p-2 bg-[var(--bos-bg)] rounded-lg text-xs font-mono">
                          <div className="font-bold text-[var(--bos-text-primary)]">{a.method} {a.path}</div>
                          <div className="text-[10px] text-[var(--bos-text-muted)] truncate">{a.purpose}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--bos-text-muted)] font-mono">Internal component state</p>
                  )}
                </div>

                {/* Components */}
                <div className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-500 uppercase">
                    <Sparkles className="w-4 h-4" />
                    Components ({selectedPage.components.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPage.components.map((c, i) => (
                      <span key={i} className="px-2 py-1 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded text-[11px] font-mono text-[var(--bos-text-secondary)]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* What You Need to Build (Linking to Real Tasks) */}
              <div className="p-6 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl space-y-4">
                <h3 className="text-xs font-mono font-bold text-[var(--bos-text-muted)] uppercase tracking-wider flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-[var(--bos-accent)]" />
                  WHAT YOU NEED TO BUILD (CONNECTED TASKS)
                </h3>

                {selectedPage.tasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedPage.tasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onClose();
                          onSelectTask?.(t.id);
                        }}
                        className="p-3 bg-[var(--bos-bg)] hover:bg-[var(--bos-surface-hover)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div>
                          <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">
                            {t.code || "TSK"}
                          </span>
                          <h4 className="text-xs font-bold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors">
                            {t.title}
                          </h4>
                          <span className="text-[10px] font-mono text-[var(--bos-text-muted)]">
                            Status: {t.status}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--bos-text-muted)] group-hover:text-[var(--bos-accent)] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-[var(--bos-text-muted)]">
                    No active tasks assigned directly to this page.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
              <LayoutGrid className="w-12 h-12 text-[var(--bos-text-muted)] opacity-30" />
              <p className="text-xs font-mono text-[var(--bos-text-secondary)]">
                Select a page on the left to inspect its complete product architecture.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
