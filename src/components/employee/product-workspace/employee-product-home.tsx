"use client";

import {
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Server,
  Sparkles,
  Layers,
  Shield,
  FolderKanban,
  FileCode,
  Flame,
  Check,
  AlertTriangle,
  Radio,
  ExternalLink,
  Users,
  ChevronRight,
  Database,
  Code2,
  Eye,
  GitPullRequest,
  CheckSquare,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ProductHomeProps {
  data: any;
  onNavigateToBuild: () => void;
  onOpenProductMap: () => void;
  onOpenFeature: (featureName: string) => void;
}

export function EmployeeProductHomeView({
  data,
  onNavigateToBuild,
  onOpenProductMap,
  onOpenFeature,
}: ProductHomeProps) {
  const [activeWorkTab, setActiveWorkTab] = useState<"ALL" | "CURRENT" | "NEXT" | "WAITING" | "IN_REVIEW" | "COMPLETED">("ALL");

  if (!data) return null;

  const {
    employee,
    project,
    yourResponsibility,
    whatAreWeBuilding,
    whatAreYouBuilding,
    yourProductAreas = [],
    currentFocus,
    nextWork,
    dependencies,
    myWork,
    teamConnections,
    myImpact,
    projectMemory,
    myChanges = [],
  } = data;

  const requiresDeps = dependencies?.requires || [];
  const enablesDeps = dependencies?.enables || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200 font-sans pb-16">
      
      {/* ── 01. TOP BANNER: IDENTITY, ROLE & PROJECT ─────────────────── */}
      <section className="relative overflow-hidden p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-gradient-to-b from-[var(--bos-surface-panel)] to-[var(--bos-surface)] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] border border-[var(--bos-accent)]/20 font-mono text-[10px] font-bold uppercase tracking-wider">
                ACTIVE PORTAL
              </span>
              <span className="font-mono text-xs text-[var(--bos-text-tertiary)]">•</span>
              <span className="font-mono text-xs text-[var(--bos-text-secondary)]">{project.code}</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--bos-text-primary)] tracking-tight">
              {employee.name.toUpperCase()}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                {employee.role}
              </span>
              <span className="text-[var(--bos-text-tertiary)]">•</span>
              <span className="text-sm font-semibold text-[var(--bos-text-primary)]">
                {project.name}
              </span>
            </div>
          </div>

          {/* Build Streak Pill */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-5 h-5 fill-current animate-pulse" />
              <span className="font-extrabold font-mono text-base sm:text-lg tracking-tight">
                {myImpact?.buildStreakDays || 1} BUILD DAYS
              </span>
            </div>
            <span className="font-mono text-[10px] text-amber-300/80 uppercase">
              Verified Progress Streak
            </span>
          </div>
        </div>
      </section>

      {/* ── 02. YOUR RESPONSIBILITY ──────────────────────────────────── */}
      <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            YOUR RESPONSIBILITY
          </span>
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase">
            {yourResponsibility?.workstream || employee.workstream}
          </span>
        </div>
        <p className="text-sm text-[var(--bos-text-secondary)] leading-relaxed">
          {yourResponsibility?.description || `You own the ${employee.workstream} workstream and implementation for this project.`}
        </p>
      </section>

      {/* ── 03. WHAT ARE WE BUILDING & WHAT ARE YOU BUILDING ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* WHAT ARE WE BUILDING */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
            WHAT ARE WE BUILDING?
          </span>
          <p className="text-xs sm:text-sm text-[var(--bos-text-secondary)] leading-relaxed">
            {whatAreWeBuilding}
          </p>
        </section>

        {/* WHAT ARE YOU BUILDING */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
            WHAT ARE YOU BUILDING?
          </span>
          <p className="text-xs sm:text-sm text-[var(--bos-text-secondary)] leading-relaxed">
            {whatAreYouBuilding}
          </p>
        </section>
      </div>

      {/* ── 04. YOUR PRODUCT AREAS ───────────────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              EXECUTION ROADMAP
            </span>
            <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
              YOUR PRODUCT AREAS
            </h2>
          </div>
          <button
            onClick={onOpenProductMap}
            className="text-xs font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <span>View Full Product Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Indicators List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {yourProductAreas.map((area: any, idx: number) => {
            const isCompleted = area.status === "COMPLETED";
            const isCurrent = area.status === "CURRENT" || area.name === currentFocus?.productAreaName;
            const isInReview = area.status === "IN_REVIEW";
            const isChanges = area.status === "CHANGES_REQUESTED";
            const isWaiting = area.status === "WAITING";

            return (
              <div
                key={area.id || idx}
                onClick={() => onOpenFeature(area.name)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3",
                  isCurrent
                    ? "bg-[var(--bos-accent)]/10 border-[var(--bos-accent)] shadow-md ring-1 ring-[var(--bos-accent)]/30"
                    : isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50"
                    : isInReview
                    ? "bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50"
                    : isChanges
                    ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                    : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] opacity-80 hover:opacity-100 hover:border-[var(--bos-border-hover)]"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--bos-text-tertiary)]">
                      0{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-[var(--bos-text-primary)]">
                      {area.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-1">
                    {area.purpose}
                  </p>
                </div>

                <div className="shrink-0 pt-0.5">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                      ✓ Done
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bos-accent)] text-white text-[10px] font-mono font-bold shadow-xs">
                      ● Current
                    </span>
                  )}
                  {isInReview && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-bold">
                      🔍 In Review
                    </span>
                  )}
                  {isChanges && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold">
                      ⚠️ Changes
                    </span>
                  )}
                  {isWaiting && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold">
                      ⏳ Waiting
                    </span>
                  )}
                  {!isCompleted && !isCurrent && !isInReview && !isChanges && !isWaiting && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)] border border-[var(--bos-border)] text-[10px] font-mono">
                      ○ Planned
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 05. CURRENT FOCUS: FOCUSED WORK CARD ─────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border-2 border-[var(--bos-accent)] bg-gradient-to-b from-[var(--bos-accent)]/10 via-[var(--bos-surface-panel)] to-[var(--bos-surface)] shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
              CURRENT FOCUS
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Status: {currentFocus?.status || "BUILDING"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[var(--bos-text-secondary)]">
            <Clock className="w-3.5 h-3.5" />
            <span>Step: {currentFocus?.currentStep || "BUILD_UI"}</span>
          </div>
        </div>

        {/* Feature Title & Rationale */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--bos-text-primary)] tracking-tight">
            {currentFocus?.productAreaName}
          </h2>
          <div className="p-4 rounded-2xl bg-[var(--bos-surface)]/80 border border-[var(--bos-border)] space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
              WHY THIS EXISTS (REQUIREMENT)
            </span>
            <p className="text-xs sm:text-sm text-[var(--bos-text-secondary)] leading-relaxed">
              {currentFocus?.why}
            </p>
          </div>
        </div>

        {/* What you are building & Expected experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 block">
              WHAT YOU ARE BUILDING
            </span>
            <p className="text-[var(--bos-text-secondary)] leading-relaxed">
              {currentFocus?.whatYouAreBuilding}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
              USER EXPERIENCE
            </span>
            <p className="text-[var(--bos-text-secondary)] leading-relaxed">
              {currentFocus?.userExperience}
            </p>
          </div>
        </div>

        {/* Connected To: Real Contracts */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2 text-xs">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
            CONNECTED TO
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
              <span className="text-[var(--bos-text-tertiary)] block text-[9px]">API CONTRACT</span>
              <span className="font-bold text-[var(--bos-text-primary)]">{currentFocus?.connectedTo?.api}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
              <span className="text-[var(--bos-text-tertiary)] block text-[9px]">BACKEND SERVICE</span>
              <span className="font-bold text-[var(--bos-text-primary)]">{currentFocus?.connectedTo?.backend}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
              <span className="text-[var(--bos-text-tertiary)] block text-[9px]">DATABASE SCHEMA</span>
              <span className="font-bold text-[var(--bos-text-primary)]">{currentFocus?.connectedTo?.database}</span>
            </div>
          </div>
        </div>

        {/* Changes requested banner if any */}
        {currentFocus?.reviewFeedback && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs text-amber-300">
            <div className="flex items-center gap-2 font-bold font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>CHANGES REQUESTED BY {currentFocus.reviewFeedback.reviewerName || "ADMIN"}</span>
            </div>
            <p className="text-amber-200/90 leading-relaxed pl-6">
              {currentFocus.reviewFeedback.issue || currentFocus.reviewFeedback.comment}
            </p>
            {currentFocus.reviewFeedback.requiredChange && (
              <p className="font-semibold text-amber-100 pl-6 pt-1">
                Required Change: {currentFocus.reviewFeedback.requiredChange}
              </p>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onNavigateToBuild}
            className="px-6 py-3.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-[var(--bos-accent)]/30 flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>CONTINUE BUILD</span>
          </button>

          <button
            onClick={() => onOpenFeature(currentFocus?.productAreaName)}
            className="px-4 py-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-xs font-mono rounded-xl transition-colors cursor-pointer"
          >
            View Specs & Done Criteria
          </button>
        </div>
      </section>

      {/* ── 06. NEXT WORK AUTOMATION ─────────────────────────────────── */}
      <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
            NEXT WORK (AUTOMATICALLY DETERMINED)
          </span>
          <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">
            Sequential Handoff
          </span>
        </div>
        <h3 className="text-base font-bold text-[var(--bos-text-primary)]">
          {nextWork?.name}
        </h3>
        <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
          {nextWork?.reason}
        </p>
      </section>

      {/* ── 07. DEPENDENCIES & WHO IS WAITING FOR ME ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* REQUIRES (DEPENDENCIES) */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            YOU DEPEND ON (REQUIRES)
          </span>

          <div className="space-y-2.5">
            {requiresDeps.map((dep: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-bold text-[var(--bos-text-primary)]">
                    {dep.name}
                  </h4>
                  <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                    Owner: {dep.ownerRole} ({dep.ownerName || "Engineering Team"})
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
                  {dep.status || "READY"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ENABLES (WHO IS WAITING FOR ME) */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            WHO IS WAITING FOR ME? (ENABLES)
          </span>

          <div className="space-y-2.5">
            {enablesDeps.map((en: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--bos-text-primary)]">
                    {en.neededByRole}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                    en.status === "UNBLOCKED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  )}>
                    {en.status === "UNBLOCKED" ? "UNBLOCKED" : "WAITING FOR APPROVAL"}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--bos-text-secondary)] leading-relaxed">
                  {en.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── 08. MY WORK: STRUCTURED PRODUCT PHASES ───────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 block">
              WORK HUB
            </span>
            <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
              MY WORK
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-[var(--bos-surface-panel)] p-1 rounded-xl border border-[var(--bos-border)] font-mono text-xs">
            {(["ALL", "CURRENT", "NEXT", "WAITING", "IN_REVIEW", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveWorkTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all cursor-pointer font-medium text-[11px]",
                  activeWorkTab === tab
                    ? "bg-[var(--bos-accent)] text-white font-bold"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                )}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Display filtered work items */}
        <div className="space-y-3">
          {/* CURRENT */}
          {(activeWorkTab === "ALL" || activeWorkTab === "CURRENT") && myWork?.current && (
            <div className="p-4 rounded-2xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-[var(--bos-accent)] text-white font-mono text-[9px] font-bold uppercase">
                  CURRENT
                </span>
                <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">
                  {myWork.current.name}
                </h4>
                <p className="text-[var(--bos-text-secondary)] text-[11px]">
                  {myWork.current.purpose}
                </p>
              </div>
              <button
                onClick={onNavigateToBuild}
                className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white font-mono font-bold text-xs cursor-pointer shrink-0"
              >
                {myWork.current.actionLabel || "Continue Build"}
              </button>
            </div>
          )}

          {/* NEXT */}
          {(activeWorkTab === "ALL" || activeWorkTab === "NEXT") && myWork?.next && (
            <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[9px] font-bold uppercase">
                  NEXT
                </span>
                <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">
                  {myWork.next.name}
                </h4>
                <p className="text-[var(--bos-text-secondary)] text-[11px]">
                  {myWork.next.purpose}
                </p>
              </div>
              <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)]">
                Unlocks on Current Approval
              </span>
            </div>
          )}

          {/* IN REVIEW */}
          {(activeWorkTab === "ALL" || activeWorkTab === "IN_REVIEW") &&
            myWork?.inReview?.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-[9px] font-bold uppercase">
                    IN REVIEW
                  </span>
                  <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">
                    {item.name}
                  </h4>
                  <p className="text-[var(--bos-text-secondary)] text-[11px]">
                    Proof attached ({item.proofCount} records). Pending Admin approval.
                  </p>
                </div>
                <span className="font-mono text-[10.5px] text-purple-400">
                  Verification Active
                </span>
              </div>
            ))}

          {/* COMPLETED */}
          {(activeWorkTab === "ALL" || activeWorkTab === "COMPLETED") &&
            myWork?.completed?.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-bold uppercase">
                    ✓ COMPLETED & APPROVED
                  </span>
                  <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">
                    {item.name}
                  </h4>
                  <p className="text-[var(--bos-text-secondary)] text-[11px]">
                    Verified against requirements.
                  </p>
                </div>
                <span className="font-mono text-[10.5px] text-emerald-400 font-bold">
                  Verified
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* ── 09. TEAM CONNECTIONS ─────────────────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
          TEAM ARCHITECTURE
        </span>
        <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
          YOUR TEAM CONNECTIONS
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {teamConnections?.members?.map((m: any, idx: number) => (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-2xl border text-xs space-y-1.5",
                m.isYou
                  ? "bg-[var(--bos-accent)]/10 border-[var(--bos-accent)]/40 ring-1 ring-[var(--bos-accent)]/30"
                  : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)]"
              )}
            >
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-secondary)] block">
                {m.workstream}
              </span>
              <h4 className="font-bold text-[var(--bos-text-primary)]">
                {m.employeeName}
              </h4>
              <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                {m.role}
              </p>
            </div>
          ))}
        </div>

        {/* Relationship Summary Path */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--bos-text-secondary)]">
          {teamConnections?.relationshipSummary?.map((rel: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="font-bold text-[var(--bos-text-primary)]">{rel.from}</span>
              <span className="text-purple-400">→</span>
              <span className="text-[10.5px] text-[var(--bos-text-tertiary)]">({rel.label})</span>
              <span className="text-purple-400">→</span>
              <span className="font-bold text-[var(--bos-text-primary)]">{rel.to}</span>
              {idx < (teamConnections?.relationshipSummary?.length || 0) - 1 && (
                <span className="text-[var(--bos-text-tertiary)]">|</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 10. PROJECT MEMORY & RECENT CHANGES ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* WHERE DID I STOP? */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            PROJECT MEMORY (WHERE DID I STOP?)
          </span>
          <p className="text-xs sm:text-sm text-[var(--bos-text-secondary)] leading-relaxed pt-1">
            {projectMemory?.whereDidIStop}
          </p>
        </section>

        {/* CHANGES AFFECTING MY WORK */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
            CHANGES AFFECTING MY WORK
          </span>
          <div className="space-y-2">
            {myChanges.map((ch: any, idx: number) => (
              <div key={idx} className="p-3 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs space-y-0.5">
                <h4 className="font-bold text-[var(--bos-text-primary)]">{ch.title}</h4>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">{ch.whatChanged}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
}
