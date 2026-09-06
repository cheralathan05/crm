"use client";

import { useState } from "react";
import { X, AlertTriangle, ArrowRight, Loader2, Clock, DollarSign, Layers } from "lucide-react";
import type { ChangeImpactResult } from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   PROPOSAL CHANGE IMPACT MODAL (Screens 64 & 65)
   When a new feature or change is proposed ("Add inventory management"),
   the system calculates impact on frontend, backend, database, QA, timeline, and budget.
   ──────────────────────────────────────────────────────────────────────────── */

interface ChangeImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
}

export function ChangeImpactModal({ isOpen, onClose, requirementId }: ChangeImpactModalProps) {
  const [featureTitle, setFeatureTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChangeImpactResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureTitle.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/change-impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRequirement: featureTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Calculation failed");
      setResult(data.impact);
    } catch (err: any) {
      setError(err?.message || "Failed to calculate change impact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bos-surface-panel)] border border-[var(--bos-line-strong)] rounded-sm max-w-xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold mb-1">
          <AlertTriangle className="w-4 h-4" />
          <span>Scope Change Impact Analysis</span>
        </div>

        <h2 className="text-[18px] font-semibold text-[var(--bos-text-primary)]">
          Evaluate Feature Change Impact
        </h2>

        <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1">
          Before adding a feature to confirmed scope, calculate the engineering, timeline, and commercial impact.
        </p>

        <form onSubmit={handleCalculate} className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={featureTitle}
              onChange={(e) => setFeatureTitle(e.target.value)}
              placeholder="e.g. Automated Inventory Sync & Low-Stock Alerts"
              className="flex-1 h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)]"
            />
            <button
              type="submit"
              disabled={!featureTitle.trim() || loading}
              className="h-10 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 shrink-0 inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Calculate Impact</span>
            </button>
          </div>
        </form>

        {error && <div className="mt-3 text-[12px] text-rose-600">{error}</div>}

        {result && (
          <div className="mt-5 pt-4 border-t border-[var(--bos-line)] space-y-4 text-[12px]">
            {/* Impact Metric Chips */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[var(--bos-accent)]" />
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">Timeline Impact</div>
                  <div className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                    +{result.estimatedTimelineAdditionDays} Business Days
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">Budget Adjustment</div>
                  <div className="text-[14px] font-semibold text-emerald-600">
                    +{result.estimatedBudgetDeltaPercent}% estimated delta
                  </div>
                </div>
              </div>
            </div>

            {/* Workstream Breakdown */}
            <div className="space-y-2">
              <span className="font-semibold text-[var(--bos-text-primary)] block">
                Engineering Workstream Impact:
              </span>
              <ul className="space-y-1 text-[11px] text-[var(--bos-text-secondary)]">
                {result.frontendImpact.map((item, idx) => (
                  <li key={`fe_${idx}`}>• Frontend: {item}</li>
                ))}
                {result.backendImpact.map((item, idx) => (
                  <li key={`be_${idx}`}>• Backend: {item}</li>
                ))}
                {result.databaseImpact.map((item, idx) => (
                  <li key={`db_${idx}`}>• Database: {item}</li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-[var(--bos-text-tertiary)] italic">
              {result.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
