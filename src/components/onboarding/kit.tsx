"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────
   Scripted sequence — deterministic story timing.
   Plays once per mount; timers are always cleaned up.
──────────────────────────────────────────────── */
export function useSequence(total: number, intervalMs: number) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Scripted animation resets when the scene (re)mounts — intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(0);
    const timers: number[] = [];
    for (let i = 1; i < total; i++) {
      timers.push(window.setTimeout(() => setIndex(i), i * intervalMs));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [total, intervalMs]);

  return index;
}

/* ────────────────────────────────────────────────
   Fake typing — types `text` progressively.
──────────────────────────────────────────────── */
export function useTypewriter(text: string, charMs = 24) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Scripted typing restarts when the field is re-mounted — intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(0);
    const t = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(t);
          return c;
        }
        return c + 1;
      });
    }, charMs);
    return () => window.clearInterval(t);
  }, [text, charMs]);
  return text.slice(0, count);
}

/* ────────────────────────────────────────────────
   MiniApp — the miniature real-application window.
   Every scene's preview lives inside one of these.
──────────────────────────────────────────────── */
export function MiniApp({
  title,
  status,
  statusTone = "neutral",
  children,
  className,
}: {
  title: string;
  status?: string;
  statusTone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full border border-[var(--bos-border)] bg-[var(--bos-surface)] rounded-sm shadow-[var(--bos-shadow-md)] overflow-hidden",
        className,
      )}
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--bos-border-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--bos-border-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--bos-border-strong)]" />
          <span className="ml-2 text-[9px] tracking-[0.18em] text-[var(--bos-text-tertiary)] uppercase font-mono">
            {title}
          </span>
        </div>
        {status && (
          <Chip tone={statusTone}>{status}</Chip>
        )}
      </div>
      <div className="p-3.5 sm:p-4">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Status chip
──────────────────────────────────────────────── */
export type Tone = "neutral" | "accent" | "green" | "amber" | "red" | "blue";

const toneColor: Record<Tone, string> = {
  neutral: "var(--bos-text-secondary)",
  accent: "var(--bos-accent)",
  green: "var(--bos-success)",
  amber: "var(--bos-warning)",
  red: "var(--bos-error)",
  blue: "var(--bos-info)",
};

export function Chip({
  children,
  tone = "neutral",
  dot = true,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  const color = toneColor[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-medium tracking-[0.14em] uppercase whitespace-nowrap",
        className,
      )}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      {dot && <span className="w-1 h-1 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────
   Label/value row
──────────────────────────────────────────────── */
export function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[var(--bos-line)] last:border-0">
      <span className="text-[10px] tracking-[0.1em] uppercase text-[var(--bos-text-tertiary)]">
        {label}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium text-[var(--bos-text-primary)] text-right",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Thin progress bar
──────────────────────────────────────────────── */
export function Bar({
  value,
  tone = "accent",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("h-[3px] w-full bg-[var(--bos-line)] rounded-full overflow-hidden", className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: toneColor[tone] }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────
   Avatar (initials)
──────────────────────────────────────────────── */
export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-semibold tracking-wide",
        className,
      )}
      style={{
        color: "var(--bos-accent)",
        background: "var(--bos-accent-subtle)",
        border: "1px solid var(--bos-accent-ring)",
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/* ────────────────────────────────────────────────
   Mono section tag
──────────────────────────────────────────────── */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[9px] tracking-[0.2em] uppercase text-[var(--bos-text-tertiary)] font-mono",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Fade/slide-in row (deterministic reveal)
──────────────────────────────────────────────── */
export function Reveal({
  show,
  children,
  delay = 0,
  className,
}: {
  show: boolean;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
   The persistent connection line between stages
──────────────────────────────────────────────── */
export function FlowArrow({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 my-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      <span className="w-6 h-px bg-[var(--bos-accent)]/60" />
      <motion.span
        className="text-[8px] tracking-[0.2em] uppercase text-[var(--bos-accent)] font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
      >
        {label}
      </motion.span>
      <svg width="14" height="8" viewBox="0 0 14 8" fill="none" className="text-[var(--bos-accent)]">
        <path d="M0 4h12m0 0-4-3.5M12 4l-4 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}
