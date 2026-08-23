"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  RotateCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  ExternalLink,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InvitationCenterModalProps = {
  onClose: () => void;
  onInvitationUpdated: () => void;
};

export function InvitationCenterModal({
  onClose,
  onInvitationUpdated,
}: InvitationCenterModalProps) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const url = statusFilter === "ALL" ? "/api/employees/invitations" : `/api/employees/invitations?status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok && json.invitations) {
        setInvitations(json.invitations);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [statusFilter]);

  const handleAction = async (invitationId: string, action: "RESEND" | "REVOKE") => {
    setProcessingId(invitationId);
    try {
      const res = await fetch("/api/employees/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action }),
      });
      const json = await res.json();
      if (json.ok) {
        setNotice(action === "RESEND" ? "Invitation re-dispatched via email." : "Invitation revoked.");
        setTimeout(() => setNotice(null), 3000);
        await fetchInvitations();
        onInvitationUpdated();
      }
    } catch {}
    finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Invitation Command Center
              </h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Monitor invitation delivery, cryptographic token lifecycle, and activation states.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div className="px-6 py-2 bg-emerald-600 text-white text-[12px] font-mono flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="px-6 py-2 bg-[var(--bos-bg)] border-b border-[var(--bos-border)] flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "SENT", "OPENED", "ACCEPTED", "FAILED", "REVOKED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer",
                statusFilter === st
                  ? "bg-[var(--bos-accent)] text-white font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] bg-[var(--bos-surface)] border border-[var(--bos-border)]",
              )}
            >
              {st}
            </button>
          ))}
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-[var(--bos-text-secondary)] font-mono text-[12px] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
              <span>Loading invitation records...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
              No invitations found matching status filter "{statusFilter}".
            </div>
          ) : (
            invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-[13px] text-[var(--bos-text-primary)]">{inv.recipientName}</strong>
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">({inv.recipientEmail})</span>
                    <span className={cn(
                      "text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded uppercase",
                      inv.status === "ACCEPTED" ? "bg-emerald-500/10 text-emerald-600" :
                      inv.status === "SENT" ? "bg-purple-500/10 text-purple-600" :
                      inv.status === "OPENED" ? "bg-sky-500/10 text-sky-600" : "bg-rose-500/10 text-rose-600"
                    )}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10.5px] font-mono text-[var(--bos-text-secondary)] mt-1">
                    <span>Role: {inv.role?.name || "General"}</span>
                    <span>·</span>
                    <span>Sent: {inv.sentAt ? new Date(inv.sentAt).toLocaleString() : "Pending"}</span>
                    <span>·</span>
                    <span>Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {inv.status !== "ACCEPTED" && inv.status !== "REVOKED" && (
                    <>
                      <button
                        type="button"
                        disabled={processingId === inv.id}
                        onClick={() => handleAction(inv.id, "RESEND")}
                        className="px-2.5 py-1 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-purple-500 text-[11px] font-mono text-[var(--bos-text-primary)] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw className="w-3 h-3 text-purple-600" />
                        <span>Resend</span>
                      </button>

                      <button
                        type="button"
                        disabled={processingId === inv.id}
                        onClick={() => handleAction(inv.id, "REVOKE")}
                        className="px-2.5 py-1 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-rose-500 text-[11px] font-mono text-rose-600 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
