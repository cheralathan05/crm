import { useState, useMemo } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronRight, FileText, HelpCircle, Info, Loader2, MessageSquare, Plus, ShieldCheck, Sparkles, StickyNote, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalBlock, ProposalDoc, ProposalSection, RequirementCoverage, ProposalReadiness, InternalNote, SectionComment, ProposalAdminAnswer } from "@/lib/proposal-doc";
import { blockText, parseGeneratedTextToBlocks, sectionCompletion, SOURCE_LABELS, type ProposalSource } from "@/lib/proposal-doc";
import { analyzeSectionInformationSufficiency } from "@/lib/proposal-gap-engine";
import { applyBlockField, BLOCK_FIELDS, fieldDisplayValue } from "./block-fields";
import type { StudioInitial } from "./types";
import type { SelectedBlock } from "./canvas";

/* ────────────────────────────────────────────────────────────────
   CONTEXTUAL INTELLIGENCE PANEL — right rail.
   Houses:
   1. Requirement Intelligence & Traceability & Proposal Readiness
   2. Section details & visibility
   3. Schema-driven Block Editor
   4. AI Proposal Copilot with Fact Protection & Before/After Diff
   5. Internal Notes & Section Comments (Admin only)
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
  "Checking missing information facts…",
  "Structuring consulting blocks…",
  "Verifying fact protection guardrails…",
  "Preparing client-ready draft…",
];

export type AiDraftState = "idle" | "streaming" | "draft";

export type IntelTab = "intel" | "section" | "block" | "ai" | "notes";

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
  aiReasoning?: string;
  aiStep: number;
  isApplyingAi?: boolean;
  onRunAi: (adminAnswers?: ProposalAdminAnswer[]) => void;
  onInsertAi: () => void;
  onRejectAi: () => void;
  onSaveAdminAnswer?: (answer: ProposalAdminAnswer) => void;
  onAddNote?: (content: string) => void;
  onAddComment?: (sectionId: string, message: string) => void;
  onToggleComment?: (commentId: string) => void;
  onSelectSection?: (sectionId: string) => void;
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
  aiReasoning,
  aiStep,
  isApplyingAi,
  onRunAi,
  onInsertAi,
  onRejectAi,
  onSaveAdminAnswer,
  onAddNote,
  onAddComment,
  onToggleComment,
  onSelectSection,
}: IntelPanelProps) {
  const selected = selectedBlock && activeSection?.id === selectedBlock.sectionId
    ? activeSection.blocks[selectedBlock.index]
    : undefined;

  const [newNote, setNewNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showQuestions, setShowQuestions] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const gap = useMemo(() => {
    if (!activeSection) return null;
    return analyzeSectionInformationSufficiency(activeSection.id, activeSection.title, doc);
  }, [activeSection, doc]);

  const currentAdminAnswers: ProposalAdminAnswer[] = useMemo(() => {
    if (!gap || !activeSection) return [];
    const list: ProposalAdminAnswer[] = [];
    const allQ = [...gap.requiredQuestions, ...gap.optionalQuestions];
    for (const q of allQ) {
      const ans = (userAnswers[q.id] ?? q.existingValue ?? "").trim();
      if (ans) {
        list.push({
          id: `ans-${activeSection.id}-${q.id}`,
          sectionId: activeSection.id,
          questionId: q.id,
          question: q.question,
          answer: ans,
          category: q.category,
          source: "ADMIN_PROVIDED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return list;
  }, [gap, activeSection, userAnswers]);

  const currentSectionWords = useMemo(() => {
    if (!activeSection) return 0;
    return activeSection.blocks.reduce((n, b) => n + blockText(b).split(/\s+/).filter(Boolean).length, 0);
  }, [activeSection]);

  const draftWords = useMemo(() => {
    return aiText.split(/\s+/).filter(Boolean).length;
  }, [aiText]);

  const generatedBlocks = useMemo(() => {
    if (!aiText.trim() || !activeSection) return [];
    return parseGeneratedTextToBlocks(aiText, activeSection.id);
  }, [aiText, activeSection]);

  const aiAddedWords = Math.max(0, draftWords - currentSectionWords);

  const handleRunAiWithAnswers = () => {
    if (onSaveAdminAnswer && currentAdminAnswers.length > 0) {
      for (const a of currentAdminAnswers) onSaveAdminAnswer(a);
    }
    onRunAi(currentAdminAnswers);
  };

  const handleAnswerChange = (qId: string, val: string, q: { question: string; category: "REQUIRED" | "OPTIONAL" }) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: val }));
    if (onSaveAdminAnswer && activeSection && val.trim()) {
      onSaveAdminAnswer({
        id: `ans-${activeSection.id}-${qId}`,
        sectionId: activeSection.id,
        questionId: qId,
        question: q.question,
        answer: val.trim(),
        category: q.category,
        source: "ADMIN_PROVIDED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const inputCls =
    "w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";
  const labelCls = "block text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1";

  if (!activeSection) {
    return (
      <aside className="hidden lg:block w-[320px] shrink-0 border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
        <div className="p-5 text-[12px] text-[var(--bos-text-tertiary)]">Select a section to work on it.</div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col min-h-0 w-[320px] shrink-0 border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
      {/* Tabs */}
      <div className="flex gap-0.5 px-2.5 pt-2.5 pb-2 overflow-x-auto no-scrollbar shrink-0 border-b border-[var(--bos-line)]">
        {(
          [
            ["intel", "Intelligence"],
            ["section", "Section"],
            ["block", "Block"],
            ["ai", "AI Copilot"],
            ["notes", "Notes"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={cn(
              "shrink-0 px-2 h-6 rounded-sm text-[10px] font-medium uppercase tracking-[0.08em] transition-colors duration-150",
              tab === key ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-semibold" : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
              key === "block" && !selected ? "opacity-40 pointer-events-none" : "",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
        {/* ═══ Intelligence ═══ */}
        {tab === "intel" && (
          <>
            <CoverageCard coverage={coverage} onAdd={(ref, title) => onAddRequirementReference(ref, title)} sectionTitle={activeSection.title} />
            <ReadinessCard readiness={readiness} />
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5 space-y-1">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Document Intelligence</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Status</span>
                <span className="text-[var(--bos-text-primary)] font-medium">{proposalMeta.status.replace(/_/g, " ").toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Version</span>
                <span className="text-[var(--bos-text-primary)] font-mono">v{proposalMeta.version}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Active Pages</span>
                <span className="text-[var(--bos-text-primary)]">{doc.sections.filter((s) => s.visible).length} sections</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Traceability</span>
                <span className="text-[var(--bos-success)] font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Snapshot verified
                </span>
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
                <div className="text-[10px] text-[var(--bos-text-tertiary)]">Included in the PDF and client review</div>
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
                  ? "Created by your team. You can refine this section directly or enhance it with AI."
                  : activeSection.source === "AI_DRAFT"
                    ? "Enhanced with AI Proposal Copilot — review changes before finalization."
                    : "Backed by approved client requirement records and snapshots."}
              </p>
            </div>
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
              <div className="text-[10px] font-medium text-[var(--bos-text-secondary)]">Completion</div>
              <div className="mt-1.5 h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--bos-accent)] transition-[width] duration-500" style={{ width: `${sectionCompletion(activeSection)}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">{sectionCompletion(activeSection)}% · {activeSection.blocks.length} structured blocks</div>
            </div>
          </div>
        )}

        {/* ═══ Block Editor ═══ */}
        {tab === "block" && (
          selected ? <BlockEditor key={selected.id ?? `${selectedBlock!.sectionId}-${selectedBlock!.index}`} block={selected} onChange={(patch) => onPatchBlock(selectedBlock!.sectionId, selectedBlock!.index, patch)} /> : (
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-4 text-[11px] text-[var(--bos-text-tertiary)]">
              Click any block on the page to edit its fields here.
            </div>
          )
        )}

        {/* ═══ AI Proposal Copilot (Spec 10 - 16) ═══ */}
        {tab === "ai" && (
          <div className="space-y-3">
            <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> AI Proposal Copilot
                </span>
                <span className="text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                  v{proposalMeta.version}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--bos-text-secondary)]">
                Active Section: <strong className="text-[var(--bos-text-primary)]">{activeSection.title}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
                <span>Coverage: {coverage.percent}%</span>
                <span className="text-[var(--bos-success)] font-medium">Fact Protection: Active</span>
              </div>
            </div>

            {/* Section Picker */}
            <div>
              <label className={labelCls}>Proposal Section to Expand / Fill</label>
              <select
                value={activeSection.id}
                onChange={(e) => onSelectSection?.(e.target.value)}
                className={cn(inputCls, "appearance-none cursor-pointer font-medium text-[var(--bos-text-primary)] bg-white shadow-sm")}
              >
                {doc.sections
                  .filter((s) => s.visible && s.id !== "cover" && s.id !== "contents")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.number ? `${s.number} · ` : ""}{s.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Information Sufficiency & Gap Engine (Specs 04, 06 - 09, 38) */}
            {gap && (
              <div className="rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowQuestions((v) => !v)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left bg-[var(--bos-surface)]/50 hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--bos-text-primary)]">
                    <HelpCircle className={cn("w-3.5 h-3.5", gap.isSufficient ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")} />
                    <span>Section Clarifications & Details</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
                    <span>{gap.answeredCount} / {gap.totalQuestions} answered</span>
                    {showQuestions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </div>
                </button>

                {showQuestions && (
                  <div className="p-3 border-t border-[var(--bos-line)] space-y-3 bg-[#faf9f6]/60">
                    <p className="text-[10.5px] text-[var(--bos-text-secondary)] leading-snug">
                      Answer these questions for <strong>{activeSection.title}</strong> to help AI compose a complete, fact-rich 1-page section:
                    </p>

                    {/* Required Questions (Level 1) */}
                    {gap.requiredQuestions.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-warning)] font-semibold flex items-center gap-1">
                          ● Key Business Questions (Required)
                        </div>
                        {gap.requiredQuestions.map((q, idx) => (
                          <div key={q.id} className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--bos-text-primary)] flex items-start gap-1">
                              <span className="text-[10px] text-[var(--bos-accent)] font-semibold">0{idx + 1}.</span>
                              <span>{q.question}</span>
                            </label>
                            <textarea
                              rows={2}
                              value={userAnswers[q.id] ?? q.existingValue ?? ""}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value, q)}
                              placeholder={q.hint}
                              className="w-full p-2 text-[11px] rounded-sm border border-[var(--bos-line-strong)] bg-white placeholder:text-[var(--bos-text-tertiary)] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)] resize-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional Enrichment (Level 2 & 3) */}
                    {gap.optionalQuestions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[var(--bos-line)]/50">
                        <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)] font-semibold">
                          ○ Additional Context & Enrichment (Optional)
                        </div>
                        {gap.optionalQuestions.map((q, idx) => (
                          <div key={q.id} className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--bos-text-secondary)] flex items-start gap-1">
                              <span className="text-[10px] text-[var(--bos-text-tertiary)]">{idx + 1}.</span>
                              <span>{q.question}</span>
                            </label>
                            <input
                              type="text"
                              value={userAnswers[q.id] ?? q.existingValue ?? ""}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value, q)}
                              placeholder={q.hint}
                              className="w-full h-8 px-2 text-[11px] rounded-sm border border-[var(--bos-line)] bg-white placeholder:text-[var(--bos-text-tertiary)] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)]"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleRunAiWithAnswers}
                      disabled={aiState === "streaming"}
                      className="w-full mt-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 transition-colors duration-150 shadow-sm"
                    >
                      {aiState === "streaming" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Generate Complete 1-Page {activeSection.title}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className={labelCls}>What do you want to do?</div>
              <div className="flex flex-wrap gap-1">
                {AI_ACTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onAiInstruction(a.toLowerCase())}
                    className={cn(
                      "px-2 py-1 rounded-sm border text-[10px] transition-colors duration-150",
                      aiInstruction.toLowerCase() === a.toLowerCase()
                        ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                        : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent-ring)] hover:text-[var(--bos-accent)]",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Detail level</label>
              <select value={aiDepth} onChange={(e) => onAiDepth(e.target.value)} className={cn(inputCls, "appearance-none cursor-pointer")}>
                {["Standard", "Detailed", "Comprehensive"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRunAiWithAnswers}
              disabled={aiState === "streaming" || !aiInstruction.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 transition-colors duration-150 shadow-sm"
            >
              {aiState === "streaming" ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Wand2 className="w-3 h-3" aria-hidden="true" />}
              {aiState === "streaming" ? AI_PROCESS_STEPS[Math.min(aiStep, AI_PROCESS_STEPS.length - 1)] : "Generate Improvements"}
            </button>

            {/* AI Before/After Diff & Production Review (Specs 15, 16, 20, 21, 46) */}
            {aiState !== "idle" && (
              <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-surface)]/60 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] font-semibold">
                    {aiState === "streaming" ? <Loader2 className="w-3 h-3 animate-spin text-[var(--bos-accent)]" /> : <Sparkles className="w-3 h-3 text-[var(--bos-success)]" />}
                    {aiState === "streaming"
                      ? aiText
                        ? "Drafting Section Content…"
                        : "Analyzing Requirements & Planning Structure…"
                      : "AI Section Draft Ready"}
                  </span>
                  {aiState === "draft" && (
                    <span className="text-[9px] font-mono text-[var(--bos-success)] font-medium">
                      +{aiAddedWords} words · 0 facts changed
                    </span>
                  )}
                </div>

                {/* Live Reasoning Stream (Qwen3:8B Thinking) */}
                {aiReasoning && (
                  <div className="rounded-sm border border-[var(--bos-line)] bg-[#faf7f2] p-2.5 text-[10.5px] text-[var(--bos-text-secondary)] space-y-1">
                    <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-accent)] font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Requirement Analysis
                      </span>
                      {aiState === "streaming" && !aiText && (
                        <span className="text-[9px] font-sans italic text-[var(--bos-text-tertiary)]">
                          Planning 1-page structure…
                        </span>
                      )}
                    </div>
                    <div className="max-h-28 overflow-y-auto whitespace-pre-wrap leading-tight text-[#6b655c] italic text-[10px]">
                      {aiReasoning}
                    </div>
                  </div>
                )}

                {/* Drafted Proposal Content */}
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)] flex items-center justify-between">
                    <span>Drafted Content (1-Page Target)</span>
                    {aiState === "streaming" && (
                      <span className="text-[var(--bos-accent)] flex items-center gap-1 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)] animate-pulse" />
                        Live streaming
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-[var(--bos-text-primary)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-white p-3 rounded-sm border border-[var(--bos-line-strong)] shadow-inner">
                    {aiText || (
                      <div className="text-[var(--bos-text-tertiary)] italic flex flex-col items-center justify-center py-6 text-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
                        <span>Synthesizing verified requirements into a complete 1-page section…</span>
                        <span className="text-[9.5px]">Qwen3:8B is generating the draft</span>
                      </div>
                    )}
                  </div>
                </div>

                {aiState === "draft" && (
                  <div className="pt-2 border-t border-[var(--bos-line)]/60 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-mono py-1.5 rounded-sm bg-white border border-[var(--bos-line)]">
                      <div>
                        <div className="text-[var(--bos-text-tertiary)]">Current</div>
                        <div className="font-semibold text-[var(--bos-text-primary)]">{currentSectionWords}w</div>
                      </div>
                      <div>
                        <div className="text-[var(--bos-text-tertiary)]">Draft</div>
                        <div className="font-semibold text-[var(--bos-accent)]">{draftWords}w</div>
                      </div>
                      <div>
                        <div className="text-[var(--bos-text-tertiary)]">Blocks</div>
                        <div className="font-semibold text-[var(--bos-success)]">{generatedBlocks.length}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onInsertAi}
                        disabled={isApplyingAi || !aiText.trim()}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {isApplyingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        {isApplyingAi ? "Applying Version…" : "Accept & Apply to Proposal"}
                      </button>
                      <button
                        type="button"
                        onClick={onRejectAi}
                        disabled={isApplyingAi}
                        className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-sm border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] disabled:opacity-50"
                      >
                        <X className="w-3 h-3" /> Keep Current
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-sm border border-[var(--bos-line)] p-2.5 text-[9.5px] text-[var(--bos-text-tertiary)] leading-snug space-y-1">
              <div className="font-semibold text-[var(--bos-text-secondary)] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[var(--bos-success)]" /> Fact Protection Active
              </div>
              <p>
                AI reasoning improves structure and explanations without modifying agreed budgets, dates, or requirement items.
              </p>
            </div>
          </div>
        )}

        {/* ═══ Internal Notes & Comments (Spec 45 & 46) ═══ */}
        {tab === "notes" && (
          <div className="space-y-4">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)] mb-1.5 flex items-center gap-1">
                <StickyNote className="w-3 h-3 text-[var(--bos-accent)]" /> Internal Notes (Admin Only)
              </div>
              <p className="text-[10px] text-[var(--bos-text-tertiary)] mb-2">
                Notes are never visible to the client and never included in generated PDFs.
              </p>
              <div className="space-y-2">
                {(doc.internalNotes || []).map((note) => (
                  <div key={note.id} className="rounded-sm border border-[#e7e2d8] bg-[#faf7f2] p-2.5 text-[11px] text-[#2a2621]">
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-1 text-[8.5px] font-mono text-[#9a948a] flex items-center justify-between">
                      <span>{note.authorName || "Admin"}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {(!doc.internalNotes || doc.internalNotes.length === 0) && (
                  <div className="text-[10.5px] text-[var(--bos-text-tertiary)] italic p-2 border border-dashed border-[var(--bos-line)] rounded-sm">
                    No internal notes yet.
                  </div>
                )}
                <div className="space-y-1.5 pt-1">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add an internal note (e.g. confirm pricing before sending)…"
                    rows={2}
                    className="w-full p-2 text-[11px] rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] resize-none outline-none focus:border-[var(--bos-accent)]"
                  />
                  <button
                    type="button"
                    disabled={!newNote.trim()}
                    onClick={() => {
                      if (onAddNote && newNote.trim()) {
                        onAddNote(newNote.trim());
                        setNewNote("");
                      }
                    }}
                    className="inline-flex items-center gap-1 h-6 px-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[10px] font-medium disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" /> Save Note
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--bos-line)] pt-3">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)] mb-1.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-[var(--bos-info)]" /> Section Comments
              </div>
              <div className="space-y-2">
                {(doc.comments || [])
                  .filter((c) => c.sectionId === activeSection.id)
                  .map((c) => (
                    <div key={c.id} className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] p-2.5 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                        <span>{c.authorName}</span>
                        <span className={cn("px-1.5 py-px rounded-[2px]", c.status === "RESOLVED" ? "text-[var(--bos-success)] bg-[var(--bos-success)]/10" : "text-[var(--bos-warning)] bg-[var(--bos-warning)]/10")}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[var(--bos-text-primary)]">{c.message}</p>
                      {onToggleComment && (
                        <button
                          type="button"
                          onClick={() => onToggleComment(c.id)}
                          className="text-[9px] font-medium text-[var(--bos-accent)] hover:underline mt-1"
                        >
                          {c.status === "OPEN" ? "Mark Resolved" : "Re-open"}
                        </button>
                      )}
                    </div>
                  ))}
                <div className="space-y-1.5 pt-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={`Comment on "${activeSection.title}"…`}
                    rows={2}
                    className="w-full p-2 text-[11px] rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] resize-none outline-none focus:border-[var(--bos-accent)]"
                  />
                  <button
                    type="button"
                    disabled={!newComment.trim()}
                    onClick={() => {
                      if (onAddComment && newComment.trim()) {
                        onAddComment(activeSection.id, newComment.trim());
                        setNewComment("");
                      }
                    }}
                    className="inline-flex items-center gap-1 h-6 px-2.5 rounded-sm border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-primary)] font-medium hover:border-[var(--bos-accent)] disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" /> Post Comment
                  </button>
                </div>
              </div>
            </div>
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
          {readiness.percent} / 100
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
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] font-semibold">{block.type.replace(/_/g, " ")}</div>
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
