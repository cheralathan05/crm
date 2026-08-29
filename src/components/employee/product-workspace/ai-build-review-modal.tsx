"use client";

import { useState } from "react";
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIBuildReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildId: string;
  featureName: string;
  expectedResult: string;
}

export function AIBuildReviewModal({
  isOpen,
  onClose,
  buildId,
  featureName,
  expectedResult,
}: AIBuildReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleRunEvaluation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/product/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildId,
          requirementText: expectedResult,
          acceptanceCriteria: [
            "UI components render correctly",
            "Data bindings function without runtime errors",
            "Error boundaries handled gracefully",
          ],
          proofDescription: `Submitted verified build proofs for ${featureName}`,
        }),
      });
      const json = await res.json();
      if (json.ok) setEvaluation(json.evaluation);
    } catch (err) {
      console.error("AI Review error:", err);
    } finally {
      setLoading(false);
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
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-lg text-[var(--bos-text-primary)]">
              AI Build Review • {featureName}
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
          <p className="text-[var(--bos-text-secondary)]">
            Ollama compares captured build proof against canonical project requirements and acceptance criteria.
          </p>

          {!evaluation && (
            <div className="p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center space-y-3">
              <button
                onClick={handleRunEvaluation}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 mx-auto"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? "Evaluating Proof..." : "Run AI Build Review"}</span>
              </button>
            </div>
          )}

          {evaluation && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-secondary)]">
                  VERIFICATION STATUS
                </span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full font-mono text-xs font-bold uppercase",
                    evaluation.status === "SUPPORTED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  )}
                >
                  {evaluation.status}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-secondary)] block">
                  AI OBSERVATIONS
                </span>
                <ul className="space-y-1.5 text-[var(--bos-text-primary)]">
                  {evaluation.observations?.map((obs: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-[var(--bos-border)]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
