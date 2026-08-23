"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const FLOW_STAGES = [
  { label: "CLIENT", code: "01" },
  { label: "REQUIREMENT", code: "02" },
  { label: "REVIEW", code: "03" },
  { label: "PROPOSAL", code: "04" },
  { label: "PROJECT", code: "05" },
  { label: "TASK", code: "06" },
  { label: "EMPLOYEE", code: "07" },
  { label: "GITHUB", code: "08" },
  { label: "DELIVERY", code: "09" },
];

/**
 * Persistent operational spine. Always mounted — the active stage advances
 * along it, which is what makes the journey feel like one moving system
 * instead of separate pages.
 */
export function SystemRail({
  active,
  mode,
}: {
  active: number; // scene index 0..8, or -1 during boot/connected
  mode: "boot" | "scenes" | "connected";
}) {
  return (
    <div className="relative pl-1" aria-hidden="true">
      {/* Spine */}
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[var(--bos-line-strong)]" />
      <motion.div
        className="absolute left-[5px] top-2 w-px bg-[var(--bos-accent)]"
        initial={false}
        animate={{
          height:
            mode === "boot" ? "0%" : mode === "connected" ? "100%" : `${((active + 1) / 9) * 100}%`,
        }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ transformOrigin: "top" }}
      />

      <div className="flex flex-col">
        {FLOW_STAGES.map((stage, i) => {
          const isActive = mode === "scenes" && i === active;
          const isDone = mode === "scenes" && i < active;
          const isConnected = mode === "connected";
          return (
            <div key={stage.code} className="relative flex items-center gap-3 py-[9px]">
              <span
                className={cn(
                  "w-[11px] h-[11px] rounded-full border transition-colors duration-300",
                  isActive || isConnected
                    ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]"
                    : isDone
                      ? "border-[var(--bos-accent)] bg-[var(--bos-bg)]"
                      : "border-[var(--bos-border-strong)] bg-[var(--bos-bg)]",
                )}
              />
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-[9px] font-mono tracking-[0.14em] transition-colors duration-300",
                    isActive
                      ? "text-[var(--bos-accent)]"
                      : isConnected || isDone
                        ? "text-[var(--bos-text-secondary)]"
                        : "text-[var(--bos-text-tertiary)] opacity-40",
                  )}
                >
                  {stage.code}
                </span>
                <span
                  className={cn(
                    "text-[10px] tracking-[0.16em] uppercase transition-colors duration-300",
                    isActive
                      ? "text-[var(--bos-text-primary)] font-medium"
                      : isConnected
                        ? "text-[var(--bos-text-secondary)]"
                        : isDone
                          ? "text-[var(--bos-text-secondary)] opacity-70"
                          : "text-[var(--bos-text-tertiary)] opacity-40",
                  )}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
