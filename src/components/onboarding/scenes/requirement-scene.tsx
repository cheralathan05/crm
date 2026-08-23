"use client";

import { MiniApp, Chip, useSequence, useTypewriter, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const SECTIONS = [
  { label: "Project overview", value: "E-commerce platform" },
  { label: "Business goal", value: "Sell online with managed delivery" },
  { label: "Features", value: "Auth · Payments · Catalog · Checkout" },
  { label: "Technical", value: "Next.js + payment gateway" },
  { label: "Integrations", value: "Razorpay, GitHub, WhatsApp" },
  { label: "Budget", value: "₹6,00,000" },
  { label: "Timeline", value: "12 weeks" },
];

export function RequirementScene() {
  // 0 form start, 1..7 sections typed, 8 submitted
  const step = useSequence(SECTIONS.length + 2, 700);
  const submitted = step >= SECTIONS.length + 1;
  const activeSection = Math.min(step - 1, SECTIONS.length - 1);
  const typed = useTypewriter(
    step >= 1 ? SECTIONS[Math.min(step - 1, SECTIONS.length - 1)].value : "",
    16,
  );

  return (
    <SceneLayout
      code="02"
      label="REQUIREMENTS"
      title="Requirement engine"
      description="Scattered conversations become a structured requirement document — with sections, owners, priorities, comments and attachments."
      capabilities={[
        "Structured sections: goal, features, technical, budget, timeline",
        "Comments and attachments tied to every requirement",
        "A clear lifecycle: draft → submitted → review",
      ]}
      connectsTo="Review"
    >
      <MiniApp
        title="REQUIREMENT WORKSPACE"
        status={submitted ? "SUBMITTED" : "DRAFT"}
        statusTone={submitted ? "green" : "amber"}
      >
        {/* Requirement form assembling itself */}
        <div className="grid grid-cols-2 gap-x-4">
          <div className="space-y-0">
            {SECTIONS.slice(0, 4).map((section, i) => (
              <Reveal key={section.label} show={step > i} delay={0.05}>
                <div className="py-1.5 border-b border-[var(--bos-line)]">
                  <div className="text-[9px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
                    {section.label}
                  </div>
                  <div className="text-[11px] text-[var(--bos-text-primary)] font-medium truncate h-[16px]">
                    {i === activeSection && !submitted ? (
                      <>
                        {typed}
                        <span className="w-[2px] h-[10px] bg-[var(--bos-accent)] inline-block ml-0.5 align-middle animate-pulse" />
                      </>
                    ) : (
                      section.value
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="space-y-0">
            {SECTIONS.slice(4).map((section, i) => (
              <Reveal key={section.label} show={step > i + 4} delay={0.05}>
                <div className="py-1.5 border-b border-[var(--bos-line)]">
                  <div className="text-[9px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
                    {section.label}
                  </div>
                  <div className="text-[11px] text-[var(--bos-text-primary)] font-medium truncate">
                    {section.value}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Submitted pulse */}
        {submitted && (
          <Reveal show delay={0.1}>
            <div className="mt-3 pt-3 border-t border-[var(--bos-line)] flex items-center gap-2 text-[10px] text-[var(--bos-success)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)]" />
              Requirement submitted for review
            </div>
          </Reveal>
        )}

        {/* Client collaboration thread */}
        <Reveal show={step >= 5} delay={0.1}>
          <div className="mt-3 pt-3 border-t border-[var(--bos-line)] space-y-2">
            <div className="text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
              Clarification thread
            </div>
            <div className="text-[11px] text-[var(--bos-text-secondary)]">
              <span className="font-medium text-[var(--bos-text-primary)]">Admin:</span> Please clarify the
              payment gateway requirement.
            </div>
            <Reveal show={step >= 6} delay={0.15}>
              <div className="text-[11px] text-[var(--bos-text-secondary)]">
                <span className="font-medium text-[var(--bos-text-primary)]">Client:</span> Razorpay is
                required.
                <Chip tone="green" className="ml-2">Resolved</Chip>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </MiniApp>
    </SceneLayout>
  );
}
