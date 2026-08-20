"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Check,
  CheckCircle2,
  Copy,
  GripVertical,
  Italic,
  Layers,
  List,
  ShieldCheck,
  Sparkles,
  Trash2,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalBlock } from "@/lib/proposal-doc";
import { blockId } from "@/lib/proposal-doc";

/* ────────────────────────────────────────────────────────────────
   BLOCK VIEW — one rendered block on the A4 canvas.
   Supports Feature Intelligence (with progressive disclosure tabs),
   Objective Cards, Technical Architecture, Problem/Solution Matrix,
   Pricing Tables with Milestones, Deliverable Matrix, Digital Approvals,
   and Inline Editing.
──────────────────────────────────────────────────────────────── */

export const ACCENT = "#b5452a";
export const INK = "#1a1714";
export const MUTED = "#6b655c";
export const FAINT = "#9a948a";
export const RULE = "#e7e2d8";

export type DropIndicator = "before" | "after" | null;

type BlockViewProps = {
  block: ProposalBlock;
  sectionId: string;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onPatch: (patch: Partial<ProposalBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) => void;
};

export function BlockView({ block, sectionId, index, selected, onSelect, onPatch, onDelete, onDuplicate, onMove }: BlockViewProps) {
  const id = blockId(block, `${sectionId}-b${index}`);
  const [editing, setEditing] = useState(false);
  const [drop, setDrop] = useState<DropIndicator>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ fromSectionId: sectionId, fromIndex: index }));
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("text/plain")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = ref.current?.getBoundingClientRect();
      if (rect) setDrop(e.clientY < rect.top + rect.height / 2 ? "before" : "after");
    }
  };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (raw) {
      try {
        const { fromSectionId, fromIndex } = JSON.parse(raw) as { fromSectionId: string; fromIndex: number };
        const toIndex = index + (drop === "after" ? 1 : 0);
        if (fromSectionId !== sectionId || fromIndex !== toIndex) onMove(fromSectionId, fromIndex, sectionId, toIndex);
      } catch {
        /* ignore */
      }
    }
    setDrop(null);
  };

  const shellCls = cn(
    "group/block relative rounded-[2px] transition-shadow duration-150",
    selected ? "ring-1 ring-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]/20" : "hover:bg-[var(--bos-overlay)]/40",
  );

  return (
    <div
      ref={ref}
      id={`blk-${id}`}
      data-block-index={index}
      className={shellCls}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDrop(null)}
      onDrop={handleDrop}
    >
      {drop && <div className={cn("absolute left-0 right-0 h-[2px] bg-[var(--bos-accent)] z-10 pointer-events-none", drop === "before" ? "-top-px" : "-bottom-px")} aria-hidden="true" />}

      {/* Hover toolbar */}
      <div
        className={cn(
          "absolute -top-3 right-1 z-20 flex items-center gap-px rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] shadow-[0_1px_6px_rgba(26,23,20,0.12)] px-0.5 py-0.5 transition-opacity duration-150",
          editing || selected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          draggable
          onDragStart={handleDragStart}
          className="flex items-center justify-center w-5 h-5 rounded-[3px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] cursor-grab active:cursor-grabbing"
          aria-label="Drag to move block"
          title="Drag to move"
        >
          <GripVertical className="w-3 h-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="flex items-center justify-center w-5 h-5 rounded-[3px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]"
          aria-label="Duplicate block"
          title="Duplicate"
        >
          <Copy className="w-3 h-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center w-5 h-5 rounded-[3px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] hover:bg-[var(--bos-error)]/8"
          aria-label="Delete block"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

      <RenderBlock
        block={block}
        editing={editing}
        onEditingChange={setEditing}
        onPatch={onPatch}
      />
    </div>
  );
}

/* ── Inline editing primitives ────────────────────────────────── */

function EditableText({
  initial,
  as: Tag,
  className,
  placeholder,
  multiline,
  onCommit,
  onEditingChange,
}: {
  initial: string;
  as: "div" | "p" | "h1" | "h2" | "h3";
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  onCommit: (text: string) => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const text = (el.innerText ?? "").replace(/\u00a0/g, " ");
    if (text !== initial) onCommit(text);
    onEditingChange?.(false);
  };

  const placeholderVisible = !ref.current?.innerText?.trim() && placeholder;
  return (
    <div className="relative" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) commit();
    }}>
      <Tag
        ref={ref as never}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={() => onEditingChange?.(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            (e.target as HTMLElement).blur();
          }
        }}
        className={cn(className, "outline-none focus:outline-none cursor-text", multiline && "whitespace-pre-wrap")}
        data-placeholder={placeholder}
      >
        {initial}
      </Tag>
      {placeholderVisible && <div className="pointer-events-none absolute inset-0 text-[var(--bos-text-tertiary)]">{placeholder}</div>}
    </div>
  );
}

function FormatToolbar({ onEditingChange }: { onEditingChange: (editing: boolean) => void }) {
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    onEditingChange(true);
  };
  const item = "flex items-center justify-center w-6 h-6 rounded-[3px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]";
  return (
    <div className="flex items-center gap-px rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] shadow-[0_1px_6px_rgba(26,23,20,0.12)] px-0.5 py-0.5">
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} aria-label="Bold" title="Bold">
        <Bold className="w-3 h-3" aria-hidden="true" />
      </button>
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} aria-label="Italic" title="Italic">
        <Italic className="w-3 h-3" aria-hidden="true" />
      </button>
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} aria-label="Underline" title="Underline">
        <Underline className="w-3 h-3" aria-hidden="true" />
      </button>
      <span className="w-px h-4 bg-[var(--bos-line-strong)] mx-0.5" aria-hidden="true" />
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<H2>")} aria-label="Heading" title="Heading">
        <span className="text-[9px] font-bold">H</span>
      </button>
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<P>")} aria-label="Paragraph" title="Paragraph">
        <span className="text-[9px]">¶</span>
      </button>
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} aria-label="List" title="List">
        <List className="w-3 h-3" aria-hidden="true" />
      </button>
      <span className="w-px h-4 bg-[var(--bos-line-strong)] mx-0.5" aria-hidden="true" />
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")} aria-label="Align left" title="Align left">
        <AlignLeft className="w-3 h-3" aria-hidden="true" />
      </button>
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")} aria-label="Align center" title="Align center">
        <AlignCenter className="w-3 h-3" aria-hidden="true" />
      </button>
      <button type="button" className={item} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")} aria-label="Align right" title="Align right">
        <AlignRight className="w-3 h-3" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ── Per-type renderers ───────────────────────────────────────── */

function RenderBlock({
  block,
  editing,
  onEditingChange,
  onPatch,
}: {
  block: ProposalBlock;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onPatch: (patch: Partial<ProposalBlock>) => void;
}) {
  const editableCls = "text-[12.5px] leading-[1.7] text-[#2a2621]";
  const [featureTab, setFeatureTab] = useState<"overview" | "capabilities" | "flow" | "tech" | "source">("overview");

  switch (block.type) {
    case "paragraph":
      return (
        <div className="relative">
          {editing && (
            <div className="absolute -top-9 left-0 z-20">
              <FormatToolbar onEditingChange={onEditingChange} />
            </div>
          )}
          <EditableText
            initial={block.text}
            as="p"
            multiline
            className={cn(editableCls, "py-0.5 px-1 -mx-1")}
            placeholder="Write a paragraph…"
            onCommit={(text) => onPatch({ text })}
            onEditingChange={onEditingChange}
          />
        </div>
      );

    case "heading": {
      const level = block.level ?? 2;
      const Tag: "h1" | "h2" | "h3" = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      return (
        <div className="relative">
          {editing && (
            <div className="absolute -top-9 left-0 z-20">
              <FormatToolbar onEditingChange={onEditingChange} />
            </div>
          )}
          <EditableText
            initial={block.text}
            as={Tag}
            className={cn(
              "font-semibold tracking-tight text-[#1a1714] py-0.5 px-1 -mx-1",
              level === 1 ? "text-[17px] mt-3 mb-1.5" : level === 2 ? "text-[14.5px] mt-2.5 mb-1" : "text-[13px] mt-2 mb-0.5",
            )}
            placeholder="Heading"
            onCommit={(text) => onPatch({ text })}
            onEditingChange={onEditingChange}
          />
        </div>
      );
    }

    case "quote":
      return (
        <div className="relative pl-4 border-l-2 border-[#b5452a]/40">
          {editing && (
            <div className="absolute -top-9 left-0 z-20">
              <FormatToolbar onEditingChange={onEditingChange} />
            </div>
          )}
          <EditableText
            initial={block.text}
            as="p"
            multiline
            className={cn(editableCls, "italic text-[#6b655c] py-0.5 px-1 -mx-1")}
            placeholder="Quote…"
            onCommit={(text) => onPatch({ text })}
            onEditingChange={onEditingChange}
          />
          <EditableText
            initial={block.attribution ?? ""}
            as="p"
            className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#9a948a] mt-1 px-1 -mx-1"
            placeholder="— Attribution"
            onCommit={(text) => onPatch({ attribution: text })}
            onEditingChange={onEditingChange}
          />
        </div>
      );

    case "list":
      return (
        <div className="space-y-1.5">
          {block.items.map((item, j) => (
            <div key={j} className="flex items-start gap-3">
              <span className="font-mono text-[10px] text-[#b5452a] tabular-nums mt-[3px] shrink-0">
                {block.ordered === false ? "•" : String(j + 1).padStart(2, "0")}
              </span>
              <EditableText
                initial={item}
                as="p"
                multiline
                className={cn(editableCls, "py-0.5 px-1 -mx-1")}
                onCommit={(text) => {
                  const items = [...block.items];
                  items[j] = text;
                  onPatch({ items });
                }}
                onEditingChange={onEditingChange}
              />
            </div>
          ))}
        </div>
      );

    case "table":
    case "pricing_table": {
      const headers = block.headers ?? [];
      const rows = block.rows ?? [];
      return (
        <div className="space-y-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {headers.map((h, j) => (
                  <th key={j} className="bg-[#b5452a] text-white text-[10px] font-semibold uppercase tracking-[0.08em] text-left px-3 py-2 first:rounded-l-sm last:rounded-r-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className={j % 2 === 0 ? "bg-[#faf7f2]" : ""}>
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 text-[11.5px] text-[#2a2621] border-b border-[#e7e2d8]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {block.type === "pricing_table" && block.total && (
              <tfoot>
                <tr>
                  <td colSpan={headers.length || 1} className="pt-2 text-right">
                    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#9a948a] mr-2">Total Investment</span>
                    <span className="text-[14px] font-bold text-[#b5452a]">{block.total}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          {block.type === "pricing_table" && block.milestones && block.milestones.length > 0 && (
            <div className="rounded-sm border border-[#e7e2d8] bg-[#faf7f2] p-3 space-y-1.5">
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#9a948a]">Payment Milestones</div>
              <div className="grid sm:grid-cols-3 gap-2">
                {block.milestones.map((m, idx) => (
                  <div key={idx} className="rounded-sm bg-white border border-[#e7e2d8] p-2 text-[10.5px]">
                    <div className="font-medium text-[#1a1714]">{m.name}</div>
                    <div className="text-[#b5452a] font-semibold mt-0.5">{m.amount}</div>
                    <div className="text-[9px] text-[#9a948a]">{m.schedule}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    /* ═══ Feature Intelligence (Spec 18) ═══ */
    case "feature_card": {
      return (
        <div className="rounded-sm border border-[#e7e2d8] border-l-[3px] border-l-[#b5452a] px-4 py-3 bg-white space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14px] font-semibold tracking-tight text-[#1a1714]">{block.title}</div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className="px-1.5 py-0.5 rounded-[3px] bg-[#f5edea] text-[#b5452a] font-semibold">{block.priority}</span>
              <span className="px-1.5 py-0.5 rounded-[3px] bg-[#eef6ec] text-[#3f6e35]">{block.status}</span>
            </div>
          </div>

          {/* Progressive disclosure tabs */}
          <div className="flex gap-1 border-b border-[#e7e2d8] pb-1.5 pt-0.5 text-[9.5px] font-medium text-[#9a948a]">
            {[
              ["overview", "Overview"],
              ["capabilities", "Capabilities"],
              ["flow", "User Flow"],
              ["tech", "Technical Detail"],
              ["source", "Requirement Source"],
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFeatureTab(tabKey as typeof featureTab);
                }}
                className={cn(
                  "px-2 py-0.5 rounded-[2px] transition-colors duration-150",
                  featureTab === tabKey ? "bg-[#b5452a] text-white" : "hover:text-[#1a1714]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {featureTab === "overview" && (
            <div className="space-y-1 text-[12px] leading-[1.65] text-[#2a2621]">
              <p>{block.purpose}</p>
              {block.businessNeed && (
                <div className="text-[11px] text-[#6b655c]">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#9a948a] mr-1">Need:</span>
                  {block.businessNeed}
                </div>
              )}
            </div>
          )}

          {featureTab === "capabilities" && (
            <ul className="space-y-1">
              {(block.capabilities || []).map((c, j) => (
                <li key={j} className="flex items-start gap-2 text-[11.5px] text-[#2a2621]">
                  <Check className="w-3.5 h-3.5 text-[#b5452a] shrink-0 mt-0.5" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          )}

          {featureTab === "flow" && (
            <div className="text-[11.5px] text-[#2a2621] space-y-1 bg-[#faf7f2] p-2 rounded-sm">
              <div><strong className="text-[#1a1714]">User Journey:</strong> {block.userFlow || "Initiates request → verifies inputs → confirms completion."}</div>
              {block.expectedOutcome && <div><strong className="text-[#1a1714]">Outcome:</strong> {block.expectedOutcome}</div>}
            </div>
          )}

          {featureTab === "tech" && (
            <div className="grid sm:grid-cols-2 gap-2 text-[11px] bg-[#faf7f2] p-2 rounded-sm text-[#6b655c]">
              <div><span className="font-mono text-[9px] uppercase text-[#9a948a]">Inputs:</span> {block.inputs || "Parameters & Form Data"}</div>
              <div><span className="font-mono text-[9px] uppercase text-[#9a948a]">Outputs:</span> {block.outputs || "Verified Records & Audit Trail"}</div>
              <div className="sm:col-span-2"><span className="font-mono text-[9px] uppercase text-[#9a948a]">Behavior:</span> {block.systemBehavior || "Real-time state validation and logging"}</div>
            </div>
          )}

          {featureTab === "source" && (
            <div className="flex items-center gap-3 text-[11px] text-[#6b655c]">
              <span className="font-mono font-semibold text-[#b5452a] bg-[#f5edea] px-2 py-0.5 rounded-[3px]">{block.requirementSource || "REQ-001"}</span>
              <span>Traceable to approved requirement snapshot</span>
              {block.aiConfidence && <span className="ml-auto text-[9.5px] font-mono text-[#3f6e35]">Confidence: {block.aiConfidence}%</span>}
            </div>
          )}
        </div>
      );
    }

    /* ═══ Objective Card (Spec 25) ═══ */
    case "objective_card":
      return (
        <div className="rounded-sm border border-[#e7e2d8] px-4 py-3 bg-white space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#b5452a] font-semibold">{block.title}</div>
          <p className="text-[12px] leading-[1.65] text-[#2a2621]">{block.description}</p>
          {block.businessNeed && (
            <div className="text-[11px] text-[#6b655c]">
              <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-[#9a948a] mr-1.5">Business Need:</span>
              {block.businessNeed}
            </div>
          )}
          {block.successIndicator && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#1a1714] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3f6e35] shrink-0" aria-hidden="true" />
              <span>Success Indicator: {block.successIndicator}</span>
            </div>
          )}
          {block.requirement && <div className="text-[9px] font-mono text-[#9a948a]">{block.requirement}</div>}
        </div>
      );

    /* ═══ Technical Architecture (Spec 31) ═══ */
    case "architecture":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1a1714]">
            <Layers className="w-4 h-4 text-[#b5452a]" aria-hidden="true" />
            {block.title || "Technical Architecture & System Design"}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {block.layers.map((l, idx) => (
              <div key={idx} className="rounded-sm border border-[#e7e2d8] bg-[#faf7f2] p-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#1a1714]">{l.name}</span>
                  <span className="font-mono text-[9.5px] text-[#b5452a] font-medium">{l.tech}</span>
                </div>
                {l.purpose && <p className="mt-1 text-[10.5px] text-[#6b655c] leading-snug">{l.purpose}</p>}
              </div>
            ))}
          </div>
        </div>
      );

    /* ═══ Problem / Solution Matrix (Spec 26) ═══ */
    case "comparison":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-sm border border-[#f0cbb8] bg-[#fdf3e7] p-3 space-y-1">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#9a5b13] font-semibold">Current State (Problem)</div>
              <p className="text-[12px] text-[#7c4d08] leading-snug">{block.currentState.problem}</p>
              <div className="text-[10.5px] text-[#9a5b13] pt-1"><strong className="text-[#7c4d08]">Impact:</strong> {block.currentState.impact}</div>
            </div>
            <div className="rounded-sm border border-[#c3e2bf] bg-[#eef6ec] p-3 space-y-1">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#3f6e35] font-semibold">Proposed State (Solution)</div>
              <p className="text-[12px] text-[#2c4f26] leading-snug">{block.proposedState.solution}</p>
              <div className="text-[10.5px] text-[#3f6e35] pt-1"><strong className="text-[#2c4f26]">Outcome:</strong> {block.proposedState.outcome}</div>
            </div>
          </div>
        </div>
      );

    /* ═══ Proposal Acceptance & Digital Approval (Spec 39) ═══ */
    case "approval":
      return (
        <div className="rounded-sm border-2 border-[#b5452a] bg-[#faf7f2] p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-[#b5452a] font-bold">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Official Proposal Acceptance
          </div>
          <div className="text-[12.5px] text-[#1a1714] leading-relaxed">
            Authorized for <strong className="font-semibold">{block.clientName || "Client"}</strong> under project <strong className="font-semibold">{block.projectName || "Proposal"}</strong>.
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-[#6b655c] bg-white p-2.5 rounded-sm border border-[#e7e2d8]">
            <div><span className="font-mono text-[9px] uppercase text-[#9a948a]">Scope:</span> {block.approvedScope || "All deliverables in proposal"}</div>
            <div><span className="font-mono text-[9px] uppercase text-[#9a948a]">Date:</span> {block.acceptanceDate || "—"}</div>
            <div><span className="font-mono text-[9px] uppercase text-[#9a948a]">Signatory:</span> {block.authorizedPerson || "Authorized Representative"}</div>
            <div><span className="font-mono text-[9px] uppercase text-[#9a948a]">Digital Seal:</span> <span className="font-mono text-[#3f6e35] font-semibold">{block.digitalStamp || "BUSINESS_OS_VERIFIED"}</span></div>
          </div>
        </div>
      );

    case "callout": {
      const tone = block.tone ?? "info";
      const toneCls =
        tone === "warning"
          ? "border-l-[#b5842a] bg-[#fdf6ec] text-[#7c4d08]"
          : tone === "success"
            ? "border-l-[#3f6e35] bg-[#eef6ec] text-[#2c4f26]"
            : "border-l-[#b5452a] bg-[#f7f0ec] text-[#6e2f1c]";
      return (
        <div className={cn("rounded-r-sm border-l-[3px] px-4 py-3", toneCls)}>
          {block.title && <div className="text-[9px] font-mono uppercase tracking-[0.14em] font-semibold mb-1">{block.title}</div>}
          <p className="text-[12px] leading-[1.65]">{block.text}</p>
        </div>
      );
    }

    case "statistic":
      return (
        <div className="py-1">
          <div className="text-[24px] font-bold tracking-tight text-[#b5452a] tabular-nums">{block.value}</div>
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#9a948a] mt-0.5">{block.label}</div>
          {block.detail && <div className="text-[11px] text-[#6b655c] mt-0.5">{block.detail}</div>}
        </div>
      );

    case "process_flow":
      return (
        <div className="space-y-1.5">
          {block.steps.filter((s) => s.trim()).map((s, j) => (
            <div key={j} className="flex items-start gap-3 text-[12px] leading-[1.6] text-[#2a2621]">
              <span className="font-mono text-[10px] text-[#b5452a] tabular-nums mt-[2px] shrink-0">{String(j + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      );

    case "timeline":
      return (
        <div className="space-y-0">
          {block.phases.map((p, j) => (
            <div key={j} className="flex gap-3 pb-3">
              <div className="flex flex-col items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full border border-[#b5452a]/30 text-[9px] font-mono text-[#b5452a]">{j + 1}</span>
                {j < block.phases.length - 1 && <span className="w-px flex-1 bg-[#e7e2d8]" aria-hidden="true" />}
              </div>
              <div className="pt-0.5 pb-2">
                <div className="text-[12.5px] font-semibold text-[#1a1714]">{p.title}</div>
                {p.duration && <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#9a948a]">{p.duration}</div>}
                {p.description && <p className="mt-1 text-[11.5px] leading-[1.6] text-[#6b655c]">{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      );

    case "milestone":
      return (
        <div className="flex items-start gap-3 rounded-sm border border-[#e7e2d8] px-3.5 py-2.5">
          {block.status && <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-[#b5452a] mt-0.5 shrink-0">{block.status}</span>}
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-[#1a1714]">{block.title}</div>
            {block.date && <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#9a948a]">{block.date}</div>}
            {block.description && <p className="mt-0.5 text-[11.5px] leading-[1.6] text-[#6b655c]">{block.description}</p>}
          </div>
        </div>
      );

    case "deliverable":
      return (
        <div className="rounded-sm border border-[#e7e2d8] px-3.5 py-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#b5452a] font-semibold">{block.id || "DLV"}</span>
            <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.1em] text-[#3f6e35]">{block.status}</span>
          </div>
          <div className="text-[12.5px] font-semibold text-[#1a1714]">{block.name}</div>
          {block.description && <p className="text-[11.5px] leading-[1.6] text-[#6b655c]">{block.description}</p>}
          {block.acceptance && <div className="text-[10px] text-[#9a948a] pt-0.5"><strong className="text-[#6b655c]">Acceptance:</strong> {block.acceptance}</div>}
        </div>
      );

    case "requirement_reference":
      return (
        <div className="flex items-center gap-3">
          <span className="rounded-[3px] bg-[#f5edea] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#b5452a]">
            {block.reference || "REQ"}
          </span>
          <span className="text-[12px] text-[#2a2621]">{block.title}</span>
          {block.status && <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.1em] text-[#9a948a]">{block.status}</span>}
        </div>
      );

    case "assumption":
      return (
        <div className="flex items-start gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#9a948a] mt-[3px] shrink-0">{block.id || "ASM"}</span>
          <div className="min-w-0">
            <p className="text-[12px] leading-[1.6] text-[#2a2621]">{block.description}</p>
            {(block.owner || block.impact) && (
              <div className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.1em] text-[#9a948a]">
                {[block.owner ? `Owner: ${block.owner}` : null, block.impact ? `Impact: ${block.impact}` : null].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
      );

    case "risk":
      return (
        <div className="rounded-sm border border-[#e7e2d8] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="text-[12.5px] font-semibold text-[#1a1714]">{block.title}</div>
            {block.status && <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.1em] text-[#9a948a]">{block.status}</span>}
          </div>
          {block.description && <p className="mt-1 text-[11.5px] leading-[1.6] text-[#2a2621]">{block.description}</p>}
          {block.impact && <div className="mt-1 text-[10.5px] text-[#6b655c]"><span className="text-[9px] font-mono uppercase tracking-[0.1em] text-[#9a948a] mr-1.5">Impact</span>{block.impact}</div>}
          {block.mitigation && <div className="mt-1 text-[10.5px] text-[#3f6e35]"><span className="text-[9px] font-mono uppercase tracking-[0.1em] text-[#9a948a] mr-1.5">Mitigation</span>{block.mitigation}</div>}
        </div>
      );

    case "signature":
      return (
        <div className="py-2">
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#b5452a] font-semibold">{block.role === "CLIENT" ? "Client signature" : "Provider signature"}</div>
          <div className="mt-8 text-[13px] font-semibold text-[#1a1714]">{block.name || " "}</div>
          <div className="mt-1 h-px w-[240px] bg-[#e7e2d8]" aria-hidden="true" />
          <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.12em] text-[#9a948a]">{block.title || "Name · Role · Date"}</div>
        </div>
      );

    case "transformation_map":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          {block.summary && <p className="text-[11.5px] text-[#6b655c]">{block.summary}</p>}
          <div className="space-y-2.5">
            {block.steps.map((st, j) => (
              <div key={j} className="grid sm:grid-cols-2 gap-2.5">
                <div className="rounded-sm border border-[#f0cbb8] bg-[#fdf3e7] p-2.5 space-y-1 text-[11px]">
                  <div className="font-mono text-[9px] uppercase font-bold text-[#9a5b13]">{st.stage} — Current Constraint</div>
                  <div className="text-[#7c4d08]">{st.current}</div>
                  <div className="text-[9.5px] text-[#9a5b13] pt-0.5"><strong className="text-[#7c4d08]">Impact:</strong> {st.impact}</div>
                </div>
                <div className="rounded-sm border border-[#c3e2bf] bg-[#eef6ec] p-2.5 space-y-1 text-[11px]">
                  <div className="font-mono text-[9px] uppercase font-bold text-[#3f6e35]">Target Product Capability</div>
                  <div className="text-[#2c4f26]">{st.future}</div>
                  <div className="text-[9.5px] text-[#3f6e35] pt-0.5"><strong className="text-[#2c4f26]">Outcome:</strong> {st.outcome}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "system_blueprint":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          {block.description && <p className="text-[11.5px] text-[#6b655c]">{block.description}</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {block.nodes.map((node, j) => (
              <div key={j} className="rounded-sm border border-[#e7e2d8] bg-[#faf7f2] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-[#b5452a] font-bold">{node.category}</span>
                </div>
                <div className="text-[11.5px] font-semibold text-[#1a1714]">{node.title}</div>
                <ul className="space-y-0.5 text-[10.5px] text-[#6b655c]">
                  {node.items.map((it, k) => (
                    <li key={k} className="flex items-start gap-1.5">
                      <span className="text-[#b5452a] mt-0.5">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );

    case "module_card":
      return (
        <div className="rounded-sm border border-[#e7e2d8] border-l-[3px] border-l-[#b5452a] bg-white p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-bold text-[#b5452a] bg-[#f5edea] px-1.5 py-0.5 rounded-[3px]">{block.id || "MOD"}</span>
              <span className="text-[13.5px] font-semibold text-[#1a1714]">{block.name}</span>
            </div>
            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[3px] bg-[#f5edea] text-[#b5452a] font-bold">{block.priority || "MUST_HAVE"}</span>
          </div>
          <p className="text-[12px] text-[#2a2621] leading-relaxed">{block.purpose}</p>
          <div className="text-[11px] text-[#6b655c]">
            <span className="text-[9px] font-mono uppercase text-[#9a948a] mr-1.5 font-semibold">Primary Users:</span>
            {block.primaryUsers.join(", ")}
          </div>
          <div className="rounded-sm bg-[#faf7f2] border border-[#e7e2d8] p-2.5 space-y-1.5 text-[11px]">
            <div className="font-mono text-[9px] uppercase font-bold text-[#1a1714]">User Actions & System Behaviors</div>
            <div className="grid sm:grid-cols-2 gap-2 text-[10.5px] text-[#6b655c]">
              <div>
                <strong className="text-[#1a1714] block text-[9.5px]">Actions:</strong>
                {block.userActions.map((a, k) => <div key={k}>• {a}</div>)}
              </div>
              <div>
                <strong className="text-[#1a1714] block text-[9.5px]">Business Rules:</strong>
                {block.businessRules.map((r, k) => <div key={k}>• {r}</div>)}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#3f6e35] font-medium pt-0.5">
            <strong className="text-[#2c4f26] font-semibold">Business Value:</strong> {block.businessValue}
          </div>
        </div>
      );

    case "journey_flow":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#b5452a] font-bold">User Journey — {block.persona}</div>
          </div>
          <div className="text-[12px] text-[#1a1714] font-medium">Primary Goal: {block.primaryGoal}</div>
          <div className="space-y-2">
            {block.steps.map((st, j) => (
              <div key={j} className="flex items-start gap-3 text-[11.5px] bg-[#faf7f2] p-2.5 rounded-sm border border-[#e7e2d8]">
                <span className="font-mono text-[10px] font-bold text-[#b5452a] bg-[#f5edea] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">0{st.stepNumber}</span>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold text-[#1a1714]">{st.action}</div>
                  <div className="text-[10px] text-[#9a948a] font-mono">Screen: {st.screenExperience}</div>
                  <div className="text-[11px] text-[#6b655c]">{st.systemResponse}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "feature_matrix":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          {block.summary && <p className="text-[11.5px] text-[#6b655c]">{block.summary}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#b5452a] text-white text-[9.5px] font-mono uppercase tracking-[0.1em]">
                  <th className="px-2.5 py-1.5">ID</th>
                  <th className="px-2.5 py-1.5">Module</th>
                  <th className="px-2.5 py-1.5">Feature & Purpose</th>
                  <th className="px-2.5 py-1.5">User</th>
                  <th className="px-2.5 py-1.5">Release</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-[#2a2621]">
                {block.items.map((it, j) => (
                  <tr key={j} className={j % 2 === 0 ? "bg-[#faf7f2]" : ""}>
                    <td className="px-2.5 py-2 font-mono font-semibold text-[#b5452a] border-b border-[#e7e2d8]">{it.featureId}</td>
                    <td className="px-2.5 py-2 font-medium border-b border-[#e7e2d8]">{it.module}</td>
                    <td className="px-2.5 py-2 border-b border-[#e7e2d8]">
                      <div className="font-semibold text-[#1a1714]">{it.name}</div>
                      <div className="text-[10px] text-[#6b655c]">{it.whatItDoes}</div>
                    </td>
                    <td className="px-2.5 py-2 text-[10px] border-b border-[#e7e2d8]">{it.user}</td>
                    <td className="px-2.5 py-2 font-mono font-bold text-[9.5px] border-b border-[#e7e2d8]">
                      <span className={it.priority === "MVP" ? "text-[#b5452a]" : "text-[#6b655c]"}>{it.priority}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "acceptance_spec":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-2 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase font-bold text-[#b5452a]">{block.id}: {block.featureTitle}</span>
            <span className="font-mono text-[8.5px] text-[#9a948a]">GIVEN-WHEN-THEN</span>
          </div>
          <div className="space-y-1">
            <div><strong className="text-[#b5452a]">GIVEN:</strong> {block.given}</div>
            <div><strong className="text-[#b5452a]">WHEN:</strong> {block.when}</div>
            <div>
              <strong className="text-[#b5452a] block">THEN:</strong>
              <ul className="pl-3 space-y-0.5 text-[#6b655c]">
                {block.then.map((t, k) => <li key={k}>• {t}</li>)}
              </ul>
            </div>
          </div>
          {block.failureBehavior && (
            <div className="text-[10.5px] text-[#9a5b13] pt-1">
              <strong>Failure Behavior:</strong> {block.failureBehavior}
            </div>
          )}
        </div>
      );

    case "domain_entity_map":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          <div className="grid sm:grid-cols-2 gap-2.5">
            {block.entities.map((e, j) => (
              <div key={j} className="rounded-sm border border-[#e7e2d8] bg-[#faf7f2] p-2.5 space-y-1 text-[11px]">
                <div className="font-bold text-[#1a1714] text-[12px]">{e.name}</div>
                <p className="text-[10.5px] text-[#6b655c]">{e.description}</p>
                <div className="font-mono text-[9px] text-[#9a948a] pt-1">Attrs: {e.keyAttributes.join(", ")}</div>
                <div className="font-mono text-[9px] text-[#b5452a]">Relations: {e.relationships.join(" | ")}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "integration_spec":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-3.5 space-y-2 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1a1714] text-[12.5px]">{block.serviceName}</span>
            <span className="font-mono text-[9px] text-[#b5452a] uppercase">{block.category}</span>
          </div>
          <p className="text-[#6b655c] text-[11px]">{block.purpose}</p>
          <div className="grid sm:grid-cols-2 gap-1.5 text-[10px] text-[#6b655c] bg-[#faf7f2] p-2 rounded-sm border border-[#e7e2d8]">
            <div><strong>Data:</strong> {block.dataExchanged}</div>
            <div><strong>Trigger:</strong> {block.trigger}</div>
            <div><strong>Direction:</strong> {block.direction}</div>
            <div><strong>Failure Protocol:</strong> {block.failureBehavior}</div>
          </div>
        </div>
      );

    case "screen_card":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-3 space-y-1 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1a1714]">{block.screenId || "SCR"}: {block.name}</span>
            <span className="text-[9.5px] text-[#9a948a]">User: {block.primaryUser}</span>
          </div>
          <p className="text-[#6b655c] text-[11px]">{block.purpose}</p>
          <div className="text-[10px] text-[#9a948a]"><strong className="text-[#6b655c]">Key Info:</strong> {block.keyInformation.join(" · ")}</div>
          <div className="text-[10px] text-[#b5452a]"><strong className="text-[#6b655c]">Actions:</strong> {block.primaryActions.join(" · ")}</div>
        </div>
      );

    case "qa_verification":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#b5452a] text-white text-[9.5px] font-mono uppercase">
                  <th className="px-2.5 py-1.5">Workflow</th>
                  <th className="px-2.5 py-1.5">Test Type</th>
                  <th className="px-2.5 py-1.5">Expected Result</th>
                  <th className="px-2.5 py-1.5">Verification Gate</th>
                </tr>
              </thead>
              <tbody>
                {block.items.map((qa, j) => (
                  <tr key={j} className={j % 2 === 0 ? "bg-[#faf7f2]" : ""}>
                    <td className="px-2.5 py-2 font-medium border-b border-[#e7e2d8]">{qa.featureOrWorkflow}</td>
                    <td className="px-2.5 py-2 font-mono text-[9px] border-b border-[#e7e2d8]">{qa.testType}</td>
                    <td className="px-2.5 py-2 text-[#6b655c] border-b border-[#e7e2d8]">{qa.expectedResult}</td>
                    <td className="px-2.5 py-2 text-[#3f6e35] font-medium border-b border-[#e7e2d8]">{qa.acceptanceVerification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "roadmap_phase":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-3">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          <div className="space-y-2">
            {block.phases.map((ph, j) => (
              <div key={j} className="flex items-start gap-3 bg-[#faf7f2] p-2.5 rounded-sm border border-[#e7e2d8] text-[11.5px]">
                <span className="font-mono text-[11px] font-bold text-[#b5452a] shrink-0 mt-0.5">{ph.phaseNumber}</span>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold text-[#1a1714]">{ph.name}</div>
                  <div className="text-[10.5px] text-[#6b655c]">{ph.focus}</div>
                  <div className="text-[10px] text-[#9a948a]"><strong className="text-[#1a1714]">Deliverables:</strong> {ph.deliverables.join(" · ")}</div>
                  <div className="text-[10px] text-[#3f6e35] font-semibold">Gate: {ph.verificationGate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "security_boundary":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-white p-4 space-y-2.5 text-[11.5px]">
          {block.title && <div className="text-[13px] font-semibold text-[#1a1714]">{block.title}</div>}
          {block.overview && <p className="text-[11px] text-[#6b655c]">{block.overview}</p>}
          <div className="space-y-1.5">
            {block.boundaries.map((sb, j) => (
              <div key={j} className="flex items-start gap-2 bg-[#faf7f2] p-2 rounded-sm border border-[#e7e2d8]">
                <span className="font-semibold text-[#1a1714] min-w-[90px] text-[11px] shrink-0">{sb.layer}:</span>
                <span className="text-[#6b655c] text-[10.5px]">{sb.mechanism} — <strong className="text-[#3f6e35]">{sb.threatProtection}</strong></span>
              </div>
            ))}
          </div>
        </div>
      );

    case "migration_pipeline":
      return (
        <div className="rounded-sm border border-[#e7e2d8] bg-[#faf7f2] p-4 space-y-2 text-[11.5px]">
          <div className="font-mono text-[9px] uppercase font-bold text-[#b5452a]">Legacy Transition — {block.systemName}</div>
          <p className="text-[11px] text-[#6b655c]">{block.scopeSummary}</p>
          <div className="space-y-1 pt-1">
            {block.steps.map((st, j) => (
              <div key={j} className="flex items-center gap-2 bg-white p-2 rounded-sm border border-[#e7e2d8] text-[10.5px]">
                <span className="font-semibold text-[#1a1714] w-20">{st.step}</span>
                <span className="font-mono text-[9px] font-bold text-[#b5452a] px-1.5 py-0.5 bg-[#f5edea] rounded">{st.treatment}</span>
                <span className="text-[#6b655c] flex-1">{st.action}</span>
                <span className="text-[9.5px] text-[#3f6e35]">{st.verification}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "page_break":
      return (
        <div className="flex items-center gap-3 py-1 opacity-60">
          <span className="h-px flex-1 bg-[#e7e2d8]" aria-hidden="true" />
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#9a948a]">Page break</span>
          <span className="h-px flex-1 bg-[#e7e2d8]" aria-hidden="true" />
        </div>
      );

    case "spacer":
      return <div className="h-[18px]" aria-hidden="true" />;

    default:
      return null;
  }
}
