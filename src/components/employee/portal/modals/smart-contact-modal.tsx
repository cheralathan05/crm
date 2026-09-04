"use client";

import { useState } from "react";
import { MessageSquare, X, Loader2, ArrowRight, ShieldAlert, Sparkles, Send } from "lucide-react";
import { WorkMessageType } from "@/lib/messages/work-messages.service";

interface SmartContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageSent: (conversationId: string) => void;
  targetPerson: {
    name: string;
    role: string;
    employeeId?: string | null;
  } | null;
  task: {
    id: string;
    code?: string;
    title: string;
    layer?: string;
    dependencyDetails?: {
      title: string;
      layer?: string;
    } | null;
  } | null;
  projectId?: string | null;
  projectName?: string;
}

export function SmartContactModal({
  isOpen,
  onClose,
  onMessageSent,
  targetPerson,
  task,
  projectId,
  projectName,
}: SmartContactModalProps) {
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState<WorkMessageType>("QUESTION");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const targetName = targetPerson?.name || "Team Member";
  const targetRole = targetPerson?.role || "Engineering Colleague";
  const dependencyTitle = task.dependencyDetails?.title;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please enter your message.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Start or get conversation thread
      const threadRes = await fetch("/api/messages/start-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmployeeId: targetPerson?.employeeId || null,
          projectId: projectId || null,
          taskId: task.id,
          dependencyWorkstream: task.dependencyDetails?.layer || null,
          dependencyLabel: dependencyTitle || null,
        }),
      });

      const threadJson = await threadRes.json();
      if (!threadRes.ok || !threadJson.ok) {
        throw new Error(threadJson.message || "Failed to establish work thread.");
      }

      const conversationId = threadJson.conversation.id;

      // 2. Post the first message with context
      const msgRes = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          messageType,
          metadata: {
            taskId: task.id,
            taskCode: task.code,
            taskTitle: task.title,
            projectName,
            dependencyTitle,
          },
        }),
      });

      const msgJson = await msgRes.json();
      if (!msgRes.ok || !msgJson.ok) {
        throw new Error(msgJson.message || "Failed to dispatch message.");
      }

      setContent("");
      onMessageSent(conversationId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error sending message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-accent)]/30 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 flex items-center justify-center text-[var(--bos-accent)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">Contact {targetName}</h2>
              <p className="text-xs text-[var(--bos-text-tertiary)] font-mono uppercase tracking-wider">
                {targetRole} · Automated Work Context
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

        {/* Automatic Message Context Header Preview */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2 font-mono text-xs">
          <div className="text-[10px] text-[var(--bos-text-tertiary)] uppercase tracking-wider">
            Context Attached Automatically
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--bos-text-secondary)]">Work Item:</span>
            <span className="text-[var(--bos-accent)] font-bold">{task.code || "WORK"}: {task.title}</span>
          </div>
          {dependencyTitle && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--bos-text-secondary)]">Dependency:</span>
              <span className="text-amber-400 font-medium">{dependencyTitle}</span>
            </div>
          )}
          {projectName && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--bos-text-secondary)]">Project:</span>
              <span className="text-[var(--bos-text-primary)]">{projectName}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-[var(--bos-text-secondary)] uppercase">
              Message Type
            </label>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {(["QUESTION", "UPDATE", "HELP", "BLOCKER"] as WorkMessageType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setMessageType(t)}
                  className={`px-3 py-1 rounded-xl border transition-colors cursor-pointer font-medium ${
                    messageType === t
                      ? "bg-[var(--bos-accent)] border-[var(--bos-accent)] text-white font-bold"
                      : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-[var(--bos-text-secondary)] uppercase">
              Message
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`e.g. Is the API response schema ready for ${task.title}?`}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)] transition-colors resize-none"
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
              className="px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Opening Thread...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
