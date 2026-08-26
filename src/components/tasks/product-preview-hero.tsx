"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  Eye,
  Globe,
  ImageIcon,
  Layers,
  LayoutGrid,
  Loader2,
  Maximize2,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Table,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskProductUnderstanding } from "@/lib/tasks";
import { InteractiveProductPreview } from "./interactive-product-preview";

export type ProductPreviewHeroProps = {
  understanding?: TaskProductUnderstanding;
  taskId?: string;
  projectId?: string;
  onOpenProductMap?: () => void;
};

export function ProductPreviewHero({
  understanding,
  taskId,
  projectId,
  onOpenProductMap,
}: ProductPreviewHeroProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"LIVE_PRODUCT" | "AI_IMAGE" | "CANVAS" | "CONTRACT" | "SCHEMA">("LIVE_PRODUCT");
  const [previewOutdated, setPreviewOutdated] = useState(false);
  const [activeFieldFilter, setActiveFieldFilter] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string>("Cloudflare Flux-1-Schnell");
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!understanding) return null;

  const {
    projectName,
    featureName,
    featureDescription,
    layer,
    actions,
    components,
    apiContracts,
    databaseEntities,
    backendServices,
    workPackage,
  } = understanding;

  // Load preview data from /api/preview on mount
  useEffect(() => {
    let isMounted = true;
    async function loadAiPreview() {
      try {
        setIsRefreshing(true);
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, projectId }),
        });
        const json = await res.json();
        if (isMounted && json.ok && json.preview) {
          if (json.preview.visualData?.imageUrl) {
            setAiImageUrl(json.preview.visualData.imageUrl);
          }
          if (json.preview.model) {
            setAiModel(json.preview.model);
          }
          if (json.preview.status === "OUTDATED") {
            setPreviewOutdated(true);
          }
        }
      } catch {
        // Fallback to interactive canvas
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    }

    if (taskId || projectId) {
      loadAiPreview();
    }

    return () => {
      isMounted = false;
    };
  }, [taskId, projectId]);

  const handleRefreshPreview = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, projectId, forceRefresh: true }),
      });
      const json = await res.json();
      if (json.ok && json.preview) {
        if (json.preview.visualData?.imageUrl) {
          setAiImageUrl(json.preview.visualData.imageUrl);
        }
        if (json.preview.model) {
          setAiModel(json.preview.model);
        }
        setPreviewOutdated(false);
      }
    } catch {
      // Keep state resilient
    } finally {
      setIsRefreshing(false);
    }
  };

  const primaryEntity = databaseEntities[0];
  const primaryApi = apiContracts[0];
  const primaryService = backendServices[0];

  return (
    <div className="space-y-4">
      {/* ── Top Bar with Status & "See Product" Action ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[var(--bos-border)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--bos-accent)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            PRODUCT PREVIEW
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-semibold">
            {previewOutdated ? "OUTDATED" : "CURRENT ARCHITECTURE"}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-[var(--bos-accent)]/10 border-[var(--bos-accent)]/30 text-[var(--bos-accent)] font-semibold">
            Interactive Live App
          </span>
          <span className="text-[11px] font-mono text-[var(--bos-text-muted)]">
            Layer: <span className="text-[var(--bos-text-primary)] font-bold">{layer}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-lg p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setActiveTab("LIVE_PRODUCT")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer font-bold",
                activeTab === "LIVE_PRODUCT"
                  ? "bg-[var(--bos-accent)] text-white shadow-xs"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              Live Product
            </button>
            <button
              onClick={() => setActiveTab("CANVAS")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer",
                activeTab === "CANVAS"
                  ? "bg-[var(--bos-accent)] text-white font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <Globe className="w-3 h-3" />
              Components
            </button>
            <button
              onClick={() => setActiveTab("CONTRACT")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer",
                activeTab === "CONTRACT"
                  ? "bg-[var(--bos-accent)] text-white font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <Server className="w-3 h-3" />
              API
            </button>
            <button
              onClick={() => setActiveTab("SCHEMA")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer",
                activeTab === "SCHEMA"
                  ? "bg-[var(--bos-accent)] text-white font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <Database className="w-3 h-3" />
              DB
            </button>
            <button
              onClick={() => setActiveTab("AI_IMAGE")}
              className={cn(
                "px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[10px]",
                activeTab === "AI_IMAGE"
                  ? "bg-[var(--bos-accent)] text-white font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
              title="View experimental AI image concept"
            >
              <ImageIcon className="w-3 h-3" />
              AI Art
            </button>
          </div>

          {onOpenProductMap && (
            <button
              onClick={onOpenProductMap}
              className="px-3 py-1.5 bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-hover)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[var(--bos-text-primary)] text-xs font-mono font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              SEE PRODUCT
            </button>
          )}

          <button
            onClick={handleRefreshPreview}
            disabled={isRefreshing}
            className="p-1.5 bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-hover)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] rounded-lg text-xs font-mono transition-all cursor-pointer"
            title="Generate fresh AI preview from current requirement hash"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--bos-accent)]")} />
          </button>
        </div>
      </div>

      {/* ── Outdated Requirement Notice ─────────────────────────────── */}
      {previewOutdated && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-500 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Product requirements or data schema changed since this preview was rendered.</span>
          </div>
          <button
            onClick={handleRefreshPreview}
            className="px-3 py-1 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Generate Updated Preview
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         TAB 0: LIVE INTERACTIVE PRODUCT (KILLER REAL FEATURES)
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === "LIVE_PRODUCT" && (
        <div className="space-y-3">
          <InteractiveProductPreview
            projectName={projectName}
            featureName={featureName}
            featureDescription={featureDescription}
            layer={layer}
            tableName={primaryEntity?.tableName}
            apiPath={primaryApi?.path}
            actions={actions}
            components={components}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         TAB 1: AI GENERATED PRODUCT PREVIEW (HERO IMAGE)
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === "AI_IMAGE" && (
        <div className="relative rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] overflow-hidden shadow-2xl">
          {/* Simulated Browser Top Bar */}
          <div className="px-4 py-2.5 bg-[var(--bos-bg)] border-b border-[var(--bos-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="ml-3 px-3 py-0.5 rounded-md bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[11px] font-mono text-[var(--bos-text-secondary)] flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-[var(--bos-accent)]" />
                https://app.{projectName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com/{featureName.toLowerCase().replace(/\s+/g, "-")}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[var(--bos-text-muted)]">
                {aiImageUrl ? "Generated via Cloudflare Flux AI" : "Rendering Preview..."}
              </span>
              {aiImageUrl && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-1 rounded bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-hover)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)]"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* AI Image Canvas Surface */}
          <div className="p-4 md:p-6 bg-gradient-to-b from-black/40 to-black/80 flex flex-col items-center justify-center min-h-[380px]">
            {isRefreshing && !aiImageUrl ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-[var(--bos-text-primary)]">
                    Generating Realistic Product UI Mockup...
                  </p>
                  <p className="text-[11px] text-[var(--bos-text-muted)] font-mono">
                    Calling Cloudflare Workers AI with live project context & schema
                  </p>
                </div>
              </div>
            ) : aiImageUrl ? (
              <div className="w-full space-y-3">
                <div className="relative group rounded-xl overflow-hidden border border-[var(--bos-border)] bg-black/60 shadow-xl max-h-[560px] flex items-center justify-center">
                  <img
                    src={aiImageUrl}
                    alt={`${projectName} - ${featureName}`}
                    className="w-full h-auto object-contain max-h-[540px] transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      View High-Res
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-muted)] px-1">
                  <span>
                    Product: <strong className="text-[var(--bos-text-primary)]">{projectName}</strong> &rsaquo; {featureName}
                  </span>
                  <span>
                    Bound to Table: <strong className="text-[var(--bos-accent)]">{primaryEntity?.tableName || "entity_store"}</strong>
                  </span>
                </div>
              </div>
            ) : (
              /* Fallback if AI image generation fails or is offline */
              <div className="w-full text-center py-12 space-y-3">
                <ImageIcon className="w-10 h-10 text-[var(--bos-text-muted)] mx-auto opacity-50" />
                <p className="text-xs font-mono font-bold text-[var(--bos-text-secondary)]">
                  Visual representation ready for live rendering
                </p>
                <button
                  onClick={handleRefreshPreview}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-bold rounded-xl shadow-md hover:opacity-90 transition-all cursor-pointer"
                >
                  Generate AI Preview
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         TAB 2: INTERACTIVE COMPONENT CANVAS
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === "CANVAS" && (
        <div className="relative rounded-2xl border border-[var(--bos-border)] bg-gradient-to-b from-[var(--bos-surface-elevated)] to-[var(--bos-surface)] overflow-hidden shadow-2xl">
          {/* Simulated Browser Bar */}
          <div className="px-4 py-2.5 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="ml-3 px-3 py-0.5 rounded-md bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[11px] font-mono text-[var(--bos-text-secondary)] flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-[var(--bos-accent)]" />
                https://app.{projectName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com/{featureName.toLowerCase().replace(/\s+/g, "-")}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--bos-text-muted)]">
              <span>{primaryEntity ? `${primaryEntity.tableName} schema` : "Live Connected"}</span>
            </div>
          </div>

          {/* Product View Surface */}
          <div className="p-6 space-y-6">
            {/* Header Area of Product */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
              <div>
                <div className="text-[11px] font-mono text-[var(--bos-accent)] font-semibold uppercase tracking-wider">
                  {projectName} &rsaquo; {featureName}
                </div>
                <h2 className="text-xl font-bold text-[var(--bos-text-primary)] mt-1 tracking-tight">
                  {featureName}
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)] mt-1 max-w-2xl leading-relaxed">
                  {featureDescription}
                </p>
              </div>

              {/* Real Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {actions.map((act, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border shadow-sm",
                      idx === 0
                        ? "bg-[var(--bos-accent)] text-white border-transparent hover:opacity-90"
                        : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-hover)]"
                    )}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter / Search Bar in Product Preview */}
            <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[var(--bos-text-muted)]" />
                <input
                  type="text"
                  placeholder={`Filter ${featureName.toLowerCase()} fields...`}
                  value={activeFieldFilter}
                  onChange={(e) => setActiveFieldFilter(e.target.value)}
                  className="bg-transparent text-xs text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-muted)] focus:outline-none w-full font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--bos-text-muted)]">
                  API: <code className="text-[var(--bos-text-primary)]">{primaryApi ? `${primaryApi.method} ${primaryApi.path}` : "Internal Router"}</code>
                </span>
              </div>
            </div>

            {/* Authentic Data Structure with Real Empty State (ZERO FAKE CUSTOMERS) */}
            <div className="rounded-xl border border-[var(--bos-border)] overflow-hidden bg-[var(--bos-surface)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--bos-bg)] border-b border-[var(--bos-border)] text-[var(--bos-text-muted)] text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-4"># ID</th>
                      {primaryEntity && primaryEntity.fields.length > 0 ? (
                        primaryEntity.fields.slice(0, 5).map((f, i) => (
                          <th key={i} className="py-2.5 px-4">
                            {f.name} <span className="text-[9px] text-[var(--bos-text-muted)] lowercase">({f.type})</span>
                          </th>
                        ))
                      ) : (
                        <>
                          <th className="py-2.5 px-4">Record Key</th>
                          <th className="py-2.5 px-4">Title / Label</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Updated</th>
                        </>
                      )}
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Realistic Authentic Empty State Notice — Never Fake Records */}
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-2">
                          <Table className="w-8 h-8 text-[var(--bos-text-muted)] mx-auto opacity-40" />
                          <p className="text-xs font-bold text-[var(--bos-text-secondary)]">
                            No {featureName.toLowerCase()} records in database yet
                          </p>
                          <p className="text-[11px] text-[var(--bos-text-muted)] leading-relaxed font-sans">
                            Ready for implementation. Connected to table <code className="font-mono text-[var(--bos-accent)]">{primaryEntity?.tableName || "entity_store"}</code> and API <code className="font-mono text-[var(--bos-accent)]">{primaryApi?.path || "/api/data"}</code>.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Meta & Component Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-[var(--bos-text-muted)] uppercase">Required Components</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {components.map((c, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-[var(--bos-text-muted)] uppercase">Data Gateway</div>
                <p className="text-xs font-mono font-bold text-[var(--bos-text-primary)]">
                  {primaryApi ? `${primaryApi.method} ${primaryApi.path}` : "Direct DB / Store"}
                </p>
                <p className="text-[10px] text-[var(--bos-text-muted)] truncate">
                  {primaryApi?.purpose || "Handles CRUD payload dispatching"}
                </p>
              </div>

              <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-[var(--bos-text-muted)] uppercase">Database Entity</div>
                <p className="text-xs font-mono font-bold text-[var(--bos-text-primary)]">
                  {primaryEntity ? `${primaryEntity.name} (${primaryEntity.tableName})` : "Project Store"}
                </p>
                <p className="text-[10px] text-[var(--bos-text-muted)]">
                  {primaryEntity ? `${primaryEntity.fields.length} columns defined` : "Standard schema"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         TAB 3: API CONTRACT
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === "CONTRACT" && (
        <div className="rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] overflow-hidden shadow-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
            <div>
              <div className="text-[11px] font-mono text-[var(--bos-accent)] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                BACKEND SERVICE &bull; {primaryService?.name || "Service Layer"}
              </div>
              <h2 className="text-xl font-bold text-[var(--bos-text-primary)] mt-1 font-mono tracking-tight">
                {primaryApi ? `${primaryApi.method} ${primaryApi.path}` : featureName}
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)] mt-1 max-w-2xl leading-relaxed">
                {primaryApi?.purpose || featureDescription}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] font-bold text-[var(--bos-text-primary)]">
                Status: {primaryApi?.status || "PLANNED"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Request Schema */}
            <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[var(--bos-accent)] font-bold">REQUEST CONTRACT (INPUT)</span>
                <span className="text-[var(--bos-text-muted)]">application/json</span>
              </div>
              <pre className="p-3 bg-[var(--bos-surface)] rounded-lg text-[11px] font-mono text-[var(--bos-text-secondary)] overflow-x-auto border border-[var(--bos-border)] max-h-48">
                {primaryApi?.requestSchema && primaryApi.requestSchema !== "{}"
                  ? primaryApi.requestSchema
                  : JSON.stringify(
                      {
                        workspaceId: "string (required)",
                        payload: primaryEntity?.fields.slice(0, 4).reduce((acc: any, f) => {
                          acc[f.name] = f.type;
                          return acc;
                        }, {}) || { data: "object" },
                      },
                      null,
                      2
                    )}
              </pre>
            </div>

            {/* Response Schema */}
            <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-500 font-bold">RESPONSE CONTRACT (OUTPUT)</span>
                <span className="text-[var(--bos-text-muted)]">HTTP 200 OK</span>
              </div>
              <pre className="p-3 bg-[var(--bos-surface)] rounded-lg text-[11px] font-mono text-[var(--bos-text-secondary)] overflow-x-auto border border-[var(--bos-border)] max-h-48">
                {primaryApi?.responseSchema && primaryApi.responseSchema !== "{}"
                  ? primaryApi.responseSchema
                  : JSON.stringify(
                      {
                        ok: true,
                        data: {
                          id: "cuid",
                          createdAt: "ISO string",
                          updatedAt: "ISO string",
                        },
                      },
                      null,
                      2
                    )}
              </pre>
            </div>
          </div>

          {/* Connected Table Mapping */}
          <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[var(--bos-accent)] shrink-0" />
              <div>
                <div className="text-xs font-mono font-bold text-[var(--bos-text-primary)]">
                  Persisted to Table: {primaryEntity?.tableName || "relational_store"}
                </div>
                <div className="text-[11px] text-[var(--bos-text-secondary)]">
                  Supports queries for {primaryEntity?.name || featureName} domain transactions
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[var(--bos-text-muted)]">
              {primaryEntity ? `${primaryEntity.fields.length} attributes` : "Schema defined"}
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         TAB 4: DATABASE ERD SCHEMA
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === "SCHEMA" && (
        <div className="rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] overflow-hidden shadow-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
            <div>
              <div className="text-[11px] font-mono text-[var(--bos-accent)] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                DATABASE ENTITY &bull; {primaryEntity?.name || featureName}
              </div>
              <h2 className="text-xl font-bold text-[var(--bos-text-primary)] mt-1 font-mono tracking-tight">
                TABLE: {primaryEntity?.tableName || "entity_table"}
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)] mt-1 max-w-2xl leading-relaxed">
                {primaryEntity?.purpose || featureDescription}
              </p>
            </div>

            <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] font-bold text-[var(--bos-text-primary)]">
              Status: {primaryEntity?.status || "PLANNED"}
            </span>
          </div>

          {/* Fields Schema Grid */}
          <div className="rounded-xl border border-[var(--bos-border)] overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[var(--bos-bg)] border-b border-[var(--bos-border)] text-[var(--bos-text-muted)] text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Column Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Key / Constraint</th>
                  <th className="py-2.5 px-4">Nullability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bos-border)] bg-[var(--bos-surface)]">
                {primaryEntity && primaryEntity.fields.length > 0 ? (
                  primaryEntity.fields.map((f, i) => (
                    <tr key={i} className="hover:bg-[var(--bos-surface-hover)]">
                      <td className="py-2.5 px-4 font-bold text-[var(--bos-text-primary)]">{f.name}</td>
                      <td className="py-2.5 px-4 text-[var(--bos-accent)]">{f.type}</td>
                      <td className="py-2.5 px-4">
                        {f.isPk ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px]">PRIMARY KEY</span>
                        ) : f.isFk ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 text-[10px]">FOREIGN KEY</span>
                        ) : (
                          <span className="text-[var(--bos-text-muted)]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--bos-text-muted)]">
                        {f.isNullable ? "NULLABLE" : "NOT NULL"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-[var(--bos-text-muted)]">
                      No explicit schema columns loaded. Defaulting to standard entity model.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Fullscreen Lightbox Modal ───────────────────────────────── */}
      {isFullscreen && aiImageUrl && (
        <div
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 cursor-zoom-out"
        >
          <div className="max-w-6xl max-h-[90vh] overflow-auto rounded-2xl border border-white/20 shadow-2xl">
            <img
              src={aiImageUrl}
              alt={`${projectName} - ${featureName}`}
              className="w-full h-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
