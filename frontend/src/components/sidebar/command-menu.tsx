"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { commandEntriesForRole, type UserRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  role: UserRole;
}

/**
 * The searchable panel. Mounted fresh each time the menu opens, so the
 * query and selection state start clean without reset effects.
 */
function CommandMenuPanel({ onClose, role }: { onClose: () => void; role: UserRole }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => commandEntriesForRole(role), [role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.hint.toLowerCase().includes(q) ||
        e.keywords.includes(q),
    );
  }, [entries, query]);

  const actions = filtered.filter((e) => e.group === "actions");
  const navigation = filtered.filter((e) => e.group === "navigation");

  // Autofocus on mount.
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Keep the active row visible while navigating.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filtered.length]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[activeIndex];
      if (entry) go(entry.href);
    }
  }

  function renderGroup(label: string, items: typeof filtered, startIndex: number) {
    return (
      <div>
        <div className="px-2.5 pt-2 pb-1 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
          {label}
        </div>
        {items.map((entry, i) => {
          const index = startIndex + i;
          const Icon = entry.icon;
          const active = index === activeIndex;
          return (
            <button
              key={entry.id}
              type="button"
              data-index={index}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => go(entry.href)}
              className={cn(
                "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-sm text-left text-[13px] transition-colors duration-100",
                active
                  ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                  : "text-[var(--bos-text-secondary)]",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate flex-1">{entry.label}</span>
              <span className="text-[10px] text-[var(--bos-text-tertiary)] shrink-0">{entry.hint}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.button
            aria-label="Close search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(26,23,20,0.45)] cursor-default"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search Business OS"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-[560px] rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] shadow-[var(--bos-shadow-lg)] overflow-hidden"
          >
            {/* Input row */}
            <div className="flex items-center gap-2.5 px-3.5 h-12 border-b border-[var(--bos-line)]">
              <Search className="w-4 h-4 text-[var(--bos-text-tertiary)] shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search anything…"
                aria-label="Search Business OS"
                className="flex-1 bg-transparent text-[14px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none min-w-0"
              />
              <kbd className="px-1.5 py-0.5 rounded-[3px] border border-[var(--bos-line)] text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[340px] overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <div className="px-2.5 py-8 text-center">
                  <div className="text-[13px] text-[var(--bos-text-secondary)]">
                    No results for “{query}”
                  </div>
                  <div className="text-[11px] text-[var(--bos-text-tertiary)] mt-1">
                    Try clients, projects, tasks or settings.
                  </div>
                </div>
              )}
              {navigation.length > 0 && renderGroup("Navigation", navigation, 0)}
              {actions.length > 0 &&
                renderGroup("Quick actions", actions, navigation.length)}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 px-3.5 h-9 border-t border-[var(--bos-line)] text-[10px] text-[var(--bos-text-tertiary)]">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" aria-hidden="true" /> open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded-[2px] border border-[var(--bos-line)] font-mono text-[8px]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <kbd className="px-1 rounded-[2px] border border-[var(--bos-line)] font-mono text-[8px]">⌘K</kbd>
                to open
              </span>
              <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
            </div>
          </motion.div>
        </div>
  );
}

/**
 * ⌘K / Ctrl+K global search. Searches the full navigation (clients,
 * requirements, projects, …) plus role-permitted quick actions.
 */
export function CommandMenu({ open, onClose, role }: CommandMenuProps) {
  return (
    <AnimatePresence>
      {open && <CommandMenuPanel onClose={onClose} role={role} />}
    </AnimatePresence>
  );
}
