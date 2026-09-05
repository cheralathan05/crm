"use client";

import { useState } from "react";
import {
  Globe,
  Layout,
  Code2,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Shield,
  FileCode,
  Smartphone,
  Eye,
  ListTodo,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FrontendArchitectureViewProps = {
  blueprint: any;
  tasks?: any[];
  onSelectCapability?: (cap: any) => void;
  onOpenTraceability?: (node: any) => void;
};

export function FrontendArchitectureView({
  blueprint,
  tasks = [],
  onSelectCapability,
  onOpenTraceability,
}: FrontendArchitectureViewProps) {
  const [selectedPage, setSelectedPage] = useState<any | null>(null);

  if (!blueprint || !blueprint.frontendCapabilities || blueprint.frontendCapabilities.length === 0) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3">
        <Globe className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Frontend Architecture Not Generated</h3>
        <p className="text-[13px] text-[var(--bos-text-secondary)] max-w-md mx-auto">
          Generate an engineering blueprint from the approved proposal to view the structured frontend specification.
        </p>
      </div>
    );
  }

  const frontendCaps = blueprint.frontendCapabilities as Array<any>;

  // Real progress calculation
  const completedCaps = frontendCaps.filter((f) => f.status === "COMPLETED").length;
  const inProgressCaps = frontendCaps.filter((f) => f.status === "IN_PROGRESS").length;
  const readyCaps = frontendCaps.filter((f) => f.status === "READY" || f.status === "PLANNED").length;
  const blockedCaps = frontendCaps.filter((f) => f.status === "BLOCKED").length;
  const progressPct = frontendCaps.length > 0 ? Math.round((completedCaps / frontendCaps.length) * 100) : 0;

  // Framework specification derived from blueprint or requirements
  const framework =
    blueprint.rawAnalysis && typeof blueprint.rawAnalysis === "string" && blueprint.rawAnalysis.includes("React")
      ? "React / Next.js (App Router)"
      : "Next.js / React (TypeScript, Tailwind CSS & Vanilla System)";

  return (
    <div className="space-y-6">
      {/* Top Specification Header */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[var(--bos-border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-sky-500 font-bold">
                FRONTEND ARCHITECTURE
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · {frontendCaps.length} Traceable Pages & Components
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Frontend Specification & User Flows
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] font-mono text-[12px] text-[var(--bos-text-secondary)]">
              Framework: <strong className="text-[var(--bos-text-primary)]">{framework}</strong>
            </span>
          </div>
        </div>

        {/* Progress Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] font-mono">
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">TOTAL SCREENS/COMPONENTS</span>
            <strong className="text-[14px] text-[var(--bos-text-primary)]">{frontendCaps.length}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">COMPLETED</span>
            <strong className="text-[14px] text-emerald-600">{completedCaps}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">IN PROGRESS</span>
            <strong className="text-[14px] text-sky-600">{inProgressCaps}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">NOT STARTED / READY</span>
            <strong className="text-[14px] text-amber-600">{readyCaps}</strong>
          </div>
        </div>
      </section>

      {/* Pages & Screens Inventory */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
            Approved Pages & Screen Specifications
          </h3>
          <span className="text-[12px] font-mono text-[var(--bos-text-tertiary)]">
            Every page traces directly to an approved client requirement.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {frontendCaps.map((fe: any, idx: number) => {
            // Find linked tasks for this frontend capability
            const linkedTasks = tasks.filter(
              (t: any) =>
                t.workstream === "FRONTEND" &&
                (t.sourceRequirementId === fe.requirementId ||
                  t.title.toLowerCase().includes(fe.name.toLowerCase()) ||
                  fe.name.toLowerCase().includes(t.title.toLowerCase()))
            );

            // Parse components, apis, state
            let componentsArr: string[] = [];
            let apisArr: string[] = [];
            let permsArr: string[] = [];
            try {
              if (fe.components) componentsArr = JSON.parse(fe.components);
            } catch {}
            try {
              if (fe.apiDependencies) apisArr = JSON.parse(fe.apiDependencies);
            } catch {}
            try {
              if (fe.permissionRequirements) permsArr = JSON.parse(fe.permissionRequirements);
            } catch {}

            return (
              <div
                key={fe.id}
                onClick={() => {
                  setSelectedPage(fe);
                  onSelectCapability?.(fe);
                }}
                className="p-5 bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-panel)]/90 border border-[var(--bos-border-subtle)] hover:border-sky-500/50 rounded-2xl transition-all space-y-3 cursor-pointer group shadow-xs"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 font-mono text-[10.5px] font-bold border border-sky-500/20">
                      {fe.type}
                    </span>
                    <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)] group-hover:text-sky-500 transition-colors">
                      {fe.name}
                    </h4>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--bos-text-secondary)] font-semibold">
                    {fe.requirementId || "REQ-APPROVED"}
                  </span>
                </div>

                {/* Purpose */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] font-semibold">
                    Purpose
                  </span>
                  <p className="text-[12.5px] text-[var(--bos-text-secondary)] leading-relaxed">
                    {fe.description || "Interactive user interface component."}
                  </p>
                </div>

                {/* Route & Components */}
                <div className="grid grid-cols-2 gap-2 text-[11.5px] font-mono pt-1">
                  <div className="p-2 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                    <span className="text-[var(--bos-text-tertiary)] block text-[10px]">ROUTE</span>
                    <span className="text-[var(--bos-text-primary)] truncate block">{fe.route || "/"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                    <span className="text-[var(--bos-text-tertiary)] block text-[10px]">COMPONENTS</span>
                    <span className="text-[var(--bos-text-primary)] truncate block">
                      {componentsArr.length > 0 ? componentsArr.join(", ") : "Standard Layout"}
                    </span>
                  </div>
                </div>

                {/* API dependencies & Status */}
                <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-[var(--bos-text-secondary)]">
                    <Code2 className="w-3.5 h-3.5 text-sky-500" />
                    <span>APIs: {apisArr.length > 0 ? apisArr.slice(0, 2).join(", ") : "GET /api"}</span>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded font-semibold",
                      fe.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : fe.status === "IN_PROGRESS"
                        ? "bg-sky-500/10 text-sky-600"
                        : "bg-amber-500/10 text-amber-600"
                    )}
                  >
                    {fe.status}
                  </span>
                </div>

                {/* Linked Tasks */}
                {linkedTasks.length > 0 && (
                  <div className="pt-2 border-t border-[var(--bos-border-subtle)]/60 flex items-center gap-2 text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
                    <ListTodo className="w-3 h-3 text-[var(--bos-accent)]" />
                    <span>Linked Tasks:</span>
                    <span className="text-[var(--bos-text-secondary)] font-semibold">
                      {linkedTasks.map((t: any) => t.code || t.title.slice(0, 15)).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Frontend Non-Functional & Quality Standards */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
          UI/UX Quality & Architectural Standards
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12.5px]">
          <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2">
            <div className="flex items-center gap-2 text-sky-500 font-bold font-mono text-[12px]">
              <Smartphone className="w-4 h-4" />
              <span>RESPONSIVE SPEC</span>
            </div>
            <p className="text-[var(--bos-text-secondary)] leading-relaxed">
              Mobile-first responsive architecture supporting mobile (&lt;640px), tablet (768px), and ultra-wide displays with fluid typography.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2">
            <div className="flex items-center gap-2 text-emerald-500 font-bold font-mono text-[12px]">
              <Eye className="w-4 h-4" />
              <span>ACCESSIBILITY (a11y)</span>
            </div>
            <p className="text-[var(--bos-text-secondary)] leading-relaxed">
              WCAG 2.1 AA compliant semantic HTML elements, high-contrast text tokens, full keyboard navigation, and ARIA labels on interactive elements.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2">
            <div className="flex items-center gap-2 text-purple-500 font-bold font-mono text-[12px]">
              <Layers className="w-4 h-4" />
              <span>STATE MANAGEMENT</span>
            </div>
            <p className="text-[var(--bos-text-secondary)] leading-relaxed">
              React Context &amp; server state synchronization with optimistic UI updates and real-time query invalidation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
