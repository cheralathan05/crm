"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];

export function RoadmapProgress({
  current,
  mode,
}: {
  current: number; // 0..8 scene index (progress is only shown during scenes)
  mode: "boot" | "scenes" | "connected";
}) {
  if (mode === "boot") {
    return (
      <div className="flex items-center gap-3 text-[9px] tracking-[0.2em] uppercase text-[var(--bos-text-tertiary)] font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)] animate-pulse" />
        <span>SYSTEM INITIALIZING</span>
      </div>
    );
  }

  if (mode === "connected") {
    return (
      <div className="flex items-center gap-3 text-[9px] tracking-[0.2em] uppercase text-[var(--bos-accent)] font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" />
        <span>SYSTEM CONNECTED</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Numeric ruler */}
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "font-mono text-[10px] leading-none transition-colors duration-300",
              i === current && "text-[var(--bos-accent)] font-semibold scale-125",
              i < current && "text-[var(--bos-text-secondary)]",
              i > current && "text-[var(--bos-text-tertiary)] opacity-40",
            )}
            aria-hidden="true"
          >
            {s}
          </span>
        ))}
      </div>
      {/* Progress line */}
      <div className="relative h-px w-full bg-[var(--bos-line-strong)]">
        <motion.div
          className="absolute left-0 top-0 h-px bg-[var(--bos-accent)]"
          initial={false}
          animate={{ width: `${((current + 1) / 9) * 100}%` }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        />
        <motion.span
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]"
          initial={false}
          animate={{ left: `calc(${((current + 1) / 9) * 100}% - 3px)` }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  );
}
