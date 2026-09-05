"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, X, Calculator, Database, Check } from "lucide-react";

export interface MetricLineageModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricName: string;
  definition: string;
  currentValue: string;
  formula: string;
  lineageSteps?: { label: string; amount: string; operator: string; source: string }[];
  sourceTables: string[];
}

export function MetricLineageModal({
  isOpen,
  onClose,
  metricName,
  definition,
  currentValue,
  formula,
  lineageSteps,
  sourceTables,
}: MetricLineageModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-lg rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface-panel)] shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bos-line)] bg-[var(--bos-surface)]">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[var(--bos-accent)]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.12em] font-semibold text-[var(--bos-text-primary)]">
                METRIC EXPLORER · HOW THIS WAS CALCULATED
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-line)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                METRIC
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <h3 className="text-base font-semibold text-[var(--bos-text-primary)]">
                  {metricName}
                </h3>
                <span className="text-sm font-mono font-bold text-[var(--bos-accent)]">
                  {currentValue}
                </span>
              </div>
              <p className="text-xs text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed">
                {definition}
              </p>
            </div>

            {/* Formula Block */}
            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)]">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                <Info className="w-3 h-3 text-[var(--bos-accent)]" /> CALCULATION RULE
              </span>
              <p className="text-xs font-mono text-[var(--bos-text-primary)] mt-1 font-medium">
                {formula}
              </p>
            </div>

            {/* Lineage Steps */}
            {lineageSteps && lineageSteps.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                  TRANSACTIONAL AUDIT LINEAGE
                </span>
                <div className="mt-1.5 border border-[var(--bos-line)] rounded-sm divide-y divide-[var(--bos-line)] overflow-hidden">
                  {lineageSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2 text-xs bg-[var(--bos-surface)]/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 text-center font-mono font-bold text-[var(--bos-accent)]">
                          {step.operator}
                        </span>
                        <span className="text-[var(--bos-text-primary)] font-medium">
                          {step.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-[var(--bos-text-primary)]">
                          {step.amount}
                        </span>
                        <span className="block text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                          {step.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Tables */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1">
                <Database className="w-3 h-3" /> SOURCE OF TRUTH TABLES
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {sourceTables.map((table, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono border border-[var(--bos-line)] bg-[var(--bos-surface)] text-[var(--bos-text-secondary)]"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end px-5 py-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface)]">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-sm text-xs font-medium bg-[var(--bos-surface-panel)] border border-[var(--bos-line)] hover:bg-[var(--bos-line)] text-[var(--bos-text-primary)] transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
