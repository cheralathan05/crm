"use client";

import { MiniApp, Chip, useSequence, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const REVIEW_ITEMS = [
  { label: "Missing information", state: "checked" },
  { label: "Priorities assigned", state: "checked" },
  { label: "Comments resolved", state: "checked" },
  { label: "Attachments verified", state: "checked" },
  { label: "Timeline feasibility", state: "checked" },
];

export function ReviewScene() {
  // 0 reviewing, 1..5 items checked, 6 decision made (approved)
  const step = useSequence(REVIEW_ITEMS.length + 3, 620);
  const itemsDone = Math.min(step - 1, REVIEW_ITEMS.length);
  const decided = step >= REVIEW_ITEMS.length + 2;
  const deciding = step === REVIEW_ITEMS.length + 1;

  return (
    <SceneLayout
      code="03"
      label="REVIEW"
      title="Review engine"
      description="Work is not stored — it is governed. Requirements pass through a real review before they become a commitment."
      capabilities={[
        "Missing information, priorities, comments and attachments reviewed",
        "Two explicit paths: request changes or approve",
        "Nothing moves forward until it is deliberately approved",
      ]}
      connectsTo="Proposal"
    >
      <MiniApp
        title="REQUIREMENT REVIEW"
        status={decided ? "APPROVED" : deciding ? "DECIDING" : "UNDER REVIEW"}
        statusTone={decided ? "green" : deciding ? "amber" : "blue"}
      >
        {/* Review checklist */}
        <div className="space-y-1.5">
          {REVIEW_ITEMS.map((item, i) => (
            <Reveal key={item.label} show={itemsDone > i} delay={0.05}>
              <div className="flex items-center gap-2.5 py-1.5 border-b border-[var(--bos-line)]">
                <span
                  className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center text-[8px] ${
                    itemsDone > i
                      ? "bg-[var(--bos-success)] border-[var(--bos-success)] text-white"
                      : "border-[var(--bos-border-strong)]"
                  }`}
                >
                  {itemsDone > i && "✓"}
                </span>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">{item.label}</span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Decision zone */}
        <div className="mt-4 pt-3 border-t border-[var(--bos-line)]">
          {decided ? (
            <Reveal show delay={0.05}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium text-[var(--bos-success)]">
                  Approved → ready for proposal
                </div>
                <Chip tone="green">APPROVED</Chip>
              </div>
            </Reveal>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                tabIndex={-1}
                className="h-8 rounded-sm border border-[var(--bos-error)]/30 text-[10px] tracking-[0.12em] uppercase text-[var(--bos-error)] opacity-40"
              >
                Request changes
              </button>
              <button
                tabIndex={-1}
                className={`h-8 rounded-sm border text-[10px] tracking-[0.12em] uppercase transition-colors ${
                  deciding
                    ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white"
                    : "border-[var(--bos-border-strong)] text-[var(--bos-text-secondary)]"
                }`}
              >
                {deciding ? "Approving…" : "Approve"}
              </button>
            </div>
          )}
        </div>
      </MiniApp>
    </SceneLayout>
  );
}
