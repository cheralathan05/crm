"use client";

import { useState } from "react";
import { Check, Plus, Trash2, UserRound, Users, X } from "lucide-react";
import { STAKEHOLDER_TYPES } from "@/lib/requirement-config";
import type { PublicContact } from "./types";

/* ────────────────────────────────────────────────────────────────
   STRUCTURED BUILDERS
   Users, scope and stakeholders are captured as structured lists —
   not free-form textareas — so the data is task-ready downstream.
──────────────────────────────────────────────────────────────── */

type ChipListProps = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
};

function ChipList({ label, items, onChange, placeholder }: ChipListProps) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-overlay)] px-2 py-1 text-[12px] text-[var(--bos-text-primary)]"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              aria-label={`Remove ${item}`}
              className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] transition-colors duration-150"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
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
          placeholder={placeholder ?? `Add ${label.toLowerCase()}…`}
          aria-label={`Add ${label.toLowerCase()}`}
          className="flex-1 h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
        />
        <button
          type="button"
          onClick={add}
          aria-label={`Add ${label.toLowerCase()}`}
          className="flex items-center justify-center w-9 h-9 rounded-sm border border-[var(--bos-line-strong)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] hover:border-[var(--bos-accent)] transition-colors duration-150"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ── User type ──────────────────────────────────────────────── */

export type UserEntry = {
  id: string;
  name: string;
  needs: string[];
  goals: string[];
  problems: string[];
  permissions: string[];
};

const USER_PRESETS = ["Customer", "Employee", "Manager", "Administrator", "Vendor"];

let userSeq = 0;
export function nextUserId(): string {
  userSeq += 1;
  return `u-${Date.now().toString(36)}-${userSeq}`;
}

function UserCard({
  user,
  onChange,
  onRemove,
}: {
  user: UserEntry;
  onChange: (next: UserEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--bos-line)]">
        <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] shrink-0">
          <UserRound className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
        <input
          value={user.name}
          onChange={(e) => onChange({ ...user, name: e.target.value })}
          placeholder="User type name"
          aria-label="User type name"
          className="flex-1 bg-transparent text-[15px] font-medium text-[var(--bos-text-primary)] outline-none placeholder:text-[var(--bos-text-tertiary)]"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${user.name || "user type"}`}
          className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <ChipList label="What they need" items={user.needs} onChange={(needs) => onChange({ ...user, needs })} placeholder="e.g. Browse products, track orders…" />
        <ChipList label="Goals" items={user.goals} onChange={(goals) => onChange({ ...user, goals })} placeholder="e.g. Find what they need fast…" />
        <ChipList label="Pain points" items={user.problems} onChange={(problems) => onChange({ ...user, problems })} placeholder="e.g. Manual follow-ups…" />
        <ChipList label="Permissions" items={user.permissions} onChange={(permissions) => onChange({ ...user, permissions })} placeholder="e.g. View reports, approve orders…" />
      </div>
    </div>
  );
}

export function UsersBuilder({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const users: UserEntry[] = Array.isArray(value) ? (value as UserEntry[]) : [];

  const setUsers = (next: UserEntry[]) => onChange({ users: next });

  const addPreset = (name: string) => {
    if (users.some((u) => u.name.toLowerCase() === name.toLowerCase())) return;
    setUsers([...users, { id: nextUserId(), name, needs: [], goals: [], problems: [], permissions: [] }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-[var(--bos-text-tertiary)] mr-1">Start from:</span>
        {USER_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => addPreset(p)}
            disabled={users.some((u) => u.name.toLowerCase() === p.toLowerCase())}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-sm border border-[var(--bos-line-strong)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent)] hover:text-[var(--bos-accent)] disabled:opacity-35 disabled:hover:border-[var(--bos-line-strong)] disabled:hover:text-[var(--bos-text-secondary)] transition-colors duration-150"
          >
            <Plus className="w-3 h-3" aria-hidden="true" /> {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setUsers([...users, { id: nextUserId(), name: "", needs: [], goals: [], problems: [], permissions: [] }])}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-sm border border-dashed border-[var(--bos-border-strong)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent)] hover:text-[var(--bos-accent)] transition-colors duration-150"
        >
          <Plus className="w-3 h-3" aria-hidden="true" /> Custom type
        </button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-sm border border-dashed border-[var(--bos-line-strong)] py-10 text-center">
          <Users className="w-5 h-5 mx-auto text-[var(--bos-text-tertiary)]" aria-hidden="true" />
          <p className="mt-2 text-[13px] text-[var(--bos-text-secondary)]">Add the people who will use the product.</p>
          <p className="text-[11px] text-[var(--bos-text-tertiary)] mt-0.5">Each user type becomes structured data for roles and permissions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onChange={(next) => setUsers(users.map((x) => (x.id === u.id ? next : x)))}
              onRemove={() => setUsers(users.filter((x) => x.id !== u.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Scope — included / excluded / assumptions / dependencies ── */

type ListDef = { key: "included" | "excluded" | "assumptions" | "dependencies"; title: string; placeholder: string };

const SCOPE_LISTS: ListDef[] = [
  { key: "included", title: "What is included", placeholder: "e.g. Online storefront with cart and checkout" },
  { key: "excluded", title: "What is not included", placeholder: "e.g. Inventory hardware integration" },
  { key: "assumptions", title: "Assumptions", placeholder: "e.g. Product data will be provided as CSV" },
  { key: "dependencies", title: "Dependencies", placeholder: "e.g. Payment gateway account approval" },
];

function ListItems({
  def,
  items,
  onChange,
}: {
  def: ListDef;
  items: string[];
  onChange: (items: string[]) => void;
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-medium text-[var(--bos-text-secondary)]">{def.title}</h3>
        <span className="text-[10px] tabular-nums text-[var(--bos-text-tertiary)]">{items.length}</span>
      </div>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1">
          {items.map((item, i) => (
            <li key={`${def.key}-${i}`} className="flex items-center gap-2 group">
              <Check className="w-3.5 h-3.5 text-[var(--bos-success)] shrink-0" aria-hidden="true" />
              <span className="flex-1 text-[13px] text-[var(--bos-text-primary)]">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${item}`}
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
          placeholder={def.placeholder}
          aria-label={def.title}
          className="flex-1 h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
        />
        <button
          type="button"
          onClick={add}
          aria-label={`Add ${def.title.toLowerCase()}`}
          className="flex items-center justify-center w-9 h-9 rounded-sm border border-[var(--bos-line-strong)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] hover:border-[var(--bos-accent)] transition-colors duration-150"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ScopeBuilder({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const data = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const list = (key: string): string[] => (Array.isArray(data[key]) ? (data[key] as string[]) : []);
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {SCOPE_LISTS.map((def) => (
        <ListItems key={def.key} def={def} items={list(def.key)} onChange={(items) => onChange({ ...data, [def.key]: items })} />
      ))}
    </div>
  );
}

/* ── Stakeholders ───────────────────────────────────────────── */

export type Stakeholder = {
  id: string;
  name: string;
  role?: string;
  email?: string;
  type: string;
};

let stakeSeq = 0;
export function nextStakeholderId(): string {
  stakeSeq += 1;
  return `s-${Date.now().toString(36)}-${stakeSeq}`;
}

export function StakeholderBuilder({
  value,
  onChange,
  contacts,
}: {
  value: unknown;
  onChange: (data: Record<string, unknown>) => void;
  contacts: PublicContact[];
}) {
  const data = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const stakeholders: Stakeholder[] = Array.isArray(data.stakeholders) ? (data.stakeholders as Stakeholder[]) : [];

  const setAll = (next: Stakeholder[]) => onChange({ ...data, stakeholders: next });

  const [form, setForm] = useState<{ name: string; type: string; email: string; role: string }>({
    name: "",
    type: STAKEHOLDER_TYPES[0],
    email: "",
    role: "",
  });

  const add = () => {
    if (!form.name.trim()) return;
    setAll([
      ...stakeholders,
      { id: nextStakeholderId(), name: form.name.trim(), type: form.type, email: form.email.trim() || undefined, role: form.role.trim() || undefined },
    ]);
    setForm({ name: "", type: STAKEHOLDER_TYPES[0], email: "", role: "" });
  };

  const addContact = (c: PublicContact) => {
    if (stakeholders.some((s) => s.name.toLowerCase() === c.name.toLowerCase())) return;
    setAll([
      ...stakeholders,
      { id: nextStakeholderId(), name: c.name, type: STAKEHOLDER_TYPES[0], email: c.email ?? undefined, role: c.role ?? undefined },
    ]);
  };

  return (
    <div className="space-y-5">
      {contacts.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1.5">
            Known contacts — add with one click
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contacts.map((c) => {
              const added = stakeholders.some((s) => s.name.toLowerCase() === c.name.toLowerCase());
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={added}
                  onClick={() => addContact(c)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-[var(--bos-line-strong)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent)] hover:text-[var(--bos-accent)] disabled:opacity-35 transition-colors duration-150"
                >
                  {added ? <Check className="w-3 h-3" aria-hidden="true" /> : <Plus className="w-3 h-3" aria-hidden="true" />}
                  {c.name}
                  {c.role && <span className="text-[var(--bos-text-tertiary)]">· {c.role}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stakeholders.length > 0 && (
        <ul className="space-y-2">
          {stakeholders.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-sm border border-[var(--bos-line-strong)] px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--bos-text-primary)]">{s.name}</span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-[3px] bg-[var(--bos-overlay)] text-[var(--bos-text-secondary)]">
                    {s.type}
                  </span>
                </div>
                {(s.email || s.role) && (
                  <div className="text-[11px] text-[var(--bos-text-tertiary)] truncate">
                    {[s.role, s.email].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAll(stakeholders.filter((x) => x.id !== s.id))}
                aria-label={`Remove ${s.name}`}
                className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-sm border border-[var(--bos-line-strong)] p-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="stake-name" className="bos-label">Name</label>
            <input
              id="stake-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
            />
          </div>
          <div>
            <label htmlFor="stake-type" className="bos-label">Role type</label>
            <select
              id="stake-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
            >
              {STAKEHOLDER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stake-email" className="bos-label">Email</label>
            <input
              id="stake-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@company.com"
              className="w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
            />
          </div>
          <div>
            <label htmlFor="stake-role" className="bos-label">Job title</label>
            <input
              id="stake-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="e.g. Founder"
              className="w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={add}
            disabled={!form.name.trim()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add stakeholder
          </button>
        </div>
      </div>
    </div>
  );
}
