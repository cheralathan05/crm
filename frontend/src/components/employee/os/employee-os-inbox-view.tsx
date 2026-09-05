"use client";

import { useState, useEffect } from "react";
import {
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InboxViewProps {
  onNavigateToAction?: (url?: string) => void;
}

export function EmployeeOSInboxView({ onNavigateToAction }: InboxViewProps) {
  const [loading, setLoading] = useState(true);
  const [inboxData, setInboxData] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<"NEEDS_ACTION" | "WAITING" | "INFORMATION">("NEEDS_ACTION");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/employee/os/inbox");
        const json = await res.json();
        if (json.ok) {
          setInboxData(json.data);
        }
      } catch (err) {
        console.error("Error loading inbox:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <span>SYNCING UNIFIED INBOX...</span>
      </div>
    );
  }

  const { needsAction = [], waiting = [], information = [] } = inboxData || {};

  const currentList =
    activeCategory === "NEEDS_ACTION" ? needsAction : activeCategory === "WAITING" ? waiting : information;

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Header */}
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
            NOTIFICATION INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
            Unified Inbox
          </h1>
          <p className="text-xs text-[var(--bos-text-secondary)]">
            High-signal notifications that directly affect your responsibilities and active blockers.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {[
            { key: "NEEDS_ACTION", label: "NEEDS ACTION", count: needsAction.length, color: "text-rose-400" },
            { key: "WAITING", label: "WAITING", count: waiting.length, color: "text-purple-400" },
            { key: "INFORMATION", label: "INFORMATION", count: information.length, color: "text-blue-400" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key as any)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5",
                activeCategory === tab.key
                  ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                  : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("text-[10px]", activeCategory === tab.key ? "text-white" : tab.color)}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {currentList.length > 0 ? (
          currentList.map((item: any) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 shadow-xs text-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">{item.title}</h3>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1.5">
                <p className="text-[var(--bos-text-primary)]"><strong className="text-emerald-400 font-mono text-[10px] uppercase">WHAT CHANGED:</strong> {item.whatChanged}</p>
                <p className="text-[var(--bos-text-secondary)]"><strong className="text-blue-400 font-mono text-[10px] uppercase">WHY IT MATTERS:</strong> {item.whyItMatters}</p>
                <p className="text-[var(--bos-text-secondary)]"><strong className="text-purple-400 font-mono text-[10px] uppercase">WHAT TO DO:</strong> {item.whatToDo}</p>
              </div>

              {item.actionUrl && onNavigateToAction && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onNavigateToAction(item.actionUrl)}
                    className="px-4 py-2 bg-[var(--bos-accent)] text-white font-mono text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Execute Action</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center text-xs text-[var(--bos-text-secondary)]">
            Zero notifications in this category. You are fully up to date.
          </div>
        )}
      </div>
    </div>
  );
}
