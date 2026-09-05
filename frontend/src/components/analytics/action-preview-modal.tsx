"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, ArrowRight, X, ShieldAlert } from "lucide-react";
import { useState } from "react";

export interface ActionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  actionType: string;
  entityTitle: string;
  currentValue: string;
  newValue: string;
  affectedEntities: string[];
  impactDescription: string;
}

export function ActionPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionType,
  entityTitle,
  currentValue,
  newValue,
  affectedEntities,
  impactDescription,
}: ActionPreviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <ShieldAlert className="w-4 h-4 text-[var(--bos-accent)]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.12em] font-semibold text-[var(--bos-text-primary)]">
                ACTION PREVIEW · WHAT WILL CHANGE
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
                TARGET RECORD
              </span>
              <h3 className="text-sm font-semibold text-[var(--bos-text-primary)] mt-0.5">
                {entityTitle}
              </h3>
            </div>

            {/* Diff Box */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)]">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-warning)]" /> CURRENT STATE
                </span>
                <p className="text-xs font-mono text-[var(--bos-text-secondary)] mt-1 break-words">
                  {currentValue}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-accent)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)]" /> NEW STATE
                </span>
                <p className="text-xs font-mono text-[var(--bos-success)] mt-1 font-semibold break-words">
                  {newValue}
                </p>
              </div>
            </div>

            {/* Affected Entities */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                AFFECTED BUSINESS CONTEXT
              </span>
              <ul className="mt-1 space-y-1">
                {affectedEntities.map((ent, i) => (
                  <li
                    key={i}
                    className="text-xs text-[var(--bos-text-secondary)] flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3 text-[var(--bos-accent)] shrink-0" />
                    <span>{ent}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Impact Explanation */}
            <div className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/70 text-xs text-[var(--bos-text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--bos-text-primary)]">Impact: </span>
              {impactDescription}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-sm text-xs font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-line)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Executing...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Execute Change</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
