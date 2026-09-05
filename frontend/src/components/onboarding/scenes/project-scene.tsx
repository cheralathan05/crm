"use client";

import { MiniApp, Chip, Bar, useSequence, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const MILESTONES = [
  { label: "DISCOVERY", progress: 100 },
  { label: "DESIGN", progress: 100 },
  { label: "DEVELOPMENT", progress: 62 },
  { label: "TESTING", progress: 0 },
  { label: "DELIVERY", progress: 0 },
];

export function ProjectScene() {
  // 0 header, 1-5 milestones appear, 6 development progress animates
  const step = useSequence(MILESTONES.length + 3, 620);
  const developmentGrowing = step >= MILESTONES.length + 2;

  return (
    <SceneLayout
      code="05"
      label="PROJECT"
      title="Project engine"
      description="Approved work becomes an organized delivery plan — milestones, owners, budgets and a living progress view."
      capabilities={[
        "Milestones: discovery → design → development → testing → delivery",
        "Budget, deadline and owner on every stage",
        "Progress that updates as work is delivered",
      ]}
      connectsTo="Task"
    >
      <MiniApp title="PROJECT — E-COMMERCE PLATFORM" status="IN PROGRESS" statusTone="blue">
        {/* Project header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-semibold text-[var(--bos-text-primary)]">E-Commerce Platform</div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">ABC Technologies · starts 12 AUG</div>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-semibold text-[var(--bos-text-primary)] tabular-nums">62%</div>
            <div className="text-[9px] text-[var(--bos-text-tertiary)] uppercase tracking-wider">overall</div>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-2.5">
          {MILESTONES.map((milestone, i) => {
            const shown = step >= i + 1;
            const value = developmentGrowing && i === 2 ? 62 : milestone.progress;
            return (
              <Reveal key={milestone.label} show={shown} delay={0.05}>
                <div className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[9px] tracking-[0.14em] uppercase text-[var(--bos-text-secondary)]">
                    {milestone.label}
                  </span>
                  <Bar value={value} tone={value >= 100 ? "green" : "accent"} className="flex-1" />
                  <span className="w-9 text-right text-[10px] tabular-nums text-[var(--bos-text-secondary)]">
                    {value}%
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Activity line */}
        <Reveal show={step >= MILESTONES.length + 1} delay={0.1}>
          <div className="mt-3 pt-3 border-t border-[var(--bos-line)] flex items-center gap-2 text-[10px] text-[var(--bos-text-secondary)]">
            <Chip tone="accent">Task created</Chip>
            <Chip tone="blue">Commit linked</Chip>
            <span className="ml-auto text-[9px] text-[var(--bos-text-tertiary)]">updated 2m ago</span>
          </div>
        </Reveal>
      </MiniApp>
    </SceneLayout>
  );
}
