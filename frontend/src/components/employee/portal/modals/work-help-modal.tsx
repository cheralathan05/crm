"use client";

import { useState } from "react";
import { HelpCircle, X, Loader2, ArrowRight, Sparkles, Shield, Send } from "lucide-react";

interface WorkHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: {
    id: string;
    code?: string;
    title: string;
    layer?: string;
  } | null;
  projectName?: string;
}

export function WorkHelpModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  projectName,
}: WorkHelpModalProps) {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError("Please describe what you need assistance with.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/employee/work/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          question: question.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to submit help request.");
      }

      setQuestion("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error submitting help request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bos-surface-panel)] border border-amber-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">Request Work Assistance</h2>
              <p className="text-xs text-[var(--bos-text-tertiary)] font-mono uppercase tracking-wider">
                Automated Context Binding · Admin & Lead Notification
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

        {/* Auto-Bound Work Context Strip */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[var(--bos-text-tertiary)] text-[10px] uppercase">
            <span>Bound Project & Workstream</span>
            <span className="text-amber-400 font-bold">Auto-Attached Context</span>
          </div>
          <div className="text-sm font-bold text-[var(--bos-text-primary)]">
            {task.code}: {task.title}
          </div>
          <div className="text-[11px] text-[var(--bos-text-secondary)]">
            Project: <span className="text-[var(--bos-text-primary)]">{projectName || "Active Project"}</span> · Discipline:{" "}
            <span className="text-[var(--bos-accent)] uppercase">{task.layer || "Engineering"}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[var(--bos-text-secondary)] uppercase mb-2">
              What do you need help with? *
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Describe the issue, specification ambiguity, or technical clarification needed..."
              rows={4}
              className="w-full p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-amber-500/50 resize-none"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Help Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
