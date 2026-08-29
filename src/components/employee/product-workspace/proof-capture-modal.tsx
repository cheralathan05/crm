"use client";

import { useState } from "react";
import {
  Camera,
  X,
  CheckCircle2,
  Code,
  FileText,
  Upload,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProofCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildId: string;
  featureName: string;
  onProofCaptured: () => void;
}

export function ProofCaptureModal({
  isOpen,
  onClose,
  buildId,
  featureName,
  onProofCaptured,
}: ProofCaptureModalProps) {
  const [type, setType] = useState<"SCREENSHOT" | "CODE" | "PR" | "TEST" | "BUILD_RESULT">("PR");
  const [milestone, setMilestone] = useState("API Connected");
  const [title, setTitle] = useState(`${featureName} Implementation`);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceCode, setEvidenceCode] = useState("");
  const [whatChanged, setWhatChanged] = useState(`Implemented ${featureName} components and verified API data binding.`);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title || !whatChanged) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/product/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId,
          type,
          milestone,
          title,
          evidenceUrl,
          evidenceCode,
          whatChanged,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onProofCaptured();
        onClose();
      }
    } catch (err) {
      console.error("Error capturing proof:", err);
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
            <Camera className="w-5 h-5 text-[var(--bos-accent)]" />
            <h3 className="font-bold text-lg text-[var(--bos-text-primary)]">
              Proof Snapshot • {featureName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Type Selection */}
          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1.5">
              PROOF TYPE
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {[
                { key: "PR", label: "Pull Request / Commit" },
                { key: "SCREENSHOT", label: "Screenshot / UI" },
                { key: "TEST", label: "Test Outcome" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key as any)}
                  className={cn(
                    "p-2 rounded-xl border text-center transition-all cursor-pointer",
                    type === t.key
                      ? "bg-[var(--bos-accent)] text-white font-bold border-transparent"
                      : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Milestone */}
          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              MILESTONE
            </label>
            <input
              type="text"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none font-mono"
            />
          </div>

          {/* URL or Code */}
          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              {type === "PR" ? "PR OR COMMIT URL" : type === "SCREENSHOT" ? "IMAGE URL" : "TEST RESULT LINK"}
            </label>
            <input
              type="text"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://github.com/org/repo/pull/42"
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none font-mono"
            />
          </div>

          {/* What Changed */}
          <div>
            <label className="block font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold mb-1">
              WHAT CHANGED?
            </label>
            <textarea
              value={whatChanged}
              onChange={(e) => setWhatChanged(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--bos-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !whatChanged.trim()}
            className="px-6 py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] disabled:opacity-50 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Confirm Proof</span>
          </button>
        </div>
      </div>
    </div>
  );
}
