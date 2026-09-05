"use client";

import { User, Shield, Briefcase, Award, CheckCircle2, Layers, Calendar, Mail, Tag } from "lucide-react";

interface EmployeeProfileViewProps {
  portalData: any;
  onNavigateTab: (tab: string, context?: any) => void;
}

export function EmployeeProfileView({
  portalData,
  onNavigateTab,
}: EmployeeProfileViewProps) {
  const { employee, allProjects = [] } = portalData;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Profile Hero */}
      <div className="p-6 sm:p-10 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--bos-accent)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-center font-mono font-bold text-2xl text-[var(--bos-accent)] shadow-inner">
              {employee.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[var(--bos-text-primary)]">{employee.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-xs font-mono font-bold uppercase">
                  {employee.discipline}
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--bos-text-secondary)]">{employee.role}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--bos-text-tertiary)] pt-1">
                <span>Code: <strong className="text-[var(--bos-text-primary)]">{employee.code || "EMP"}</strong></span>
                <span>·</span>
                <span>Department: <strong className="text-[var(--bos-text-primary)]">{employee.department}</strong></span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {employee.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Purpose & Core Responsibilities */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--bos-text-primary)]">Engineering Role & Purpose</h2>
              <p className="text-xs font-mono text-[var(--bos-text-tertiary)] uppercase">Standardized Role Spec</p>
            </div>
          </div>

          <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed italic border-l-2 border-[var(--bos-accent)] pl-3">
            "{employee.purpose}"
          </p>

          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
              Core Responsibilities
            </span>
            <div className="space-y-2">
              {employee.responsibilities?.map((resp: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--bos-text-secondary)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{resp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Required Capabilities & Active Allocations */}
        <div className="space-y-6">
          {/* Capabilities */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--bos-text-primary)]">Verified Capabilities</h2>
                <p className="text-xs font-mono text-[var(--bos-text-tertiary)] uppercase">Discipline Competencies</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {employee.requiredCapabilities?.map((cap: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono font-medium text-[var(--bos-text-primary)]"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Project Allocations */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--bos-text-primary)]">Active Project Allocations</h2>
                  <p className="text-xs font-mono text-[var(--bos-text-tertiary)] uppercase">{allProjects.length} Projects</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab("PROJECTS")}
                className="text-xs font-mono text-[var(--bos-accent)] hover:underline cursor-pointer font-bold"
              >
                View Projects →
              </button>
            </div>

            <div className="space-y-2">
              {allProjects.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-[var(--bos-text-primary)] block">{p.name}</span>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)]">{p.code} · Role: {p.role}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-bold text-[10px] uppercase">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
