"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Lock,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────
   CLIENT CLARIFICATION FLOW — the professional question experience.
   Grouped, classified questions with typed answers, progress, context,
   autosave, review and submit. Every answer hits the token endpoint
   and is stored against the exact question. Nothing here is simulated.
──────────────────────────────────────────────────────────────── */

type FlowQuestion = {
  id: string;
  section: string;
  sectionLabel: string;
  category: string | null;
  categoryLabel: string;
  subcategory: string | null;
  featureName: string | null;
  clientQuestion: string;
  currentUnderstanding: string | null;
  whyWeAsk: string | null;
  helpText: string | null;
  answerType: string;
  options: string[];
  priority: string;
  isBlocking: boolean;
  impact: Record<string, string>;
  required: boolean;
  status: string;
  response: string | null;
  answerData: unknown;
  dependsOnQuestionId: string | null;
  dependsOnAnswer: string | null;
};

type FlowBundle = {
  ok: boolean;
  companyName: string;
  projectTitle: string;
  anchorId: string;
  recipientName: string;
  progress: { answered: number; total: number };
  questions: FlowQuestion[];
};

type AnswerDraft = { answer: string; answerData: unknown };

const IMPACT_AREAS: { key: string; label: string }[] = [
  { key: "scope", label: "Scope" },
  { key: "timeline", label: "Timeline" },
  { key: "budget", label: "Budget" },
];

const IMPACT_TONE: Record<string, string> = {
  LOW: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
  MEDIUM: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
  HIGH: "text-[var(--bos-error)] border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6",
  UNKNOWN: "text-[var(--bos-text-tertiary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]",
};

export function ClarificationFlow({ token }: { token: string }) {
  const [bundle, setBundle] = useState<FlowBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"flow" | "review" | "done">("flow");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<{ questionId: string; description: string; detail: string }[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/client/clarifications/${token}`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setLoadError(data.message ?? "Unable to load your questions.");
      return;
    }
    setBundle(data);
    // Seed drafts from stored answers.
    const drafts: Record<string, AnswerDraft> = {};
    for (const q of data.questions as FlowQuestion[]) {
      if (q.response || q.answerData) {
        drafts[q.id] = { answer: q.response ?? "", answerData: q.answerData };
      }
    }
    setAnswers((prev) => ({ ...drafts, ...prev }));
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /* Dependency-aware visible ordering — recomputed live from answers. */
  const visible = useMemo(() => {
    if (!bundle) return [];
    return bundle.questions.filter((q) => {
      if (!q.dependsOnQuestionId) return true;
      const parent = bundle.questions.find((p) => p.id === q.dependsOnQuestionId);
      if (!parent) return true;
      const expected = q.dependsOnAnswer ?? "*";
      const parentAnswer = answers[parent.id]?.answer ?? "";
      return expected === "*" ? Boolean(parentAnswer) : parentAnswer.toLowerCase().includes(expected.toLowerCase());
    });
  }, [bundle, answers]);

  const current = visible[Math.min(index, Math.max(0, visible.length - 1))] ?? null;
  const answeredCount = visible.filter((q) => answers[q.id]?.answer || answers[q.id]?.answerData).length;
  const total = visible.length;

  const setDraft = (q: FlowQuestion, draft: AnswerDraft) => {
    setAnswers((prev) => ({ ...prev, [q.id]: draft }));
    setError(null);
  };

  const save = async (q: FlowQuestion, advance = true) => {
    const draft = answers[q.id];
    if (!draft || (!draft.answer && draft.answerData === undefined)) {
      setError("Please answer this question before continuing.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/clarifications/${token}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          answer: draft.answer,
          answerData: draft.answerData,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Unable to save your answer.");
        return;
      }
      if (advance) setIndex((i) => Math.min(i + 1, visible.length - 1));
      await load();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (q: FlowQuestion, file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("questionId", q.id);
      const res = await fetch(`/api/client/clarifications/${token}/files`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Unable to upload this file.");
        return;
      }
      setAnswers((prev) => ({ ...prev, [q.id]: { answer: data.name ?? file.name, answerData: undefined } }));
      await load();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    setConflicts([]);
    try {
      const res = await fetch(`/api/client/clarifications/${token}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "CONFLICT") {
          setConflicts(data.conflicts ?? []);
          setMode("review");
          return;
        }
        if (data.code === "INCOMPLETE") {
          const first = (data.questions ?? [])[0];
          const idx = visible.findIndex((q) => q.id === first);
          if (idx >= 0) setIndex(idx);
          setMode("flow");
          setError(data.message);
          return;
        }
        setError(data.message ?? "Unable to submit your answers.");
        return;
      }
      setMode("done");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="text-center py-16">
        <p className="text-[13px] text-[var(--bos-text-secondary)]">{loadError}</p>
      </div>
    );
  }
  if (!bundle || !current) {
    return (
      <div className="rounded-sm border border-[var(--bos-line)] p-8 space-y-3" aria-busy="true">
        <div className="h-4 w-48 bg-[var(--bos-overlay)] animate-pulse rounded-sm" />
        <div className="h-3 w-72 bg-[var(--bos-overlay)] animate-pulse rounded-sm" />
        <div className="h-32 w-full bg-[var(--bos-overlay)] animate-pulse rounded-sm" />
      </div>
    );
  }

  if (mode === "done") {
    return (
      <div className="text-center py-10 req-enter">
        <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-success)] text-white">
          <Check className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-[24px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Responses submitted</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-sm mx-auto">
          Thank you. Your clarifications have been sent to the project team. You may close this page.
        </p>
        <div className="mt-8 h-px w-24 mx-auto bg-[var(--bos-line-strong)]" aria-hidden="true" />
        <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
          {bundle.projectTitle}
        </p>
      </div>
    );
  }

  if (mode === "review") {
    return (
      <div className="req-enter space-y-5">
        <header className="text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">
            {bundle.companyName} · Requirement clarification
          </div>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Review your answers</h1>
        </header>

        {conflicts.length > 0 && (
          <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 p-4 space-y-3">
            {conflicts.map((c, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-error)]">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {c.description}
                </div>
                <p className="mt-1 text-[12px] text-[var(--bos-text-secondary)]">{c.detail}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setConflicts([])}
              className="text-[11px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
            >
              Edit the affected answers
            </button>
          </div>
        )}

        <div className="space-y-3">
          {visible.map((q, i) => {
            const draft = answers[q.id];
            const answered = Boolean(draft?.answer || draft?.answerData);
            return (
              <div key={q.id} className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
                      <span>{q.categoryLabel}</span>
                      {q.subcategory && <span>· {q.subcategory}</span>}
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-[var(--bos-text-primary)] leading-snug">{q.clientQuestion}</p>
                    <p className="mt-1 text-[12px] text-[var(--bos-text-secondary)]">
                      {answered ? draft.answer : <span className="text-[var(--bos-text-tertiary)]">Not answered</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setMode("flow");
                    }}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
                  >
                    Edit <ChevronRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 bg-[var(--bos-bg)]/95 backdrop-blur pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMode("flow")}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
              {saving ? "Submitting…" : "Submit answers"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Question flow ── */
  const draft = answers[current.id];

  return (
    <div className="req-enter space-y-5">
      {/* Header + progress */}
      <header className="text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">
          {bundle.companyName} · Requirement clarification
        </div>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight text-[var(--bos-text-primary)]">{bundle.projectTitle}</h1>
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-[var(--bos-text-tertiary)]">
          <span>
            {answeredCount} of {total} answered
          </span>
          <span className="h-3 w-px bg-[var(--bos-line-strong)]" aria-hidden="true" />
          <span>{total === 0 ? 0 : Math.round((answeredCount / total) * 100)}% complete</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-[var(--bos-overlay)] overflow-hidden max-w-sm mx-auto">
          <div
            className="h-full rounded-full bg-[var(--bos-accent)] transition-[width] duration-500"
            style={{ width: `${total === 0 ? 0 : Math.round((answeredCount / total) * 100)}%` }}
          />
        </div>
      </header>

      {/* Breadcrumb + blocking badge */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-line)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)]">
          {current.sectionLabel}
        </span>
        {current.categoryLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--bos-accent)]">
            {current.categoryLabel}
          </span>
        )}
        {current.subcategory && (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-line)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)]">
            {current.subcategory}
          </span>
        )}
        {current.isBlocking && (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/6 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--bos-error)]">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Required before proposal
          </span>
        )}
      </div>

      {/* Current understanding */}
      {current.currentUnderstanding && (
        <section className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-4">
          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-1.5">
            What we currently understand
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--bos-text-secondary)]">{current.currentUnderstanding}</p>
        </section>
      )}

      {/* Question card */}
      <section className="rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface)]/60 p-5">
        <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">
          {current.featureName ? `${current.featureName} · ` : ""}Question
        </div>
        <p className="text-[16px] font-medium leading-relaxed text-[var(--bos-text-primary)]">{current.clientQuestion}</p>
        {current.helpText && <p className="mt-1.5 text-[11px] text-[var(--bos-text-tertiary)]">{current.helpText}</p>}

        <div className="mt-4">
          <AnswerControl
            question={current}
            draft={draft}
            onChange={(d) => setDraft(current, d)}
            onUpload={(file) => void upload(current, file)}
            uploading={uploading}
          />
        </div>
      </section>

      {/* Why we're asking */}
      {current.whyWeAsk && (
        <section className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/30 p-4">
          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-accent)] mb-1">Why we&apos;re asking</div>
          <p className="text-[12px] leading-relaxed text-[var(--bos-text-secondary)]">{current.whyWeAsk}</p>
        </section>
      )}

      {/* Potential impact */}
      {Object.keys(current.impact).length > 0 && (
        <section className="rounded-sm border border-[var(--bos-line)] p-4">
          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Potential impact</div>
          <div className="flex flex-wrap gap-2">
            {IMPACT_AREAS.map((area) => {
              const v = current.impact[area.key];
              if (!v) return null;
              return (
                <span key={area.key} className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] border text-[10px] font-mono uppercase tracking-[0.1em]", IMPACT_TONE[v] ?? IMPACT_TONE.UNKNOWN)}>
                  {area.label} · {v}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
          {error}
        </div>
      )}

      {/* Sticky bottom nav */}
      <div className="sticky bottom-0 bg-[var(--bos-bg)]/95 backdrop-blur pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (index === 0) {
                setMode("review");
              } else {
                setIndex((i) => Math.max(0, i - 1));
              }
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-[var(--bos-line)] text-[12px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {index === 0 ? "Review" : "Back"}
          </button>

          {index < visible.length - 1 ? (
            <button
              type="button"
              onClick={() => void save(current, true)}
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />}
              {saving ? "Saving…" : "Save & continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (current && (draft?.answer || draft?.answerData)) {
                  void save(current, false).then(() => setMode("review"));
                } else {
                  setMode("review");
                }
              }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] text-[12px] font-medium hover:bg-[var(--bos-accent-subtle)]/60 transition-colors duration-150"
            >
              Review answers <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Typed answer controls ───────────────────────────────────── */

function AnswerControl({
  question,
  draft,
  onChange,
  onUpload,
  uploading,
}: {
  question: FlowQuestion;
  draft?: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const value = draft?.answer ?? "";
  const multi = Array.isArray(draft?.answerData) ? (draft?.answerData as string[]) : value ? [value] : [];
  const inputCls =
    "w-full h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[14px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";

  switch (question.answerType) {
    case "SINGLE_SELECT":
    case "DROPDOWN":
      return (
        <div className={cn("space-y-1.5", question.answerType === "DROPDOWN" && "max-w-xs")}>
          {question.answerType === "DROPDOWN" ? (
            <select
              value={value}
              onChange={(e) => onChange({ answer: e.target.value, answerData: e.target.value })}
              className={inputCls}
            >
              <option value="">Choose…</option>
              {question.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            question.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onChange({ answer: o, answerData: o })}
                className={cn(
                  "w-full text-left rounded-sm border px-3.5 py-2.5 text-[13px] transition-colors duration-150",
                  value === o
                    ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                    : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                {o}
              </button>
            ))
          )}
        </div>
      );
    case "MULTI_SELECT":
      return (
        <div className="space-y-1.5">
          {question.options.map((o) => {
            const active = multi.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  const next = active ? multi.filter((x) => x !== o) : [...multi, o];
                  onChange({ answer: next.join(", "), answerData: next });
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 text-left rounded-sm border px-3.5 py-2.5 text-[13px] transition-colors duration-150",
                  active
                    ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                    : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                <span className={cn("flex items-center justify-center w-4 h-4 rounded-sm border shrink-0", active ? "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white" : "border-[var(--bos-border-strong)]")}>
                  {active && <Check className="w-3 h-3" aria-hidden="true" />}
                </span>
                {o}
              </button>
            );
          })}
        </div>
      );
    case "YES_NO":
      return (
        <div className="flex gap-2">
          {["Yes", "No"].map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange({ answer: o, answerData: o })}
              className={cn(
                "flex-1 rounded-sm border px-3.5 py-2.5 text-[13px] font-medium transition-colors duration-150",
                value === o
                  ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                  : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      );
    case "RATING":
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ answer: String(n), answerData: String(n) })}
              className={cn(
                "w-9 h-9 rounded-sm border text-[12px] font-medium transition-colors duration-150",
                value === String(n)
                  ? "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white"
                  : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    case "FILE_UPLOAD":
      return (
        <div>
          <label
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed px-4 py-6 text-center cursor-pointer transition-colors duration-150",
              value ? "border-[var(--bos-success)]/40 bg-[var(--bos-success)]/5" : "border-[var(--bos-line-strong)] hover:border-[var(--bos-accent)]",
            )}
          >
            <FileUp className={cn("w-5 h-5", value ? "text-[var(--bos-success)]" : "text-[var(--bos-text-tertiary)]")} aria-hidden="true" />
            <span className="text-[12px] text-[var(--bos-text-secondary)]">
              {uploading ? "Uploading…" : value ? value : "Upload a file"}
            </span>
            <span className="text-[10px] text-[var(--bos-text-tertiary)]">PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP, TXT, CSV · up to 15 MB</span>
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
          </label>
          {value && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--bos-success)]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> File received
            </p>
          )}
        </div>
      );
    case "DATE_RANGE":
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            type="date"
            value={Array.isArray(draft?.answerData) ? String(draft?.answerData[0] ?? "") : ""}
            onChange={(e) => {
              const from = e.target.value;
              const to = Array.isArray(draft?.answerData) ? String(draft?.answerData[1] ?? "") : "";
              onChange({ answer: `${from} → ${to}`.replace(" → ", from && to ? " → " : ""), answerData: [from, to] });
            }}
            className={inputCls}
          />
          <input
            type="date"
            value={Array.isArray(draft?.answerData) ? String(draft?.answerData[1] ?? "") : ""}
            onChange={(e) => {
              const from = Array.isArray(draft?.answerData) ? String(draft?.answerData[0] ?? "") : "";
              const to = e.target.value;
              onChange({ answer: [from, to].filter(Boolean).join(" → "), answerData: [from, to] });
            }}
            className={inputCls}
          />
        </div>
      );
    case "TEXT":
    case "LONG_TEXT":
    case "CUSTOM":
    case "TABLE":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange({ answer: e.target.value, answerData: e.target.value })}
          rows={question.answerType === "TEXT" ? 3 : 6}
          placeholder="Write your answer here…"
          className={cn(inputCls, "h-auto py-2.5 leading-relaxed resize-none")}
        />
      );
    default: {
      const inputType =
        question.answerType === "NUMBER" ? "number"
        : question.answerType === "CURRENCY" ? "number"
        : question.answerType === "DATE" ? "date"
        : question.answerType === "EMAIL" ? "email"
        : question.answerType === "URL" ? "url"
        : question.answerType === "PHONE" ? "tel"
        : "text";
      return (
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange({ answer: e.target.value, answerData: e.target.value })}
          placeholder={question.answerType === "CURRENCY" ? "e.g. 250000" : question.answerType === "EMAIL" ? "name@company.com" : question.answerType === "URL" ? "https://…" : question.answerType === "PHONE" ? "+91…" : ""}
          className={inputCls}
        />
      );
    }
  }
}
