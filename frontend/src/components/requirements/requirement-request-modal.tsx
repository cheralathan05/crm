"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Layers,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_TYPE_OPTIONS } from "@/lib/requirement-config";
import type { RequirementProjectType } from "@/generated/prisma/client";
import { MicroButton } from "@/components/clients/kit";

type ClientOption = {
  id: string;
  companyName: string;
  status: string;
  industry: string | null;
  hasActiveRequest?: boolean;
  activeRequestId?: string;
  activeRequestRef?: string;
};

export function RequirementRequestModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (requestId: string, clientId: string) => void;
}) {
  const router = useRouter();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<RequirementProjectType>("WEB_APP");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictReq, setConflictReq] = useState<{ id: string; ref: string } | null>(null);
  const [createdData, setCreatedData] = useState<{
    id: string;
    reference: string;
    clientId: string;
    link: string;
    emailSent: boolean;
    recipient: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load clients and active requirements when opened
  useEffect(() => {
    if (!open) {
      setCreatedData(null);
      setError(null);
      setConflictReq(null);
      return;
    }

    let active = true;
    async function loadData() {
      setLoadingClients(true);
      try {
        const [clientsRes, reqsRes] = await Promise.all([
          fetch("/api/clients?view=all"),
          fetch("/api/requirements?view=all"),
        ]);
        const clientsData = await clientsRes.json();
        const reqsData = await reqsRes.json();

        if (!active) return;

        const reqMap = new Map<string, { id: string; ref: string }>();
        if (reqsRes.ok && Array.isArray(reqsData.rows)) {
          for (const r of reqsData.rows) {
            if (r.clientId && !reqMap.has(r.clientId)) {
              reqMap.set(r.clientId, { id: r.id, ref: r.reference });
            }
          }
        }

        if (clientsRes.ok && Array.isArray(clientsData.rows)) {
          const list: ClientOption[] = clientsData.rows.map((c: any) => {
            const existing = reqMap.get(c.id);
            return {
              id: c.id,
              companyName: c.companyName,
              status: c.status,
              industry: c.industry,
              hasActiveRequest: Boolean(existing),
              activeRequestId: existing?.id,
              activeRequestRef: existing?.ref,
            };
          });
          setClients(list);

          // Default pick the first client that doesn't have an active request if available
          const free = list.find((c) => !c.hasActiveRequest);
          if (free) {
            setSelectedClientId(free.id);
            setTitle(`${free.companyName} Discovery & Requirements`);
          } else if (list.length > 0) {
            setSelectedClientId(list[0].id);
            setTitle(`${list[0].companyName} Discovery & Requirements`);
          }
        }
      } catch {
        if (active) setError("Failed to load clients list.");
      } finally {
        if (active) setLoadingClients(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [open]);

  // When client selection changes, auto-suggest title & check conflict
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setError(null);
    setConflictReq(null);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setTitle(`${client.companyName} Discovery & Requirements`);
      if (client.hasActiveRequest && client.activeRequestId && client.activeRequestRef) {
        setConflictReq({ id: client.activeRequestId, ref: client.activeRequestRef });
      }
    }
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        (c.industry && c.industry.toLowerCase().includes(q)) ||
        (c.activeRequestRef && c.activeRequestRef.toLowerCase().includes(q)),
    );
  }, [clients, clientSearch]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setConflictReq(null);

    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: title.trim(),
          projectType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Find client's existing request
          const cl = clients.find((c) => c.id === selectedClientId);
          if (cl?.activeRequestId && cl?.activeRequestRef) {
            setConflictReq({ id: cl.activeRequestId, ref: cl.activeRequestRef });
          }
        }
        setError(data.message ?? "Failed to create requirement request.");
        return;
      }

      setCreatedData({
        id: data.request.id,
        reference: data.request.reference,
        clientId: selectedClientId,
        link: data.link,
        emailSent: Boolean(data.emailSent),
        recipient: data.recipient ?? null,
      });

      onCreated?.(data.request.id, selectedClientId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdData?.link) return;
    try {
      await navigator.clipboard.writeText(createdData.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-xl)] p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-req-title"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-1 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]">
            <ClipboardList className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="modal-req-title" className="text-lg font-semibold tracking-tight text-[var(--bos-text-primary)]">
              {createdData ? "Requirement Workspace Ready" : "Request Requirements"}
            </h2>
            <p className="text-[12px] text-[var(--bos-text-secondary)]">
              {createdData
                ? "Secure client portal link has been generated."
                : "Create a tailored discovery and specification portal for your client."}
            </p>
          </div>
        </div>

        {/* ── Success State ── */}
        {createdData ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-[var(--bos-success)]/30 bg-[var(--bos-success)]/5 p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--bos-success)]">
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Created {createdData.reference} successfully</span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--bos-text-secondary)]">
                {createdData.emailSent && createdData.recipient
                  ? `Invite link has been emailed to ${createdData.recipient}. You can also share the link manually.`
                  : "Copy and share this private link with your client. They can fill out specifications, attach assets, and submit revisions."}
              </p>

              {/* Live Link Box */}
              <div className="mt-3 flex items-center gap-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] p-2">
                <input
                  type="text"
                  readOnly
                  value={createdData.link}
                  className="flex-1 bg-transparent font-mono text-[11px] text-[var(--bos-text-primary)] select-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  window.open(createdData.link, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Preview client view
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <MicroButton
                  onClick={() => {
                    onClose();
                    router.push(`/clients/${createdData.clientId}?req=${createdData.id}#requirement`);
                  }}
                >
                  View in Client Workspace
                </MicroButton>
                <MicroButton
                  variant="accent"
                  onClick={() => {
                    onClose();
                    router.push(`/requirements/${createdData.id}`);
                  }}
                >
                  Open Command Center
                  <ArrowRight className="w-3 h-3 ml-1" aria-hidden="true" />
                </MicroButton>
              </div>
            </div>
          </div>
        ) : (
          /* ── Form State ── */
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
            {/* Client selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="client-select" className="bos-label mb-0">
                  Target Client <span className="text-[var(--bos-accent)]">*</span>
                </label>
                {loadingClients && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--bos-text-tertiary)]">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    Loading clients…
                  </span>
                )}
              </div>

              {clients.length > 5 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Filter clients…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 text-[12px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)]"
                  />
                </div>
              )}

              <select
                id="client-select"
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                disabled={loadingClients}
                className="w-full h-9 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 text-[13px] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)] transition-colors"
              >
                {clients.length === 0 ? (
                  <option value="">No clients found</option>
                ) : (
                  filteredClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.status.toLowerCase()}){c.hasActiveRequest ? ` — Has request ${c.activeRequestRef}` : ""}
                    </option>
                  ))
                )}
              </select>

              {selectedClient?.hasActiveRequest && conflictReq && (
                <div className="mt-2 rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/10 px-3 py-2 text-[11px] text-[var(--bos-warning)] flex items-center justify-between gap-2">
                  <span>
                    <strong>{selectedClient.companyName}</strong> already has an active requirement request ({conflictReq.ref}).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/requirements/${conflictReq.id}`);
                    }}
                    className="underline font-medium hover:text-[var(--bos-text-primary)] shrink-0"
                  >
                    Open {conflictReq.ref}
                  </button>
                </div>
              )}
            </div>

            {/* Project Title */}
            <div>
              <label htmlFor="req-title" className="bos-label">
                Discovery Title <span className="text-[var(--bos-accent)]">*</span>
              </label>
              <input
                id="req-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. NextGen Web App Discovery & Specifications"
                className="w-full h-9 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors"
              />
            </div>

            {/* Project Type */}
            <div>
              <label className="bos-label">
                Project Archetype <span className="text-[var(--bos-accent)]">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROJECT_TYPE_OPTIONS.map((opt) => {
                  const active = projectType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setProjectType(opt.value)}
                      className={cn(
                        "text-left p-2.5 rounded-sm border transition-all duration-150 flex flex-col justify-between min-h-[64px]",
                        active
                          ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] ring-1 ring-[var(--bos-accent)]"
                          : "border-[var(--bos-line)] bg-[var(--bos-bg)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-overlay)]",
                      )}
                    >
                      <div className={cn("text-[11px] font-semibold", active ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-primary)]")}>
                        {opt.label}
                      </div>
                      <div className="text-[9px] text-[var(--bos-text-tertiary)] leading-snug mt-1">
                        {opt.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">
                The discovery portal automatically configures feature questions and catalog templates matching this archetype.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
                {error}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--bos-line)]">
              <MicroButton type="button" onClick={onClose} disabled={submitting}>
                Cancel
              </MicroButton>
              <MicroButton
                type="submit"
                variant="accent"
                disabled={!selectedClientId || !title.trim() || submitting || Boolean(selectedClient?.hasActiveRequest)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    Generating portal…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    Create & Generate Link
                  </>
                )}
              </MicroButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
