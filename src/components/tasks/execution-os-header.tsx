"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Sparkles,
  Plus,
  Command,
  ArrowRight,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExecutionOSHeaderProps = {
  projects: Array<{ id: string; name: string; clientId: string }>;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCommandPalette: () => void;
  onOpenWorkBreakdown: () => void;
  onOpenNewTask: () => void;
  activeProjectContext?: {
    code?: string;
    name?: string;
    clientName?: string;
    stage?: string;
    health?: string;
    currentMilestoneTitle?: string;
    deadline?: string | null;
    progress?: number;
    requirementCount?: number;
    deliverableCount?: number;
  } | null;
};

export function ExecutionOSHeader({
  projects = [],
  selectedProjectId,
  onSelectProject,
  searchQuery,
  onSearchChange,
  onOpenCommandPalette,
  onOpenWorkBreakdown,
  onOpenNewTask,
  activeProjectContext,
}: ExecutionOSHeaderProps) {
  return (
    <header className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)] sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-3 space-y-2.5">
        {/* Row 1: Top Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo / System Badge & Project Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold font-mono text-[13px] shadow-xs">
                ⬡
              </div>
              <span className="font-mono text-[13px] font-extrabold uppercase tracking-wider text-[var(--bos-text-primary)]">
                EXECUTION OS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-semibold border border-[var(--bos-accent)]/20">
                PROD-ENGINE
              </span>
            </div>

            <div className="h-4 w-px bg-[var(--bos-border)] hidden sm:block" />

            {/* Real Database Project Selector */}
            <div className="flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />
              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-md px-2.5 py-1 text-[12px] font-medium text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] cursor-pointer"
              >
                <option value="">All Active Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center/Right Controls: Search, ⌘K, AI Breakdown, New Task */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search input with ⌘K shortcut */}
            <div className="relative flex items-center min-w-[220px] lg:min-w-[280px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--bos-text-tertiary)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search execution nodes, REQ, APIs..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg pl-8 pr-12 py-1 text-[12px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
              />
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="absolute right-1.5 px-1.5 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[9.5px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
                title="Command Palette (⌘K)"
              >
                ⌘K
              </button>
            </div>

            {/* AI Work Breakdown */}
            <button
              type="button"
              onClick={onOpenWorkBreakdown}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[12px] font-medium text-[var(--bos-text-primary)] transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span>Decompose Scope</span>
            </button>

            {/* New Task Button */}
            <button
              type="button"
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-medium transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Work</span>
            </button>
          </div>
        </div>

        {/* Row 2: Connected Project Context Strip */}
        {activeProjectContext && (
          <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--bos-text-secondary)] flex-wrap pt-1.5 border-t border-[var(--bos-border)]/60">
            <div className="flex items-center gap-1">
              <span className="text-[var(--bos-text-tertiary)]">PROJECT:</span>
              <strong className="text-[var(--bos-text-primary)] font-bold">
                {activeProjectContext.code ? `[${activeProjectContext.code}] ` : ""}
                {activeProjectContext.name}
              </strong>
              {activeProjectContext.clientName && (
                <span className="text-[var(--bos-text-tertiary)] font-sans">({activeProjectContext.clientName})</span>
              )}
            </div>

            <span>·</span>

            <div className="flex items-center gap-1">
              <span className="text-[var(--bos-text-tertiary)]">PHASE:</span>
              <span className="font-bold text-[var(--bos-accent)] uppercase">
                {activeProjectContext.currentMilestoneTitle || activeProjectContext.stage || "Execution"}
              </span>
            </div>

            <span>·</span>

            <div className="flex items-center gap-1">
              <span className="text-[var(--bos-text-tertiary)]">HEALTH:</span>
              <span
                className={cn(
                  "font-bold uppercase px-1.5 py-0.2 rounded",
                  activeProjectContext.health === "ON_TRACK"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-500/10 text-rose-600",
                )}
              >
                {activeProjectContext.health?.replace("_", " ") || "ACTIVE"}
              </span>
            </div>

            <span>·</span>

            <div className="flex items-center gap-1">
              <span className="text-[var(--bos-text-tertiary)]">DEADLINE:</span>
              <span className="text-[var(--bos-text-primary)]">
                {activeProjectContext.deadline
                  ? new Date(activeProjectContext.deadline).toLocaleDateString()
                  : "Target Schedule"}
              </span>
            </div>

            <span>·</span>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[var(--bos-text-tertiary)]">PROGRESS:</span>
              <strong className="text-[var(--bos-text-primary)]">{activeProjectContext.progress || 0}%</strong>
              <div className="w-16 h-1.5 bg-[var(--bos-border)] rounded-full overflow-hidden">
                <div
                  className="bg-[var(--bos-accent)] h-full transition-all duration-300"
                  style={{ width: `${activeProjectContext.progress || 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
