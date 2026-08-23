"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Quick Create — context-preserving resource creation.
   The client is already known (this panel lives inside the Command Center);
   the workspace + owner are resolved server-side. No "which client?" step. */

export type CreateResource =
  | "proposal"
  | "project"
  | "task"
  | "payment"
  | "document"
  | "message"
  | "note"
  | "activity"
  | "contact";

const META: Record<CreateResource, { label: string; hint: string }> = {
  proposal: { label: "New proposal", hint: "Priced offer for this client" },
  project: { label: "New project", hint: "Client work begins here" },
  task: { label: "New task", hint: "Assign work to the team" },
  payment: { label: "New payment", hint: "Invoice, contract or milestone" },
  document: { label: "New document", hint: "File attached to this relationship" },
  message: { label: "New message", hint: "Record a communication" },
  note: { label: "Internal note", hint: "Client memory, visible to your team" },
  activity: { label: "New activity", hint: "Call, meeting, follow-up…" },
  contact: { label: "New contact", hint: "Someone inside the client company" },
};

const inputCls =
  "w-full h-9 px-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none transition-colors duration-150 focus:border-[var(--bos-border-strong)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="bos-label">{label}</label>
      {children}
    </div>
  );
}

export function QuickCreate({
  clientId,
  resource,
  onClose,
  onSaved,
}: {
  clientId: string;
  resource: CreateResource;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Drop empty strings so the server only receives real values.
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== "") payload[k] = k.includes("Count") || k === "amount" ? Number(v) : v;
      }
      const res = await fetch(`/api/clients/${clientId}/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Unable to save.");
        return;
      }
      setForm({});
      onClose();
      await onSaved();
    } catch {
      setError("Unable to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const meta = META[resource];

  return (
    <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--bos-line)]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
            {meta.label}
          </span>
          <span className="ml-2 text-[10px] text-[var(--bos-text-tertiary)]">{meta.hint}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-6 h-6 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={(e) => void submit(e)} className="p-4 space-y-3">
        {resource === "proposal" && (
          <>
            <Field label="Title">
              <input className={inputCls} required autoFocus value={form.title ?? ""} onChange={set("title")} placeholder="Website Development Proposal" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)">
                <input className={inputCls} type="number" min={0} step="1000" value={form.amount ?? ""} onChange={set("amount")} placeholder="250000" />
              </Field>
              <Field label="Valid until">
                <input className={inputCls} type="date" value={form.validUntil ?? ""} onChange={set("validUntil")} />
              </Field>
            </div>
          </>
        )}

        {resource === "project" && (
          <>
            <Field label="Name">
              <input className={inputCls} required autoFocus value={form.name ?? ""} onChange={set("name")} placeholder="E-Commerce Platform" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stage">
                <select className={inputCls} value={form.stage ?? "PLANNING"} onChange={set("stage")}>
                  <option value="PLANNING">Planning</option>
                  <option value="DISCOVERY">Discovery</option>
                  <option value="DESIGN">Design</option>
                  <option value="DEVELOPMENT">Development</option>
                  <option value="TESTING">Testing</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </Field>
              <Field label="Deadline">
                <input className={inputCls} type="date" value={form.deadline ?? ""} onChange={set("deadline")} />
              </Field>
            </div>
          </>
        )}

        {resource === "task" && (
          <>
            <Field label="Title">
              <input className={inputCls} required autoFocus value={form.title ?? ""} onChange={set("title")} placeholder="Implement payment gateway" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <select className={inputCls} value={form.priority ?? "MEDIUM"} onChange={set("priority")}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </Field>
              <Field label="Team role">
                <input className={inputCls} value={form.teamRole ?? ""} onChange={set("teamRole")} placeholder="Backend · Frontend · Designer" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assignee">
                <input className={inputCls} value={form.assigneeName ?? ""} onChange={set("assigneeName")} placeholder="Team member name" />
              </Field>
              <Field label="Due">
                <input className={inputCls} type="date" value={form.dueAt ?? ""} onChange={set("dueAt")} />
              </Field>
            </div>
          </>
        )}

        {resource === "payment" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Label">
                <input className={inputCls} value={form.label ?? ""} onChange={set("label")} placeholder="Phase 1 — Advance" />
              </Field>
              <Field label="Type">
                <select className={inputCls} value={form.type ?? "INVOICE"} onChange={set("type")}>
                  <option value="CONTRACT">Contract</option>
                  <option value="INVOICE">Invoice</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="MILESTONE">Milestone</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)">
                <input className={inputCls} required type="number" min={0} step="1000" value={form.amount ?? ""} onChange={set("amount")} placeholder="50000" />
              </Field>
              <Field label="Invoice no.">
                <input className={inputCls} value={form.invoiceNumber ?? ""} onChange={set("invoiceNumber")} placeholder="INV-0024" />
              </Field>
            </div>
            <Field label="Due">
              <input className={inputCls} type="date" value={form.dueAt ?? ""} onChange={set("dueAt")} />
            </Field>
          </>
        )}

        {resource === "document" && (
          <>
            <Field label="Name">
              <input className={inputCls} required autoFocus value={form.name ?? ""} onChange={set("name")} placeholder="Website-Proposal.pdf" />
            </Field>
            <Field label="Category">
              <select className={inputCls} value={form.category ?? "PROJECT_FILE"} onChange={set("category")}>
                <option value="REQUIREMENT">Requirement</option>
                <option value="PROPOSAL">Proposal</option>
                <option value="CONTRACT">Contract</option>
                <option value="INVOICE">Invoice</option>
                <option value="PROJECT_FILE">Project file</option>
                <option value="CLIENT_UPLOAD">Client upload</option>
              </select>
            </Field>
          </>
        )}

        {resource === "message" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Channel">
                <select className={inputCls} value={form.channel ?? "EMAIL"} onChange={set("channel")}>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="CALL">Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="INTERNAL_NOTE">Internal note</option>
                </select>
              </Field>
              <Field label="Direction">
                <select className={inputCls} value={form.direction ?? "IN"} onChange={set("direction")}>
                  <option value="IN">Inbound</option>
                  <option value="OUT">Outbound</option>
                </select>
              </Field>
            </div>
            <Field label="Subject">
              <input className={inputCls} required autoFocus value={form.subject ?? ""} onChange={set("subject")} placeholder="Project timeline discussion" />
            </Field>
            <Field label="Body">
              <textarea className={cn(inputCls, "h-16 py-2 resize-none")} value={form.body ?? ""} onChange={set("body")} />
            </Field>
          </>
        )}

        {resource === "note" && (
          <Field label="Note">
            <textarea
              className={cn(inputCls, "h-24 py-2 resize-none")}
              required
              autoFocus
              value={form.content ?? ""}
              onChange={set("content")}
              placeholder="Client prefers weekly progress reports…"
            />
          </Field>
        )}

        {resource === "activity" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} value={form.type ?? "NOTE"} onChange={set("type")}>
                  <option value="CALL">Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="NOTE">Note</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="EMAIL">Email</option>
                  <option value="MESSAGE">Message</option>
                </select>
              </Field>
              <Field label="Due">
                <input className={inputCls} type="date" value={form.dueAt ?? ""} onChange={set("dueAt")} />
              </Field>
            </div>
            <Field label="Title">
              <input className={inputCls} required autoFocus value={form.title ?? ""} onChange={set("title")} placeholder="Proposal discussion" />
            </Field>
          </>
        )}

        {resource === "contact" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input className={inputCls} required autoFocus value={form.name ?? ""} onChange={set("name")} placeholder="Arun Kumar" />
              </Field>
              <Field label="Role">
                <input className={inputCls} value={form.role ?? ""} onChange={set("role")} placeholder="Founder" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input className={inputCls} type="email" value={form.email ?? ""} onChange={set("email")} placeholder="arun@…" />
              </Field>
              <Field label="Phone / WhatsApp">
                <input className={inputCls} value={form.phone ?? ""} onChange={set("phone")} placeholder="+91 …" />
              </Field>
            </div>
            <Field label="Preferred channel">
              <select className={inputCls} value={form.preferredChannel ?? "EMAIL"} onChange={set("preferredChannel")}>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </Field>
          </>
        )}

        {error && (
          <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center h-8 px-3 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium",
              "hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 disabled:opacity-40",
            )}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
