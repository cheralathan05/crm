"use client";

import { ChevronDown, Eye, EyeOff, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalDoc, ProposalSource, SectionStatus } from "@/lib/proposal-doc";
import { SECTION_GROUPS, SOURCE_LABELS, blockText, sectionCompletion, sectionGroupKey } from "@/lib/proposal-doc";

/* ────────────────────────────────────────────────────────────────
   PROPOSAL NAVIGATOR — the document outline. Sections are grouped
   (OVERVIEW / SOLUTION / DELIVERY / COMMERCIAL / CLOSING), each row
   shows number, title, derived status, completion, page range and
   its real data source. Groups collapse.
──────────────────────────────────────────────────────────────── */

const STATUS_STYLE: Record<SectionStatus, { label: string; cls: string }> = {
  READY: { label: "Ready", cls: "text-[var(--bos-success)] bg-[var(--bos-success)]/10" },
  REVIEW_REQUIRED: { label: "Review required", cls: "text-[var(--bos-warning)] bg-[var(--bos-warning)]/10" },
  DRAFT: { label: "Draft", cls: "text-[var(--bos-text-tertiary)] bg-[var(--bos-overlay)]" },
  AI_ENHANCED: { label: "AI enhanced", cls: "text-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]" },
};

const SOURCE_DOT: Record<ProposalSource, string> = {
  REQUIREMENT: "bg-[var(--bos-accent)]",
  CLIENT: "bg-[var(--bos-info)]",
  WORKSPACE: "bg-[var(--bos-success)]",
  MANUAL: "bg-[var(--bos-text-tertiary)]",
  AI_DRAFT: "bg-[var(--bos-warning)]",
};

type NavigatorProps = {
  doc: ProposalDoc;
  activeSection: string;
  searchQuery: string;
  collapsedGroups: Set<string>;
  onSelect: (id: string) => void;
  onToggleGroup: (key: string) => void;
  onToggleVisibility: (id: string) => void;
  onAddSection: () => void;
};

export function Navigator({ doc, activeSection, searchQuery, collapsedGroups, onSelect, onToggleGroup, onToggleVisibility, onAddSection }: NavigatorProps) {
  const q = searchQuery.trim().toLowerCase();
  const visiblePages = doc.sections.filter((s) => s.visible);
  const pageOf = (id: string) => visiblePages.findIndex((s) => s.id === id);

  const matches = (s: (typeof doc.sections)[number]) => {
    if (!q) return true;
    return s.title.toLowerCase().includes(q) || s.kicker.toLowerCase().includes(q) || s.blocks.map(blockText).join(" ").toLowerCase().includes(q);
  };

  const groups = SECTION_GROUPS.map((g) => ({
    ...g,
    sections: doc.sections.filter((s) => sectionGroupKey(s) === g.key && matches(s)),
  })).filter((g) => g.sections.length > 0);

  const totalMatches = doc.sections.filter(matches).length;

  return (
    <aside className="hidden lg:flex flex-col min-h-0 border-r border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Proposal</span>
        {q && (
          <span className="text-[9px] font-mono text-[var(--bos-accent)]">
            {totalMatches} match{totalMatches === 1 ? "" : "es"}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-3" aria-label="Proposal sections">
        {groups.map((group) => {
          const collapsed = collapsedGroups.has(group.key);
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => onToggleGroup(group.key)}
                className="flex items-center gap-1.5 w-full px-1 py-1 text-[8.5px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)] transition-colors duration-150"
              >
                <ChevronDown className={cn("w-2.5 h-2.5 transition-transform duration-150", collapsed && "-rotate-90")} aria-hidden="true" />
                {group.label}
                <span className="ml-auto text-[8px] tabular-nums opacity-60">{group.sections.length}</span>
              </button>

              {!collapsed && (
                <div className="mt-0.5 space-y-px">
                  {group.sections.map((s) => {
                    const isActive = activeSection === s.id;
                    const completion = sectionCompletion(s);
                    const status = s.status ?? (hasContentFallback(s) ? "READY" : "DRAFT");
                    const st = STATUS_STYLE[status] ?? STATUS_STYLE.DRAFT;
                    const pageNum = pageOf(s.id);
                    return (
                      <div key={s.id} className="group flex items-center rounded-sm">
                        <button
                          type="button"
                          onClick={() => onSelect(s.id)}
                          className={cn(
                            "flex-1 flex items-center gap-2 min-w-0 px-2 py-1.5 rounded-sm text-left transition-colors duration-150",
                            isActive ? "bg-[var(--bos-accent-subtle)]" : "hover:bg-[var(--bos-overlay)]",
                          )}
                        >
                          <span className={cn("font-mono text-[9px] shrink-0", isActive ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-tertiary)]")}>
                            {s.number === "—" ? "·" : s.number}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={cn("block text-[11.5px] truncate", isActive ? "text-[var(--bos-accent)] font-medium" : s.visible ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-text-tertiary)]")}>
                              {s.title}
                            </span>
                            <span className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn("px-1 py-px rounded-[3px] text-[7.5px] font-mono uppercase tracking-[0.08em]", st.cls)}>{st.label}</span>
                              <span className="text-[8px] text-[var(--bos-text-tertiary)] tabular-nums">{completion}%</span>
                              {pageNum >= 0 && <span className="text-[8px] text-[var(--bos-text-tertiary)]">p{pageNum + 1}</span>}
                            </span>
                          </span>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SOURCE_DOT[s.source])} title={SOURCE_LABELS[s.source]} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleVisibility(s.id)}
                          className="flex items-center justify-center w-6 h-6 rounded-sm text-[var(--bos-text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-[var(--bos-text-primary)] transition-opacity duration-150"
                          aria-label={s.visible ? "Hide section" : "Show section"}
                          title={s.visible ? "Hide from proposal" : "Show in proposal"}
                        >
                          {s.visible ? <Eye className="w-3 h-3" aria-hidden="true" /> : <EyeOff className="w-3 h-3" aria-hidden="true" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-2">
          <button
            type="button"
            onClick={onAddSection}
            className="flex items-center gap-1.5 h-8 px-2 rounded-sm w-full text-[11px] font-medium text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150 border border-dashed border-[var(--bos-line-strong)]"
          >
            <Plus className="w-3 h-3" aria-hidden="true" /> Add section
          </button>
        </div>
      </nav>
    </aside>
  );
}

function hasContentFallback(s: { blocks: { type: string }[] }): boolean {
  return s.blocks.length > 0;
}
