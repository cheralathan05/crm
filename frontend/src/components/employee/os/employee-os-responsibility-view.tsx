"use client";

import {
  Layers,
  CheckCircle2,
  Server,
  Globe,
  Database,
  ArrowRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsibilityViewProps {
  briefData: any;
  onSelectFeature?: (feature: any) => void;
}

export function EmployeeOSResponsibilityView({ briefData, onSelectFeature }: ResponsibilityViewProps) {
  if (!briefData) return null;

  const { roleOwnership, productMap, architectureConnections, acceptanceCriteria, projectRole, responsibility, workstream } = briefData;

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
            OWNERSHIP MATRIX
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
            My Responsibility
          </h1>
          <p className="text-xs text-[var(--bos-text-secondary)]">
            Role: <strong className="text-[var(--bos-text-primary)]">{projectRole}</strong> • Area: <strong className="text-[var(--bos-text-primary)]">{responsibility}</strong>
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent)]/20 font-mono text-xs font-bold uppercase">
          {workstream} LEAD
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MY OWNED FEATURES & PAGES */}
        <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
            MY PAGES & CAPABILITIES ({productMap.length})
          </span>
          <div className="space-y-2.5">
            {productMap.map((page: any) => (
              <div
                key={page.id}
                onClick={() => onSelectFeature && onSelectFeature(page)}
                className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between hover:border-[var(--bos-accent)]/50 transition-all cursor-pointer text-xs"
              >
                <div>
                  <span className="font-bold text-[var(--bos-text-primary)] block">{page.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400">{page.route}</span>
                </div>
                <button className="text-[11px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]">
                  Inspect &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RESPONSIBLE FOR */}
        <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block">
            CORE ACCOUNTABILITIES
          </span>
          <ul className="space-y-3 text-xs text-[var(--bos-text-primary)]">
            {roleOwnership.responsibleFor.map((r: string, idx: number) => (
              <li key={idx} className="p-3 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* DELIVERABLE ACCEPTANCE CRITERIA */}
      <section className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 block">
          MY DELIVERABLES & ACCEPTANCE CRITERIA ({acceptanceCriteria.length})
        </span>
        <div className="space-y-2 text-xs">
          {acceptanceCriteria.map((ac: any) => (
            <div key={ac.id} className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between">
              <div className="flex items-start gap-2">
                <CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", ac.status === "PASSED" ? "text-emerald-400" : "text-[var(--bos-text-tertiary)]")} />
                <div>
                  <span className="font-medium text-[var(--bos-text-primary)] block">{ac.criterion}</span>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">Deliverable: {ac.deliverableTitle}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400">{ac.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
