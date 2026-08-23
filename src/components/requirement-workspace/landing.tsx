"use client";

import { ArrowRight, CheckCircle2, Clock, FileText, Layers, ShieldCheck } from "lucide-react";
import { getSection, SECTIONS } from "@/lib/requirement-config";
import { Progress } from "@/components/clients/kit";
import type { PublicBundle } from "./types";

/* ────────────────────────────────────────────────────────────────
   LANDING — PROJECT DISCOVERY
   Not a form: a project introduction. Left side explains the process;
   right side is a visual project summary. Returns with a resume state
   that continues where the client left off.
──────────────────────────────────────────────────────────────── */

export function Landing({
  bundle,
  onBegin,
  onResume,
}: {
  bundle: PublicBundle;
  onBegin: () => void;
  onResume: () => void;
}) {
  const { request } = bundle;
  const hasProgress = request.completeness > 0;
  const lastSection = getSection(request.currentSection);
  const totalSections = SECTIONS.length;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-12 sm:py-16">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left — narrative */}
        <div className="lg:col-span-7">
          <div className="section-number">PROJECT DISCOVERY</div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--bos-text-primary)] leading-[1.15]">
            Let&apos;s understand
            <br />
            what you&apos;re building.
          </h1>
          <p className="mt-5 max-w-lg text-[14px] leading-relaxed text-[var(--bos-text-secondary)]">
            We&apos;ll guide you through a few focused steps to understand your business,
            users, goals and project requirements. Nothing here is a contract — it&apos;s
            the context we need to build the right thing, the first time.
          </p>

          <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-lg">
            <div className="rounded-sm border border-[var(--bos-line-strong)] p-3.5">
              <Clock className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
              <div className="mt-2 text-[12px] font-medium text-[var(--bos-text-primary)]">10–15 minutes</div>
              <div className="text-[11px] text-[var(--bos-text-tertiary)]">Estimated time</div>
            </div>
            <div className="rounded-sm border border-[var(--bos-line-strong)] p-3.5">
              <Layers className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
              <div className="mt-2 text-[12px] font-medium text-[var(--bos-text-primary)]">{totalSections} focused steps</div>
              <div className="text-[11px] text-[var(--bos-text-tertiary)]">One idea per screen</div>
            </div>
            <div className="rounded-sm border border-[var(--bos-line-strong)] p-3.5">
              <ShieldCheck className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
              <div className="mt-2 text-[12px] font-medium text-[var(--bos-text-primary)]">Private & secure</div>
              <div className="text-[11px] text-[var(--bos-text-tertiary)]">Only your team sees this</div>
            </div>
          </div>

          {hasProgress ? (
            <div className="mt-9 max-w-lg rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bos-accent)]">Welcome back</span>
              </div>
              <h2 className="mt-2 text-[16px] font-semibold text-[var(--bos-text-primary)]">
                You were working on {lastSection?.label ?? "your project"}
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={request.completeness} className="flex-1" />
                <span className="text-[12px] font-medium tabular-nums text-[var(--bos-text-secondary)]">{request.completeness}%</span>
              </div>
              <button
                type="button"
                onClick={onResume}
                className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
              >
                Continue where I left off <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onBegin}
              className="mt-9 inline-flex items-center gap-2 h-12 px-6 rounded-sm bg-[var(--bos-accent)] text-white text-[14px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
            >
              Start Project Discovery <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          <p className="mt-4 text-[11px] text-[var(--bos-text-tertiary)]">
            You can save your progress and continue later — your answers are saved automatically.
          </p>
        </div>

        {/* Right — project summary panel */}
        <div className="lg:col-span-5">
          <div className="rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)]/70">
            <div className="px-5 py-4 border-b border-[var(--bos-line)]">
              <div className="section-number">Project</div>
              <div className="mt-1 text-[18px] font-semibold text-[var(--bos-text-primary)]">{request.title}</div>
            </div>
            <dl className="divide-y divide-[var(--bos-line)]">
              <SummaryRow label="Client" value={request.companyName} />
              <SummaryRow
                label="Status"
                value={hasProgress ? `${request.completeness}% complete` : "Not started"}
                accent={hasProgress}
              />
              <SummaryRow label="Estimated time" value="10–15 minutes" />
              <SummaryRow label="Steps" value={`${totalSections} sections`} />
              <SummaryRow label="Reference" value={request.reference} mono />
            </dl>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Progress</span>
                <span className="text-[11px] tabular-nums text-[var(--bos-text-secondary)]">{request.completeness}%</span>
              </div>
              <Progress value={request.completeness} />
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
                <FileText className="w-3 h-3" aria-hidden="true" />
                Everything you enter is saved automatically and securely.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <dt className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">{label}</dt>
      <dd className={mono ? "font-mono text-[12px] text-[var(--bos-text-secondary)]" : accent ? "text-[12px] font-medium text-[var(--bos-accent)]" : "text-[12px] font-medium text-[var(--bos-text-primary)]"}>
        {value}
      </dd>
    </div>
  );
}
