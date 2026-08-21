"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  ArrowRight,
  Database,
  Server,
  Globe,
  ShieldCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposedWorkPlanOutput, ProposedWorkItem } from "@/lib/ai/schemas/blueprint.schema";

export type WorkPlanModalProps = {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommitted: () => void;
};

export function WorkPlanModal({
  projectId,
  isOpen,
  onClose,
  onCommitted,
}: WorkPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [plan, setPlan] = useState<ProposedWorkPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint/work-plan`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok && data.plan) {
        setPlan(data.plan);
      } else {
        setError(data.message || "Failed to generate work plan proposal.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!plan || plan.workItems.length === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint/work-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workItems: plan.workItems }),
      });
      const data = await res.json();
      if (data.ok) {
        onCommitted();
        onClose();
      } else {
        setError(data.message || "Failed to commit work items.");
      }
    } catch (err: any) {
      setError(err.message || "Commit failed.");
    } finally {
      setCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                AI Engineering Work Plan Generator
              </h3>
              <p className="text-[12px] text-[var(--bos-text-secondary)]">
                Transforms approved blueprint architecture into executable production tasks with layer tags & Work DNA.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-border)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[13px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!plan && !loading && (
            <div className="text-center py-10 space-y-4">
              <Layers className="w-10 h-10 mx-auto text-[var(--bos-text-tertiary)]" />
              <div>
                <h4 className="text-[15px] font-semibold text-[var(--bos-text-primary)]">
                  Ready to Generate Execution Plan
                </h4>
                <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1 max-w-md mx-auto">
                  AI will analyze the approved blueprint, resolve dependency order, estimate effort, and propose structured tasks across Database, Backend, Frontend, and QA.
                </p>
              </div>
              <button
                onClick={fetchPlan}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[13px] font-medium transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Generate Proposed Work Plan
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-[var(--bos-accent)]" />
              <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">
                Analyzing blueprint dependencies & generating work breakdown...
              </p>
            </div>
          )}

          {plan && !loading && (
            <div className="space-y-5">
              {/* Summary Stats */}
              <div className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                    {plan.planSummary}
                  </h4>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                    Review and verify before committing to production project tasks.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Total Tasks</span>
                    <span className="text-[14px] font-bold text-[var(--bos-text-primary)]">{plan.workItems.length}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] block">Est. Effort</span>
                    <span className="text-[14px] font-bold text-[var(--bos-accent)]">{plan.totalEstimatedHours}h</span>
                  </div>
                </div>
              </div>

              {/* Proposed Work Items List */}
              <div className="space-y-2.5">
                <h5 className="text-[12px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-tertiary)]">
                  Proposed Engineering Tasks ({plan.workItems.length})
                </h5>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {plan.workItems.map((item) => (
                    <div
                      key={item.workId}
                      className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl flex items-start justify-between gap-3 hover:border-[var(--bos-border-strong)] transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                            item.layer === "DATABASE" ? "bg-purple-500/10 text-purple-600" :
                            item.layer === "BACKEND" ? "bg-emerald-500/10 text-emerald-600" :
                            item.layer === "FRONTEND" ? "bg-sky-500/10 text-sky-600" : "bg-amber-500/10 text-amber-600"
                          )}>
                            {item.workId}
                          </span>
                          <h6 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                            {item.title}
                          </h6>
                        </div>
                        <p className="text-[11px] text-[var(--bos-text-secondary)]">{item.description}</p>
                        <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                          <span>Layer: {item.layer}</span>
                          <span>REQ: {item.requirementId}</span>
                          <span>Role: {item.suggestedRole}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[12px] font-mono font-bold text-[var(--bos-text-primary)]">{item.estimatedHours}h</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] block mt-1">
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-[13px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {plan && (
            <button
              onClick={handleCommit}
              disabled={committing}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {committing ? "Committing Tasks..." : `Commit & Create ${plan.workItems.length} Real Tasks`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
