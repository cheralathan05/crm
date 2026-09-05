"use client";

import { Check, Pencil, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS, computeReadiness, type CompletionContext } from "@/lib/requirement-config";
import type { PublicBundle, PublicFeature } from "./types";

/* ────────────────────────────────────────────────────────────────
   PROJECT SUMMARY — REVIEW
   A real summary of everything collected, section by section, each
   with its completion state and an Edit shortcut. The readiness bar
   is computed from actual data.
──────────────────────────────────────────────────────────────── */

export function ReviewScreen({
  bundle,
  onEdit,
}: {
  bundle: PublicBundle;
  onEdit: (section: string) => void;
}) {
  const { request, answers, features, attachments, states } = bundle;

  const ctx: CompletionContext = {
    featureCount: features.length,
    mustHaveCount: features.filter((f) => f.priority === "MUST_HAVE").length,
    attachmentCount: attachments.length,
  };
  const readiness = computeReadiness(answers, ctx);
  const data = (k: string) => (answers[k] ?? {}) as Record<string, unknown>;

  const mustHave = features.filter((f) => f.priority === "MUST_HAVE").length;
  const shouldHave = features.filter((f) => f.priority === "SHOULD_HAVE").length;
  const niceToHave = features.filter((f) => f.priority === "NICE_TO_HAVE").length;

  const users = (data("users").users as { name?: string }[] | undefined) ?? [];
  const stakeholders = (data("stakeholders").stakeholders as { name?: string }[] | undefined) ?? [];
  const design = data("design");
  const tech = data("technology");
  const timeline = data("timeline");
  const commercial = data("commercial");

  const summaryRows: { key: string; label: string; value: React.ReactNode; complete: boolean }[] = [
    {
      key: "business",
      label: "Business",
      value: data("business").description ? String(data("business").description).slice(0, 140) + "…" : "—",
      complete: states.business,
    },
    {
      key: "vision",
      label: "Project goal",
      value: Array.isArray(data("vision").goals) ? (data("vision").goals as string[]).join(" · ") : "—",
      complete: states.vision,
    },
    {
      key: "users",
      label: "Users",
      value: users.length > 0 ? <span className="inline-flex items-center gap-1.5">{users.map((u) => u.name).filter(Boolean).join(", ")}</span> : "—",
      complete: states.users,
    },
    {
      key: "features",
      label: "Features",
      value:
        features.length > 0 ? (
          <span>
            {features.length} selected · <span className="text-[var(--bos-accent)]">{mustHave} must have</span> · {shouldHave} should · {niceToHave} nice to have
          </span>
        ) : "—",
      complete: states.features,
    },
    {
      key: "design",
      label: "Design",
      value: design.style ? `${String(design.style)}${design.darkMode ? ` · dark mode: ${String(design.darkMode)}` : ""}` : "—",
      complete: states.design,
    },
    {
      key: "technology",
      label: "Technology",
      value: tech.preference ? (tech.preference === "Yes" ? "Existing preferences shared" : "Recommendation requested") : "—",
      complete: states.technology,
    },
    {
      key: "timeline",
      label: "Timeline",
      value: timeline.launchWindow ? String(timeline.launchWindow) : "—",
      complete: states.timeline,
    },
    {
      key: "commercial",
      label: "Budget",
      value: commercial.budgetModel ? `${String(commercial.budgetModel)}${commercial.budgetRange ? ` · ${String(commercial.budgetRange)}` : ""}` : "—",
      complete: states.commercial,
    },
    {
      key: "stakeholders",
      label: "Stakeholders",
      value: stakeholders.length > 0 ? stakeholders.map((s) => s.name).filter(Boolean).join(", ") : "—",
      complete: states.stakeholders,
    },
    {
      key: "files",
      label: "Files",
      value: attachments.length > 0 ? `${attachments.length} file${attachments.length === 1 ? "" : "s"} uploaded` : "—",
      complete: states.files,
    },
  ];

  const completeCount = Object.values(states).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="section-number">YOUR PROJECT</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">{request.title}</h2>
        <p className="mt-1.5 text-[13px] text-[var(--bos-text-secondary)]">
          {request.companyName} · {request.reference} · {completeCount} of {SECTIONS.length} sections complete
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Summary */}
        <div className="lg:col-span-7 space-y-2">
          {summaryRows.map((row) => (
            <div key={row.key} className="flex items-center gap-3 rounded-sm border border-[var(--bos-line-strong)] px-4 py-3">
              <span
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
                  row.complete ? "bg-[var(--bos-success)] text-white" : "border border-[var(--bos-border-strong)] text-[var(--bos-text-tertiary)]",
                )}
                aria-hidden="true"
              >
                {row.complete ? <Check className="w-3 h-3" /> : <Users className="w-3 h-3 opacity-0" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">{row.label}</div>
                <div className="text-[13px] text-[var(--bos-text-primary)] truncate">{row.value}</div>
              </div>
              <button
                type="button"
                onClick={() => onEdit(row.key)}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)] shrink-0 transition-colors duration-150"
              >
                <Pencil className="w-3 h-3" aria-hidden="true" /> Edit
              </button>
            </div>
          ))}
        </div>

        {/* Readiness */}
        <div className="lg:col-span-5">
          <div className="rounded-sm border border-[var(--bos-line-strong)] p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="section-number">PROJECT READINESS</div>
                <div className="mt-1 text-[32px] font-semibold tabular-nums text-[var(--bos-text-primary)]">{readiness.total}%</div>
              </div>
              <div className="text-[11px] text-[var(--bos-text-tertiary)] text-right">
                Based on the information
                <br />
                you&apos;ve provided so far
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {readiness.sections.map((s) => (
                <div key={s.key} className="flex items-center gap-2.5">
                  <span className="w-20 shrink-0 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-secondary)]">{s.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-500", s.complete ? "bg-[var(--bos-success)]" : "bg-[var(--bos-warning)]")}
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                  <span className={cn("w-8 text-right text-[10px] tabular-nums", s.complete ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>
                    {s.value}%
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--bos-line)]">
              <p className="text-[11px] text-[var(--bos-text-tertiary)] leading-relaxed">
                {readiness.total >= 80
                  ? "This looks ready to submit — we have a strong picture of the project."
                  : "A few sections still need attention. You can submit anyway and answer follow-up questions, or complete the remaining sections first."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { PublicFeature };
