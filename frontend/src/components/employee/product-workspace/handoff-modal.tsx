"use client";

import { useState } from "react";
import {
  Share2,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildId: string;
  featureName: string;
  onHandoffExecuted: () => void;
}

export function HandoffModal({
  isOpen,
  onClose,
  buildId,
  featureName,
  onHandoffExecuted,
}: HandoffModalProps) {
  const [toWorkstream, setToWorkstream] = useState("QA");
  const [whatWasBuilt, setWhatWasBuilt] = useState(`${featureName} responsive interface and API integrations.`);
  const [whatWasVerified, setWhatWasVerified] = useState("Passed local interaction testing, empty states, and error handling.");
  const [whatRemains, setWhatRemains] = useState("End-to-end user acceptance and load verification.");
  const [knownIssues, setKnownIssues] = useState("None.");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/product/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId,
          fromWorkstream: "FRONTEND",
          toWorkstream,
          whatWasBuilt,
          whatWasVerified,
          whatRemains,
          knownIssues,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onHandoffExecuted();
        onClose();
      }
    } catch (err) {
      console.error("Handoff error:", err);
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
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-lg text-[var(--bos-text-primary)]">
              Feature Handoff • {featureName}
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
              HANDING OFF TO SQUAD
            </label>
            <select
              value={toWorkstream}
              onChange={(e) => setToWorkstream(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs font-mono outline-none"
            >
              <option value="QA">QA / Quality Engineering Squad</option>
              <option value="BACKEND">Backend Squad</option>
              <option value="INTEGRATION">Release & Integration Squad</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              WHAT WAS BUILT
            </label>
            <textarea
              value={whatWasBuilt}
              onChange={(e) => setWhatWasBuilt(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              WHAT WAS VERIFIED
            </label>
            <textarea
              value={whatWasVerified}
              onChange={(e) => setWhatWasVerified(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              WHAT REMAINS
            </label>
            <input
              type="text"
              value={whatRemains}
              onChange={(e) => setWhatRemains(e.target.value)}
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
            disabled={submitting}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>Execute Handoff</span>
          </button>
        </div>
      </div>
    </div>
  );
}
