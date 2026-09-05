"use client";

import { useState } from "react";
import { AlertOctagon, X, Loader2, ArrowRight, ShieldAlert } from "lucide-react";

interface WorkBlockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: {
    id: string;
    code?: string;
    title: string;
    layer?: string;
    dependencyDetails?: {
      title: string;
      layer?: string;
      ownerName: string;
      ownerRole: string;
    } | null;
  } | null;
  projectName?: string;
}

export function WorkBlockerModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  projectName,
}: WorkBlockerModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const dependency = task.dependencyDetails;
  const waitingWorkstream = dependency?.layer || "BACKEND";
  const waitingLabel = dependency?.title || `${waitingWorkstream} Dependency`;
  const ownerName = dependency?.ownerName || "Backend Team";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please describe what is blocking you.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/employee/work/blocker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          blockerReason: reason.trim(),
          waitingOnWorkstream: waitingWorkstream,
          waitingOnLabel: waitingLabel,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to report blocker.");
      }

      setReason("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error reporting blocker.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bos-surface-panel)] border border-rose-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">Report Work Blocker</h2>
              <p className="text-xs text-[var(--bos-text-tertiary)] font-mono uppercase tracking-wider">
                Automated Context Binding · Zero Manual Tagging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-populated Context Card */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border)]">
            <span className="text-[var(--bos-text-tertiary)] uppercase text-[10px]">Blocked Work</span>
            <span className="text-[var(--bos-accent)] font-bold">{task.code || "WORK"}</span>
          </div>
          <div className="text-sm font-semibold text-[var(--bos-text-primary)]">{task.title}</div>
          {projectName && (
            <div className="text-[11px] text-[var(--bos-text-secondary)]">Project: {projectName}</div>
          )}

          <div className="pt-2 grid grid-cols-2 gap-3 border-t border-[var(--bos-border)]">
            <div>
              <span className="text-[var(--bos-text-tertiary)] uppercase text-[10px] block">Dependency</span>
              <span className="text-amber-400 font-medium">{waitingLabel}</span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] uppercase text-[10px] block">Owner / Team</span>
              <span className="text-[var(--bos-text-primary)] font-medium">{ownerName}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-[var(--bos-text-secondary)] uppercase">
              What is blocking you?
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. The endpoint is returning 500 when saving product variants, or waiting for API response schema..."
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-rose-500/50 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reporting...</span>
                </>
              ) : (
                <>
                  <span>Report Blocker</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
