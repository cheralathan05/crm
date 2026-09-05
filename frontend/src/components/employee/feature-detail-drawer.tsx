"use client";

import {
  X,
  Layers,
  ArrowRight,
  Database,
  Server,
  Globe,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  Sparkles,
  Zap,
  Play,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualPageSpec } from "@/lib/employees/employee-project-brief.service";

interface FeatureDetailDrawerProps {
  feature: VisualPageSpec | null;
  projectName: string;
  workstream: string;
  projectRole: string;
  allApis?: Array<{ method: string; path: string; purpose?: string }>;
  allEntities?: Array<{ name: string; tableName?: string; purpose?: string; fields?: any }>;
  allServices?: Array<{ name: string; description?: string }>;
  linkedTasks?: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    priority: string;
    whyAmIDoingThis?: string;
  }>;
  onClose: () => void;
  onStartBuilding?: (featureId: string) => void;
}

export function FeatureDetailDrawer({
  feature,
  projectName,
  workstream,
  projectRole,
  allApis = [],
  allEntities = [],
  allServices = [],
  linkedTasks = [],
  onClose,
  onStartBuilding,
}: FeatureDetailDrawerProps) {
  if (!feature) return null;

  // Filter linked APIs
  const connectedApis = feature.connectedApis?.length
    ? feature.connectedApis
    : allApis.filter(
        (a) =>
          a.path.toLowerCase().includes(feature.name.toLowerCase().replace(/\s+/g, "-")) ||
          a.path.toLowerCase().includes(feature.route.toLowerCase().replace(/^\//, ""))
      );

  // Filter linked Database entities
  const connectedEntities = allEntities.filter(
    (e) =>
      feature.name.toLowerCase().includes(e.name.toLowerCase()) ||
      (e.tableName && feature.name.toLowerCase().includes(e.tableName.toLowerCase())) ||
      e.name.toLowerCase().includes(feature.name.toLowerCase().replace(/management|page|list/g, "").trim())
  );

  const matchedService = allServices.find((s) =>
    s.name.toLowerCase().includes(feature.name.toLowerCase().replace(/\s+/g, ""))
  )?.name || (allServices[0]?.name || "CoreService");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[var(--bos-surface-panel)] border-l border-[var(--bos-border)] h-full overflow-y-auto shadow-2xl flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 p-6 border-b border-[var(--bos-border)] bg-[var(--bos-surface-panel)]/95 backdrop-blur flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent)]/20">
                {feature.type || "FEATURE"}
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                {feature.route}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--bos-text-primary)]">
              {feature.name}
            </h2>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Part of {projectName} • Owned by {projectRole} ({workstream})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 text-sm">
          {/* 1. WHAT IT IS */}
          <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>WHAT IT IS</span>
            </div>
            <p className="text-[13px] text-[var(--bos-text-primary)] leading-relaxed">
              {feature.purpose || "Approved product capability defined in project specifications."}
            </p>
          </div>

          {/* 2. WHAT THE USER SEES */}
          <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Globe className="w-3.5 h-3.5" />
              <span>WHAT THE USER SEES (VISUAL SPEC)</span>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--bos-text-secondary)] font-mono">Main Sections:</div>
              <div className="flex flex-wrap gap-1.5">
                {feature.mainSections.map((sec, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-xs">
              <span className="text-[var(--bos-text-secondary)] font-mono">Primary Action:</span>
              <span className="font-semibold text-emerald-400">{feature.primaryAction}</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[var(--bos-border)]">
              <span className="text-xs text-[var(--bos-text-secondary)] font-mono">UI States:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {feature.relevantStates.map((st, idx) => (
                  <div key={idx} className="p-2 rounded bg-[var(--bos-surface-subtle)] text-[11px]">
                    <span className="font-semibold text-[var(--bos-text-primary)] block">{st.state}</span>
                    <span className="text-[var(--bos-text-tertiary)]">{st.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. WHAT THE USER CAN DO */}
          <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
              <Zap className="w-3.5 h-3.5" />
              <span>WHAT THE USER CAN DO</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--bos-text-primary)]">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Navigate to {feature.route} and inspect live {feature.name} records.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Perform {feature.primaryAction} with immediate client-side validation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Filter and search records dynamically with responsive state persistence.</span>
              </li>
            </ul>
          </div>

          {/* 4. WHAT YOU BUILD */}
          <div className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              <Layers className="w-3.5 h-3.5" />
              <span>WHAT YOU BUILD ({workstream})</span>
            </div>
            <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
              {workstream === "FRONTEND"
                ? `Implement the ${feature.name} page at route "${feature.route}", connect required APIs, handle loading/empty/error states, and ensure full responsiveness.`
                : workstream === "BACKEND"
                ? `Build API contracts and business validation logic supporting ${feature.name}, enforcing auth and error boundaries.`
                : workstream === "DATABASE"
                ? `Maintain entity schemas, indexes, and relationship integrity for ${feature.name} data storage.`
                : `Author and verify test specifications for ${feature.name} against approved client acceptance criteria.`}
            </p>
          </div>

          {/* 5. DATA USED & 6. API USED */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* DATA USED */}
            <div className="p-3.5 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>DATA USED</span>
              </div>
              <div className="space-y-1">
                {connectedEntities.length > 0 ? (
                  connectedEntities.map((ent, idx) => (
                    <div key={idx} className="text-xs">
                      <span className="font-semibold text-[var(--bos-text-primary)]">{ent.name}</span>
                      <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] block">
                        table: {ent.tableName || ent.name.toLowerCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[var(--bos-text-secondary)]">
                    {feature.dataShown.slice(0, 4).join(", ")}
                  </div>
                )}
              </div>
            </div>

            {/* API USED */}
            <div className="p-3.5 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>API USED</span>
              </div>
              <div className="space-y-1">
                {connectedApis.length > 0 ? (
                  connectedApis.map((api, idx) => (
                    <div key={idx} className="text-xs">
                      <span className="font-mono font-bold text-indigo-400">{api.method} </span>
                      <span className="font-mono text-[11px] text-[var(--bos-text-primary)]">{api.path}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[var(--bos-text-secondary)]">
                    Connection not defined.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7. BACKEND CONNECTION & STATUS */}
          <div className="p-3.5 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between text-xs">
            <div>
              <span className="text-mono text-[var(--bos-text-secondary)] uppercase font-mono block text-[10px]">
                BACKEND SERVICE
              </span>
              <span className="font-semibold text-[var(--bos-text-primary)]">{matchedService}</span>
            </div>
            <div className="text-right">
              <span className="text-mono text-[var(--bos-text-secondary)] uppercase font-mono block text-[10px]">
                STATUS
              </span>
              <span className="font-mono font-bold text-emerald-400">{feature.status}</span>
            </div>
          </div>

          {/* 8. RELATED WORK / TASKS */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                RELATED TASKS ({linkedTasks.length})
              </span>
            </div>
            {linkedTasks.length > 0 ? (
              <div className="space-y-1.5">
                {linkedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg border border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[var(--bos-accent)] font-bold">
                          {t.code || "TASK"}
                        </span>
                        <span className="font-medium text-[var(--bos-text-primary)]">{t.title}</span>
                      </div>
                      {t.whyAmIDoingThis && (
                        <p className="text-[10.5px] text-[var(--bos-text-tertiary)]">{t.whyAmIDoingThis}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)]">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--bos-text-tertiary)] italic">
                No specific sub-tasks registered for this page yet.
              </p>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
          >
            Close
          </button>
          {onStartBuilding && (
            <button
              onClick={() => {
                onClose();
                onStartBuilding(feature.id);
              }}
              className="px-5 py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Building This Feature</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
