"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS } from "@/lib/requirement-config";
import { Progress } from "@/components/clients/kit";

/* ── Mobile: sticky progress header + horizontal step chips ── */

export function MobileNav({
  current,
  states,
  completeness,
  onJump,
}: {
  current: string;
  states: Record<string, boolean>;
  completeness: number;
  onJump: (key: string) => void;
}) {
  const index = Math.max(0, SECTIONS.findIndex((s) => s.key === current));
  const section = SECTIONS[index];
  const total = SECTIONS.length;

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-[var(--bos-bg)]/95 backdrop-blur-sm border-b border-[var(--bos-line)]">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-semibold tabular-nums text-[var(--bos-text-primary)]">{completeness}%</span>
            <span className="text-[11px] text-[var(--bos-text-secondary)]">
              {section.label} · Step {index + 1} of {total}
            </span>
          </div>
        </div>
        <Progress value={completeness} />
      </div>
      <nav aria-label="Sections" className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 no-scrollbar">
        {SECTIONS.map((s) => {
          const complete = states[s.key] === true;
          const active = current === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onJump(s.key)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-1 h-7 px-2.5 rounded-sm border text-[11px] whitespace-nowrap transition-colors duration-150",
                active
                  ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                  : complete
                    ? "border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)]"
                    : "border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-secondary)]",
              )}
            >
              {complete && <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" />}
              {s.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
