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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  if (!data) return null;

  const { employee, project, yourArea, currentBuild, nextAction, dependency, recentChange } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150 font-sans">
      {/* ── GREETING & ROLE ────────────────────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
          EMPLOYEE WORKSPACE
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
          GOOD MORNING, {employee.name.toUpperCase()}
        </h1>
        <p className="text-sm font-semibold text-emerald-400 font-mono">
          {employee.role}
        </p>
      </section>

      {/* ── CURRENT PROJECT ────────────────────────────────────────── */}
      <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block">
          CURRENT PROJECT
        </span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
            {project.name}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10.5px] font-bold uppercase">
            {project.phase}
          </span>
        </div>
        <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
          {project.description}
        </p>
      </section>

      {/* ── YOUR AREA ──────────────────────────────────────────────── */}
      <section className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 block">
              YOUR AREA
            </span>
            <h3 className="text-base font-bold text-[var(--bos-text-primary)] mt-0.5">
              {yourArea.workstream}
            </h3>
          </div>
          <button
            onClick={onOpenProductMap}
            className="text-xs font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Product Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-secondary)] leading-relaxed">
          <span className="font-semibold text-[var(--bos-text-primary)] block mb-1">You are responsible for:</span>
          {yourArea.responsibility}
        </div>
      </section>

      {/* ── CURRENT BUILD & NEXT ACTION ────────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl border-2 border-[var(--bos-accent)]/50 bg-[var(--bos-accent)]/5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[var(--bos-accent)] text-white text-[10.5px] font-mono font-bold uppercase tracking-wider">
            CURRENT BUILD
          </span>
          <span className="font-mono text-xs font-bold text-emerald-400">
            Status: {currentBuild.status}
          </span>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-[var(--bos-text-primary)]">
            {currentBuild.featureName}
          </h2>
          <p className="text-xs text-[var(--bos-text-secondary)] mt-1">
            {currentBuild.expectedResult}
          </p>
        </div>

        {/* Next Action Box */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1 text-xs">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
            NEXT ACTION
          </span>
          <p className="text-sm font-bold text-[var(--bos-text-primary)]">
            {nextAction.title}
          </p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={onNavigateToBuild}
            className="px-6 py-3 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{nextAction.actionText}</span>
          </button>
          <button
            onClick={() => onOpenFeature(currentBuild.featureName)}
            className="px-4 py-3 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-xs font-mono rounded-xl transition-colors cursor-pointer"
          >
            Feature Spec
          </button>
        </div>
      </section>

      {/* ── DEPENDENCY & RECENT CHANGE ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* DEPENDENCY */}
        <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
            DEPENDENCY
          </span>
          <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
            {dependency.name}
          </h4>
          <p className="text-xs text-[var(--bos-text-secondary)] font-mono">
            Owner: {dependency.ownerRole} ({dependency.ownerName})
          </p>
          <div className="pt-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
              {dependency.status}
            </span>
          </div>
        </div>

        {/* RECENT CHANGE */}
        <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
            RECENT CHANGE
          </span>
          <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
            {recentChange.title}
          </h4>
          <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
            {recentChange.whatChanged}
          </p>
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block pt-1">
            {new Date(recentChange.timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
