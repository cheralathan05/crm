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
  Code2,
  ArrowRight,
  User,
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
  const [openSection, setOpenSection] = useState<"fe" | "be" | "db" | "api" | "tests" | null>("fe");
  const [approvalComment, setApprovalComment] = useState("");
  const [activePipelineStep, setActivePipelineStep] = useState<string | null>(null);

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

  // Real calculations
  const feCapabilities = blueprint.frontendCapabilities || [];
  const feComponentsCount = feCapabilities.reduce((acc: number, f: any) => {
    try {
      const parsed = typeof f.components === "string" ? JSON.parse(f.components) : f.components;
      return acc + (Array.isArray(parsed) ? parsed.length : 1);
    } catch {
      return acc + 1;
    }
  }, 0);
  const fePagesCount = feCapabilities.filter((f: any) => f.type === "PAGE" || !f.type).length;
  const feFlowsCount = feCapabilities.filter((f: any) => f.type === "FLOW" || f.type === "FORM").length || (feCapabilities.length > 0 ? 1 : 0);

  const beServices = blueprint.backendServices || [];
  const beApis = blueprint.backendApis || [];
  const dbEntities = blueprint.databaseEntities || [];
  const testSpecs = blueprint.testSpecifications || [];

  const apisTotal = beApis.length;
  const apisConnected = beApis.filter((a: any) => a.status === "COMPLETED" || a.status === "READY").length;
  const apisMissing = apisTotal - apisConnected;

  const feStatus = feCapabilities.every((f: any) => f.status === "COMPLETED") && feCapabilities.length > 0 ? "DONE" : feCapabilities.some((f: any) => f.status === "IN_PROGRESS" || f.status === "READY") ? "IN PROGRESS" : "PLANNED";
  const beStatus = beServices.every((s: any) => s.status === "COMPLETED") && beServices.length > 0 ? "DONE" : beServices.some((s: any) => s.status === "IN_PROGRESS") || beApis.some((a: any) => a.status === "IN_PROGRESS") ? "IN PROGRESS" : "PLANNED";
  const dbStatus = dbEntities.every((e: any) => e.status === "MIGRATED" || e.status === "VERIFIED") && dbEntities.length > 0 ? "DONE" : "IN PROGRESS";

  return (
    <div className="space-y-6">
      {/* ── 01. HOW ARE WE BUILDING THIS? (4 PRIMARY BLOCKS) ───────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              HOW ARE WE BUILDING THIS?
            </span>
            <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Engineering Architecture Overview
            </h3>
          </div>
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
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                ✓ BLUEPRINT APPROVED (v{blueprint.version})
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* BLOCK 1: FRONTEND */}
          <div
            onClick={() => setOpenSection("fe")}
            className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-sky-500/50 transition-all space-y-3 cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" />
                <h4 className="font-mono text-[12px] font-bold uppercase text-[var(--bos-text-primary)] group-hover:text-sky-500 transition-colors">
                  FRONTEND
                </h4>
              </div>
              <span className={cn(
                "text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border",
                feStatus === "DONE" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-sky-500/10 text-sky-600 border-sky-500/20"
              )}>
                {feStatus}
              </span>
            </div>

            <div className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
              React / Next.js
            </div>

            <div className="space-y-1 pt-1 border-t border-[var(--bos-border-subtle)] text-[12px] font-mono text-[var(--bos-text-primary)]">
              <div>{feComponentsCount} component{feComponentsCount === 1 ? "" : "s"}</div>
              <div>{fePagesCount} page{fePagesCount === 1 ? "" : "s"}</div>
              <div>{feFlowsCount} flow{feFlowsCount === 1 ? "" : "s"}</div>
            </div>
          </div>

          {/* BLOCK 2: BACKEND */}
          <div
            onClick={() => setOpenSection("be")}
            className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-indigo-500/50 transition-all space-y-3 cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                <h4 className="font-mono text-[12px] font-bold uppercase text-[var(--bos-text-primary)] group-hover:text-indigo-500 transition-colors">
                  BACKEND
                </h4>
              </div>
              <span className={cn(
                "text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border",
                beStatus === "DONE" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
              )}>
                {beStatus}
              </span>
            </div>

            <div className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
              API + Business Logic
            </div>

            <div className="space-y-1 pt-1 border-t border-[var(--bos-border-subtle)] text-[12px] font-mono text-[var(--bos-text-primary)]">
              <div>{beServices.length} service{beServices.length === 1 ? "" : "s"}</div>
              <div>{beApis.length} endpoint{beApis.length === 1 ? "" : "s"}</div>
              <div className="text-[var(--bos-text-secondary)]">Prisma ORM</div>
            </div>
          </div>

          {/* BLOCK 3: DATABASE */}
          <div
            onClick={() => setOpenSection("db")}
            className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-emerald-500/50 transition-all space-y-3 cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <h4 className="font-mono text-[12px] font-bold uppercase text-[var(--bos-text-primary)] group-hover:text-emerald-500 transition-colors">
                  DATABASE
                </h4>
              </div>
              <span className={cn(
                "text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border",
                dbStatus === "DONE" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              )}>
                {dbStatus}
              </span>
            </div>

            <div className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
              PostgreSQL / SQLite
            </div>

            <div className="space-y-1 pt-1 border-t border-[var(--bos-border-subtle)] text-[12px] font-mono text-[var(--bos-text-primary)]">
              <div>{dbEntities.length} entit{dbEntities.length === 1 ? "y" : "ies"}</div>
              <div className="text-[var(--bos-text-secondary)]">Relational Schema</div>
              <div className="text-[var(--bos-text-secondary)]">Indexed Keys</div>
            </div>
          </div>

          {/* BLOCK 4: API */}
          <div
            onClick={() => setOpenSection("api")}
            className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-amber-500/50 transition-all space-y-3 cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" />
                <h4 className="font-mono text-[12px] font-bold uppercase text-[var(--bos-text-primary)] group-hover:text-amber-500 transition-colors">
                  API
                </h4>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                {apisTotal} TOTAL
              </span>
            </div>

            <div className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
              {apisTotal} endpoints
            </div>

            <div className="space-y-1 pt-1 border-t border-[var(--bos-border-subtle)] text-[12px] font-mono text-[var(--bos-text-primary)]">
              <div className="text-emerald-600 font-semibold">Connected: {apisConnected}</div>
              <div className={apisMissing > 0 ? "text-amber-600 font-semibold" : "text-[var(--bos-text-secondary)]"}>
                Pending / Missing: {apisMissing}
              </div>
              <div className="text-[var(--bos-text-secondary)]">REST / JSON</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 02. CONNECTION VIEW (HOW IT CONNECTS) ─────────────────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--bos-accent)]">
            HOW IT CONNECTS
          </span>
          <p className="text-[12.5px] text-[var(--bos-text-secondary)] mt-0.5">
            Understand the complete execution flow from user interaction to database and automated verification.
          </p>
        </div>

        {/* Linear Interactive Pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-[var(--bos-surface-sunken)] rounded-xl border border-[var(--bos-border-subtle)] items-center">
          {[
            { id: "USER", label: "USER", icon: User, desc: "Client & Admin UI", section: "fe" },
            { id: "FRONTEND", label: "FRONTEND", icon: Globe, desc: `${fePagesCount} Pages / Views`, section: "fe" },
            { id: "API", label: "API", icon: Code2, desc: `${apisTotal} Endpoints`, section: "api" },
            { id: "BACKEND", label: "BACKEND", icon: Server, desc: `${beServices.length} Services`, section: "be" },
            { id: "DATABASE", label: "DATABASE", icon: Database, desc: `${dbEntities.length} Entities`, section: "db" },
            { id: "VERIFICATION", label: "VERIFICATION", icon: ShieldCheck, desc: `${testSpecs.length} Test Specs`, section: "tests" },
          ].map((step, idx, arr) => {
            const Icon = step.icon;
            const isSelected = activePipelineStep === step.id;
            return (
              <div key={step.id} className="relative flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setActivePipelineStep(step.id);
                    setOpenSection(step.section as any);
                  }}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-all cursor-pointer",
                    isSelected
                      ? "bg-[var(--bos-surface-panel)] border border-[var(--bos-accent)] shadow-sm"
                      : "hover:bg-[var(--bos-surface-panel)] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--bos-text-primary)]">
                    <Icon className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                    <span>{step.label}</span>
                  </div>
                  <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] block mt-0.5">
                    {step.desc}
                  </span>
                </button>

                {idx < arr.length - 1 && (
                  <span className="hidden lg:block absolute right-0 text-[var(--bos-text-tertiary)] font-bold text-xs pointer-events-none translate-x-1/2">
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 03. SPECIFICATION RECORDS (DRILL DOWN) ─────────────────── */}
      <section className="space-y-3">
        {/* Frontend Section */}
        {openSection === "fe" && (
          <div className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
              <h4 className="font-mono text-[13px] font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" />
                Frontend Capabilities ({feCapabilities.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {feCapabilities.map((f: any) => (
                <div
                  key={f.id}
                  onClick={() => onSelectNode?.({ type: "FE", id: f.id, name: f.name })}
                  className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] hover:border-sky-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 font-bold">
                      {f.type || "PAGE"}
                    </span>
                    <span className="font-mono text-[10.5px] text-emerald-600 font-semibold">{f.status}</span>
                  </div>
                  <h5 className="text-[13px] font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-sky-500 transition-colors">
                    {f.name}
                  </h5>
                  {f.description && <p className="text-[11.5px] text-[var(--bos-text-secondary)] mt-0.5">{f.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backend Section */}
        {openSection === "be" && (
          <div className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
              <h4 className="font-mono text-[13px] font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                Backend Domain Services ({beServices.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {beServices.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => onSelectNode?.({ type: "BE", id: s.id, name: s.name })}
                  className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] hover:border-indigo-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold">
                      SERVICE
                    </span>
                    <span className="font-mono text-[10.5px] text-emerald-600 font-semibold">{s.status}</span>
                  </div>
                  <h5 className="text-[13px] font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-indigo-500 transition-colors">
                    {s.name}
                  </h5>
                  {s.description && <p className="text-[11.5px] text-[var(--bos-text-secondary)] mt-0.5">{s.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Section */}
        {openSection === "db" && (
          <div className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
              <h4 className="font-mono text-[13px] font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                Database Entities &amp; Tables ({dbEntities.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dbEntities.map((e: any) => (
                <div
                  key={e.id}
                  onClick={() => onSelectNode?.({ type: "DB", id: e.id, name: e.name })}
                  className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] hover:border-emerald-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                      TABLE
                    </span>
                    <span className="font-mono text-[10.5px] text-emerald-600 font-semibold">{e.status}</span>
                  </div>
                  <h5 className="text-[13px] font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-emerald-500 transition-colors font-mono">
                    {e.tableName || e.name}
                  </h5>
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)] mt-0.5">{e.purpose || e.description || "Database table model"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Section */}
        {openSection === "api" && (
          <div className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
              <h4 className="font-mono text-[13px] font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" />
                HTTP API Endpoints ({beApis.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {beApis.map((api: any) => (
                <div
                  key={api.id}
                  onClick={() => onSelectNode?.({ type: "API", id: api.id, name: `${api.method} ${api.path}` })}
                  className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] hover:border-amber-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                      {api.method}
                    </span>
                    <span className="font-mono text-[10.5px] text-emerald-600 font-semibold">{api.status}</span>
                  </div>
                  <h5 className="text-[12.5px] font-mono font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-amber-500 transition-colors">
                    {api.path}
                  </h5>
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)] mt-0.5">{api.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testing Section */}
        {openSection === "tests" && (
          <div className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
              <h4 className="font-mono text-[13px] font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                Automated Test &amp; Verification Specifications ({testSpecs.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {testSpecs.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 font-bold">
                      {t.testType || "SPEC"}
                    </span>
                    <span className="font-mono text-[10.5px] text-teal-600 font-semibold">{t.status}</span>
                  </div>
                  <h5 className="text-[13px] font-bold text-[var(--bos-text-primary)] mt-1">{t.name}</h5>
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)]">{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
