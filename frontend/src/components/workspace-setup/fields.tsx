"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Question block ─────────────────────────────── */

export function Question({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mb-6 last:mb-0">
      <legend className="mb-2 text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
        {eyebrow}
      </legend>
      <div className="text-[15px] font-semibold tracking-tight text-[var(--bos-text-primary)] mb-1">
        {title}
      </div>
      {hint && <p className="text-[11px] text-[var(--bos-text-tertiary)] mb-3">{hint}</p>}
      {children}
    </fieldset>
  );
}

/* ── Single-select choice grid ──────────────────── */

export function ChoiceGrid({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-1.5", columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm border text-left transition-all duration-150",
              selected
                ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]"
                : "border-[var(--bos-line)] bg-[var(--bos-bg)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-overlay)]",
            )}
          >
            <span
              className={cn(
                "text-[11px] leading-tight transition-colors",
                selected
                  ? "text-[var(--bos-accent)] font-medium"
                  : "text-[var(--bos-text-secondary)]",
              )}
            >
              {option}
            </span>
            <span
              className={cn(
                "w-3.5 h-3.5 shrink-0 rounded-full border flex items-center justify-center transition-all",
                selected
                  ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]"
                  : "border-[var(--bos-border-strong)]",
              )}
            >
              {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Multi-select choice grid ───────────────────── */

export function MultiChoiceGrid({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[11px] transition-all duration-150",
              selected
                ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                : "border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            {selected && <Check className="w-3 h-3" strokeWidth={3} />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

/* ── Text field ─────────────────────────────────── */

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="bos-label">
        {label}
        {optional && (
          <span className="ml-1.5 normal-case tracking-normal text-[var(--bos-text-tertiary)] opacity-70">
            (optional)
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={200}
        className="bos-input"
      />
    </div>
  );
}

/* ── Segmented control ──────────────────────────── */

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="sr-only">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex flex-wrap gap-0.5 p-0.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]"
      >
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                "px-3 py-1.5 rounded-[2px] text-[10px] tracking-[0.08em] uppercase transition-all duration-150",
                selected
                  ? "bg-[var(--bos-bg)] text-[var(--bos-accent)] font-semibold shadow-[var(--bos-shadow-sm)]"
                  : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Toggle row (notification switches) ─────────── */

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between py-2.5 border-b border-[var(--bos-line)] last:border-0 group"
    >
      <span className="text-[12px] text-[var(--bos-text-secondary)] group-hover:text-[var(--bos-text-primary)] transition-colors">
        {label}
      </span>
      <span
        className={cn(
          "relative w-8 h-[18px] rounded-full transition-colors duration-200",
          checked ? "bg-[var(--bos-accent)]" : "bg-[var(--bos-border-strong)]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm",
            checked ? "left-[18px]" : "left-[2px]",
          )}
        />
      </span>
    </button>
  );
}

/* ── Save indicator ─────────────────────────────── */

export function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.14em] uppercase font-mono">
      <motion.span
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "saving" && "bg-[var(--bos-warning)] animate-pulse",
          status === "saved" && "bg-[var(--bos-success)]",
          status === "error" && "bg-[var(--bos-error)]",
          status === "idle" && "bg-[var(--bos-border-strong)]",
        )}
      />
      <span className="text-[var(--bos-text-tertiary)]">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && "Offline — will retry"}
        {status === "idle" && "Ready"}
      </span>
    </span>
  );
}
