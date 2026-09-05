"use client";

import { useState } from "react";
import {
  ShieldAlert,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildId: string;
  featureName: string;
  onBlockerReported: () => void;
}

export function BlockerModal({
  isOpen,
  onClose,
  buildId,
  featureName,
  onBlockerReported,
}: BlockerModalProps) {
  const [blockedReason, setBlockedReason] = useState("API Contract or response format mismatch.");
  const [blockedDependency, setBlockedDependency] = useState("Backend API");
  const [blockedOwnerRole, setBlockedOwnerRole] = useState("Backend Developer");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/product/blocker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId,
          blockedReason,
          blockedDependency,
          blockedOwnerRole,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onBlockerReported();
        onClose();
      }
    } catch (err) {
      console.error("Error reporting blocker:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
      <div
        className="w-full max-w-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-lg text-[var(--bos-text-primary)]">
              Report Blocker • {featureName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              BLOCKING DEPENDENCY
            </label>
            <input
              type="text"
              value={blockedDependency}
              onChange={(e) => setBlockedDependency(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs font-mono outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              OWNER ROLE TO NOTIFY
            </label>
            <input
              type="text"
              value={blockedOwnerRole}
              onChange={(e) => setBlockedOwnerRole(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs font-mono outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              EXPLICIT BLOCKER REASON
            </label>
            <textarea
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--bos-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[var(--bos-text-secondary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !blockedReason.trim()}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            <span>Report Blocker</span>
          </button>
        </div>
      </div>
    </div>
  );
}
