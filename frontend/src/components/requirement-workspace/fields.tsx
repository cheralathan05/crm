"use client";

import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldDef } from "@/lib/requirement-config";

/* ────────────────────────────────────────────────────────────────
   CONFIG-DRIVEN FIELD RENDERER
   Every section in requirement-config declares its fields; this renders
   the appropriate control per type with consistent styling, keyboard
   support, focus states and visible hints. No per-question hardcoding.
──────────────────────────────────────────────────────────────── */

export type FieldChange = (key: string, value: unknown) => void;

const inputCls =
  "w-full rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 py-2.5 text-[14px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none transition-colors duration-150 focus:border-[var(--bos-accent)] hover:border-[var(--bos-border-strong)]";

export function FieldLabel({
  field,
  missing,
}: {
  field: FieldDef;
  missing?: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        htmlFor={`f-${field.key}`}
        className="text-[12px] font-medium text-[var(--bos-text-secondary)]"
      >
        {field.label}
        {field.required && <span className="text-[var(--bos-accent)] ml-0.5" aria-hidden="true">*</span>}
      </label>
      {missing && (
        <span className="text-[10px] text-[var(--bos-error)]">Required to continue</span>
      )}
    </div>
  );
}

export function FieldHint({ field }: { field: FieldDef }) {
  if (!field.hint) return null;
  return <p className="mt-1.5 text-[11px] text-[var(--bos-text-tertiary)]">{field.hint}</p>;
}

/* ── Chips — multi-select toggle grid ───────────────────────── */

export function ChipsField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: FieldDef;
  value: unknown;
  onChange: FieldChange;
  idPrefix: string;
}) {
  const selected: string[] = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(field.key, next);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={field.label}>
      {(field.options ?? []).map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            id={`${idPrefix}-${field.key}-${opt}`}
            aria-pressed={active}
            onClick={() => toggle(opt)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border text-[13px] transition-colors duration-150",
              active
                ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                : "border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            {active && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── Radio cards — large selectable options ─────────────────── */

export function RadioCardsField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: FieldDef;
  value: unknown;
  onChange: FieldChange;
  idPrefix: string;
}) {
  const multiple = field.multiple === true;
  const selected: string[] = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : typeof value === "string" && value
      ? [value]
      : [];

  const toggle = (opt: string) => {
    if (multiple) {
      const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
      onChange(field.key, next);
    } else {
      onChange(field.key, selected.includes(opt) ? "" : opt);
    }
  };

  return (
    <div role="group" aria-label={field.label} className="grid gap-2">
      {(field.options ?? []).map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            id={`${idPrefix}-${field.key}-${opt}`}
            aria-pressed={active}
            onClick={() => toggle(opt)}
            className={cn(
              "group flex items-center gap-3 w-full rounded-sm border px-4 py-3 text-left transition-all duration-150",
              active
                ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] shadow-[0_0_0_3px_var(--bos-accent-ring)]"
                : "border-[var(--bos-line-strong)] bg-[var(--bos-bg)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-overlay)]",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-sm border shrink-0 transition-colors duration-150",
                active
                  ? "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white"
                  : "border-[var(--bos-border-strong)] bg-[var(--bos-bg)]",
              )}
              aria-hidden="true"
            >
              {active && <Check className="w-3 h-3" />}
            </span>
            <span className={cn("text-[14px]", active ? "text-[var(--bos-text-primary)] font-medium" : "text-[var(--bos-text-secondary)]")}>
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Yes/No segmented control ───────────────────────────────── */

export function YesNoField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: FieldDef;
  value: unknown;
  onChange: FieldChange;
  idPrefix: string;
}) {
  const options = field.options && field.options.length > 0 ? field.options : ["Yes", "No"];
  const current = typeof value === "string" ? value : "";
  return (
    <div role="radiogroup" aria-label={field.label} className="inline-flex rounded-sm border border-[var(--bos-line-strong)] overflow-hidden">
      {options.map((opt) => {
        const active = current === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            id={`${idPrefix}-${field.key}-${opt}`}
            onClick={() => onChange(field.key, active ? "" : opt)}
            className={cn(
              "px-5 h-10 text-[13px] font-medium transition-colors duration-150 border-r border-[var(--bos-line-strong)] last:border-r-0",
              active
                ? "bg-[var(--bos-accent)] text-white"
                : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── Multiselect — checkbox option grid ─────────────────────── */

export function MultiselectField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: FieldDef;
  value: unknown;
  onChange: FieldChange;
  idPrefix: string;
}) {
  const selected: string[] = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(field.key, next);
  };
  return (
    <div role="group" aria-label={field.label} className="grid sm:grid-cols-2 gap-2">
      {(field.options ?? []).map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            role="checkbox"
            aria-checked={active}
            id={`${idPrefix}-${field.key}-${opt}`}
            onClick={() => toggle(opt)}
            className={cn(
              "flex items-center gap-2.5 rounded-sm border px-3 py-2.5 text-[13px] text-left transition-colors duration-150",
              active
                ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-text-primary)]"
                : "border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center w-4 h-4 rounded-[3px] border shrink-0 transition-colors duration-150",
                active ? "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white" : "border-[var(--bos-border-strong)]",
              )}
              aria-hidden="true"
            >
              {active && <Check className="w-2.5 h-2.5" />}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── URL list — rows with add/remove ────────────────────────── */

export function UrlsField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: FieldChange;
}) {
  const urls: string[] = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  const update = (i: number, v: string) => {
    const next = [...urls];
    next[i] = v;
    onChange(field.key, next.filter((u, idx) => u.trim() !== "" || idx < next.length - 1));
  };
  const add = () => onChange(field.key, [...urls, ""]);
  const remove = (i: number) => onChange(field.key, urls.filter((_, idx) => idx !== i));

  if (urls.length === 0) {
    return (
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)] transition-colors duration-150"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add {field.label.toLowerCase()}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {urls.map((u, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="url"
            value={u}
            placeholder={field.placeholder ?? "https://…"}
            onChange={(e) => update(i, e.target.value)}
            aria-label={`${field.label} ${i + 1}`}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Remove ${field.label} ${i + 1}`}
            className="flex items-center justify-center w-8 h-8 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] hover:bg-[var(--bos-overlay)] transition-colors duration-150 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)] transition-colors duration-150"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add another
      </button>
    </div>
  );
}

/* ── Single field dispatcher ────────────────────────────────── */

export function FieldControl({
  field,
  value,
  onChange,
  idPrefix,
  showIfVisible,
}: {
  field: FieldDef;
  value: unknown;
  onChange: FieldChange;
  idPrefix: string;
  showIfVisible: boolean;
}) {
  if (!showIfVisible) return null;

  const common = { field, value, onChange, idPrefix };

  switch (field.type) {
    case "text":
      return (
        <input
          id={`f-${field.key}`}
          type="text"
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputCls}
        />
      );
    case "textarea":
      return (
        <textarea
          id={`f-${field.key}`}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={5}
          className={cn(inputCls, "resize-y min-h-28 leading-relaxed")}
        />
      );
    case "select":
      return (
        <select
          id={`f-${field.key}`}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={cn(inputCls, "appearance-none")}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          id={`f-${field.key}`}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputCls}
        />
      );
    case "chips":
      return <ChipsField {...common} />;
    case "multiselect":
      return <MultiselectField {...common} />;
    case "radio-cards":
      return <RadioCardsField {...common} />;
    case "yesno":
      return <YesNoField {...common} />;
    case "urls":
      return <UrlsField {...common} />;
    default:
      return null;
  }
}

/* ── A full section's fields, respecting showIf predicates ──── */

export function SectionFields({
  section,
  data,
  onChange,
  idPrefix,
  missingKeys,
}: {
  section: { key: string; fields: FieldDef[] };
  data: Record<string, unknown>;
  onChange: FieldChange;
  idPrefix: string;
  missingKeys?: Set<string>;
}) {
  return (
    <div className="space-y-7">
      {section.fields.map((field) => {
        const visible = field.showIf ? field.showIf(data) : true;
        const missing = missingKeys?.has(field.key) === true && !(field.showIf && !field.showIf(data));
        return (
          <div key={field.key} className={cn("transition-opacity duration-200", !visible && "hidden")}>
            <FieldLabel field={field} missing={visible && missing} />
            <FieldControl field={field} value={data[field.key]} onChange={onChange} idPrefix={idPrefix} showIfVisible={visible} />
            <FieldHint field={field} />
          </div>
        );
      })}
    </div>
  );
}

/** Which required fields are empty — drives Continue-time validation. */
export function missingRequiredKeys(
  section: { key: string; fields: FieldDef[] },
  data: Record<string, unknown>,
): Set<string> {
  const missing = new Set<string>();
  for (const field of section.fields) {
    if (!field.required) continue;
    if (field.showIf && !field.showIf(data)) continue;
    const v = data[field.key];
    const empty = Array.isArray(v) ? v.length === 0 : v === undefined || v === null || String(v).trim() === "";
    if (empty) missing.add(field.key);
  }
  return missing;
}
