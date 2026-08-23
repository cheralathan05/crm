"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalDoc, ProposalSection } from "@/lib/proposal-doc";
import { blockId, hasContent } from "@/lib/proposal-doc";
import { BlockView } from "./block-view";
import { INSERT_ITEMS, type InsertItem } from "./block-fields";

/* ────────────────────────────────────────────────────────────────
   A4 CANVAS — the document itself. Each visible section is one page
   (matching the PDF, which starts each section on a fresh page), so
   what you see is what ships. Sections scroll-select from the
   navigator, blocks drag-reorder, and "+ Add block" inserts any
   structured block type.
──────────────────────────────────────────────────────────────── */

export type SelectedBlock = { sectionId: string; index: number } | null;

type CanvasPageProps = {
  section: ProposalSection;
  doc: ProposalDoc;
  pageNumber: number;
  totalPages: number;
  active: boolean;
  insertOpen: boolean;
  selectedBlock: SelectedBlock;
  onSelect: () => void;
  onPatchBlock: (sectionId: string, index: number, patch: Record<string, unknown>) => void;
  onRequestInsert: (sectionId: string, index: number) => void;
  onCloseInsert: () => void;
  onInsert: (sectionId: string, index: number, type: InsertItem["type"]) => void;
  onDeleteBlock: (sectionId: string, index: number) => void;
  onDuplicateBlock: (sectionId: string, index: number) => void;
  onMoveBlock: (fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) => void;
  onSelectBlock: (sectionId: string, index: number) => void;
};

export function CanvasPage({
  section,
  doc,
  pageNumber,
  totalPages,
  active,
  insertOpen,
  selectedBlock,
  onSelect,
  onPatchBlock,
  onRequestInsert,
  onCloseInsert,
  onInsert,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onSelectBlock,
}: CanvasPageProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dropEnd, setDropEnd] = useState(false);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [active]);

  const handleEndDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("text/plain")) {
      e.preventDefault();
      setDropEnd(true);
    }
  };
  const handleEndDrop = (e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (raw) {
      try {
        const { fromSectionId, fromIndex } = JSON.parse(raw) as { fromSectionId: string; fromIndex: number };
        if (fromSectionId !== section.id || fromIndex !== section.blocks.length) onMoveBlock(fromSectionId, fromIndex, section.id, section.blocks.length);
      } catch {
        /* ignore */
      }
    }
    setDropEnd(false);
  };

  return (
    <div
      ref={ref}
      id={`page-${section.id}`}
      className={cn(
        "w-[660px] bg-white shadow-[0_2px_4px_rgba(26,23,20,0.06),0_12px_40px_rgba(26,23,20,0.1)] scroll-mt-6 transition-shadow duration-200",
        active ? "ring-1 ring-[var(--bos-accent)]/40" : "",
      )}
      onClick={() => {
        if (!selectedBlock) onSelect();
      }}
    >
      {/* Page body */}
      <div className="px-12 py-14 min-h-[700px] relative">
        {section.id === "cover" ? (
          <CoverPage section={section} doc={doc} />
        ) : section.id === "contents" ? (
          <ContentsPage doc={doc} onSelectSection={onSelect} />
        ) : (
          <BodyPage
            section={section}
            insertOpen={insertOpen}
            selectedBlock={selectedBlock}
            onPatchBlock={(index, patch) => onPatchBlock(section.id, index, patch)}
            onRequestInsert={(index) => onRequestInsert(section.id, index)}
            onCloseInsert={onCloseInsert}
            onInsert={(index, type) => onInsert(section.id, index, type)}
            onDeleteBlock={(index) => onDeleteBlock(section.id, index)}
            onDuplicateBlock={(index) => onDuplicateBlock(section.id, index)}
            onMoveBlock={onMoveBlock}
            onSelectBlock={(index) => onSelectBlock(section.id, index)}
          />
        )}
      </div>

      {/* Drop zone at page end — append blocks by dragging here */}
      {section.id !== "cover" && section.id !== "contents" && (
        <div
          onDragOver={handleEndDragOver}
          onDragLeave={() => setDropEnd(false)}
          onDrop={handleEndDrop}
          className="mx-12 mb-2 h-2 rounded-[2px] transition-colors duration-150"
          title="Drop to append at the end of this section"
        >
          <div className={cn("h-full rounded-[2px] border border-dashed transition-colors duration-150", dropEnd ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]/40" : "border-transparent")} />
        </div>
      )}

      {/* Page footer */}
      <div className="px-12 pb-6 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.14em] text-[#9a948a]">
        <span>{doc.meta.clientName}</span>
        <span>{String(pageNumber).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}</span>
        <span>{doc.meta.reference}</span>
      </div>
    </div>
  );
}

/* ── Body page — header + blocks + insert menu ────────────────── */

function BodyPage({
  section,
  insertOpen,
  selectedBlock,
  onPatchBlock,
  onRequestInsert,
  onCloseInsert,
  onInsert,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onSelectBlock,
}: {
  section: ProposalSection;
  insertOpen: boolean;
  selectedBlock: SelectedBlock;
  onPatchBlock: (index: number, patch: Record<string, unknown>) => void;
  onRequestInsert: (index: number) => void;
  onCloseInsert: () => void;
  onInsert: (index: number, type: InsertItem["type"]) => void;
  onDeleteBlock: (index: number) => void;
  onDuplicateBlock: (index: number) => void;
  onMoveBlock: (fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) => void;
  onSelectBlock: (index: number) => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!insertOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onCloseInsert();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [insertOpen, onCloseInsert]);

  return (
    <div>
      {/* Section header */}
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#b5452a]">
        {section.number !== "—" ? `${section.number} · ${section.kicker}` : section.kicker}
      </div>
      <h2 className="mt-2 text-[24px] font-bold tracking-tight text-[#1a1714] border-b-2 border-[#b5452a] pb-3">{section.title}</h2>

      {/* Blocks */}
      <div className="mt-6 space-y-3">
        {section.blocks.map((b, i) => (
          <BlockView
            key={blockId(b, `${section.id}-b${i}`)}
            block={b}
            sectionId={section.id}
            index={i}
            selected={selectedBlock?.sectionId === section.id && selectedBlock.index === i}
            onSelect={() => onSelectBlock(i)}
            onPatch={(patch) => onPatchBlock(i, patch)}
            onDelete={() => onDeleteBlock(i)}
            onDuplicate={() => onDuplicateBlock(i)}
            onMove={onMoveBlock}
          />
        ))}
      </div>

      {/* + Add block */}
      <div className="relative mt-5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (insertOpen) {
              onCloseInsert();
            } else {
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              setMenuAnchor({ x: 0, y: 0 });
              onRequestInsert(section.blocks.length);
              // keep anchor near the button for menu placement
              setMenuAnchor({ x: rect.left, y: rect.bottom });
            }
          }}
          className="flex items-center gap-1.5 h-7 px-3 rounded-sm border border-dashed border-[var(--bos-line-strong)] text-[10px] font-medium text-[var(--bos-text-tertiary)] hover:border-[var(--bos-accent)] hover:text-[var(--bos-accent)] transition-colors duration-150"
        >
          <Plus className="w-3 h-3" aria-hidden="true" /> Add block
        </button>

        {insertOpen && (
          <div
            ref={menuRef}
            className="absolute left-0 top-9 z-30 w-56 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-1 max-h-72 overflow-y-auto"
            style={menuAnchor ? { position: "fixed", left: Math.min(menuAnchor.x, window.innerWidth - 240), top: Math.min(menuAnchor.y, window.innerHeight - 320) } : undefined}
          >
            <div className="px-2 py-1.5 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">Insert block</div>
            {INSERT_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => onInsert(section.blocks.length, item.type)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm text-left hover:bg-[var(--bos-overlay)] transition-colors duration-150"
              >
                <span>
                  <span className="block text-[11.5px] font-medium text-[var(--bos-text-primary)]">{item.label}</span>
                  <span className="block text-[9px] text-[var(--bos-text-tertiary)]">{item.hint}</span>
                </span>
                <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Cover page ────────────────────────────────────────────────── */

function CoverPage({ section, doc }: { section: ProposalSection; doc: ProposalDoc }) {
  const meta: Record<string, string> = {};
  let last: string | null = null;
  for (const b of section.blocks) {
    if (b.type !== "paragraph") continue;
    const t = b.text.trim();
    if (["Prepared for", "Prepared by", "Investment", "Timeline"].includes(t)) {
      last = t;
    } else if (last) {
      meta[last] = t;
      last = null;
    }
  }

  return (
    <div className="flex flex-col min-h-[580px]">
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#9a948a]">{doc.meta.preparedBy}</div>
      <div className="mt-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#b5452a] font-semibold">Proposal</div>
        <h1 className="mt-3 text-[38px] font-bold leading-[1.1] tracking-tight text-[#1a1714]">{doc.meta.title}</h1>
        <div className="mt-5 text-[13px] text-[#6b655c]">
          Prepared for <span className="text-[#1a1714] font-medium">{doc.meta.clientName}</span>
        </div>
        <div className="text-[11px] text-[#9a948a] mt-1">
          {new Date(doc.meta.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="mt-auto pt-10">
        <div className="h-[3px] w-full bg-[#b5452a]" aria-hidden="true" />
        <div className="mt-8 grid grid-cols-3 gap-6">
          <MetaCell label="Investment" value={meta.Investment ?? doc.meta.amountLabel} />
          <MetaCell label="Timeline" value={meta.Timeline ?? doc.meta.timelineLabel} />
          <MetaCell label="Reference" value={doc.meta.reference} />
        </div>
        <div className="mt-14 flex gap-[2px]">
          <div className="h-2 w-[150px] bg-[#b5452a]" aria-hidden="true" />
          <div className="h-2 flex-1 bg-[#f5edea]" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#9a948a]">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-[#1a1714]">{value}</div>
    </div>
  );
}

/* ── Contents page ─────────────────────────────────────────────── */

function ContentsPage({ doc, onSelectSection }: { doc: ProposalDoc; onSelectSection: (id: string) => void }) {
  const items = doc.sections.filter((s) => s.visible && s.id !== "cover" && s.id !== "contents");
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#b5452a]">This proposal</div>
      <h2 className="mt-2 text-[26px] font-bold tracking-tight text-[#1a1714]">Contents</h2>
      <div className="mt-8 space-y-1">
        {items.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectSection(s.id)}
            className="group w-full flex items-baseline gap-3 py-2 border-b border-[#e7e2d8] text-left"
          >
            <span className="font-mono text-[10px] text-[#b5452a] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[14px] text-[#1a1714] group-hover:text-[#b5452a] transition-colors duration-150">{s.title}</span>
            {!hasContent(s) && <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.1em] text-[#9a948a]">Draft</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
