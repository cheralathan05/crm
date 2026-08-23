"use client";

import { MiniApp, Chip, useSequence, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const SCOPE = ["Authentication", "Payments", "Product management", "Checkout"];

const PRICING = [
  { label: "Discovery & design", amount: "₹1,50,000" },
  { label: "Development", amount: "₹3,50,000" },
  { label: "Testing & delivery", amount: "₹1,00,000" },
];

export function ProposalScene() {
  // 0 doc base, 1 scope, 2 timeline, 3-5 pricing rows, 6 generating, 7 pdf ready
  const step = useSequence(9, 650);
  const generating = step === 6;
  const ready = step >= 7;
  const rows = Math.max(0, Math.min(step - 3, PRICING.length));

  return (
    <SceneLayout
      code="04"
      label="PROPOSAL"
      title="Proposal engine"
      description="Approved requirements assemble into a clear, professional proposal — scope, deliverables, timeline and investment."
      capabilities={[
        "A real document: scope, deliverables, pricing and terms",
        "Lifecycle: draft → sent → viewed → approved",
        "A polished PDF clients can view and approve",
      ]}
      connectsTo="Project"
    >
      <MiniApp
        title="PROPOSAL — E-COMMERCE PLATFORM"
        status={ready ? "PDF READY" : generating ? "GENERATING" : "DRAFT"}
        statusTone={ready ? "green" : generating ? "amber" : "neutral"}
      >
        {/* Document header */}
        <div className="border-b border-[var(--bos-line)] pb-2 mb-2">
          <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--bos-accent)] font-mono mb-1">
            Business OS Proposal
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--bos-text-primary)] font-medium">ABC Technologies</span>
            <span className="text-[var(--bos-text-tertiary)]">v1.0</span>
          </div>
        </div>

        {/* Scope */}
        <Reveal show={step >= 1} delay={0.05}>
          <div className="py-1.5">
            <div className="text-[9px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)] mb-1">Scope</div>
            <div className="flex flex-wrap gap-1">
              {SCOPE.map((s, i) => (
                <Reveal key={s} show={step >= 1 + i} delay={0.05}>
                  <span className="px-1.5 py-0.5 rounded-sm bg-[var(--bos-overlay)] text-[10px] text-[var(--bos-text-secondary)]">
                    {s}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Timeline */}
        <Reveal show={step >= 2} delay={0.1}>
          <div className="py-1.5 flex items-center justify-between border-b border-[var(--bos-line)]">
            <span className="text-[9px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">Timeline</span>
            <span className="text-[11px] font-medium text-[var(--bos-text-primary)]">12 weeks</span>
          </div>
        </Reveal>

        {/* Pricing */}
        <div className="py-1">
          {PRICING.slice(0, rows).map((row, i) => (
            <Reveal key={row.label} show={step >= 3 + i} delay={0.05}>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--bos-line)] last:border-0">
                <span className="text-[10px] text-[var(--bos-text-secondary)]">{row.label}</span>
                <span className="text-[11px] font-medium text-[var(--bos-text-primary)] tabular-nums">
                  {row.amount}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Total */}
        <Reveal show={rows === PRICING.length} delay={0.1}>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[10px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">Investment</span>
            <span className="text-[13px] font-semibold text-[var(--bos-text-primary)] tabular-nums">₹6,00,000</span>
          </div>
        </Reveal>

        {/* Generating / ready */}
        {generating && (
          <Reveal show>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--bos-warning)]">
              <span className="w-3 h-3 rounded-full border-2 border-[var(--bos-warning)] border-t-transparent animate-spin" />
              Generating proposal document…
            </div>
          </Reveal>
        )}
        {ready && (
          <Reveal show>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[10px] text-[var(--bos-success)]">Document locked · ready to send</div>
              <Chip tone="green">PDF READY</Chip>
            </div>
          </Reveal>
        )}
      </MiniApp>
    </SceneLayout>
  );
}
