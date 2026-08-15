"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Command,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Save,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/clients/kit";
import type { SaveState } from "./types";

/* ────────────────────────────────────────────────────────────────
   PROPOSAL COMMAND BAR — compact, always visible. Identity on the
   left (← Proposals · reference · editable title · status · version ·
   autosave state), document controls on the right (zoom · page nav ·
   search · preview · AI assist · share · finalize · more).
──────────────────────────────────────────────────────────────── */

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5] as const;

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Save failed — retry",
};

const SAVE_CLS: Record<SaveState, string> = {
  saved: "text-[var(--bos-success)]",
  saving: "text-[var(--bos-text-tertiary)]",
  unsaved: "text-[var(--bos-warning)]",
  error: "text-[var(--bos-error)]",
};

type MoreAction = "save" | "view-pdf" | "download" | "send" | "finalize" | "delivery" | "shortcuts";

type CommandBarProps = {
  reference: string | null;
  title: string;
  onTitleChange: (title: string) => void;
  status: string;
  version: number;
  saveState: SaveState;
  zoom: number;
  onZoom: (zoom: number) => void;
  pageIdx: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  searchQuery: string;
  onSearchQuery: (q: string) => void;
  onAiAssist: () => void;
  onPreview: () => void;
  onShare: () => void;
  onFinalize: () => void;
  finalized: boolean;
  canSend: boolean;
  onSend: () => void;
  onMore: (action: MoreAction) => void;
};

export function CommandBar({
  reference,
  title,
  onTitleChange,
  status,
  version,
  saveState,
  zoom,
  onZoom,
  pageIdx,
  totalPages,
  onPrevPage,
  onNextPage,
  searchQuery,
  onSearchQuery,
  onAiAssist,
  onPreview,
  onShare,
  onFinalize,
  finalized,
  canSend,
  onSend,
  onMore,
}: CommandBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const openMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMoreOpen((v) => !v);
  };

  const moreItem = "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-left text-[11.5px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150";

  return (
    <div className="shrink-0 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/95 backdrop-blur-sm px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-wrap">
      <Link
        href="/proposals"
        className="flex items-center gap-1 text-[11px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150 shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Proposals
      </Link>
      <span className="w-px h-4 bg-[var(--bos-line-strong)] shrink-0" aria-hidden="true" />
      <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)] shrink-0">{reference ?? "PROP"}</span>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="min-w-0 max-w-[260px] bg-transparent text-[13.5px] font-semibold tracking-tight text-[var(--bos-text-primary)] outline-none hover:bg-[var(--bos-overlay)] focus:bg-[var(--bos-overlay)] rounded-sm px-1.5 py-0.5 transition-colors duration-150 truncate"
        aria-label="Proposal title"
      />
      <StatusChip status={status} />
      <span className="shrink-0 rounded-[3px] border border-[var(--bos-line)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--bos-text-tertiary)]">v{version}</span>
      <span className={cn("shrink-0 text-[9.5px] font-mono", SAVE_CLS[saveState])}>{SAVE_LABEL[saveState]}</span>

      <div className="ml-auto flex items-center gap-1.5 flex-wrap">
        {/* Zoom */}
        <div className="relative shrink-0">
          <select
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="appearance-none h-7 pl-2 pr-6 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[10.5px] text-[var(--bos-text-secondary)] outline-none hover:border-[var(--bos-border-strong)] cursor-pointer"
          >
            {ZOOMS.map((z) => (
              <option key={z} value={z}>{Math.round(z * 100)}%</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--bos-text-tertiary)] pointer-events-none" aria-hidden="true" />
        </div>

        {/* Page nav */}
        <div className="flex items-center gap-1 text-[10.5px] text-[var(--bos-text-tertiary)] shrink-0">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={pageIdx === 0}
            className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] hover:border-[var(--bos-border-strong)] disabled:opacity-30"
            aria-label="Previous page"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden="true" />
          </button>
          <span className="tabular-nums whitespace-nowrap">Page {pageIdx + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={pageIdx >= totalPages - 1}
            className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] hover:border-[var(--bos-border-strong)] disabled:opacity-30"
            aria-label="Next page"
          >
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0 hidden md:block">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--bos-text-tertiary)] pointer-events-none" aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQuery(e.target.value)}
            placeholder="Search document…"
            className="h-7 w-32 focus:w-52 pl-7 pr-6 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[10.5px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-[width] duration-200"
            aria-label="Search document"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Preview */}
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] text-[10.5px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150 shrink-0"
          title="Preview PDF (Ctrl/Cmd+P)"
        >
          <Eye className="w-3 h-3" aria-hidden="true" /> Preview
        </button>

        {/* AI assist */}
        <button
          type="button"
          onClick={onAiAssist}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[10.5px] font-medium text-[var(--bos-accent)] hover:bg-[var(--bos-accent-subtle)]/70 transition-colors duration-150 shrink-0"
        >
          <Sparkles className="w-3 h-3" aria-hidden="true" /> AI Assist
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] text-[10.5px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150 shrink-0"
        >
          <Send className="w-3 h-3" aria-hidden="true" /> Share
        </button>

        {/* Finalize */}
        {finalized ? (
          <button
            type="button"
            onClick={() => onMore("view-pdf")}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[10.5px] font-medium text-[var(--bos-accent)] hover:bg-[var(--bos-accent-subtle)]/70 transition-colors duration-150 shrink-0"
          >
            <FileText className="w-3 h-3" aria-hidden="true" /> Final PDF
          </button>
        ) : (
          <button
            type="button"
            onClick={onFinalize}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[10.5px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 shrink-0"
          >
            <FileText className="w-3 h-3" aria-hidden="true" /> Finalize
          </button>
        )}

        {/* More */}
        <div className="relative shrink-0" ref={moreRef}>
          <button
            type="button"
            onClick={openMore}
            className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)]"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-8 z-40 w-52 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-1">
                <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onMore("save"); }}>
                  <Save className="w-3.5 h-3.5" aria-hidden="true" /> Save now
                </button>
                {finalized && (
                  <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onMore("view-pdf"); }}>
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" /> View PDF
                  </button>
                )}
                {finalized && (
                  <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onMore("download"); }}>
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download PDF
                  </button>
                )}
                {finalized && canSend && (
                  <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onMore("send"); }}>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send to client
                  </button>
                )}
                {!finalized && (
                  <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onMore("finalize"); }}>
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Finalize proposal
                  </button>
                )}
                <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onMore("delivery"); }}>
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Delivery history
                </button>
                <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onMore("shortcuts"); }}>
                  <Command className="w-3.5 h-3.5" aria-hidden="true" /> Keyboard shortcuts
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
