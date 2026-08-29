"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  FolderGit2,
  Layers,
  ListTodo,
  Loader2,
  Lock,
  LogOut,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Unlock,
  User,
  Users,
  X,
  Zap,
  Globe,
  Database,
  Server,
  Code2,
  FileCode,
  Compass,
  Link2,
  TrendingUp,
  Cpu,
  Eye,
} from "lucide-react";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { cn } from "@/lib/utils";
import {
  EmployeeProjectBriefData,
  VisualPageSpec,
} from "@/lib/employees/employee-project-brief.service";
import { FeatureDetailDrawer } from "./feature-detail-drawer";
import { EmployeeBuildModeModal } from "./employee-build-mode-modal";

interface EmployeeProjectHomeProps {
  initialProjectId?: string | null;
  previewEmployeeId?: string | null;
  onLogout?: () => void;
}

export function EmployeeProjectHome({
  initialProjectId,
  previewEmployeeId,
  onLogout,
}: EmployeeProjectHomeProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [briefData, setBriefData] = useState<EmployeeProjectBriefData | null>(null);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [error, setError] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedFeature, setSelectedFeature] = useState<VisualPageSpec | null>(null);
  const [isBuildModeOpen, setIsBuildModeOpen] = useState(false);
  const [buildModeCapabilityId, setBuildModeCapabilityId] = useState<string | null>(null);
  const [selectedConnectionNode, setSelectedConnectionNode] = useState<any | null>(null);

  // Filter Tasks Tab in Section 9
  const [taskFilter, setTaskFilter] = useState<"ALL" | "TODO" | "IN_PROGRESS" | "COMPLETED">("ALL");

  const loadBrief = useCallback(async (projId?: string | null, forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const targetId = projId || selectedProjectId || "";
      const url = `/api/employee/project-brief?${targetId ? `projectId=${targetId}` : ""}${previewEmployeeId ? `&previewEmployeeId=${previewEmployeeId}` : ""}`;

      if (forceRefresh && targetId && briefData?.employeeId) {
        const res = await fetch("/api/employee/project-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: targetId,
            employeeId: briefData.employeeId,
            forceRefresh: true,
          }),
        });
        const json = await res.json();
        if (json.ok) {
          setBriefData(json.brief);
        }
      } else {
        const res = await fetch(url);
        const json = await res.json();
        if (json.ok) {
          setBriefData(json.brief);
          setAvailableProjects(json.availableProjects || []);
          if (!selectedProjectId && json.brief?.projectId) {
            setSelectedProjectId(json.brief.projectId);
          }
        } else {
          setError(json.message || "Failed to load project brief.");
        }
      }
    } catch (err: any) {
      setError("Business OS could not connect to project data. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedProjectId, previewEmployeeId, briefData?.employeeId]);

  useEffect(() => {
    loadBrief(selectedProjectId);
  }, [selectedProjectId]);

  const handleProjectSwitch = (pId: string) => {
    setSelectedProjectId(pId);
    loadBrief(pId);
  };

  const handleOpenBuildMode = (capabilityId?: string) => {
    if (capabilityId) setBuildModeCapabilityId(capabilityId);
    setIsBuildModeOpen(true);
  };

  if (loading && !briefData) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col items-center justify-center p-6 gap-3 font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <p className="text-xs text-[var(--bos-text-secondary)] tracking-wider uppercase">
          SYNCHRONIZING PRODUCT CONTROL CENTER...
        </p>
      </div>
    );
  }

  if (error || !briefData) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl text-center space-y-4 shadow-xl">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">Project Workspace Unavailable</h2>
          <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">{error}</p>
          <div className="pt-2 flex justify-center gap-2 font-mono text-xs">
            <button
              onClick={() => loadBrief(selectedProjectId, true)}
              className="px-4 py-2 bg-[var(--bos-accent)] text-white font-semibold uppercase rounded-xl cursor-pointer"
            >
              Retry
            </button>
            <a
              href="/auth/employee/login"
              className="px-4 py-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] font-semibold uppercase rounded-xl"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  const {
    projectName,
    projectCode,
    projectStage,
    projectHealth,
    projectProgress,
    clientName,
    projectRole,
    responsibility,
    workstream,
    summaryWhat,
    summaryWho,
    summaryEnables,
    userPersonas,
    productMap,
    userJourneys,
    roleOwnership,
    architectureConnections,
    startHere,
    yourWork,
    acceptanceCriteria,
    isOutdated,
    outdatedReason,
    audit,
  } = briefData;

  // Filter tasks based on status
  const filteredTasks = yourWork.filter((t) => {
    if (taskFilter === "ALL") return true;
    if (taskFilter === "TODO") return t.status === "TODO" || t.status === "READY" || t.status === "BACKLOG";
    if (taskFilter === "IN_PROGRESS") return t.status === "IN_PROGRESS" || t.status === "IN_REVIEW";
    if (taskFilter === "COMPLETED") return t.status === "DONE" || t.status === "COMPLETED";
    return true;
  });

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* ── TOP APPLICATION HEADER ───────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/90 backdrop-blur-md px-4 sm:px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            ⬡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
                PRODUCT CONTROL CENTER
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)]">
                LIVE
              </span>
            </div>
            <span className="text-[11px] text-[var(--bos-text-secondary)]">
              {clientName} • {briefData.employeeName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Switcher */}
          {availableProjects.length > 1 && (
            <select
              value={selectedProjectId || ""}
              onChange={(e) => handleProjectSwitch(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] text-xs font-mono text-[var(--bos-text-primary)] cursor-pointer outline-none"
            >
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.code ? `(${p.code})` : ""}
                </option>
              ))}
            </select>
          )}

          {/* Start Building Quick Action */}
          <button
            onClick={() => handleOpenBuildMode()}
            className="px-4 py-2 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Start Building</span>
          </button>

          {/* Sync Brief Action */}
          <button
            onClick={() => loadBrief(selectedProjectId, true)}
            disabled={refreshing}
            className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
            title="Synchronize Project Brief"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-[var(--bos-accent)]")} />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-rose-500 hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ───────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-10">

        {/* ── LIVE SYNC ALERT BANNER (IF PROJECT UPDATED) ─────────────── */}
        {isOutdated && (
          <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider font-mono">PROJECT CHANGE DETECTED</p>
                <p className="text-xs text-amber-200/90">{outdatedReason || "Underlying requirements, APIs, or database entities were updated."}</p>
              </div>
            </div>
            <button
              onClick={() => loadBrief(selectedProjectId, true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold uppercase rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              Update Brief
            </button>
          </div>
        )}

        {/* ── 1. FIRST SCREEN: YOUR PROJECT & ROLE ─────────────────────── */}
        <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--bos-accent)]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Label */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)] block">
              YOUR PROJECT
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                {projectStage} • {projectHealth}
              </span>
              <span className="text-[var(--bos-text-tertiary)]">
                {projectProgress}% Complete
              </span>
            </div>
          </div>

          {/* Project Title & Client */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--bos-text-primary)]">
              {projectName}
            </h1>
            {projectCode && (
              <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">
                Code: {projectCode} • Client: {clientName}
              </span>
            )}
          </div>

          {/* Role & Responsibility Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--bos-border)]">
            <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                YOUR ROLE
              </span>
              <p className="text-base sm:text-lg font-bold text-[var(--bos-text-primary)] mt-0.5">
                {projectRole.toUpperCase()}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] block">
                YOUR RESPONSIBILITY
              </span>
              <p className="text-base sm:text-lg font-bold text-[var(--bos-accent)] mt-0.5">
                {responsibility.toUpperCase()}
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. WHAT ARE WE BUILDING? (OLLAMA REAL EXPLANATION) ───────── */}
        <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)]">
            <Sparkles className="w-4 h-4" />
            <span>1. WHAT ARE WE BUILDING?</span>
          </div>
          <p className="text-base sm:text-lg text-[var(--bos-text-primary)] leading-relaxed font-medium">
            {summaryWhat}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--bos-border)]">
            {/* 3. WHO USES IT? */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                <Users className="w-3.5 h-3.5" />
                <span>2. WHO USES IT?</span>
              </div>
              <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                {summaryWho}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {userPersonas.map((p, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-primary)] border border-[var(--bos-border)]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* 4. WHAT DOES IT DO? */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                <span>3. WHAT DOES IT DO?</span>
              </div>
              <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                {summaryEnables}
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. "SEE THE PRODUCT" (VISUAL PRODUCT MAP) ────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                4. SEE THE PRODUCT (PRODUCT MAP)
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                Visual representations for every approved page in {projectName}.
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">
              {productMap.length} Pages Specified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productMap.map((page) => (
              <div
                key={page.id}
                onClick={() => setSelectedFeature(page)}
                className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] hover:border-[var(--bos-accent)]/60 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)]">
                      {page.type}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      {page.route}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors">
                    {page.name}
                  </h3>
                  <p className="text-xs text-[var(--bos-text-secondary)] line-clamp-2 leading-relaxed">
                    {page.purpose}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--bos-border)] text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--bos-text-tertiary)] font-mono">Primary Action:</span>
                    <span className="font-semibold text-emerald-400 truncate max-w-[150px]">{page.primaryAction}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--bos-text-tertiary)] font-mono">Data Shown:</span>
                    <span className="text-[var(--bos-text-secondary)] truncate max-w-[150px]">{page.dataShown.slice(0, 2).join(", ")}</span>
                  </div>
                </div>

                <button className="w-full py-2 bg-[var(--bos-surface-subtle)] group-hover:bg-[var(--bos-accent)] group-hover:text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 text-[var(--bos-text-primary)]">
                  <span>Inspect Spec</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. "WHAT DOES THE USER ACTUALLY DO?" (USER JOURNEYS) ──────── */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-400" />
              5. WHAT DOES THE USER ACTUALLY DO?
            </h2>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Real user journeys supported directly by approved requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userJourneys.slice(0, 4).map((j, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">{j.featureName}</h3>
                  <span className="text-[10px] font-mono text-[var(--bos-accent)]">{j.requirementTitle}</span>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                    <strong className="text-[var(--bos-text-primary)]">1. User Enters:</strong> {j.userJourney.enters}
                  </p>
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                    <strong className="text-[var(--bos-text-primary)]">2. User Sees:</strong> {j.userJourney.sees}
                  </p>
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                    <strong className="text-[var(--bos-text-primary)]">3. User Performs:</strong> {j.userJourney.performs}
                  </p>
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                    <strong className="text-[var(--bos-text-primary)]">4. System Responds:</strong> {j.userJourney.responds}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. "YOUR ROLE IN THIS PRODUCT" (ROLE OWNERSHIP DASHBOARD) ──── */}
        <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[var(--bos-accent)]" />
                6. YOUR ROLE IN THIS PRODUCT
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                {roleOwnership.title} • {responsibility}
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent)]/20 font-bold uppercase">
              {workstream} OWNERSHIP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* YOU OWN */}
            <div className="p-4 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                YOU OWN
              </span>
              <div className="space-y-2">
                {roleOwnership.youOwn.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-[var(--bos-surface-subtle)] text-xs">
                    <span className="font-semibold text-[var(--bos-text-primary)] block">{item.name}</span>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)]">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* YOU ARE RESPONSIBLE FOR */}
            <div className="p-4 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block">
                YOU ARE RESPONSIBLE FOR
              </span>
              <ul className="space-y-2 text-xs text-[var(--bos-text-primary)]">
                {roleOwnership.responsibleFor.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CONSUMES / DEPENDS ON */}
            <div className="p-4 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 block">
                {roleOwnership.consumesOrProvides.label}
              </span>
              <div className="space-y-2">
                {roleOwnership.consumesOrProvides.items.slice(0, 4).map((c, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[var(--bos-surface-subtle)] text-xs">
                    <span className="font-mono font-semibold text-purple-400 block">{c.name}</span>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)]">{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. "WHAT AM I ACTUALLY BUILDING?" (YOUR BUILD AREA) ────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                7. YOUR BUILD AREA
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                Click any feature to inspect requirements, UI previews, data entities, APIs, and tasks.
              </p>
            </div>
            <button
              onClick={() => handleOpenBuildMode()}
              className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-accent)] hover:bg-[var(--bos-surface-subtle)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Open Build Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productMap.map((feat, idx) => (
              <div
                key={feat.id}
                onClick={() => setSelectedFeature(feat)}
                className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] hover:border-amber-400/50 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-amber-400 font-bold">ITEM {idx + 1}</span>
                    <span className="text-[var(--bos-text-tertiary)]">{feat.route}</span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--bos-text-primary)] group-hover:text-amber-400 transition-colors">
                    {feat.name}
                  </h3>
                  <p className="text-xs text-[var(--bos-text-secondary)] line-clamp-2">
                    {feat.purpose}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bos-surface-subtle)] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--bos-text-tertiary)] font-mono">Action:</span>
                    <span className="font-medium text-emerald-400 truncate">{feat.primaryAction}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--bos-text-tertiary)] font-mono">Status:</span>
                    <span className="font-mono font-bold text-blue-400">{feat.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 9. "HOW DOES IT WORK?" (CLICKABLE ARCHITECTURE FLOW) ───────── */}
        <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-400" />
                8. HOW DOES IT WORK? (ARCHITECTURE TRACE)
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                Every node originates from real project data. Click any row to inspect deep linkages.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {architectureConnections.map((conn, idx) => (
              <div
                key={conn.id || idx}
                onClick={() => setSelectedConnectionNode(conn)}
                className="p-3.5 sm:p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] hover:border-indigo-500/50 transition-all cursor-pointer text-xs"
              >
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                  <div>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block">PRODUCT</span>
                    <span className="font-bold text-[var(--bos-text-primary)] truncate block">{conn.feature}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block">PAGE</span>
                    <span className="text-emerald-400 font-mono truncate block">{conn.pageRoute || conn.page}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block">API</span>
                    <span className="text-indigo-400 font-mono truncate block">{conn.api}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block">BACKEND</span>
                    <span className="text-[var(--bos-text-primary)] truncate block">{conn.backend}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block">DATABASE</span>
                    <span className="text-cyan-400 font-mono truncate block">{conn.database}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 10. "WHAT SHOULD I WORK ON FIRST?" (START HERE) ───────────── */}
        <section className="p-6 sm:p-8 rounded-3xl border-2 border-[var(--bos-accent)]/50 bg-[var(--bos-accent)]/5 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bos-accent)] text-white text-[11px] font-mono font-bold uppercase tracking-wider">
                START HERE
              </span>
              <span className="text-xs text-[var(--bos-text-secondary)] font-mono">
                Derived from real dependency graph & priority
              </span>
            </div>
            {startHere.code && (
              <span className="font-mono text-xs font-bold text-[var(--bos-accent)]">
                {startHere.code}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--bos-text-primary)]">
              {startHere.title}
            </h3>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Layer: <strong className="text-[var(--bos-text-primary)]">{startHere.layer}</strong>
            </p>
          </div>

          {/* WHY? */}
          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
              WHY THIS FIRST?
            </span>
            <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
              {startHere.why}
            </p>
          </div>

          {/* Dependency Chain: AFTER THAT -> THEN */}
          {(startHere.afterThat || startHere.then) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {startHere.afterThat && (
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs space-y-1">
                  <span className="text-[10px] font-mono text-blue-400 font-bold uppercase block">AFTER THAT</span>
                  <p className="font-semibold text-[var(--bos-text-primary)]">{startHere.afterThat}</p>
                  {startHere.afterThatWhy && (
                    <p className="text-[11px] text-[var(--bos-text-secondary)]">{startHere.afterThatWhy}</p>
                  )}
                </div>
              )}
              {startHere.then && (
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs space-y-1">
                  <span className="text-[10px] font-mono text-purple-400 font-bold uppercase block">THEN</span>
                  <p className="font-semibold text-[var(--bos-text-primary)]">{startHere.then}</p>
                  {startHere.thenWhy && (
                    <p className="text-[11px] text-[var(--bos-text-secondary)]">{startHere.thenWhy}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Start Action Button */}
          <div className="pt-2">
            <button
              onClick={() => handleOpenBuildMode(startHere.taskId || undefined)}
              className="px-6 py-3 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Begin Work on This Item</span>
            </button>
          </div>
        </section>

        {/* ── 11. "YOUR WORK" (TASKS WITH FULL TRACEABILITY) ───────────── */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-emerald-400" />
                9. YOUR WORK (TASKS & TRACEABILITY)
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                Every task shows its full product lineage: Task → Feature → Page → Requirement → Project.
              </p>
            </div>

            {/* Task Filter */}
            <div className="flex items-center gap-1 font-mono text-[11px]">
              {(["ALL", "TODO", "IN_PROGRESS", "COMPLETED"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTaskFilter(tab)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all cursor-pointer",
                    taskFilter === tab
                      ? "bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] font-bold"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 hover:border-[var(--bos-accent)]/40 transition-all text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--bos-accent)]">
                        {t.code}
                      </span>
                      <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">{t.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)]">
                        {t.priority}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px] font-bold px-2 py-0.5 rounded",
                          t.status === "DONE" || t.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : t.status === "IN_PROGRESS"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-zinc-500/10 text-zinc-400"
                        )}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>

                  {/* Traceability Lineage Breadcrumb */}
                  <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] font-mono text-[11px] text-[var(--bos-text-secondary)] flex flex-wrap items-center gap-1.5">
                    <span className="text-[var(--bos-accent)] font-bold">{t.code}</span>
                    <span className="text-[var(--bos-text-tertiary)]">↓ belongs to</span>
                    <span className="text-emerald-400 font-semibold">{t.featureName}</span>
                    <span className="text-[var(--bos-text-tertiary)]">↓ belongs to</span>
                    <span className="text-cyan-400">{t.pageName}</span>
                    <span className="text-[var(--bos-text-tertiary)]">↓ belongs to</span>
                    <span className="text-purple-400">{t.requirementId}</span>
                    <span className="text-[var(--bos-text-tertiary)]">↓ belongs to</span>
                    <span className="text-[var(--bos-text-primary)] font-semibold">{t.projectName}</span>
                  </div>

                  {/* Why am I doing this task? */}
                  <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                    <strong className="text-[var(--bos-text-primary)]">Why am I doing this?</strong> {t.whyAmIDoingThis}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] text-center font-mono text-xs text-[var(--bos-text-secondary)]">
                No tasks matching the selected filter ({taskFilter}).
              </div>
            )}
          </div>
        </section>

        {/* ── 12. "WHAT DOES DONE LOOK LIKE?" (ACCEPTANCE CRITERIA) ─────── */}
        <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              10. WHAT DOES DONE LOOK LIKE?
            </h2>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Approved client acceptance criteria for project delivery.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {acceptanceCriteria.length > 0 ? (
              acceptanceCriteria.map((ac) => (
                <div
                  key={ac.id}
                  className="p-3 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex items-center justify-between"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        ac.status === "PASSED" ? "text-emerald-400" : "text-[var(--bos-text-tertiary)]"
                      )}
                    />
                    <div>
                      <span className="font-medium text-[var(--bos-text-primary)] block">{ac.criterion}</span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                        Deliverable: {ac.deliverableTitle}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {ac.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--bos-text-secondary)] italic">
                Standard milestone verification criteria apply.
              </p>
            )}
          </div>
        </section>

        {/* ── 13. AUDITABILITY FOOTER ──────────────────────────────────── */}
        <footer className="p-6 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] text-[11px] font-mono text-[var(--bos-text-tertiary)] space-y-2">
          <div className="flex items-center gap-2 font-bold text-[var(--bos-text-secondary)] uppercase">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>AUDIT & TRACEABILITY TRAIL</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>Project ID: <span className="text-[var(--bos-text-secondary)]">{audit.projectId}</span></div>
            <div>Employee ID: <span className="text-[var(--bos-text-secondary)]">{audit.employeeId}</span></div>
            <div>Requirement v{audit.sourceRequirementVersion} • Proposal v{audit.sourceProposalVersion}</div>
            <div>Blueprint v{audit.sourceBlueprintVersion}</div>
            <div>Engine: <span className="text-[var(--bos-text-secondary)]">{audit.model}</span></div>
            <div>Prompt v{audit.promptVersion}</div>
            <div>Generated: <span className="text-[var(--bos-text-secondary)]">{new Date(audit.generatedAt).toLocaleDateString()}</span></div>
            <div>Status: <span className="text-emerald-400 font-bold">{briefData.status}</span></div>
          </div>
        </footer>
      </main>

      {/* ── MODALS & DRAWERS ─────────────────────────────────────────── */}
      <FeatureDetailDrawer
        feature={selectedFeature}
        projectName={projectName}
        workstream={workstream}
        projectRole={projectRole}
        onClose={() => setSelectedFeature(null)}
        onStartBuilding={(fId) => {
          setSelectedFeature(null);
          handleOpenBuildMode(fId);
        }}
      />

      <EmployeeBuildModeModal
        isOpen={isBuildModeOpen}
        onClose={() => setIsBuildModeOpen(false)}
        projectId={briefData.projectId}
        projectName={projectName}
        initialCapabilityId={buildModeCapabilityId}
        workstream={workstream}
        projectRole={projectRole}
        employeeId={briefData.employeeId}
      />
    </div>
  );
}
