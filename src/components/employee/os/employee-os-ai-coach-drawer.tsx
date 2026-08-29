"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Bot,
  HelpCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AICoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectRole: string;
  workstream: string;
  previewEmployeeId?: string | null;
}

export function EmployeeOSAICoachDrawer({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectRole,
  workstream,
  previewEmployeeId,
}: AICoachDrawerProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "coach"; text: string; model?: string }>>([
    {
      role: "coach",
      text: `Hello! I am your Technical Coach for ${projectName}. I have access to your approved project scope, API blueprints, database schemas, and dependencies. What would you like to clarify or verify?`,
    },
  ]);

  if (!isOpen) return null;

  const quickStarters = [
    "Explain this project like I am new.",
    "What should I verify before submitting my work?",
    "What could go wrong with my current workstream?",
    "What dependencies should I be aware of?",
  ];

  const handleAsk = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim() || loading) return;

    const userMsg = q.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/employee/os/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          question: userMsg,
          previewEmployeeId,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessages((prev) => [...prev, { role: "coach", text: json.answer, model: json.modelUsed }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "coach", text: "I encountered an error retrieving context. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "coach", text: "Network error contacting coaching service." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[var(--bos-surface-panel)] border-l border-[var(--bos-border)] h-full shadow-2xl flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">AI Technical Coach</h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)] font-mono">
                Contextual guide for {workstream} ({projectRole})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Starters */}
        <div className="p-3.5 border-b border-[var(--bos-border)] bg-[var(--bos-surface-subtle)]/30 space-y-1.5 text-xs">
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block">
            SUGGESTED QUESTIONS:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickStarters.map((qs, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(qs)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-purple-400/40 transition-all text-left cursor-pointer"
              >
                {qs}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3.5 rounded-2xl max-w-[90%] space-y-1 leading-relaxed",
                m.role === "user"
                  ? "ml-auto bg-[var(--bos-accent)] text-white rounded-br-none"
                  : "mr-auto bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] rounded-bl-none shadow-xs"
              )}
            >
              <p>{m.text}</p>
              {m.model && (
                <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)] block pt-1">
                  Engine: {m.model}
                </span>
              )}
            </div>
          ))}
          {loading && (
            <div className="mr-auto p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center gap-2 text-xs font-mono text-[var(--bos-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Synthesizing project guidance...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask AI Coach about this project or task..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] outline-none font-mono"
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="p-2 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
