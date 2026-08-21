"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlowNode {
  label: string;
  description: string;
}

const nodes: FlowNode[] = [
  { label: "CLIENTS", description: "Accounts & relationships" },
  { label: "REQUIREMENTS", description: "Structured specifications" },
  { label: "PROPOSALS", description: "Priced scope & agreements" },
  { label: "PROJECTS", description: "Engineering blueprints & stages" },
  { label: "TASKS", description: "Operational execution graph" },
  { label: "DELIVERY", description: "Verified milestone signoffs" },
];

interface SystemFlowProps {
  className?: string;
}

/**
 * System Capability Architecture Pipeline.
 * Subtle connection animation initializing stages sequentially without mock counts.
 */
export function SystemFlow({ className }: SystemFlowProps) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % nodes.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn("flex flex-col gap-2.5", className)} aria-hidden="true">
      {nodes.map((node, i) => {
        const isActive = i === activeStage;
        return (
          <div
            key={node.label}
            className={cn(
              "flex items-center justify-between px-3.5 py-2 rounded-xs border transition-all duration-300",
              isActive
                ? "bg-[var(--bos-surface)] border-[var(--bos-accent)] translate-x-1"
                : "bg-transparent border-[var(--bos-line)] opacity-60",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-xs flex items-center justify-center font-mono text-[9.5px] font-bold transition-colors",
                  isActive
                    ? "bg-[var(--bos-accent)] text-white"
                    : "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)] border border-[var(--bos-line)]",
                )}
              >
                0{i + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] font-mono font-semibold tracking-wider transition-colors",
                  isActive
                    ? "text-[var(--bos-text-primary)]"
                    : "text-[var(--bos-text-secondary)]",
                )}
              >
                {node.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] hidden sm:inline">
              {node.description}
            </span>
          </div>
        );
      })}
    </div>
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
        "flex items-center gap-1.5 text-[9px] font-mono tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)]",
        className,
      )}
      aria-hidden="true"
    >
      {labels.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span>{label}</span>
          {i < labels.length - 1 && <span className="opacity-30">→</span>}
        </span>
      ))}
    </div>
  );
}