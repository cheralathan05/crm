"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Duplicate = {
  id: string;
  companyName: string;
  status: string;
  createdAt: string;
  match: "name" | "email" | "domain";
};

interface CreateClientPanelProps {
  onCreated: (id: string) => void;
  onCancel?: () => void;
}

export function CreateClientPanel({ onCreated, onCancel }: CreateClientPanelProps) {
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    businessType: "",
    website: "",
    email: "",
    phone: "",
    leadSource: "",
    primaryContactName: "",
    primaryContactRole: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(createAnyway = false) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, createAnyway }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "POSSIBLE_DUPLICATE") {
          setDuplicates(data.duplicates);
        } else {
          setError(data.message ?? "Unable to create client.");
        }
        return;
      }
      onCreated(data.id);
    } catch {
      setError("Unable to create client. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full h-9 px-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none transition-colors duration-150 focus:border-[var(--bos-border-strong)]";

  return (
    <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
            New client
          </div>
          <div className="text-[15px] font-semibold text-[var(--bos-text-primary)] mt-0.5">
            Add a business relationship
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Duplicate warning */}
      {duplicates && duplicates.length > 0 && (
        <div className="mt-4 rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/8 p-3">
          <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--bos-warning)]">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            Possible duplicate
          </div>
          <ul className="mt-2 space-y-1">
            {duplicates.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-[11px] text-[var(--bos-text-secondary)]">
                <span className="font-medium text-[var(--bos-text-primary)]">{d.companyName}</span>
                <span className="text-[var(--bos-text-tertiary)]">· {d.match} match</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDuplicates(null);
                setError(null);
                submit(true);
              }}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40"
            >
              Create anyway
            </button>
            <button
              type="button"
              onClick={() => setDuplicates(null)}
              className="inline-flex items-center h-8 px-3 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {error && !duplicates && (
        <div className="mt-4 rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
          {error}
        </div>
      )}

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        {/* Company */}
        <div>
          <label className="bos-label">Company name</label>
          <input className={inputCls} value={form.companyName} onChange={set("companyName")} placeholder="ABC Technologies" required autoFocus />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="bos-label">Industry</label>
            <input className={inputCls} value={form.industry} onChange={set("industry")} placeholder="Technology" />
          </div>
          <div>
            <label className="bos-label">Business type</label>
            <input className={inputCls} value={form.businessType} onChange={set("businessType")} placeholder="B2B · Agency · Retail…" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="bos-label">Website</label>
            <input className={inputCls} value={form.website} onChange={set("website")} placeholder="https://…" />
          </div>
          <div>
            <label className="bos-label">Lead source</label>
            <input className={inputCls} value={form.leadSource} onChange={set("leadSource")} placeholder="Website · Referral · Inbound…" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="bos-label">Company email</label>
            <input className={inputCls} value={form.email} onChange={set("email")} placeholder="accounts@…" type="email" />
          </div>
          <div>
            <label className="bos-label">Company phone</label>
            <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="+91 …" />
          </div>
        </div>

        {/* Primary contact */}
        <div className="pt-2 border-t border-[var(--bos-line)]">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-3">
            Primary contact
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="bos-label">Name</label>
              <input className={inputCls} value={form.primaryContactName} onChange={set("primaryContactName")} placeholder="Arun Kumar" />
            </div>
            <div>
              <label className="bos-label">Role</label>
              <input className={inputCls} value={form.primaryContactRole} onChange={set("primaryContactRole")} placeholder="Founder · CEO…" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="bos-label">Email</label>
              <input className={inputCls} value={form.primaryContactEmail} onChange={set("primaryContactEmail")} placeholder="arun@…" type="email" />
            </div>
            <div>
              <label className="bos-label">Phone / WhatsApp</label>
              <input className={inputCls} value={form.primaryContactPhone} onChange={set("primaryContactPhone")} placeholder="+91 …" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center h-9 px-3 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !form.companyName.trim()}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium",
              "hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            Create client
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
