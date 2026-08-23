"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Server,
  Globe,
  Database,
  Shield,
  Zap,
  ExternalLink,
  Code2,
  AlertCircle,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectOverviewBlueprintProps = {
  project: any;
  blueprint: any;
  metrics: {
    progress: number;
    completedTasks: number;
    totalTasks: number;
    acceptedDeliverables: number;
    totalDeliverables: number;
    currentMilestone: any | null;
    nextBestAction: any;
  };
  onSelectFeature?: (feature: any) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenRequirementDrawer?: () => void;
};

export function ProjectOverviewBlueprint({
  project,
  blueprint,
  metrics,
  onSelectFeature,
  onNavigateTab,
  onOpenRequirementDrawer,
}: ProjectOverviewBlueprintProps) {
  // Extract real approved scope items from proposal/requirement
  const scopeSnapshot = (() => {
    if (project.scopeSnapshot) {
      try {
        const parsed = JSON.parse(project.scopeSnapshot);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  })();

  // Core features derived strictly from proposal/requirement/deliverables
  const coreFeatures: Array<{
    featureId: string;
    name: string;
    description: string;
    sourceRequirementId: string;
    sourceProposalSection: string;
    status: string;
    acceptanceCriteria: string[];
  }> = [];

  if (blueprint?.rawAnalysis) {
    try {
      const raw = typeof blueprint.rawAnalysis === "string" ? JSON.parse(blueprint.rawAnalysis) : blueprint.rawAnalysis;
      if (raw?.requirements && Array.isArray(raw.requirements)) {
        raw.requirements.forEach((r: any, idx: number) => {
          coreFeatures.push({
            featureId: r.id || `FEAT-${String(idx + 1).padStart(3, "0")}`,
            name: r.title || "Approved Feature",
            description: r.description || "Derived from approved client requirement",
            sourceRequirementId: r.id || project.requirementRequestId || "REQ-APPROVED",
            sourceProposalSection: r.sourceSection || "Scope & Specifications",
            status: "APPROVED",
            acceptanceCriteria: (r.acceptanceCriteria || []).map((ac: any) =>
              typeof ac === "string" ? ac : ac.criterion || "Verified functionality"
            ),
          });
        });
      }
    } catch {}
  }

  // Fallback to scope snapshot if rawAnalysis didn't yield features
  if (coreFeatures.length === 0 && scopeSnapshot.length > 0) {
    scopeSnapshot.forEach((s: any, idx: number) => {
      coreFeatures.push({
        featureId: s.id || `FEAT-${String(idx + 1).padStart(3, "0")}`,
        name: s.title,
        description: s.detail || "Approved scope capability",
        sourceRequirementId: project.requirementRequestId ? `REQ-${project.requirementRequestId.slice(-4)}` : "REQ-APPROVED",
        sourceProposalSection: s.sourceSection || "Approved Proposal Scope",
        status: "APPROVED",
        acceptanceCriteria: s.acceptanceCriteria || [],
      });
    });
  }

  // Fallback to deliverables if still empty
  if (coreFeatures.length === 0 && (project.deliverables || []).length > 0) {
    project.deliverables.forEach((d: any, idx: number) => {
      let acs: string[] = [];
      try {
        if (d.acceptanceCriteria) acs = JSON.parse(d.acceptanceCriteria);
      } catch {}
      coreFeatures.push({
        featureId: `FEAT-${String(idx + 1).padStart(3, "0")}`,
        name: d.title,
        description: d.description || "Contracted project deliverable",
        sourceRequirementId: project.requirementRequestId ? "REQ-LOCKED" : "REQ-APPROVED",
        sourceProposalSection: "Proposal Deliverables",
        status: d.status === "ACCEPTED" ? "COMPLETED" : "APPROVED",
        acceptanceCriteria: acs,
      });
    });
  }

  // Project purpose strictly extracted from approved project/proposal
  const projectPurpose =
    project.description ||
    (project.proposal?.document
      ? (() => {
          try {
            const pDoc = JSON.parse(project.proposal.document);
            const execSec = (pDoc.sections || []).find(
              (s: any) =>
                s.title?.toLowerCase().includes("executive") ||
                s.title?.toLowerCase().includes("purpose") ||
                s.title?.toLowerCase().includes("objective")
            );
            if (execSec && execSec.blocks) {
              const textBlock = execSec.blocks.find((b: any) => b.type === "paragraph" || b.type === "rich_text");
              if (textBlock?.content) return textBlock.content;
            }
          } catch {}
          return null;
        })()
      : null) ||
    "Approved engineering project for client delivery.";

  // Calculate real technical metrics
  const feCount = blueprint?.frontendCapabilities?.length || 0;
  const beCount = blueprint?.backendApis?.length || 0;
  const dbCount = blueprint?.databaseEntities?.length || 0;
  const testCount = blueprint?.testSpecifications?.length || 0;
  const intCount = blueprint?.integrations?.length || 0;

  return (
    <div className="space-y-6">
      {/* ── 1. WHAT ARE WE BUILDING? (Executive Purpose Banner) ────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-[var(--bos-border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--bos-accent)] font-bold">
                WHAT ARE WE BUILDING?
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · Single Source of Truth
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)]">
              {project.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[12px] font-mono">
            <span className="px-2.5 py-1 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]">
              Client: <strong className="text-[var(--bos-text-primary)]">{project.client?.companyName}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]">
              Proposal: <strong className="text-[var(--bos-text-primary)]">{project.proposal?.reference || "PROP-APPROVED"}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]">
              Req: <strong className="text-[var(--bos-text-primary)]">{project.requirementRequestId ? "REQ-LOCKED" : "REQ-APPROVED"}</strong>
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] uppercase font-semibold block">
            PROJECT PURPOSE
          </span>
          <p className="text-[14px] text-[var(--bos-text-secondary)] leading-relaxed bg-[var(--bos-surface-sunken)]/60 p-4 rounded-xl border border-[var(--bos-border-subtle)]">
            {projectPurpose}
          </p>
        </div>
      </section>

      {/* ── 2. CORE APPROVED FEATURES (Scope Inventory) ────────────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--bos-accent)] font-bold">
              APPROVED SCOPE
            </span>
            <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Core Features ({coreFeatures.length})
            </h3>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
              Approved functionality derived directly from client requirements and proposal specifications.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenRequirementDrawer?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12px] font-mono text-[var(--bos-text-primary)] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
            <span>Open Source Requirement</span>
            <ExternalLink className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
          </button>
        </div>

        {coreFeatures.length === 0 ? (
          <div className="p-6 text-center bg-[var(--bos-surface-sunken)] rounded-xl border border-[var(--bos-border-subtle)] text-[13px] text-[var(--bos-text-secondary)]">
            Not specified in approved requirements
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {coreFeatures.map((feat) => (
              <div
                key={feat.featureId}
                onClick={() => onSelectFeature?.(feat)}
                className="p-4 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)]/50 rounded-xl transition-all space-y-2 cursor-pointer group shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[11px] font-bold">
                      ✓
                    </span>
                    <h4 className="text-[13.5px] font-bold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors">
                      {feat.name}
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                    {feat.status}
                  </span>
                </div>

                <p className="text-[12px] text-[var(--bos-text-secondary)] line-clamp-2 leading-relaxed">
                  {feat.description}
                </p>

                <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                  <span>Source: <strong className="text-[var(--bos-text-secondary)]">{feat.sourceRequirementId}</strong></span>
                  <span>Section: <strong className="text-[var(--bos-text-secondary)]">{feat.sourceProposalSection}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 3. ENGINEERING ARCHITECTURE BREAKDOWN ─────────────────── */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--bos-accent)] font-bold">
              ENGINEERING ARCHITECTURE
            </span>
            <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Technical Execution Breakdown
            </h3>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
              Architecture layers synthesized automatically from the approved scope.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Frontend */}
          <button
            type="button"
            onClick={() => onNavigateTab?.("frontend")}
            className="p-3.5 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] hover:border-sky-500/50 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <Globe className="w-4 h-4 text-sky-500" />
              <span className="text-[11px] font-mono font-bold text-sky-500">{feCount}</span>
            </div>
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)] group-hover:text-sky-500 transition-colors">
              Frontend
            </h4>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] block">
              Pages & Screens
            </span>
          </button>

          {/* Backend */}
          <button
            type="button"
            onClick={() => onNavigateTab?.("backend")}
            className="p-3.5 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] hover:border-indigo-500/50 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <Server className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px] font-mono font-bold text-indigo-500">{blueprint?.backendServices?.length || 0}</span>
            </div>
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)] group-hover:text-indigo-500 transition-colors">
              Backend
            </h4>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] block">
              Domain Services
            </span>
          </button>

          {/* Database */}
          <button
            type="button"
            onClick={() => onNavigateTab?.("database")}
            className="p-3.5 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] hover:border-emerald-500/50 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <Database className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-mono font-bold text-emerald-500">{dbCount}</span>
            </div>
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)] group-hover:text-emerald-500 transition-colors">
              Database
            </h4>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] block">
              Tables & Models
            </span>
          </button>

          {/* APIs */}
          <button
            type="button"
            onClick={() => onNavigateTab?.("apis")}
            className="p-3.5 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] hover:border-amber-500/50 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <Code2 className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-mono font-bold text-amber-500">{beCount}</span>
            </div>
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)] group-hover:text-amber-500 transition-colors">
              APIs
            </h4>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] block">
              HTTP Endpoints
            </span>
          </button>

          {/* Integrations */}
          <button
            type="button"
            onClick={() => onNavigateTab?.("integrations")}
            className="p-3.5 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] hover:border-purple-500/50 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <GitBranch className="w-4 h-4 text-purple-500" />
              <span className="text-[11px] font-mono font-bold text-purple-500">{intCount}</span>
            </div>
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)] group-hover:text-purple-500 transition-colors">
              Integrations
            </h4>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] block">
              External Gateways
            </span>
          </button>

          {/* Testing */}
          <button
            type="button"
            onClick={() => onNavigateTab?.("testing")}
            className="p-3.5 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] hover:border-teal-500/50 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              <span className="text-[11px] font-mono font-bold text-teal-500">{testCount}</span>
            </div>
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)] group-hover:text-teal-500 transition-colors">
              Testing
            </h4>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] block">
              Specs & UAT
            </span>
          </button>
        </div>
      </section>

      {/* ── 4. PROGRESS & WHAT NEEDS TO HAPPEN NEXT ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real Progress */}
        <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--bos-accent)] font-bold">
              DELIVERY PROGRESS
            </span>
            <span className="text-[13px] font-mono font-bold text-[var(--bos-accent)]">
              {metrics.progress}%
            </span>
          </div>

          <div className="w-full bg-[var(--bos-surface-sunken)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--bos-accent)] h-full transition-all duration-300 rounded-full"
              style={{ width: `${metrics.progress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-[12px] font-mono">
            <div className="p-3 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
              <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">TASKS COMPLETED</span>
              <strong className="text-[14px] text-[var(--bos-text-primary)]">
                {metrics.completedTasks} / {metrics.totalTasks}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
              <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">DELIVERABLES ACCEPTED</span>
              <strong className="text-[14px] text-[var(--bos-text-primary)]">
                {metrics.acceptedDeliverables} / {metrics.totalDeliverables}
              </strong>
            </div>
          </div>
        </section>

        {/* What Needs To Happen Next */}
        <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--bos-accent)]" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--bos-accent)] font-bold">
              WHAT NEEDS TO HAPPEN NEXT
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
              {metrics.nextBestAction?.title || "Execute Next Milestone Tasks"}
            </h4>
            <p className="text-[12.5px] text-[var(--bos-text-secondary)] leading-relaxed">
              {metrics.nextBestAction?.description || "Continue implementation of active tasks in the current development phase gate."}
            </p>
          </div>

          {metrics.currentMilestone && (
            <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-between text-[11.5px] font-mono">
              <span className="text-[var(--bos-text-secondary)]">
                Active Milestone: <strong className="text-[var(--bos-text-primary)]">{metrics.currentMilestone.title}</strong>
              </span>
              <span className="text-[var(--bos-accent)] font-semibold">{metrics.currentMilestone.status}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
