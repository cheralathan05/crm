"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { catalogFor, type CatalogFeature } from "@/lib/requirement-config";
import { FieldControl, type FieldChange } from "./fields";
import type { PublicFeature } from "./types";

/* ────────────────────────────────────────────────────────────────
   FEATURE DISCOVERY
   The client selects what the product should do from a catalog that
   adapts to the project type, then configures each feature in a
   mini-workspace: priority, users, description, config, acceptance
   criteria, dependencies. Every feature is task-ready data.
──────────────────────────────────────────────────────────────── */

const PRIORITIES = [
  { value: "MUST_HAVE", label: "Must Have" },
  { value: "SHOULD_HAVE", label: "Should Have" },
  { value: "NICE_TO_HAVE", label: "Nice to Have" },
];

type Props = {
  projectType: string;
  features: PublicFeature[];
  users: string[];
  onChange: (features: PublicFeature[], immediate?: boolean) => void;
};

let customSeq = 0;
function newCustomFeature(name: string, users: string[]): PublicFeature {
  customSeq += 1;
  return {
    id: `cf-${Date.now().toString(36)}-${customSeq}`,
    name,
    priority: "SHOULD_HAVE",
    users,
    description: "",
    config: {},
    acceptanceCriteria: [],
    dependencies: [],
  };
}

export function FeatureDiscovery({ projectType, features, users, onChange }: Props) {
  const catalog: CatalogFeature[] = useMemo(
    () => catalogFor(projectType as never),
    [projectType],
  );

  const selectedNames = new Set(features.map((f) => f.name));
  const [expanded, setExpanded] = useState<string | null>(features[0]?.name ?? null);
  const [customDraft, setCustomDraft] = useState("");

  const toggleCatalog = (name: string) => {
    if (selectedNames.has(name)) {
      onChange(features.filter((f) => f.name !== name));
      if (expanded === name) setExpanded(null);
    } else {
      onChange([...features, newCustomFeature(name, [])]);
      setExpanded(name);
    }
  };

  const addCustom = () => {
    const name = customDraft.trim();
    if (!name || selectedNames.has(name)) return;
    onChange([...features, newCustomFeature(name, [])]);
    setCustomDraft("");
    setExpanded(name);
  };

  const update = (name: string, patch: Partial<PublicFeature>) => {
    onChange(features.map((f) => (f.name === name ? { ...f, ...patch } : f)));
  };

  const catalogDef = (name: string): CatalogFeature | undefined => catalog.find((c) => c.name === name);

  return (
    <div className="space-y-6">
      {/* Catalog selection */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-2">
          Select what applies — you can configure each one next
        </div>
        <div className="flex flex-wrap gap-2">
          {catalog.map((c) => {
            const active = selectedNames.has(c.name);
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCatalog(c.name)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-10 px-3.5 rounded-sm border text-[13px] transition-all duration-150",
                  active
                    ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                    : "border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                {active && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                {c.name}
              </button>
            );
          })}
          <div className="inline-flex items-center gap-1.5">
            <input
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Create custom feature…"
              aria-label="Custom feature name"
              className="h-10 w-48 px-3 rounded-sm border border-dashed border-[var(--bos-border-strong)] bg-[var(--bos-bg)] text-[13px] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
            />
            <button
              type="button"
              onClick={addCustom}
              aria-label="Add custom feature"
              className="flex items-center justify-center h-10 w-10 rounded-sm border border-dashed border-[var(--bos-border-strong)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent)] hover:text-[var(--bos-accent)] transition-colors duration-150"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected features — mini-workspaces */}
      {features.length === 0 ? (
        <div className="rounded-sm border border-dashed border-[var(--bos-line-strong)] py-12 text-center">
          <Sparkles className="w-5 h-5 mx-auto text-[var(--bos-text-tertiary)]" aria-hidden="true" />
          <p className="mt-2 text-[13px] text-[var(--bos-text-secondary)]">Nothing selected yet.</p>
          <p className="text-[11px] text-[var(--bos-text-tertiary)] mt-0.5">Select features above or create your own — each one opens for configuration.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {features.map((f) => {
            const isOpen = expanded === f.name;
            const def = catalogDef(f.name);
            const configFields = def?.configFields ?? [];
            return (
              <div
                key={f.id}
                className={cn(
                  "rounded-sm border transition-colors duration-150",
                  isOpen ? "border-[var(--bos-border-strong)]" : "border-[var(--bos-line-strong)]",
                )}
              >
                {/* Card header */}
                <div className="flex items-center gap-2 px-3.5 py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : f.name)}
                    aria-expanded={isOpen}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <ChevronDown
                      className={cn("w-4 h-4 text-[var(--bos-text-tertiary)] shrink-0 transition-transform duration-150", !isOpen && "-rotate-90")}
                      aria-hidden="true"
                    />
                    <span className="text-[14px] font-medium text-[var(--bos-text-primary)] truncate">{f.name}</span>
                    {f.acceptanceCriteria.length > 0 && (
                      <span className="text-[10px] tabular-nums text-[var(--bos-text-tertiary)] shrink-0">{f.acceptanceCriteria.length} criteria</span>
                    )}
                  </button>

                  {/* Priority segmented */}
                  <div className="hidden sm:inline-flex rounded-sm border border-[var(--bos-line-strong)] overflow-hidden shrink-0" role="radiogroup" aria-label={`${f.name} priority`}>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        role="radio"
                        aria-checked={f.priority === p.value}
                        onClick={() => update(f.name, { priority: p.value })}
                        className={cn(
                          "px-2.5 h-7 text-[10px] font-mono uppercase tracking-[0.06em] transition-colors duration-150 border-r border-[var(--bos-line-strong)] last:border-r-0",
                          f.priority === p.value
                            ? p.value === "MUST_HAVE"
                              ? "bg-[var(--bos-accent)] text-white"
                              : "bg-[var(--bos-overlay)] text-[var(--bos-text-primary)]"
                            : "bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCatalog(f.name)}
                    aria-label={`Remove ${f.name}`}
                    className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] hover:bg-[var(--bos-overlay)] transition-colors duration-150 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Expanded config */}
                {isOpen && (
                  <div className="border-t border-[var(--bos-line)] px-4 py-4 space-y-5">
                    {/* Mobile priority */}
                    <div className="sm:hidden">
                      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1.5">Priority</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PRIORITIES.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => update(f.name, { priority: p.value })}
                            className={cn(
                              "h-9 rounded-sm border text-[11px] font-medium transition-colors duration-150",
                              f.priority === p.value
                                ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                                : "border-[var(--bos-line-strong)] text-[var(--bos-text-tertiary)]",
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Who uses it */}
                    <div>
                      <label className="bos-label">Who uses it?</label>
                      <UserPicker
                        value={f.users}
                        options={users}
                        onChange={(next) => update(f.name, { users: next })}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor={`feat-desc-${f.id}`} className="bos-label">How should {f.name.toLowerCase()} work?</label>
                      <textarea
                        id={`feat-desc-${f.id}`}
                        value={f.description}
                        onChange={(e) => update(f.name, { description: e.target.value })}
                        placeholder={`Describe what ${f.name.toLowerCase()} should do — in your own words.`}
                        rows={3}
                        className="w-full rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 py-2.5 text-[13px] leading-relaxed placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] resize-y transition-colors duration-150"
                      />
                    </div>

                    {/* Catalog config fields */}
                    {configFields.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                        {configFields.map((field) => (
                          <div key={field.key}>
                            <label className="bos-label">{field.label}</label>
                            <FieldControl
                              field={field}
                              value={f.config[field.key]}
                              onChange={(k, v) => update(f.name, { config: { ...f.config, [k]: v } })}
                              idPrefix={`feat-${f.id}`}
                              showIfVisible
                            />
                            {field.hint && <p className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">{field.hint}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Acceptance criteria */}
                    <AcceptanceCriteria
                      name={f.name}
                      items={f.acceptanceCriteria}
                      onChange={(next) => update(f.name, { acceptanceCriteria: next })}
                    />

                    {/* Dependencies */}
                    {features.length > 1 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1.5">Depends on</div>
                        <div className="flex flex-wrap gap-1.5">
                          {features
                            .filter((other) => other.name !== f.name)
                            .map((other) => {
                              const active = f.dependencies.includes(other.name);
                              return (
                                <button
                                  key={other.id}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() =>
                                    update(f.name, {
                                      dependencies: active
                                        ? f.dependencies.filter((d) => d !== other.name)
                                        : [...f.dependencies, other.name],
                                    })
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-1 h-7 px-2 rounded-sm border text-[11px] transition-colors duration-150",
                                    active
                                      ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                                      : "border-[var(--bos-line-strong)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
                                  )}
                                >
                                  {active && <Check className="w-3 h-3" aria-hidden="true" />}
                                  {other.name}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── User picker with free-text chips ───────────────────────── */

function UserPicker({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const suggestions = options.filter((o) => !value.includes(o));

  const add = (v: string) => {
    const clean = v.trim();
    if (!clean || value.includes(clean)) return;
    onChange([...value, clean]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((u) => (
          <span key={u} className="inline-flex items-center gap-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-overlay)] px-2 py-1 text-[12px] text-[var(--bos-text-primary)]">
            {u}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== u))} aria-label={`Remove ${u}`} className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)]">
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-sm border border-dashed border-[var(--bos-line-strong)] text-[11px] text-[var(--bos-text-tertiary)] hover:border-[var(--bos-accent)] hover:text-[var(--bos-accent)] transition-colors duration-150"
            >
              <Plus className="w-3 h-3" aria-hidden="true" /> {s}
            </button>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
        placeholder="Add a user type…"
        aria-label="Who uses this feature"
        className="w-full h-8 px-2.5 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[12px] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
      />
    </div>
  );
}

/* ── Acceptance criteria list ───────────────────────────────── */

function AcceptanceCriteria({
  name,
  items,
  onChange,
}: {
  name: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1.5">
        Acceptance criteria — what must be true for {name.toLowerCase()} to be considered done
      </div>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1">
          {items.map((c, i) => (
            <li key={i} className="flex items-center gap-2 group">
              <Check className="w-3.5 h-3.5 text-[var(--bos-success)] shrink-0" aria-hidden="true" />
              <span className="flex-1 text-[13px] text-[var(--bos-text-primary)]">{c}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                aria-label={`Remove criterion: ${c}`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] transition-opacity duration-150"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add acceptance criterion…"
          aria-label={`Add acceptance criterion for ${name}`}
          className="flex-1 h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
        />
        <button
          type="button"
          onClick={add}
          aria-label={`Add acceptance criterion for ${name}`}
          className="flex items-center justify-center w-9 h-9 rounded-sm border border-[var(--bos-line-strong)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] hover:border-[var(--bos-accent)] transition-colors duration-150"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export type { FieldChange };
