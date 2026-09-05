"use client";

import {
  Flame,
  Play,
  ArrowRight,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  Layers,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeViewProps {
  homeData: any;
  onNavigate: (tab: string, payload?: any) => void;
  onStartBuild: (taskId?: string) => void;
}

export function EmployeeOSHomeView({
  homeData,
  onNavigate,
  onStartBuild,
}: HomeViewProps) {
  if (!homeData) return null;

  const { employee, project, focus, momentum, needsAttention, waitingForYou, youAreWaitingFor, impact } = homeData;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── GREETING & CONTEXT HEADER ───────────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] relative overflow-hidden shadow-xl space-y-4">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[var(--bos-accent)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)] block">
              EMPLOYEE OS • ACTIVE WORKSPACE
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
              Welcome back, {employee.name}
            </h1>
            <p className="text-xs text-[var(--bos-text-secondary)] font-medium">
              {employee.role} • Project: <strong className="text-[var(--bos-text-primary)]">{project.name}</strong> ({project.clientName})
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
              {project.stage} • {project.health}
            </span>
            <span className="text-[var(--bos-text-tertiary)]">{project.progress}% Complete</span>
          </div>
        </div>
      </section>

      {/* ── YOUR FOCUS (ONE RECOMMENDED STARTING POINT) ─────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border-2 border-[var(--bos-accent)]/60 bg-[var(--bos-accent)]/5 shadow-xl space-y-4 relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bos-accent)] text-white text-[10.5px] font-mono font-bold uppercase tracking-wider">
              YOUR FOCUS
            </span>
            <span className="text-xs font-mono text-[var(--bos-text-secondary)]">
              Recommended starting point based on dependencies & priority
            </span>
          </div>
          {focus?.code && (
            <span className="font-mono text-xs font-bold text-[var(--bos-accent)]">
              {focus.code}
            </span>
          )}
        </div>

        {focus ? (
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--bos-text-primary)]">
              {focus.title}
            </h2>
            <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1 text-xs">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                WHY THIS MATTERS RIGHT NOW
              </span>
              <p className="text-[var(--bos-text-primary)] leading-relaxed">{focus.why}</p>
            </div>
            <div className="pt-1 flex items-center gap-3">
              <button
                onClick={() => onStartBuild(focus.taskId)}
                className="px-6 py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Build</span>
              </button>
              <button
                onClick={() => onNavigate("MY_DAY")}
                className="px-4 py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-xs font-mono rounded-xl transition-colors cursor-pointer"
              >
                View in My Day
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-secondary)]">
            All assigned work is currently completed or in review. Explore project explorer or check team map.
          </div>
        )}
      </section>

      {/* ── THREE COLUMN PULSE: MOMENTUM | WAITING FOR YOU | YOU ARE WAITING FOR ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* MOMENTUM */}
        <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              MOMENTUM
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] flex items-baseline gap-1.5">
              🔥 {momentum.currentBuildStreak}{" "}
              <span className="text-xs font-normal text-[var(--bos-text-tertiary)] font-mono">
                BUILD {momentum.currentBuildStreak === 1 ? "DAY" : "DAYS"}
              </span>
            </p>
            <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
              {momentum.currentBuildStreak > 0
                ? `${momentum.currentBuildStreak} days of meaningful verified project progress.`
                : "Record your first build session to establish momentum."}
            </p>
          </div>
          <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)]">
            <span>Completed: <strong className="text-[var(--bos-text-primary)]">{momentum.completedWorkCount}</strong></span>
            <span>Active: <strong className="text-[var(--bos-text-primary)]">{momentum.activeWorkCount}</strong></span>
          </div>
        </div>

        {/* WAITING FOR YOU */}
        <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              WAITING FOR YOU
            </span>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              {waitingForYou.length > 0
                ? `${waitingForYou.length} downstream item(s) are waiting on your completion.`
                : "No teammates or downstream systems are currently blocked by your work."}
            </p>
            {waitingForYou.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {waitingForYou.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[var(--bos-surface-subtle)] text-[11px] space-y-0.5">
                    <span className="font-semibold text-[var(--bos-text-primary)] block truncate">{item.blockedTaskTitle}</span>
                    <span className="text-[10px] font-mono text-purple-400">{item.blockedRole} waiting</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate("DEPENDENCIES")}
            className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1 cursor-pointer pt-1"
          >
            <span>Open Dependency Radar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* YOU ARE WAITING FOR */}
        <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              YOU ARE WAITING FOR
            </span>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              {youAreWaitingFor.length > 0
                ? `${youAreWaitingFor.length} upstream prerequisite(s) are currently in progress.`
                : "Zero dependencies blocking your assigned responsibilities."}
            </p>
            {youAreWaitingFor.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {youAreWaitingFor.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[var(--bos-surface-subtle)] text-[11px] space-y-0.5">
                    <span className="font-semibold text-[var(--bos-text-primary)] block truncate">{item.prerequisiteTaskTitle}</span>
                    <span className="text-[10px] font-mono text-cyan-400">Status: {item.prerequisiteStatus}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate("DEPENDENCIES")}
            className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1 cursor-pointer pt-1"
          >
            <span>View Upstream Lineage</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── YOUR REAL IMPACT SUMMARY ─────────────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              YOUR REAL IMPACT
            </h3>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Meaningful contributions verified in database records.
            </p>
          </div>
          <button
            onClick={() => onNavigate("IMPACT")}
            className="text-xs font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Impact Story</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] block">{impact.pagesBuilt}</span>
            <span className="text-[10px] font-mono text-[var(--bos-text-secondary)] uppercase">Pages Built</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] block">{impact.apisConnected}</span>
            <span className="text-[10px] font-mono text-[var(--bos-text-secondary)] uppercase">APIs Connected</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] block">{impact.bugsVerified}</span>
            <span className="text-[10px] font-mono text-[var(--bos-text-secondary)] uppercase">Bugs Verified</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] block">{impact.dependenciesUnblocked}</span>
            <span className="text-[10px] font-mono text-[var(--bos-text-secondary)] uppercase">Unblocked</span>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)] block">{impact.deliverablesShipped}</span>
            <span className="text-[10px] font-mono text-[var(--bos-text-secondary)] uppercase">Shipped</span>
          </div>
        </div>
      </section>
    </div>
  );
}
