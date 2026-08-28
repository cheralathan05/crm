"use client";

import { cn } from "@/lib/utils";
import {
  Monitor,
  Layout,
  FormInput,
  Table2,
  PanelRightOpen,
  MessageSquare,
  Layers,
  Link2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   WORKSTREAM PAGE PREVIEW
   Renders a visual preview card for a frontend capability (page,
   component, form, table, dialog) from real project data.
   ════════════════════════════════════════════════════════════════════ */

type PagePreviewProps = {
  page: {
    id: string;
    name: string;
    type: string;
    route: string | null;
    description: string | null;
    status: string;
    components: string[];
    apiDependencies: string[];
    order: number;
  };
  compact?: boolean;
  onClick?: () => void;
};

const TYPE_ICONS: Record<string, typeof Monitor> = {
  PAGE: Monitor,
  COMPONENT: Layers,
  FORM: FormInput,
  TABLE: Table2,
  DIALOG: MessageSquare,
  DRAWER: PanelRightOpen,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  PLANNED: { label: "Planned", color: "text-[var(--bos-text-tertiary)]", icon: Circle },
  READY: { label: "Ready", color: "text-[var(--bos-info)]", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-500", icon: AlertTriangle },
  COMPLETED: { label: "Completed", color: "text-emerald-500", icon: CheckCircle2 },
  BLOCKED: { label: "Blocked", color: "text-rose-500", icon: AlertTriangle },
};

export function WorkstreamPagePreview({ page, compact = false, onClick }: PagePreviewProps) {
  const TypeIcon = TYPE_ICONS[page.type] || Monitor;
  const statusCfg = STATUS_CONFIG[page.status] || STATUS_CONFIG.PLANNED;
  const StatusIcon = statusCfg.icon;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left p-3 rounded-xl border transition-all",
          "bg-[var(--bos-bg)] border-[var(--bos-border)]",
          "hover:border-[var(--bos-accent)]/40 hover:shadow-sm cursor-pointer",
          "group"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <TypeIcon className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
            <span className="text-[12.5px] font-semibold text-[var(--bos-text-primary)] truncate">
              {page.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusIcon className={cn("w-3 h-3", statusCfg.color)} />
            <span className={cn("text-[10px] font-mono", statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>
        </div>
        {page.route && (
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] mt-0.5 block">
            {page.route}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border overflow-hidden transition-all",
        "bg-[var(--bos-bg)] border-[var(--bos-border)]",
        "hover:border-[var(--bos-accent)]/40 hover:shadow-md",
        onClick ? "cursor-pointer" : ""
      )}
    >
      {/* Preview Area */}
      <div className="relative h-32 bg-gradient-to-br from-[var(--bos-surface)] to-[var(--bos-surface-sunken)] flex items-center justify-center border-b border-[var(--bos-border)]">
        {/* Simulated UI skeleton from real components */}
        <div className="w-[85%] h-[85%] rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] p-2 flex flex-col gap-1.5 shadow-inner overflow-hidden">
          {/* Top bar skeleton */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--bos-accent)]/30" />
            <div className="h-1.5 w-16 rounded bg-[var(--bos-border)]" />
            <div className="ml-auto h-1.5 w-8 rounded bg-[var(--bos-border)]" />
          </div>
          {/* Content skeleton based on type */}
          {page.type === "TABLE" ? (
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex gap-1">
                <div className="h-1.5 flex-1 rounded bg-[var(--bos-border-strong)]" />
                <div className="h-1.5 flex-1 rounded bg-[var(--bos-border-strong)]" />
                <div className="h-1.5 flex-1 rounded bg-[var(--bos-border-strong)]" />
              </div>
              {[1, 2, 3].map((r) => (
                <div key={r} className="flex gap-1">
                  <div className="h-1.5 flex-1 rounded bg-[var(--bos-border)]" />
                  <div className="h-1.5 flex-1 rounded bg-[var(--bos-border)]" />
                  <div className="h-1.5 flex-1 rounded bg-[var(--bos-border)]" />
                </div>
              ))}
            </div>
          ) : page.type === "FORM" ? (
            <div className="flex-1 flex flex-col gap-1.5">
              {[1, 2, 3].map((r) => (
                <div key={r}>
                  <div className="h-1 w-10 rounded bg-[var(--bos-border-strong)] mb-0.5" />
                  <div className="h-2 w-full rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border)]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-3 gap-1">
              {page.components.slice(0, 6).map((comp, i) => (
                <div key={i} className="rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-center">
                  <span className="text-[5px] font-mono text-[var(--bos-text-tertiary)] truncate px-0.5">
                    {comp}
                  </span>
                </div>
              ))}
              {page.components.length === 0 && (
                <>
                  <div className="rounded bg-[var(--bos-surface-sunken)]" />
                  <div className="col-span-2 rounded bg-[var(--bos-surface-sunken)]" />
                  <div className="col-span-2 rounded bg-[var(--bos-surface-sunken)]" />
                  <div className="rounded bg-[var(--bos-surface-sunken)]" />
                </>
              )}
            </div>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-[8px] font-mono text-[var(--bos-text-tertiary)] uppercase">
          {page.type}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)] truncate">{page.name}</h4>
            {page.route && (
              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{page.route}</span>
            )}
          </div>
          <div className={cn("flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md", statusCfg.color === "text-emerald-500" ? "bg-emerald-500/10" : statusCfg.color === "text-amber-500" ? "bg-amber-500/10" : statusCfg.color === "text-rose-500" ? "bg-rose-500/10" : "bg-[var(--bos-surface)]")}>
            <StatusIcon className={cn("w-3 h-3", statusCfg.color)} />
            <span className={cn("text-[9.5px] font-mono font-bold", statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {page.description && (
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-relaxed line-clamp-2">
            {page.description}
          </p>
        )}

        {/* Component & API counts */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--bos-text-tertiary)]">
          {page.components.length > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {page.components.length} components
            </span>
          )}
          {page.apiDependencies.length > 0 && (
            <span className="flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              {page.apiDependencies.length} APIs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
