"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, CheckCircle2, AlertTriangle, ArrowRight, User, Calendar, FolderKanban } from "lucide-react";

export interface DrillDownItem {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeTone?: "success" | "warning" | "error" | "neutral";
  details: { label: string; value: string }[];
  actionLabel?: string;
  onAction?: () => void;
}

export interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  categoryName: string;
  items: DrillDownItem[];
}

export function DrillDownModal({
  isOpen,
  onClose,
  title,
  categoryName,
  items,
}: DrillDownModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface-panel)] shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bos-line)] bg-[var(--bos-surface)] shrink-0">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-accent)]">
                OPERATIONAL DRILL-DOWN · {categoryName}
              </div>
              <h2 className="text-sm font-semibold text-[var(--bos-text-primary)] mt-0.5">
                {title} ({items.length} records)
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-line)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--bos-text-secondary)]">
                No active records found in this view.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--bos-text-primary)]">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {item.badgeText && (
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] shrink-0 font-medium ${
                          item.badgeTone === "success"
                            ? "bg-[var(--bos-success)]/10 text-[var(--bos-success)] border border-[var(--bos-success)]/20"
                            : item.badgeTone === "warning"
                              ? "bg-[var(--bos-warning)]/10 text-[var(--bos-warning)] border border-[var(--bos-warning)]/20"
                              : item.badgeTone === "error"
                                ? "bg-[var(--bos-error)]/10 text-[var(--bos-error)] border border-[var(--bos-error)]/20"
                                : "bg-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                        }`}
                      >
                        {item.badgeText}
                      </span>
                    )}
                  </div>

                  {/* Key Values Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--bos-line)]">
                    {item.details.map((det, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                          {det.label}
                        </span>
                        <span className="font-medium text-[var(--bos-text-primary)] mt-0.5 block break-words">
                          {det.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {item.actionLabel && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={item.onAction}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white transition-colors"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end px-5 py-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface)] shrink-0">
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
