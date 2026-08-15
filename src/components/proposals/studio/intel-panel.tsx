"use client";

import { AlertTriangle, Check, Loader2, Plus, Sparkles, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalBlock, ProposalDoc, ProposalSection, RequirementCoverage, ProposalReadiness } from "@/lib/proposal-doc";
import { blockText, sectionCompletion, SOURCE_LABELS, type ProposalSource } from "@/lib/proposal-doc";
import { applyBlockField, BLOCK_FIELDS, fieldDisplayValue } from "./block-fields";
import type { SaveState, StudioInitial } from "./types";
import type { SelectedBlock } from "./canvas";

/* ────────────────────────────────────────────────────────────────
   CONTEXTUAL INTELLIGENCE PANEL — right rail. Shows the truth about
   the current section and the whole document (coverage, readiness),
   edits the selected block through its schema, and hosts the AI
   Proposal Copilot — a document intelligence system, not a chatbot.
──────────────────────────────────────────────────────────────── */

const SOURCE_DOT: Record<ProposalSource, string> = {
  REQUIREMENT: "bg-[var(--bos-accent)]",
  CLIENT: "bg-[var(--bos-info)]",
  WORKSPACE: "bg-[var(--bos-success)]",
  MANUAL: "bg-[var(--bos-text-tertiary)]",
  AI_DRAFT: "bg-[var(--bos-warning)]",
};

const AI_ACTIONS = [
  "Expand Section",
  "Improve Writing",
  "Add Missing Detail",
  "Add Requirement Context",
  "Improve Business Value",
  "Improve Technical Detail",
  "Improve Structure",
  "Make Client-Friendly",
  "Add Feature Details",
  "Add User Journey",
  "Improve Entire Proposal",
];

const AI_PROCESS_STEPS = [
  "Analyzing approved requirements…",
  "Reviewing current proposal…",
  "Mapping requirement coverage…",
  "Identifying missing detail…",
  "Building content blocks…",
  "Checking factual consistency…",
  "Preparing document changes…",
];

export type AiDraftState = "idle" | "streaming" | "draft";

export type IntelTab = "intel" | "section" | "block" | "ai";

type IntelPanelProps = {
  tab: IntelTab;
  onTabChange: (tab: IntelTab) => void;
  doc: ProposalDoc;
  proposalMeta: StudioInitial["proposal"];
  activeSection: ProposalSection | undefined;
  selectedBlock: SelectedBlock;
  coverage: RequirementCoverage;
  readiness: ProposalReadiness;
  onUpdateSection: (id: string, patch: Partial<ProposalSection>) => void;
  onPatchBlock: (sectionId: string, index: number, patch: Record<string, unknown>) => void;
  onAddRequirementReference: (reference: string, title: string) => void;
  aiInstruction: string;
  onAiInstruction: (v: string) => void;
  aiDepth: string;
  onAiDepth: (v: string) => void;
  aiState: AiDraftState;
  aiText: string;
  aiStep: number;
  onRunAi: () => void;
  onInsertAi: () => void;
  onRejectAi: () => void;
};

export function IntelPanel({
  tab,
  onTabChange,
  doc,
  proposalMeta,
  activeSection,
  selectedBlock,
  coverage,
  readiness,
  onUpdateSection,
  onPatchBlock,
  onAddRequirementReference,
  aiInstruction,
  onAiInstruction,
  aiDepth,
  onAiDepth,
  aiState,
  aiText,
  aiStep,
  onRunAi,
  onInsertAi,
  onRejectAi,
}: IntelPanelProps) {
  const selected = selectedBlock && activeSection?.id === selectedBlock.sectionId
    ? activeSection.blocks[selectedBlock.index]
    : undefined;

  const inputCls =
    "w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";
  const labelCls = "block text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1";

  if (!activeSection) {
    return (
      <aside className="hidden lg:block w-[300px] shrink-0 border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
        <div className="p-5 text-[12px] text-[var(--bos-text-tertiary)]">Select a section to work on it.</div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col min-h-0 w-[300px] shrink-0 border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
      {/* Tabs */}
      <div className="flex gap-0.5 px-2.5 pt-2.5 pb-2 overflow-x-auto no-scrollbar shrink-0">
        {(
          [
            ["intel", "Intelligence"],
            ["section", "Section"],
            ["block", "Block"],
            ["ai", "AI"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={cn(
              "shrink-0 px-2 h-6 rounded-sm text-[10px] font-medium uppercase tracking-[0.08em] transition-colors duration-150",
              tab === key ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]" : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
              key === "block" && !selected ? "opacity-40 pointer-events-none" : "",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 pb-6 space-y-4">
        {/* ═══ Intelligence ═══ */}
        {tab === "intel" && (
          <>
            <CoverageCard coverage={coverage} onAdd={(ref, title) => onAddRequirementReference(ref, title)} sectionTitle={activeSection.title} />
            <ReadinessCard readiness={readiness} />
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5 space-y-1">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Document</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Status</span>
                <span className="text-[var(--bos-text-primary)]">{proposalMeta.status.replace(/_/g, " ").toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Version</span>
                <span className="text-[var(--bos-text-primary)]">v{proposalMeta.version}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Sections</span>
                <span className="text-[var(--bos-text-primary)]">{doc.sections.filter((s) => s.visible).length} pages</span>
              </div>
            </div>
          </>
        )}

        {/* ═══ Section ═══ */}
        {tab === "section" && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Section title</label>
              <input value={activeSection.title} onChange={(e) => onUpdateSection(activeSection.id, { title: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Kicker</label>
              <input value={activeSection.kicker} onChange={(e) => onUpdateSection(activeSection.id, { kicker: e.target.value })} className={inputCls} placeholder="Small label above the title" />
            </div>
            <div className="flex items-center justify-between rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
              <div>
                <div className="text-[12px] font-medium text-[var(--bos-text-primary)]">Visible in proposal</div>
                <div className="text-[10px] text-[var(--bos-text-tertiary)]">Included in the PDF and page count</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={activeSection.visible}
                onClick={() => onUpdateSection(activeSection.id, { visible: !activeSection.visible })}
                className={cn("relative rounded-full transition-colors duration-200", activeSection.visible ? "bg-[var(--bos-accent)]" : "bg-[var(--bos-border-strong)]")}
                style={{ width: 32, height: 18 }}
              >
                <span className={cn("absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200", activeSection.visible ? "left-[16px]" : "left-0.5")} />
              </button>
            </div>
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--bos-text-secondary)]">
                <span className={cn("w-1.5 h-1.5 rounded-full", SOURCE_DOT[activeSection.source])} aria-hidden="true" />
                {SOURCE_LABELS[activeSection.source]}
              </div>
              <p className="mt-1 text-[10px] text-[var(--bos-text-tertiary)] leading-snug">
                {activeSection.source === "MANUAL"
                  ? "Written by your team. Requirement-bound sections stay locked unless you replace them with an AI draft."
                  : activeSection.source === "AI_DRAFT"
                    ? "An AI draft replaced the original content — review it before finalizing."
                    : "Content flows from real data. Edits here are saved to the document."}
              </p>
            </div>
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
              <div className="text-[10px] font-medium text-[var(--bos-text-secondary)]">Completion</div>
              <div className="mt-1.5 h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--bos-accent)] transition-[width] duration-500" style={{ width: `${sectionCompletion(activeSection)}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">{sectionCompletion(activeSection)}% · {activeSection.blocks.length} blocks</div>
            </div>
          </div>
        )}

        {/* ═══ Block ═══ */}
        {tab === "block" && (
          selected ? <BlockEditor key={selected.id ?? `${selectedBlock!.sectionId}-${selectedBlock!.index}`} block={selected} onChange={(patch) => onPatchBlock(selectedBlock!.sectionId, selectedBlock!.index, patch)} /> : (
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-4 text-[11px] text-[var(--bos-text-tertiary)]">
              Click any block on the page to edit its fields here.
            </div>
          )
        )}

        {/* ═══ AI copilot ═══ */}
        {tab === "ai" && (
          <div className="space-y-3">
            <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
                <Sparkles className="w-3 h-3" aria-hidden="true" /> AI Proposal Copilot
              </div>
              <div className="mt-1 text-[11px] text-[var(--bos-text-secondary)]">
                {activeSection.title} · v{proposalMeta.version}
              </div>
            </div>

            <div>
              <div className={labelCls}>What do you want to improve?</div>
              <div className="flex flex-wrap gap-1">
                {AI_ACTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onAiInstruction(a.toLowerCase())}
                    className={cn(
                      "px-2 py-1 rounded-sm border text-[10px] transition-colors duration-150",
                      aiInstruction === a.toLowerCase()
                        ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                        : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent-ring)] hover:text-[var(--bos-accent)]",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Content depth</label>
              <select value={aiDepth} onChange={(e) => onAiDepth(e.target.value)} className={cn(inputCls, "appearance-none cursor-pointer")}>
                {["Standard", "Detailed", "Comprehensive"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onRunAi}
              disabled={aiState === "streaming" || !aiInstruction.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 transition-colors duration-150"
            >
              {aiState === "streaming" ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Wand2 className="w-3 h-3" aria-hidden="true" />}
              {aiState === "streaming" ? AI_PROCESS_STEPS[Math.min(aiStep, AI_PROCESS_STEPS.length - 1)] : "Generate"}
            </button>

            {aiState !== "idle" && (
              <div className="rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/5 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-warning)] mb-1.5">
                  <Sparkles className="w-3 h-3" aria-hidden="true" /> AI draft
                </div>
                <div className="text-[12px] text-[var(--bos-text-primary)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {aiText || "Drafting…"}
                </div>
                {aiState === "draft" && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button type="button" onClick={onInsertAi} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]">
                      <Check className="w-3 h-3" aria-hidden="true" /> Insert
                    </button>
                    <button type="button" onClick={onRejectAi} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]">
                      <X className="w-3 h-3" aria-hidden="true" /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-[var(--bos-text-tertiary)] leading-snug">
              The copilot drafts from this proposal&apos;s real data only — it never invents prices, dates or scope. Drafts are not saved until you insert them.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ═══ Coverage ═══ */

function CoverageCard({ coverage, onAdd, sectionTitle }: { coverage: RequirementCoverage; onAdd: (ref: string, title: string) => void; sectionTitle: string }) {
  const missing = coverage.uncovered.slice(0, 5);
  return (
    <div className="rounded-sm border border-[var(--bos-line)] px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Requirement coverage</div>
        <span className={cn("text-[13px] font-semibold tabular-nums", coverage.percent >= 90 ? "text-[var(--bos-success)]" : coverage.percent >= 70 ? "text-[var(--bos-warning)]" : "text-[var(--bos-error)]")}>
          {coverage.percent}%
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
        <div className={cn("h-full rounded-full transition-[width] duration-500", coverage.percent >= 90 ? "bg-[var(--bos-success)]" : coverage.percent >= 70 ? "bg-[var(--bos-warning)]" : "bg-[var(--bos-error)]")} style={{ width: `${coverage.percent}%` }} />
      </div>
      {coverage.total > 0 && (
        <div className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">
          {coverage.represented} of {coverage.total} approved features represented
        </div>
      )}
      {missing.length > 0 && (
        <div className="mt-2.5 space-y-1">
          <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-warning)]">Needs proposal coverage</div>
          {missing.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onAdd("REQ", f)}
              className="w-full flex items-center justify-between gap-2 rounded-sm border border-[var(--bos-line)] px-2 py-1.5 text-left hover:border-[var(--bos-accent-ring)] transition-colors duration-150"
              title={`Add "${f}" to ${sectionTitle}`}
            >
              <span className="text-[10.5px] text-[var(--bos-text-secondary)] truncate">{f}</span>
              <Plus className="w-3 h-3 text-[var(--bos-accent)] shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {coverage.total > 0 && coverage.uncovered.length > 5 && (
        <div className="mt-1 text-[9px] text-[var(--bos-text-tertiary)]">+{coverage.uncovered.length - 5} more</div>
      )}
    </div>
  );
}

/* ═══ Readiness ═══ */

function ReadinessCard({ readiness }: { readiness: ProposalReadiness }) {
  return (
    <div className="rounded-sm border border-[var(--bos-line)] px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Proposal readiness</div>
        <span className={cn("text-[13px] font-semibold tabular-nums", readiness.percent >= 80 ? "text-[var(--bos-success)]" : readiness.percent >= 50 ? "text-[var(--bos-warning)]" : "text-[var(--bos-error)]")}>
          {readiness.percent}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        {readiness.areas.map((a) => (
          <div key={a.key} className="flex items-center gap-1.5 text-[10px]">
            <span className={cn("w-3.5 h-3.5 flex items-center justify-center rounded-full shrink-0", a.ok ? "bg-[var(--bos-success)]/15 text-[var(--bos-success)]" : "bg-[var(--bos-warning)]/15 text-[var(--bos-warning)]")}>
              {a.ok ? <Check className="w-2 h-2" aria-hidden="true" /> : <span className="text-[8px]">!</span>}
            </span>
            <span className="text-[var(--bos-text-tertiary)] truncate">{a.label}</span>
          </div>
        ))}
      </div>
      {readiness.areas.some((a) => !a.ok) && (
        <div className="mt-2 flex items-start gap-1.5 text-[9.5px] text-[var(--bos-warning)]">
          <AlertTriangle className="w-3 h-3 mt-px shrink-0" aria-hidden="true" />
          {readiness.areas.filter((a) => !a.ok).map((a) => a.note).join(" · ")}
        </div>
      )}
    </div>
  );
}

/* ═══ Schema-driven block editor ═══ */

function BlockEditor({ block, onChange }: { block: ProposalBlock; onChange: (patch: Record<string, unknown>) => void }) {
  const fields = BLOCK_FIELDS[block.type] ?? [];
  const inputCls =
    "w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";
  const labelCls = "block text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1";

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 px-3 py-2.5">
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">{block.type.replace(/_/g, " ")}</div>
        <div className="mt-0.5 text-[10px] text-[var(--bos-text-tertiary)] break-words">{(blockText(block) || "Empty block").slice(0, 120)}</div>
      </div>
      {fields.map((f) => {
        const value = fieldDisplayValue(block, f.key);
        if (f.kind === "select") {
          return (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              <select value={String(value)} onChange={(e) => onChange(applyBlockField(block, f.key, e.target.value) as unknown as Record<string, unknown>)} className={cn(inputCls, "appearance-none cursor-pointer")}>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          );
        }
        const textValue = typeof value === "string" ? value : value ? "true" : "";
        return (
          <div key={f.key}>
            <label className={labelCls}>{f.label}</label>
            <textarea
              value={textValue}
              rows={f.kind === "textarea" ? 4 : Math.max(2, Math.min(6, textValue.split("\n").length + 1))}
              onChange={(e) => onChange(applyBlockField(block, f.key, e.target.value) as unknown as Record<string, unknown>)}
              placeholder={f.placeholder}
              className={cn(inputCls, "h-auto py-2 resize-y leading-relaxed")}
            />
          </div>
        );
      })}
      {block.source && (
        <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
          Source: {SOURCE_LABELS[block.source]}
        </div>
      )}
    </div>
  );
}
