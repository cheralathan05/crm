"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert, X, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChangePreviewData {
  key: string;
  name: string;
  category: string;
  scope: string;
  beforeValue: any;
  afterValue: any;
  impact: {
    affectedUsers: number;
    affectedProjects: number;
    affectedTeams: number;
    affectedWorkflows: number;
    affectedIntegrations: number;
    description: string;
  };
  dependencies: string[];
  affectedModules: string[];
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresConfirmation: boolean;
  warnings: string[];
}

export interface ChangePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  preview: ChangePreviewData | null;
  loading: boolean;
}

export function ChangePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  preview,
  loading,
}: ChangePreviewModalProps) {
  if (!isOpen || !preview) return null;

  const riskColors = {
    LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    CRITICAL: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bos-line)] bg-[var(--bos-surface-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-[var(--bos-text-primary)]">
                Review Configuration Change
              </h3>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border",
                  riskColors[preview.risk]
                )}
              >
                {preview.risk} Risk
              </span>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
              Pre-flight impact analysis computed from active database state.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] p-1 rounded-lg hover:bg-[var(--bos-surface)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Setting Title & Scope */}
          <div className="p-3 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface-subtle)]">
            <div className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider">
              Target Setting
            </div>
            <div className="text-[14px] font-semibold text-[var(--bos-text-primary)] mt-0.5">
              {preview.name}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--bos-text-secondary)]">
              <span>
                Key: <strong className="font-mono">{preview.key}</strong>
              </span>
              <span>•</span>
              <span>
                Scope: <strong className="font-mono">{preview.scope}</strong>
              </span>
              <span>•</span>
              <span>
                Category: <strong className="font-mono">{preview.category}</strong>
              </span>
            </div>
          </div>

          {/* Before vs After Diff */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)]/40">
              <div className="text-[10px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider">
                Current Value (Before)
              </div>
              <div className="mt-1 font-mono text-[13px] text-[var(--bos-text-secondary)] break-all font-medium">
                {String(preview.beforeValue)}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold">
                Proposed Value (After)
              </div>
              <div className="mt-1 font-mono text-[13px] text-blue-300 break-all font-semibold">
                {String(preview.afterValue)}
              </div>
            </div>
          </div>

          {/* Impact Metrics Grid */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider">
              Quantified System Impact
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                  {preview.impact.affectedUsers}
                </div>
                <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                  Users
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                  {preview.impact.affectedProjects}
                </div>
                <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                  Projects
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                  {preview.impact.affectedWorkflows}
                </div>
                <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                  Workflows
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                <div className="text-[18px] font-mono font-bold text-[var(--bos-text-primary)]">
                  {preview.impact.affectedIntegrations}
                </div>
                <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                  Integrations
                </div>
              </div>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed mt-1">
              {preview.impact.description}
            </p>
          </div>

          {/* Dependencies & Affected Modules */}
          {preview.dependencies.length > 0 && (
            <div className="p-3 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface-subtle)] space-y-1">
              <div className="text-[11px] font-medium text-[var(--bos-text-primary)]">
                Dependent Services & Workflows
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preview.dependencies.map((dep) => (
                  <span
                    key={dep}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warnings if High/Critical */}
          {preview.warnings.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Operational Warnings
              </div>
              <ul className="text-[12px] text-amber-300/90 list-disc list-inside space-y-0.5 pt-1">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--bos-line)] bg-[var(--bos-surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Persisting...
              </>
            ) : (
              <>
                <span>Apply Change</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
