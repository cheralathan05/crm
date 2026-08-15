"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────
   COMMAND PALETTE (Ctrl/Cmd+K) — every document action reachable
   from the keyboard: go to section, search, AI assist, preview,
   download, finalize, send, save, add block.
──────────────────────────────────────────────────────────────── */

export type PaletteEntry = {
  id: string;
  label: string;
  hint: string;
  group: string;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({ open, onClose, entries }: { open: boolean; onClose: () => void; entries: PaletteEntry[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.label.toLowerCase().includes(q) || e.hint.toLowerCase().includes(q) || (e.keywords ?? "").toLowerCase().includes(q));
  }, [query, entries]);

  useEffect(() => setActive(0), [filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        filtered[active].run();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-palette-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3.5 border-b border-[var(--bos-line)]">
          <Search className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 h-11 bg-transparent text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none"
          />
          <kbd className="rounded-[3px] border border-[var(--bos-line)] px-1.5 py-0.5 text-[8px] font-mono text-[var(--bos-text-tertiary)]">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-[var(--bos-text-tertiary)]">No matches</div>}
          {filtered.map((e, i) => (
            <button
              key={e.id}
              type="button"
              data-palette-index={i}
              onMouseEnter={() => setActive(i)}
              onClick={e.run}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-left transition-colors duration-100",
                i === active ? "bg-[var(--bos-accent-subtle)]" : "",
              )}
            >
              <span className="flex-1 min-w-0">
                <span className={cn("block text-[12.5px] font-medium truncate", i === active ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-primary)]")}>{e.label}</span>
                <span className="block text-[9.5px] text-[var(--bos-text-tertiary)] truncate">{e.hint}</span>
              </span>
              <span className="shrink-0 text-[8px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)]">{e.group}</span>
              {i === active && <CornerDownLeft className="w-3 h-3 text-[var(--bos-accent)] shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Keyboard shortcuts dialog ═══ */

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "⌘/Ctrl + K", label: "Command palette" },
  { keys: "⌘/Ctrl + S", label: "Save document" },
  { keys: "⌘/Ctrl + Z", label: "Undo" },
  { keys: "⌘/Ctrl + Shift + Z", label: "Redo" },
  { keys: "⌘/Ctrl + P", label: "Preview PDF" },
  { keys: "Esc", label: "Close panel / palette" },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-sm rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-5"
          >
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
              <div className="text-[14px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Keyboard shortcuts</div>
              <button type="button" onClick={onClose} className="ml-auto text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--bos-text-secondary)]">{s.label}</span>
                  <kbd className="rounded-[3px] border border-[var(--bos-line)] bg-[var(--bos-surface)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--bos-text-primary)]">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
