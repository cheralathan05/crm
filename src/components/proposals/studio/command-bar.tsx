"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Command,
  Download,
  Eye,
  FileCheck,
  FileText,
  GitCompare,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/clients/kit";
import type { ProposalDeliveryBundle } from "@/lib/proposal-delivery";
import type { SaveState } from "./types";

/* ────────────────────────────────────────────────────────────────
   PROPOSAL COMMAND CENTER — TOP HEADER & LIFECYCLE BAR
   - High-density executive command bar
   - Proposal Lifecycle Bar (DRAFT → REVIEW → FINALIZED → SENT → VIEWED → CLIENT RESPONSE → APPROVED)
   - Real calculated Health Header
   - Approval-to-Project Action Bar
──────────────────────────────────────────────────────────────── */

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5] as const;

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Autosaved",
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

export type MoreAction = "save" | "view-pdf" | "download" | "send" | "finalize" | "delivery" | "compare" | "shortcuts";

export type ProposalHealthMetrics = {
  contentPercent: number;
  requirementPercent: number;
  clientDataOk: boolean;
  brandingOk: boolean;
  pdfStatus: "Ready" | "Outdated" | "Draft";
  deliveryStatus: string;
  clientReviewStatus: string;
};

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
  reviewMode: boolean;
  onToggleReviewMode: () => void;
  onCompare: () => void;
  onAiAssist: () => void;
  onPreview: () => void;
  onShare: () => void;
  onFinalize: () => void;
  finalized: boolean;
  canSend: boolean;
  onSend: () => void;
  onMore: (action: MoreAction) => void;
  pdfOutdated?: boolean;
  delivery?: ProposalDeliveryBundle;
  health?: ProposalHealthMetrics;
  onOpenDelivery?: () => void;
  onCreateRevision?: () => void;
  onCreateProject?: () => void;
  onOpenProject?: (projectId: string) => void;
  existingProject?: { id: string; name: string; code?: string | null; stage: string } | null;
  isCreatingProject?: boolean;
  projectCreated?: boolean;
};

const LIFECYCLE_STAGES = [
  { key: "DRAFT", label: "Draft" },
  { key: "REVIEW", label: "Review" },
  { key: "FINALIZED", label: "Finalized" },
  { key: "SENT", label: "Sent" },
  { key: "VIEWED", label: "Viewed" },
  { key: "CLIENT_RESPONSE", label: "Client Response" },
  { key: "APPROVED", label: "Approved" },
] as const;

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
  reviewMode,
  onToggleReviewMode,
  onCompare,
  onAiAssist,
  onPreview,
  onShare,
  onFinalize,
  finalized,
  canSend,
  onSend,
  onMore,
  pdfOutdated,
  delivery,
  health,
  onOpenDelivery,
  onCreateRevision,
  onCreateProject,
  onOpenProject,
  existingProject,
  isCreatingProject,
  projectCreated,
}: CommandBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const openMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMoreOpen((v) => !v);
  };

  const moreItem =
    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-left text-[11.5px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150";

  // Calculate active lifecycle stage index
  const currentStageIndex = (() => {
    if (status === "APPROVED") return 6;
    if (status === "CHANGES_REQUESTED" || (delivery?.changeRequests && delivery.changeRequests.length > 0)) return 5;
    if (delivery?.views && delivery.views.length > 0) return 4;
    if (delivery?.deliveries && delivery.deliveries.length > 0) return 3;
    if (finalized) return 2;
    if (reviewMode) return 1;
    return 0;
  })();

  return (
    <div className="shrink-0 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/95 backdrop-blur-sm">
      {/* ═══ PRIMARY COMMAND ROW ═══ */}
      <div className="px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-wrap">
        <Link
          href="/proposals"
          className="flex items-center gap-1 text-[11px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Proposals
        </Link>
        <span className="w-px h-4 bg-[var(--bos-line-strong)] shrink-0" aria-hidden="true" />
        <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)] shrink-0">
          {reference ?? "PROP"}
        </span>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="min-w-0 max-w-[240px] bg-transparent text-[13px] font-semibold tracking-tight text-[var(--bos-text-primary)] outline-none hover:bg-[var(--bos-overlay)] focus:bg-[var(--bos-overlay)] rounded-sm px-1.5 py-0.5 transition-colors duration-150 truncate"
          aria-label="Proposal title"
        />
        <StatusChip status={status} />
        <span className="shrink-0 rounded-[3px] border border-[var(--bos-line)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--bos-text-tertiary)]">
          v{version}
        </span>
        <span className={cn("shrink-0 text-[9.5px] font-mono", SAVE_CLS[saveState])}>{SAVE_LABEL[saveState]}</span>

        {/* Right action controls */}
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {/* Review Mode Toggle (Spec 47) */}
          <button
            type="button"
            onClick={onToggleReviewMode}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2 rounded-sm text-[10.5px] font-medium transition-colors duration-150 shrink-0",
              reviewMode
                ? "bg-[var(--bos-info)]/15 border border-[var(--bos-info)]/30 text-[var(--bos-info)]"
                : "border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
            )}
            title="Toggle Review Mode"
          >
            <FileCheck className="w-3 h-3" />
            <span>{reviewMode ? "Reviewing" : "Review"}</span>
          </button>

          {/* Compare Versions (Spec 42) */}
          <button
            type="button"
            onClick={onCompare}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-sm border border-[var(--bos-line)] text-[10.5px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] transition-colors duration-150 shrink-0"
            title="Compare Proposal Versions"
          >
            <GitCompare className="w-3 h-3" />
            <span className="hidden sm:inline">Compare</span>
          </button>

          {/* Zoom */}
          <div className="relative shrink-0">
            <select
              value={zoom}
              onChange={(e) => onZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="appearance-none h-7 pl-2 pr-6 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[10.5px] text-[var(--bos-text-secondary)] outline-none hover:border-[var(--bos-border-strong)] cursor-pointer"
            >
              {ZOOMS.map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--bos-text-tertiary)] pointer-events-none"
              aria-hidden="true"
            />
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
            <span className="tabular-nums whitespace-nowrap">
              Page {pageIdx + 1} / {totalPages}
            </span>
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
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--bos-text-tertiary)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              value={searchQuery}
              onChange={(e) => onSearchQuery(e.target.value)}
              placeholder="Search document…"
              className="h-7 w-28 focus:w-48 pl-7 pr-6 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[10.5px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-[width] duration-200"
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
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-[10.5px] transition-colors duration-150 shrink-0",
              pdfOutdated
                ? "border-[var(--bos-warning)] bg-[var(--bos-warning)]/10 text-[var(--bos-warning)] font-medium hover:bg-[var(--bos-warning)]/20"
                : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
            )}
            title="Preview PDF (Ctrl/Cmd+P)"
          >
            <Eye className="w-3 h-3" aria-hidden="true" />
            <span>{pdfOutdated ? "PDF Outdated" : "Preview"}</span>
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

          {/* Finalize / Final PDF */}
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
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[10.5px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 shrink-0 shadow-sm"
            >
              <FileText className="w-3 h-3" aria-hidden="true" /> Finalize
            </button>
          )}

          {/* More actions dropdown */}
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
                  <button
                    type="button"
                    className={moreItem}
                    onClick={() => {
                      setMoreOpen(false);
                      onMore("save");
                    }}
                  >
                    <Save className="w-3.5 h-3.5" aria-hidden="true" /> Save now
                  </button>
                  <button
                    type="button"
                    className={moreItem}
                    onClick={() => {
                      setMoreOpen(false);
                      onMore("compare");
                    }}
                  >
                    <GitCompare className="w-3.5 h-3.5" aria-hidden="true" /> Compare versions
                  </button>
                  <button
                    type="button"
                    className={moreItem}
                    onClick={() => {
                      setMoreOpen(false);
                      onMore("view-pdf");
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" /> View PDF
                  </button>
                  <button
                    type="button"
                    className={moreItem}
                    onClick={() => {
                      setMoreOpen(false);
                      onMore("download");
                    }}
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download PDF
                  </button>
                  {canSend && (
                    <button
                      type="button"
                      className={moreItem}
                      onClick={() => {
                        setMoreOpen(false);
                        onMore("send");
                      }}
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send to client
                    </button>
                  )}
                  {!finalized && (
                    <button
                      type="button"
                      className={moreItem}
                      onClick={() => {
                        setMoreOpen(false);
                        onMore("finalize");
                      }}
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Finalize proposal
                    </button>
                  )}
                  <button
                    type="button"
                    className={moreItem}
                    onClick={() => {
                      setMoreOpen(false);
                      onMore("delivery");
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Delivery history
                  </button>
                  <button
                    type="button"
                    className={moreItem}
                    onClick={() => {
                      setMoreOpen(false);
                      onMore("shortcuts");
                    }}
                  >
                    <Command className="w-3.5 h-3.5" aria-hidden="true" /> Keyboard shortcuts
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ PROPOSAL LIFECYCLE BAR (Specs 02, 80) ═══ */}
      <div className="px-3 sm:px-4 py-1.5 border-t border-[var(--bos-line)]/70 bg-[var(--bos-surface)]/40 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] font-mono uppercase tracking-[0.08em] whitespace-nowrap">
          <span className="text-[9px] text-[var(--bos-text-tertiary)] font-sans mr-1">Lifecycle:</span>
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage.key} className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (["SENT", "VIEWED", "CLIENT_RESPONSE", "APPROVED"].includes(stage.key) && onOpenDelivery) {
                      onOpenDelivery();
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] transition-colors cursor-pointer",
                    isCurrent
                      ? "bg-[var(--bos-accent)] text-white font-bold shadow-2xs"
                      : isCompleted
                        ? "text-[var(--bos-success)] bg-[var(--bos-success)]/10 font-semibold hover:bg-[var(--bos-success)]/20"
                        : "text-[var(--bos-text-tertiary)] opacity-60 hover:opacity-100",
                  )}
                  title={`Stage: ${stage.label}${isCompleted || isCurrent ? " — Click to inspect delivery details" : ""}`}
                >
                  {isCompleted ? (
                    <Check className="w-2.5 h-2.5" />
                  ) : isCurrent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  ) : null}
                  <span>{stage.label}</span>
                </button>
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)]/50 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* ═══ PROPOSAL HEALTH SUMMARY CHIPS (Spec 03) ═══ */}
        {health && (
          <div className="hidden xl:flex items-center gap-2.5 text-[9.5px] font-mono text-[var(--bos-text-tertiary)] shrink-0 border-l border-[var(--bos-line)] pl-3">
            <span>Health:</span>
            <span className="flex items-center gap-1 text-[var(--bos-text-secondary)]">
              Content <strong className="text-[var(--bos-text-primary)]">{health.contentPercent}%</strong>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-[var(--bos-text-secondary)]">
              Reqs <strong className="text-[var(--bos-success)]">{health.requirementPercent}%</strong>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-[var(--bos-text-secondary)]">
              PDF <strong className={cn(health.pdfStatus === "Ready" ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>{health.pdfStatus}</strong>
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenDelivery}
              className={cn(
                "flex items-center gap-1 hover:underline cursor-pointer",
                health.clientReviewStatus === "Changes Requested"
                  ? "text-[var(--bos-warning)] font-bold"
                  : health.clientReviewStatus === "Approved"
                    ? "text-[var(--bos-success)] font-bold"
                    : "text-[var(--bos-text-secondary)]",
              )}
            >
              Client <strong className={cn(health.clientReviewStatus === "Changes Requested" ? "text-[#9a5b13]" : "text-[var(--bos-text-primary)]")}>{health.clientReviewStatus}</strong>
            </button>
          </div>
        )}
      </div>

      {/* ═══ CLIENT CHANGES REQUESTED BANNER ═══ */}
      {(status === "CHANGES_REQUESTED" || (delivery?.changeRequests && delivery.changeRequests.length > 0)) && (
        <div className="px-4 py-2.5 bg-[#fdf3e7] border-t border-[#f5dfb8] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] text-[#9a5b13]">
            <AlertTriangle className="w-4 h-4 text-[#9a5b13] shrink-0" />
            <span>
              <strong>Client Requested Changes</strong>
              {delivery?.changeRequests?.[0]?.message
                ? `: "${delivery.changeRequests[0].message}"`
                : " — The client submitted feedback and requested adjustments."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenDelivery && (
              <button
                type="button"
                onClick={onOpenDelivery}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[#9a5b13] text-white text-[11px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
              >
                <FileText className="w-3 h-3" /> View Change Request ({delivery?.changeRequests?.length ?? 1})
              </button>
            )}
            {onCreateRevision && (
              <button
                type="button"
                onClick={onCreateRevision}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm border border-[#9a5b13]/40 bg-white text-[#9a5b13] text-[11px] font-medium hover:bg-[#faf7f2] transition-all shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Start Revision v{version + 1}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ APPROVED BANNER: READY TO CREATE / OPEN PROJECT (Specification 03) ═══ */}
      {status === "APPROVED" && (
        <div className="px-4 py-2.5 bg-[#f5fbf3] border-t border-[#d8edd4] flex items-center justify-between gap-4 flex-wrap">
          {existingProject ? (
            <>
              <div className="flex items-center gap-3 text-[12px] text-[#2c5324]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold tracking-wider uppercase bg-[#3f6e35] text-white">
                  <CheckCircle2 className="w-3 h-3" /> PROJECT CREATED
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[12.5px] text-[var(--bos-text-primary)]">
                    Project: {existingProject.name} {existingProject.code ? `(${existingProject.code})` : ""}
                  </span>
                  <span className="text-[11px] text-[var(--bos-text-tertiary)]">·</span>
                  <span className="text-[11px] font-mono uppercase bg-[var(--bos-surface-sunken)] px-1.5 py-0.5 rounded text-[var(--bos-text-secondary)]">
                    Status: {existingProject.stage}
                  </span>
                </div>
              </div>
              {onOpenProject && (
                <button
                  type="button"
                  onClick={() => onOpenProject(existingProject.id)}
                  className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-sm bg-[#3f6e35] text-white text-[11.5px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
                >
                  <span>Open Project</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 text-[12px] text-[#2c5324]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold tracking-wider uppercase bg-[#3f6e35] text-white">
                  <CheckCircle2 className="w-3 h-3" /> CLIENT APPROVED
                </span>
                <span className="text-[12px] text-[var(--bos-text-secondary)]">
                  This proposal has been approved by the client. <strong className="text-[var(--bos-text-primary)]">Project: Not created yet</strong>
                </span>
              </div>
              {onCreateProject && (
                <button
                  type="button"
                  disabled={isCreatingProject || projectCreated}
                  onClick={onCreateProject}
                  className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-sm bg-[#3f6e35] text-white text-[11.5px] font-medium hover:brightness-95 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  {isCreatingProject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  <span>{projectCreated ? "Project Created ✓" : "Create Project"}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
