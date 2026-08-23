"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BlueprintReviewProps = {
  blueprint: any;
  versions?: any[];
  readiness?: any;
  projectId: string;
  onApprove: (blueprintId: string, comment?: string) => Promise<void>;
  onGenerate: (forceNewVersion?: boolean) => Promise<void>;
  onSelectNode?: (node: any) => void;
};

export function BlueprintReview({
  blueprint,
  versions = [],
  readiness,
  projectId,
  onApprove,
  onGenerate,
  onSelectNode,
}: BlueprintReviewProps) {
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [openSection, setOpenSection] = useState<"fe" | "be" | "db" | "sys" | "deps" | null>("fe");
  const [approvalComment, setApprovalComment] = useState("");

  const handleApprove = async () => {
    if (!blueprint) return;
    setApproving(true);
    try {
      await onApprove(blueprint.id, approvalComment);
    } finally {
      setApproving(false);
    }
  };

  const handleGenerate = async (newVer = false) => {
    setGenerating(true);
    try {
      await onGenerate(newVer);
    } finally {
      setGenerating(false);
    }
  };

  if (!blueprint) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] mx-auto flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--bos-text-primary)]">No Engineering Blueprint</h3>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1 max-w-md mx-auto">
            The approved proposal is ready for technical analysis. Trigger AI decomposition to generate the multi-tier engineering blueprint.
          </p>
        </div>
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:bg-[var(--bos-accent-hover)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {generating ? "Analyzing Scope & Generating..." : "Generate Engineering Blueprint"}
        </button>
      </div>
    );
  }

  const isApproved = blueprint.status === "APPROVED";

  return (
    <div className="space-y-6">
      {/* Blueprint Header */}
      <div className="p-5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[var(--bos-border)]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">
                ENGINEERING BLUEPRINT
              </h2>
              <span className="text-[12px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] font-semibold">
                v{blueprint.version}
              </span>
              <span
                className={cn(
                  "text-[11px] font-mono uppercase px-2 py-0.5 rounded-full font-bold",
                  isApproved
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                )}
              >
                {blueprint.status}
              </span>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1 font-mono">
              Model: {blueprint.model} · Prompt: v{blueprint.promptVersion} · Generated: {new Date(blueprint.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isApproved ? (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {approving ? "Approving..." : "Approve Blueprint"}
              </button>
            ) : (
              <button
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-surface)] hover:bg-[var(--bos-border)] text-[var(--bos-text-primary)] border border-[var(--bos-border)] text-[12px] font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {generating ? "Regenerating..." : "Create New Version (v" + (blueprint.version + 1) + ")"}
              </button>
            )}
          </div>
        </div>

        {/* Readiness Highlight Summary */}
        {readiness && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)]">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Database</span>
              <span className="text-[13px] font-bold text-purple-600 block mt-0.5">
                {readiness.layers.database.status}
              </span>
              <span className="text-[11px] text-[var(--bos-text-secondary)]">{blueprint.databaseEntities?.length || 0} entities</span>
            </div>
            <div className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)]">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Backend</span>
              <span className="text-[13px] font-bold text-emerald-600 block mt-0.5">
                {readiness.layers.backend.status}
              </span>
              <span className="text-[11px] text-[var(--bos-text-secondary)]">{blueprint.backendApis?.length || 0} APIs</span>
            </div>
            <div className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)]">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Frontend</span>
              <span className="text-[13px] font-bold text-sky-600 block mt-0.5">
                {readiness.layers.frontend.status}
              </span>
              <span className="text-[11px] text-[var(--bos-text-secondary)]">{blueprint.frontendCapabilities?.length || 0} views</span>
            </div>
            <div className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)]">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Testing</span>
              <span className="text-[13px] font-bold text-amber-600 block mt-0.5">
                {readiness.layers.testing.status}
              </span>
              <span className="text-[11px] text-[var(--bos-text-secondary)]">{blueprint.testSpecifications?.length || 0} specs</span>
            </div>
          </div>
        )}
      </div>

      {/* Progressive Disclosure Sections */}
      <div className="space-y-3">
        {/* 1. FRONTEND REVIEW */}
        <div className="border border-[var(--bos-border)] rounded-xl bg-[var(--bos-bg)] overflow-hidden shadow-xs">
          <button
            onClick={() => setOpenSection(openSection === "fe" ? null : "fe")}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--bos-surface)]/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-sky-500" />
              <div>
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">FRONTEND CAPABILITIES</h4>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  {blueprint.frontendCapabilities?.length || 0} Pages, Forms, Dialogs & State hooks
                </p>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-[var(--bos-text-tertiary)] transition-transform", openSection === "fe" && "rotate-180")} />
          </button>

          {openSection === "fe" && (
            <div className="p-4 border-t border-[var(--bos-border)] space-y-2.5">
              {(blueprint.frontendCapabilities || []).map((f: any) => (
                <div
                  key={f.id}
                  onClick={() => onSelectNode?.({ type: "FE", id: f.id, name: f.name })}
                  className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)] hover:border-sky-500 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 font-semibold">
                        {f.type}
                      </span>
                      <h5 className="text-[13px] font-medium text-[var(--bos-text-primary)] group-hover:text-sky-600 transition-colors">
                        {f.name}
                      </h5>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{f.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">{f.requirementId}</span>
                    <span className="text-[10px] font-mono text-emerald-600 font-medium">{f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. BACKEND REVIEW */}
        <div className="border border-[var(--bos-border)] rounded-xl bg-[var(--bos-bg)] overflow-hidden shadow-xs">
          <button
            onClick={() => setOpenSection(openSection === "be" ? null : "be")}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--bos-surface)]/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-emerald-500" />
              <div>
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">BACKEND API CONTRACTS & SERVICES</h4>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  {blueprint.backendApis?.length || 0} API Endpoints, Services & Auth rules
                </p>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-[var(--bos-text-tertiary)] transition-transform", openSection === "be" && "rotate-180")} />
          </button>

          {openSection === "be" && (
            <div className="p-4 border-t border-[var(--bos-border)] space-y-2.5">
              {(blueprint.backendApis || []).map((api: any) => (
                <div
                  key={api.id}
                  onClick={() => onSelectNode?.({ type: "API", id: api.id, name: `${api.method} ${api.path}` })}
                  className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)] hover:border-emerald-500 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        {api.method}
                      </span>
                      <span className="text-[12px] font-mono font-semibold text-[var(--bos-text-primary)] group-hover:text-emerald-600 transition-colors">
                        {api.path}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{api.purpose}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">{api.requirementId}</span>
                    <span className="text-[10px] font-mono text-[var(--bos-text-secondary)]">{api.service}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. DATABASE REVIEW */}
        <div className="border border-[var(--bos-border)] rounded-xl bg-[var(--bos-bg)] overflow-hidden shadow-xs">
          <button
            onClick={() => setOpenSection(openSection === "db" ? null : "db")}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--bos-surface)]/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-purple-500" />
              <div>
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">DATABASE ENTITIES & SCHEMA</h4>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  {blueprint.databaseEntities?.length || 0} Entities, Relations, Indexes & Migration safety
                </p>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-[var(--bos-text-tertiary)] transition-transform", openSection === "db" && "rotate-180")} />
          </button>

          {openSection === "db" && (
            <div className="p-4 border-t border-[var(--bos-border)] space-y-2.5">
              {(blueprint.databaseEntities || []).map((dbEntity: any) => (
                <div
                  key={dbEntity.id}
                  onClick={() => onSelectNode?.({ type: "DB", id: dbEntity.id, name: dbEntity.name })}
                  className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)] hover:border-purple-500 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-bold text-[var(--bos-text-primary)] group-hover:text-purple-600 transition-colors">
                        {dbEntity.name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">({dbEntity.tableName})</span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{dbEntity.purpose}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">{dbEntity.requirementId}</span>
                    <span className="text-[10px] font-mono text-purple-600 font-medium">{dbEntity.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. TESTING & SYSTEM SPECIFICATION */}
        <div className="border border-[var(--bos-border)] rounded-xl bg-[var(--bos-bg)] overflow-hidden shadow-xs">
          <button
            onClick={() => setOpenSection(openSection === "sys" ? null : "sys")}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--bos-surface)]/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <div>
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">SYSTEM: TESTING, SECURITY & INTEGRATIONS</h4>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  {blueprint.testSpecifications?.length || 0} Test Specifications, Security Guards & Integrations
                </p>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-[var(--bos-text-tertiary)] transition-transform", openSection === "sys" && "rotate-180")} />
          </button>

          {openSection === "sys" && (
            <div className="p-4 border-t border-[var(--bos-border)] space-y-2.5">
              {(blueprint.testSpecifications || []).map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => onSelectNode?.({ type: "TEST", id: t.id, name: t.name })}
                  className="p-3 bg-[var(--bos-surface)] rounded-lg border border-[var(--bos-border)] hover:border-amber-500 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                        {t.testType}
                      </span>
                      <h5 className="text-[12px] font-medium text-[var(--bos-text-primary)] group-hover:text-amber-600 transition-colors">
                        {t.name}
                      </h5>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{t.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">{t.requirementId}</span>
                    <span className="text-[10px] font-mono text-emerald-600 font-medium">{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
