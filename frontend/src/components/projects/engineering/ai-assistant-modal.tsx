"use client";

import { useState } from "react";
import {
  X,
  Bot,
  Send,
  Loader2,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AIAssistantModalProps = {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
};

const SUGGESTED_QUESTIONS = [
  "What should I work on next?",
  "What is currently blocking engineering progress?",
  "Why does the database schema exist for this project?",
  "Summarize this project architecture technically.",
  "Which requirements are waiting for client review?",
];

export function AIAssistantModal({
  projectId,
  projectName,
  isOpen,
  onClose,
}: AIAssistantModalProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hello! I am the Business OS Engineering Copilot for **${projectName}**. I answer strictly from your real database blueprint, tasks, deliverables, and blockers. Ask me anything about architecture, blockers, or execution priority.`,
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query.trim();
    if (!q || loading) return;

    const newMessages = [...messages, { role: "user" as const, content: q }];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        setMessages([...newMessages, { role: "assistant", content: data.answer }]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: `Error: ${data.message || "Failed to query project database."}` },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Network error communicating with project assistant." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                Project Engineering Assistant
              </h3>
              <p className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                Grounded in Real Project Database & Blueprint
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

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "flex flex-col max-w-[88%]",
                m.role === "user" ? "ml-auto items-end" : "mr-auto items-start",
              )}
            >
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] mb-1 px-1">
                {m.role === "user" ? "You" : "Engineering Intelligence"}
              </span>
              <div
                className={cn(
                  "p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-xs",
                  m.role === "user"
                    ? "bg-[var(--bos-accent)] text-white rounded-tr-xs"
                    : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] rounded-tl-xs whitespace-pre-wrap",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-[var(--bos-text-secondary)] text-[12px] font-mono p-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
              <span>Querying relational project state...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Queries */}
        <div className="px-5 py-2 border-t border-[var(--bos-border)] bg-[var(--bos-surface)]/50 flex items-center gap-1.5 overflow-x-auto">
          {SUGGESTED_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sq)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] whitespace-nowrap transition-colors cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about blockers, architecture, database schemas, or next work..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="p-2 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white transition-colors cursor-pointer shadow-xs disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
