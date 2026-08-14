"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight, Check, ClipboardList, Copy, Loader2, Mail, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_TYPE_OPTIONS, requestStatusLabel } from "@/lib/requirement-config";
import type { ClientDetail } from "@/lib/client-serialize";
import { Section, StatusChip, MicroButton, Progress } from "./kit";
import { RequirementCommandCenter } from "./requirement-command-center";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT REQUESTS — inside the Client Command Center
   Every secure-link request for this client: create, configure the
   project type, copy the link, and open the full Requirement Command
   Center. Completely data-driven — statuses and progress come from
   the requirement request records themselves.
──────────────────────────────────────────────────────────────── */

type RequestRow = ClientDetail["requirementRequests"][number];

export function RequirementRequests({
  requests,
  clientId,
  defaultEmail,
  configOpen,
  onConfigOpenChange,
  onChanged,
}: {
  requests: RequestRow[];
  clientId: string;
  defaultEmail?: string | null;
  configOpen?: boolean;
  onConfigOpenChange?: (open: boolean) => void;
  onChanged: () => Promise<void>;
}) {
  const configuring = configOpen ?? false;
  const setConfiguring = (open: boolean) => {
    onConfigOpenChange?.(open);
    if (!open) setTitle("");
  };
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<string>("ECOMMERCE");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const create = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, title: title.trim(), projectType }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCreateError(data.message ?? "Unable to create the request.");
        return;
      }
      setLinks((l) => ({ ...l, [data.id]: data.link }));
      setConfiguring(false);
      setOpenRequestId(data.id);
      notify(`✓ ${data.reference} created — link ready to send.`);
      await onChanged();
    } catch {
      setCreateError("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (id: string, link?: string) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const openRequest = requests.find((r) => r.id === openRequestId);

  return (
    <Section
      id="requirement-requests"
      title="Requirement requests"
      meta={`${requests.length} total`}
      action={
        <MicroButton variant="accent" onClick={() => setConfiguring(!configuring)}>
          {configuring ? <X className="w-3 h-3" aria-hidden="true" /> : <Plus className="w-3 h-3" aria-hidden="true" />}
          {configuring ? "Cancel" : "Request requirements"}
        </MicroButton>
      }
    >
      {/* Configure */}
      {configuring && (
        <div className="mb-4 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-surface)]/60 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)] mb-3">
            Configure requirement request
          </div>
          <label className="bos-label" htmlFor="req-title">Project title</label>
          <input
            id="req-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E-Commerce Platform"
            className="w-full h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[14px] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
          />
          <div className="mt-3 mb-1.5 bos-label">Project type</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {PROJECT_TYPE_OPTIONS.map((opt) => {
              const active = projectType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setProjectType(opt.value)}
                  className={cn(
                    "rounded-sm border px-2.5 py-2 text-left transition-colors duration-150",
                    active
                      ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]"
                      : "border-[var(--bos-line)] bg-[var(--bos-bg)] hover:border-[var(--bos-border-strong)]",
                  )}
                >
                  <div className={cn("text-[11px] font-medium", active ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-primary)]")}>
                    {opt.label}
                  </div>
                  <div className="text-[9px] text-[var(--bos-text-tertiary)] leading-snug">{opt.hint}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">
            The client workspace adapts to this type — the feature catalog and questions follow.
          </div>
          {createError && (
            <div className="mt-3 rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
              {createError}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <MicroButton variant="accent" disabled={!title.trim() || creating} onClick={() => void create()}>
              {creating ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <ClipboardList className="w-3 h-3" aria-hidden="true" />}
              {creating ? "Creating…" : "Create & generate secure link"}
            </MicroButton>
          </div>
        </div>
      )}

      {/* List */}
      {requests.length === 0 && !configuring ? (
        <div className="py-8 text-center">
          <div className="text-[13px] font-medium text-[var(--bos-text-secondary)]">No requirement requests yet.</div>
          <div className="text-[11px] text-[var(--bos-text-tertiary)] mt-1">
            Create your first request to start collecting project information from this client through a secure link.
          </div>
          <div className="mt-3 flex justify-center">
            <MicroButton variant="accent" onClick={() => setConfiguring(true)}>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Request requirements
            </MicroButton>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => {
            const link = links[r.id];
            return (
              <li key={r.id} className="rounded-sm border border-[var(--bos-line)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)]">{r.reference}</span>
                      <span className="text-[13px] font-medium text-[var(--bos-text-primary)] truncate">{r.title}</span>
                      <StatusChip status={r.status} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[var(--bos-text-tertiary)] flex-wrap">
                      <span>{requestStatusLabel(r.status)}</span>
                      <span>{r.completeness}% complete</span>
                      <span>Revision {r.revision}</span>
                      {r.responderName && <span>Respondent · {r.responderName}</span>}
                      <span>Updated {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {link && (
                      <MicroButton onClick={() => void copyLink(r.id, link)}>
                        {copiedId === r.id ? <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                        {copiedId === r.id ? "Copied" : "Copy link"}
                      </MicroButton>
                    )}
                    {r.status === "DRAFT" && !link && (
                      <MicroButton onClick={() => setOpenRequestId(r.id)}>
                        <Mail className="w-3 h-3" aria-hidden="true" /> Send
                      </MicroButton>
                    )}
                    <MicroButton
                      variant="accent"
                      onClick={() => setOpenRequestId(openRequestId === r.id ? null : r.id)}
                      aria-expanded={openRequestId === r.id}
                    >
                      {openRequestId === r.id ? "Close" : "Open"}
                      <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                    </MicroButton>
                  </div>
                </div>
                <Progress value={r.completeness} className="mt-2.5" />
              </li>
            );
          })}
        </ul>
      )}

      {/* Command center */}
      {openRequest && (
        <div className="mt-4">
          <RequirementCommandCenter
            key={openRequest.id}
            requestId={openRequest.id}
            initialLink={links[openRequest.id]}
            defaultEmail={defaultEmail}
            onClose={() => setOpenRequestId(null)}
            onChanged={onChanged}
          />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-sm border border-[var(--bos-success)]/30 bg-[var(--bos-bg)] px-4 py-3 shadow-[var(--bos-shadow-lg)]">
          <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-primary)]">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--bos-success)] text-white">
              <Check className="w-2.5 h-2.5" aria-hidden="true" />
            </span>
            {toast}
          </div>
        </div>
      )}
    </Section>
  );
}
