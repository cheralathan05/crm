"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS } from "@/lib/requirement-config";
import { Progress } from "@/components/clients/kit";

/* ── Desktop vertical progress rail — states come from real data ── */

export function ProgressRail({
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
  return (
    <aside className="sticky top-24 hidden lg:block w-60 shrink-0" aria-label="Progress">
      <div className="section-number mb-1.5">YOUR PROJECT</div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[16px] font-semibold tabular-nums text-[var(--bos-text-primary)]">{completeness}%</span>
        <span className="text-[10px] text-[var(--bos-text-tertiary)]">complete</span>
      </div>
      <Progress value={completeness} className="mb-5" />

      <nav>
        <ol className="space-y-0.5">
          {SECTIONS.map((s) => {
            const complete = states[s.key] === true;
            const active = current === s.key;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onJump(s.key)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors duration-150",
                    active ? "bg-[var(--bos-overlay)]" : "hover:bg-[var(--bos-overlay)]/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-full shrink-0 border transition-colors duration-150",
                      complete
                        ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white"
                        : active
                          ? "border-[var(--bos-accent)]"
                          : "border-[var(--bos-border-strong)]",
                    )}
                    aria-hidden="true"
                  >
                    {complete ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : active ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" />
                    ) : (
                      <Circle className="w-2 h-2 text-[var(--bos-border-strong)]" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block font-mono text-[9px] tracking-[0.1em]", complete ? "text-[var(--bos-success)]" : "text-[var(--bos-text-tertiary)]")}>
                      {s.number}
                    </span>
                    <span
                      className={cn(
                        "block text-[12px] leading-tight transition-colors duration-150",
                        active ? "text-[var(--bos-text-primary)] font-medium" : "text-[var(--bos-text-secondary)] group-hover:text-[var(--bos-text-primary)]",
                        complete && !active && "text-[var(--bos-text-tertiary)]",
                      )}
                    >
                      {s.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
