"use client";

import { useState } from "react";
import {
  X,
  Plus,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  FileCheck2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EvidenceModalProps = {
  projectId: string;
  isOpen: boolean;
  target?: {
    taskId?: string;
    deliverableId?: string;
    requirementId?: string;
    title: string;
  } | null;
  onClose: () => void;
  onAttached: () => void;
};

export function EvidenceModal({
  projectId,
  isOpen,
  target,
  onClose,
  onAttached,
}: EvidenceModalProps) {
  const [type, setType] = useState<
    "GIT_COMMIT" | "PULL_REQUEST" | "CI_TEST" | "MIGRATION_RESULT" | "DEPLOYMENT_URL" | "SCREENSHOT" | "REVIEW_SIGNOFF"
  >("GIT_COMMIT");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for this evidence record.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: target?.taskId,
          deliverableId: target?.deliverableId,
          requirementId: target?.requirementId,
          type,
          title,
          url: url.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onAttached();
        onClose();
      } else {
        setError(data.message || "Could not save evidence record.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to attach evidence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                Attach Verification Proof
              </h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                {target?.title || "Verification record for requirement fulfillment"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-border)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[12px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Evidence Type */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold mb-1.5">
              Evidence Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
            >
              <option value="GIT_COMMIT">GitHub / Git Commit</option>
              <option value="PULL_REQUEST">Pull Request (PR)</option>
              <option value="CI_TEST">CI Automated Test Run</option>
              <option value="MIGRATION_RESULT">Database Migration Log</option>
              <option value="DEPLOYMENT_URL">Live Staging / Deployment URL</option>
              <option value="SCREENSHOT">Visual Screenshot / Recording</option>
              <option value="REVIEW_SIGNOFF">Internal Code Review Sign-off</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold mb-1.5">
              Proof Summary / Commit Message
            </label>
            <input
              type="text"
              required
              placeholder="e.g. feat(workspace): provision schema and migrations (commit a8f91c)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold mb-1.5">
              Reference URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://github.com/.../commit/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold mb-1.5">
              Verification Notes
            </label>
            <textarea
              rows={3}
              placeholder="Details on test execution results, coverage benchmarks, or reviewer notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--bos-border)] text-[var(--bos-text-secondary)] text-[12px] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {loading ? "Attaching..." : "Record Verification Proof"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
