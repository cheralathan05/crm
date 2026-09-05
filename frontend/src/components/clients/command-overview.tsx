"use client";

import {
  ArrowRight,
  CalendarClock,
  Check,
  Circle,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Send,
  ShieldAlert,
  Target,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientDetail, NextAction } from "@/lib/client-serialize";
import { StatusChip } from "./kit";

/* ── Lifecycle ───────────────────────────────────────────────── */

const STAGES = ["LEAD", "QUALIFIED", "REQUIREMENTS", "PROPOSAL", "APPROVAL", "PROJECT", "DELIVERY"] as const;

const STAGE_ICON: Record<(typeof STAGES)[number], React.ReactNode> = {
  LEAD: <Circle className="w-3 h-3" />,
  QUALIFIED: <Check className="w-3 h-3" />,
  REQUIREMENTS: <ClipboardCheck className="w-3 h-3" />,
  PROPOSAL: <FileText className="w-3 h-3" />,
  APPROVAL: <Check className="w-3 h-3" />,
  PROJECT: <FolderKanban className="w-3 h-3" />,
  DELIVERY: <Send className="w-3 h-3" />,
};

export function LifecycleRail({ stage, status }: { stage: string; status: string }) {
  const currentIndex = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-2.5">
        Client lifecycle
      </div>
      <ol className="space-y-0">
        {STAGES.map((s, i) => {
          const completed = status !== "LEAD" && status !== "ARCHIVED" && i < currentIndex;
          const current = status !== "LEAD" && status !== "ARCHIVED" && i === currentIndex;
          return (
            <li key={s} className="flex items-center gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full border transition-colors duration-150",
                    current && "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]",
                    completed && "border-[var(--bos-success)]/40 bg-[var(--bos-success)]/8 text-[var(--bos-success)]",
                    !current && !completed && "border-[var(--bos-line)] text-[var(--bos-text-tertiary)]",
                  )}
                >
                  {current ? STAGE_ICON[s] : completed ? <Check className="w-3 h-3" /> : STAGE_ICON[s]}
                </span>
                {i < STAGES.length - 1 && (
                  <span
                    className={cn(
                      "w-px h-3.5",
                      completed || current ? "bg-[var(--bos-accent)]/40" : "bg-[var(--bos-line)]",
                    )}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-[0.1em] transition-colors duration-150",
                    current ? "text-[var(--bos-accent)]" : completed ? "text-[var(--bos-text-secondary)]" : "text-[var(--bos-text-tertiary)]",
                  )}
                >
                  {s.replace("_", " ")}
                </span>
                {current && (
                  <span className="text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
                    ● current
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Next action engine card ─────────────────────────────────── */

const ACTION_ICON: Record<NextAction["kind"], React.ReactNode> = {
  review: <ClipboardCheck className="w-4 h-4" />,
  proposal: <FileText className="w-4 h-4" />,
  payment: <Wallet className="w-4 h-4" />,
  task: <Target className="w-4 h-4" />,
  deadline: <CalendarClock className="w-4 h-4" />,
  "reach-out": <Send className="w-4 h-4" />,
  create: <FolderKanban className="w-4 h-4" />,
};

export function NextActionCard({
  action,
  ownerName,
  onTake,
}: {
  action: NextAction | null;
  ownerName: string | null;
  onTake: (a: NextAction) => void;
}) {
  if (!action) return null;
  return (
    <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/60">
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-accent)]">
          <Target className="w-3 h-3" aria-hidden="true" />
          Next action
        </div>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
              {action.title}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--bos-text-secondary)] line-clamp-2">{action.detail}</div>
          </div>
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-sm border border-[var(--bos-accent-ring)] text-[var(--bos-accent)]">
            {ACTION_ICON[action.kind]}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[10px] text-[var(--bos-text-tertiary)]">
            {ownerName && (
              <span>
                <span className="font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Owner · </span>
                <span className="text-[var(--bos-text-secondary)]">{ownerName}</span>
              </span>
            )}
            <span>
              <span className="font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Due · </span>
              <span className="text-[var(--bos-text-secondary)]">Today</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onTake(action)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
          >
            Take action
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Relationship score — explainable breakdown ──────────────── */

export function RelationshipScore({ score }: { score: ClientDetail["score"] }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
          Relationship
        </span>
        <span className="text-[22px] font-semibold tracking-tight text-[var(--bos-text-primary)] tabular-nums">
          {score.total}
          <span className="text-[11px] text-[var(--bos-text-tertiary)]"> / 100</span>
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {score.breakdown.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--bos-text-secondary)]">{b.label}</span>
              <span className="text-[var(--bos-text-tertiary)] tabular-nums">{b.value}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--bos-accent)] transition-[width] duration-500"
                style={{ width: `${b.value}%` }}
                title={b.reason}
              />
            </div>
            <div className="mt-0.5 text-[9px] text-[var(--bos-text-tertiary)] truncate" title={b.reason}>
              {b.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Health + attention center ───────────────────────────────── */

export function HealthBlock({
  health,
  attentionCount,
  onScrollToAttention,
}: {
  health: ClientDetail["health"];
  attentionCount: number;
  onScrollToAttention: () => void;
}) {
  const riskCount = health.reasons.filter((r) => r.kind !== "ok").length;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-1">
          Health
        </div>
        <StatusChip status={health.health} />
        {health.reasons.filter((r) => r.kind === "ok").slice(0, 2).map((r) => (
          <div key={r.text} className="mt-1 text-[10px] text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
            <Check className="w-2.5 h-2.5 text-[var(--bos-success)]" aria-hidden="true" />
            {r.text}
          </div>
        ))}
      </div>
      {riskCount > 0 && (
        <button
          type="button"
          onClick={onScrollToAttention}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--bos-warning)] hover:text-[var(--bos-warning)]/80 transition-colors duration-150"
        >
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          {attentionCount} thing{attentionCount === 1 ? "" : "s"} need attention
        </button>
      )}
    </div>
  );
}
