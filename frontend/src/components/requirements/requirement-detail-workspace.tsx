"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MicroButton, StatusChip } from "@/components/clients/kit";
import { RequirementCommandCenter } from "@/components/clients/requirement-command-center";
import { RequirementCollaborationStudio } from "./requirement-collaboration-studio";

export function RequirementDetailWorkspace({
  requestId,
  initialData,
}: {
  requestId: string;
  initialData?: any;
}) {
  const router = useRouter();
  const [data, setData] = useState<any>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"command-center" | "studio">("command-center");
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/requirements/${requestId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load requirement.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requirement details.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (!initialData) {
      void fetchDetail();
    }
  }, [initialData, fetchDetail]);

  const handleCopyLink = async () => {
    if (portalLink) {
      try {
        await navigator.clipboard.writeText(portalLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        /* ignore */
      }
    }

    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/requirements/${requestId}/regenerate`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.link) {
        setPortalLink(json.link);
        await navigator.clipboard.writeText(json.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* ignore */
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleOpenPortal = async () => {
    if (portalLink) {
      window.open(portalLink, "_blank", "noopener,noreferrer");
      return;
    }
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/requirements/${requestId}/regenerate`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.link) {
        setPortalLink(json.link);
        window.open(json.link, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* ignore */
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center gap-2 text-[13px] text-[var(--bos-text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
          Loading requirement workspace…
        </div>
      </div>
    );
  }

  if (error || !data?.request) {
    return (
      <div className="px-5 sm:px-8 py-8 max-w-4xl">
        <button
          type="button"
          onClick={() => router.push("/requirements")}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to requirements
        </button>
        <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 p-4 text-[13px] text-[var(--bos-error)]">
          {error ?? "Requirement request not found or inaccessible."}
        </div>
      </div>
    );
  }

  const req = data.request;
  const client = data.client;

  return (
    <div className="w-full">
      {/* ── Top Bar ──────────────────────────────────────────── */}
      <div className="border-b border-[var(--bos-line)] bg-[var(--bos-bg)] px-5 sm:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Back + identity */}
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={() => router.push("/requirements")}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Requirements
            </button>
            <span className="text-[var(--bos-line-strong)]">/</span>
            <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)] shrink-0">
              {req.reference}
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-[var(--bos-text-primary)] truncate max-w-[320px]">
              {req.title}
            </span>
            <StatusChip status={req.status} />

            {client && (
              <button
                type="button"
                onClick={() => router.push(`/clients/${client.id}?req=${req.id}#requirement`)}
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors"
              >
                <span>Client:</span>
                <span className="font-medium text-[var(--bos-text-primary)]">{client.companyName}</span>
              </button>
            )}
          </div>

          {/* Right: View toggle + Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Switcher */}
            <div className="inline-flex rounded-sm border border-[var(--bos-line)] p-0.5 bg-[var(--bos-surface)]/50">
              <button
                type="button"
                onClick={() => setActiveView("command-center")}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-sm transition-colors duration-150",
                  activeView === "command-center"
                    ? "bg-[var(--bos-bg)] text-[var(--bos-accent)] font-medium shadow-sm"
                    : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
                )}
              >
                Command Center
              </button>
              <button
                type="button"
                onClick={() => setActiveView("studio")}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-sm transition-colors duration-150",
                  activeView === "studio"
                    ? "bg-[var(--bos-bg)] text-[var(--bos-accent)] font-medium shadow-sm"
                    : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
                )}
              >
                Collaboration Studio
              </button>
            </div>

            <MicroButton onClick={() => void handleCopyLink()} disabled={generatingLink}>
              {copied ? <Check className="w-3 h-3 text-[var(--bos-success)]" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy Link"}
            </MicroButton>

            <MicroButton variant="accent" onClick={() => void handleOpenPortal()} disabled={generatingLink}>
              <ExternalLink className="w-3 h-3" />
              Client Portal
            </MicroButton>
          </div>
        </div>
      </div>

      {/* ── Main View Content ─────────────────────────────────── */}
      <div className="w-full">
        {activeView === "command-center" ? (
          <div className="px-4 sm:px-8 py-5">
            <RequirementCommandCenter
              requestId={requestId}
              initialLink={portalLink}
              onClose={() => router.push("/requirements")}
              onChanged={() => void fetchDetail()}
            />
          </div>
        ) : (
          <div className="w-full">
            <RequirementCollaborationStudio
              requestId={requestId}
              onClose={() => setActiveView("command-center")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
