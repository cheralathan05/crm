"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, X, AlertCircle, ArrowDown, User, Layers } from "lucide-react";
import type { RootCauseGraphData, RootCauseNode } from "@/lib/analytics/root-cause.service";

export interface RootCauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RootCauseGraphData | null;
  onSelectNode?: (node: RootCauseNode) => void;
}

export function RootCauseModal({ isOpen, onClose, data, onSelectNode }: RootCauseModalProps) {
  if (!isOpen || !data) return null;

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
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[var(--bos-accent)]" />
              <div>
                <h2 className="text-xs font-mono uppercase tracking-[0.12em] font-semibold text-[var(--bos-text-primary)]">
                  ROOT CAUSE GRAPH · DETERMINISTIC DEPENDENCY CHAIN
                </h2>
                <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                  Target: {data.targetTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-line)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Root Cause Banner */}
            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider font-bold">
                  DETERMINED ROOT CAUSE
                </span>
                <p className="text-xs font-medium mt-0.5 leading-relaxed">
                  {data.rootCauseSummary}
                </p>
              </div>
            </div>

            {/* Causal Chain Nodes */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                CAUSAL TRAVERSAL PIPELINE (ORIGIN → IMPACT)
              </span>
              <div className="mt-3 space-y-2">
                {data.nodes.map((node, index) => (
                  <div key={node.id} className="flex flex-col items-center">
                    <div
                      onClick={() => onSelectNode?.(node)}
                      className={`w-full p-3 rounded-sm border transition-all cursor-pointer ${
                        node.isRootCause
                          ? "border-[var(--bos-error)] bg-[var(--bos-error)]/5 shadow-xs"
                          : node.status === "BLOCKED"
                            ? "border-[var(--bos-warning)] bg-[var(--bos-surface)]"
                            : "border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] hover:border-[var(--bos-line-strong)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-mono uppercase tracking-wider ${
                              node.isRootCause
                                ? "bg-[var(--bos-error)] text-white"
                                : "bg-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                            }`}
                          >
                            {node.isRootCause ? "ROOT CAUSE ORIGIN" : node.nodeType}
                          </span>
                          <span className="text-xs font-semibold text-[var(--bos-text-primary)]">
                            {node.label}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] ${
                            node.status === "BLOCKED"
                              ? "bg-[var(--bos-error)]/10 text-[var(--bos-error)]"
                              : node.status === "DONE"
                                ? "bg-[var(--bos-success)]/10 text-[var(--bos-success)]"
                                : "bg-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                          }`}
                        >
                          {node.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-[var(--bos-text-secondary)]">
                        {node.ownerName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                            {node.ownerName}
                          </span>
                        )}
                        {node.layer && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                            {node.layer}
                          </span>
                        )}
                        {node.reason && (
                          <span className="text-[var(--bos-warning)] font-medium">
                            {node.reason}
                          </span>
                        )}
                      </div>
                    </div>

                    {index < data.nodes.length - 1 && (
                      <div className="py-1 flex flex-col items-center text-[var(--bos-text-tertiary)]">
                        <ArrowDown className="w-3.5 h-3.5 animate-pulse" />
                        <span className="text-[8px] font-mono uppercase tracking-wider">
                          Blocks Downstream
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
