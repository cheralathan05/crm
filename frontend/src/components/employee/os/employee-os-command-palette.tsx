"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  X,
  Play,
  Layers,
  FolderKanban,
  FileCode,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Database,
  Server,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionType: string, payload?: any) => void;
  projectData: any;
}

export function EmployeeOSCommandPalette({
  isOpen,
  onClose,
  onSelectAction,
  projectData,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectAction("OPEN_PALETTE");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onSelectAction]);

  if (!isOpen) return null;

  const quickActions = [
    { id: "act-build", label: "Start Build Session", category: "Actions", icon: Play, action: () => onSelectAction("NAV", "BUILD") },
    { id: "act-day", label: "Open My Day", category: "Actions", icon: Layers, action: () => onSelectAction("NAV", "MY_DAY") },
    { id: "act-radar", label: "View Dependency Radar", category: "Actions", icon: Server, action: () => onSelectAction("NAV", "DEPENDENCIES") },
    { id: "act-team", label: "Open Team Map", category: "Actions", icon: Users, action: () => onSelectAction("NAV", "TEAM") },
    { id: "act-decisions", label: "View Decision Feed", category: "Actions", icon: Sparkles, action: () => onSelectAction("NAV", "DECISIONS") },
    { id: "act-coach", label: "Ask AI Coach", category: "Actions", icon: Sparkles, action: () => onSelectAction("OPEN_COACH") },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-[var(--bos-border)] flex items-center gap-3 bg-[var(--bos-surface)]">
          <Search className="w-5 h-5 text-[var(--bos-text-secondary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search feature, API, task, or decision..."
            className="flex-1 bg-transparent text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] outline-none font-mono"
            autoFocus
          />
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 rounded bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] text-[10px] font-mono text-[var(--bos-text-secondary)]">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-1 text-xs">
          <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
            QUICK ACTIONS
          </div>
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl hover:bg-[var(--bos-surface)] flex items-center justify-between transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--bos-surface-subtle)] text-[var(--bos-accent)] group-hover:bg-[var(--bos-accent)] group-hover:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-[var(--bos-text-primary)]">{item.label}</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-[var(--bos-border)] bg-[var(--bos-surface-subtle)]/50 text-[11px] font-mono text-[var(--bos-text-tertiary)] flex items-center justify-between">
          <span>Search authorized project scope & actions</span>
          <span>Business OS 3.0</span>
        </div>
      </div>
    </div>
  );
}
