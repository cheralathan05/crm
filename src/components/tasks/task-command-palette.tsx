"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  Clock,
  FolderKanban,
  GitBranch,
  Layers,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TaskCommandPalette({
  isOpen,
  onClose,
  onSelectAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string, payload?: any) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: "create-task", label: "Create New Task", category: "Actions", icon: Plus, shortcut: "N" },
    { id: "work-breakdown", label: "Open Work Breakdown Builder (AI)", category: "Actions", icon: Sparkles, shortcut: "B" },
    { id: "view-overview", label: "Switch to Command Overview", category: "Views", icon: Zap, payload: "overview" },
    { id: "view-board", label: "Switch to Execution Board", category: "Views", icon: CheckSquare, payload: "board" },
    { id: "view-list", label: "Switch to Work Breakdown Tree", category: "Views", icon: ListTodo, payload: "list" },
    { id: "view-timeline", label: "Switch to Timeline View", category: "Views", icon: Clock, payload: "timeline" },
    { id: "view-calendar", label: "Switch to Calendar View", category: "Views", icon: Calendar, payload: "calendar" },
    { id: "view-workmap", label: "Switch to Project Work Map", category: "Views", icon: GitBranch, payload: "work-map" },
    { id: "view-dependencies", label: "Switch to Dependency Graph", category: "Views", icon: Layers, payload: "dependencies" },
    { id: "filter-my", label: "Filter: My Tasks", category: "Quick Filters", icon: User, payload: "my" },
    { id: "filter-blocked", label: "Filter: Blocked Work", category: "Quick Filters", icon: AlertTriangle, payload: "blocked" },
    { id: "filter-overdue", label: "Filter: Overdue Work", category: "Quick Filters", icon: Clock, payload: "overdue" },
    { id: "filter-today", label: "Filter: Due Today", category: "Quick Filters", icon: Calendar, payload: "today" },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-bg)] border border-[var(--bos-border-strong)] rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-[var(--bos-text-primary)]">
        {/* Search bar */}
        <div className="p-3.5 border-b border-[var(--bos-border)] flex items-center gap-3 bg-[var(--bos-surface)]">
          <Search className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
          <input
            type="text"
            placeholder="Type a command, view, or search task (e.g. 'board', 'create', 'blocked')…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-[var(--bos-text-primary)] focus:outline-none placeholder:text-[var(--bos-text-tertiary)]"
            autoFocus
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded text-[var(--bos-text-tertiary)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-[var(--bos-text-secondary)]">No commands matching "{query}".</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectAction(item.id, item.payload);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[var(--bos-surface)] transition text-[13px] group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[var(--bos-text-secondary)] group-hover:text-[var(--bos-accent)] transition" />
                    <span className="font-medium text-[var(--bos-text-primary)]">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
