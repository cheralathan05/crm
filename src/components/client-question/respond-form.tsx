"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   CLIENT RESPONSE — SECURE QUESTION PAGE
   The client reads the exact question asked and submits their answer.
   Nothing here is simulated: the POST hits the token endpoint, which
   validates the token server-side and stores the response against the
   exact question before this success state is shown.
──────────────────────────────────────────────────────────────── */

export function QuestionRespondForm({
  token,
  companyName,
  projectTitle,
  sectionLabel,
  question,
  index,
  total,
}: {
  token: string;
  companyName: string;
  projectTitle: string;
  sectionLabel: string;
  question: string;
  index: number;
  total: number;
}) {
  const [response, setResponse] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!response.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/questions/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: response.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Unable to submit your response. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-10 req-enter">
        <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-success)] text-white">
          <Check className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-[24px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
          Response received
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-sm mx-auto">
          Thank you. Your clarification has been sent to the project team. You may close this page.
        </p>
        <div className="mt-8 h-px w-24 mx-auto bg-[var(--bos-line-strong)]" aria-hidden="true" />
        <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
          {projectTitle} · {sectionLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="req-enter">
      {/* Header */}
      <header className="text-center mb-7">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">
          {companyName} · Requirement clarification
        </div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
          {projectTitle}
        </h1>
        <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-[var(--bos-text-tertiary)]">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-line)] px-2 py-0.5">
            Section · {sectionLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--bos-line)] px-2 py-0.5">
            Question {Math.max(1, index)} of {Math.max(1, total)}
          </span>
        </div>
      </header>

      {/* Question */}
      <section className="rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface)]/60 p-5">
        <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">
          Question
        </div>
        <p className="text-[15px] leading-relaxed text-[var(--bos-text-primary)]">{question}</p>
      </section>

      {/* Response */}
      <section className="mt-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-5">
        <label htmlFor="response" className="bos-label">
          Your response
        </label>
        <textarea
          id="response"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={6}
          placeholder="Write your answer here…"
          className="mt-1.5 w-full px-3 py-2.5 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[14px] leading-relaxed text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150 resize-none"
        />
        <div className="mt-3">
          <label htmlFor="responder-name" className="bos-label">
            Your name <span className="text-[var(--bos-text-tertiary)]">(optional)</span>
          </label>
          <input
            id="responder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vijiii"
            className="mt-1.5 w-full h-10 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[14px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[12px] text-[var(--bos-error)]">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !response.trim()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
            {busy ? "Submitting…" : "Submit Response"}
          </button>
        </div>
      </section>

      <p className="mt-5 text-center text-[10px] text-[var(--bos-text-tertiary)]">
        Your response goes directly to the {companyName} project team.
      </p>
    </div>
  );
}
