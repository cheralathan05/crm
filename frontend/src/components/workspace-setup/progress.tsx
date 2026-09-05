"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  { code: "01", label: "IDENTITY" },
  { code: "02", label: "BUSINESS" },
  { code: "03", label: "OPERATIONS" },
  { code: "04", label: "TEAM" },
  { code: "05", label: "WORK" },
  { code: "06", label: "PREFERENCES" },
];

export function WorkspaceProgress({
  current,
  phase,
}: {
  current: number;
  phase: "intro" | "steps" | "review" | "creating" | "ready";
}) {
  const reached = phase === "review" || phase === "creating" || phase === "ready" ? STEPS.length : current;

  return (
    <div>
      {/* Codes */}
      <div className="flex items-center justify-between mb-1">
        {STEPS.map((step, i) => {
          const active = phase === "steps" && i === current;
          const done = i < reached;
          return (
            <motion.span
              key={step.code}
              animate={{ opacity: active || done ? 1 : 0.4 }}
              className={cn(
                "text-[9px] font-mono tracking-[0.16em] transition-colors",
                active ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-tertiary)]",
              )}
            >
              {step.code}
            </motion.span>
          );
        })}
      </div>

      {/* Line */}
      <div className="relative h-px bg-[var(--bos-line-strong)]">
        <motion.div
          className="absolute inset-y-0 left-0 bg-[var(--bos-accent)]"
          initial={false}
          animate={{ width: `${(reached / STEPS.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 26 }}
        />
        {STEPS.map((step, i) => {
          const active = phase === "steps" && i === current;
          return (
            <span
              key={step.code}
              className={cn(
                "absolute -top-[3px] w-[7px] h-[7px] rounded-full -translate-x-1/2 border",
                i < reached
                  ? "bg-[var(--bos-accent)] border-[var(--bos-accent)]"
                  : "bg-[var(--bos-bg)] border-[var(--bos-border-strong)]",
                active && "ring-2 ring-[var(--bos-accent-ring)]",
              )}
              style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-1.5">
        {STEPS.map((step, i) => {
          const active = phase === "steps" && i === current;
          return (
            <span
              key={step.code}
              className={cn(
                "text-[7.5px] font-mono tracking-[0.14em] uppercase transition-colors",
                active ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-text-tertiary)]",
              )}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
