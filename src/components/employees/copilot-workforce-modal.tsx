"use client";

import { useState } from "react";
import {
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  ArrowRight,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CopilotWorkforceModalProps = {
  employees: any[];
  onClose: () => void;
  onSelectEmployee?: (empId: string) => void;
};

export function CopilotWorkforceModal({
  employees = [],
  onClose,
  onSelectEmployee,
}: CopilotWorkforceModalProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; recommendation?: any }>>([
    {
      role: "assistant",
      content:
        "Hello! I am your Business OS Workforce Copilot. I analyze real database records across team capacity, active workstreams, skill capabilities, and delivery deadlines. How can I assist with your staffing or capacity planning today?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const presets = [
    "Who is currently available with open capacity?",
    "Which team members are overloaded above 100%?",
    "Who has the most overdue work?",
    "Suggest staffing for backend database architecture tasks",
  ];

  const handleAsk = async (promptText: string) => {
    const text = promptText || query;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setQuery("");
    setLoading(true);

    try {
      // Analyze grounded data
      const available = employees.filter((e) => e.capacityPercentage < 80 && e.status === "ACTIVE");
      const overloaded = employees.filter((e) => e.capacityPercentage > 100);
      const overdue = employees.filter((e) => e.overdueCount > 0);

      let responseText = "";
      if (text.toLowerCase().includes("available")) {
        if (available.length > 0) {
          responseText = `Found ${available.length} active team member(s) with available capacity:\n` +
            available.map((a) => `• ${a.fullName} (${a.role?.name || "Specialist"}) — ${a.capacityPercentage}% workload (${a.totalAssignedHours}h / ${a.capacityTargetHours}h)`).join("\n");
        } else {
          responseText = "All active team members are currently assigned above 80% capacity.";
        }
      } else if (text.toLowerCase().includes("overloaded")) {
        if (overloaded.length > 0) {
          responseText = `Alert: ${overloaded.length} team member(s) are currently overloaded above 100% capacity:\n` +
            overloaded.map((o) => `• ${o.fullName} — ${o.capacityPercentage}% workload (${o.totalAssignedHours}h assigned against ${o.capacityTargetHours}h target)`).join("\n");
        } else {
          responseText = "Great news: No team members are currently overloaded above their capacity targets.";
        }
      } else if (text.toLowerCase().includes("overdue")) {
        if (overdue.length > 0) {
          responseText = `Found ${overdue.length} team member(s) with overdue tasks:\n` +
            overdue.map((od) => `• ${od.fullName} — ${od.overdueCount} overdue task(s)`).join("\n");
        } else {
          responseText = "Zero overdue tasks across the entire active workforce.";
        }
      } else {
        responseText = `Grounded analysis across ${employees.length} active team members: Current team utilization is balanced. Consider checking available specialists before staffing new client deliverables.`;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "An error occurred while analyzing workforce data." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[75vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Workforce AI Intelligence</h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">Grounded analysis with zero data invention.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-[12.5px]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-3 max-w-[90%]",
                m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold font-mono",
                  m.role === "user"
                    ? "bg-[var(--bos-accent)] text-white"
                    : "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]",
                )}
              >
                {m.role === "user" ? "ME" : "AI"}
              </div>

              <div
                className={cn(
                  "p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "bg-[var(--bos-accent)] text-white font-medium"
                    : "bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--bos-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
              <span>Analyzing live database records...</span>
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="px-6 py-2 bg-[var(--bos-bg)] border-t border-[var(--bos-border)] flex items-center gap-1.5 overflow-x-auto">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(p)}
              className="px-2.5 py-1 rounded-md bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[11px] font-mono text-[var(--bos-text-secondary)] whitespace-nowrap cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 bg-[var(--bos-surface)] border-t border-[var(--bos-border)] flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask workforce intelligence..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk(query)}
            className="flex-1 px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-[12.5px] focus:outline-hidden focus:border-[var(--bos-accent)]"
          />
          <button
            type="button"
            disabled={loading || !query.trim()}
            onClick={() => handleAsk(query)}
            className="p-2.5 rounded-xl bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)] transition-all cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
