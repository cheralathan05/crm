"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlowNode {
  label: string;
  count?: number;
  description?: string;
}

const nodes: FlowNode[] = [
  { label: "CLIENT", count: 128, description: "Active engagements" },
  { label: "REQUIREMENT", count: 24, description: "Open specifications" },
  { label: "PROPOSAL", count: 16, description: "In review" },
  { label: "PROJECT", count: 12, description: "In progress" },
  { label: "TASK", count: 47, description: "Assigned items" },
  { label: "DELIVERY", count: 8, description: "This quarter" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.3 },
  },
};

const nodeVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

interface SystemFlowProps {
  className?: string;
}

/**
 * Decorative product architecture flow.
 *
 * Represents the structural pipeline:
 *   CLIENT → REQUIREMENT → PROPOSAL → PROJECT → TASK → DELIVERY
 *
 * These are NOT real dashboard stats — they are conceptual visual
 * elements demonstrating the product's purpose.
 */
export function SystemFlow({ className }: SystemFlowProps) {
  return (
    <motion.div
      className={cn("flex flex-col gap-3", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-hidden="true"
    >
      {nodes.map((node, i) => (
        <motion.div
          key={node.label}
          variants={nodeVariants}
          className="group flex items-center gap-3 py-2"
        >
          {/* Connection line */}
          {i > 0 && (
            <div className="absolute -top-0 left-[3px] h-[28px] w-px bg-[var(--bos-line)]" />
          )}

          {/* Node indicator */}
          <div className="relative flex items-center gap-3">
            <div className="w-[7px] h-[7px] rounded-full border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] transition-colors group-hover:border-[var(--bos-accent)]" />

            {/* Arrow connector */}
            <div className="w-[16px] h-px bg-[var(--bos-line)]" />
          </div>

          {/* Content */}
          <div className="flex items-baseline gap-2.5">
            <span className="text-[11px] font-medium tracking-[0.12em] text-[var(--bos-text-secondary)] uppercase">
              {node.label}
            </span>
            {node.count !== undefined && (
              <span className="text-[13px] font-semibold text-[var(--bos-text-primary)] tabular-nums">
                {node.count}
              </span>
            )}
            <span className="text-[9px] text-[var(--bos-text-tertiary)] tracking-wide hidden lg:inline">
              {node.description}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Compact horizontal flow — used on mobile.
 */
export function SystemFlowCompact({ className }: SystemFlowProps) {
  const labels = nodes.map((n) => n.label);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)]",
        className,
      )}
      aria-hidden="true"
    >
      {labels.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span>{label}</span>
          {i < labels.length - 1 && (
            <span className="opacity-30">→</span>
          )}
        </span>
      ))}
    </div>
  );
}