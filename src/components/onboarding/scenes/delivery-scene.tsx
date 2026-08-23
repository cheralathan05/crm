"use client";

import { MiniApp, Chip, useSequence, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const STAGES = ["CLIENT", "REQUIREMENT", "REVIEW", "PROPOSAL", "PROJECT", "TASK", "EMPLOYEE", "GITHUB"];

const TIMELINE = [
  { time: "10:42", event: "Requirement submitted" },
  { time: "11:10", event: "Requirement approved" },
  { time: "11:22", event: "Proposal sent" },
  { time: "11:48", event: "Proposal approved" },
  { time: "12:05", event: "Project created" },
  { time: "12:08", event: "Task assigned" },
  { time: "14:31", event: "Pull request merged" },
  { time: "16:00", event: "Delivered to client" },
];

export function DeliveryScene() {
  // 0-7 stages converge, 8 timeline begins, +events
  const step = useSequence(STAGES.length + TIMELINE.length + 2, 560);
  const stagesShown = Math.min(step, STAGES.length);
  const eventsShown = Math.max(0, Math.min(step - STAGES.length - 1, TIMELINE.length));

  return (
    <SceneLayout
      code="09"
      label="DELIVERY"
      title="Delivery"
      description="Every stage converges here. The whole engagement — from first conversation to final delivery — lives on one timeline."
      capabilities={[
        "One unified timeline for the entire client relationship",
        "Everything connected: clients, work, employees, code",
        "Delivery is the state every system point feeds into",
      ]}
      connectsTo="Your workspace"
    >
      <MiniApp title="DELIVERY" status="DELIVERED" statusTone="green">
        {/* All stages converging */}
        <div className="flex items-center justify-center gap-1 flex-wrap mb-3">
          {STAGES.slice(0, stagesShown).map((stage, i) => (
            <Reveal key={stage} show={step > i} delay={0.03}>
              <span className="flex items-center gap-1">
                {i > 0 && <span className="text-[9px] text-[var(--bos-text-tertiary)] opacity-40">→</span>}
                <span className="px-1.5 py-0.5 text-[8px] tracking-[0.1em] font-mono rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                  {stage}
                </span>
              </span>
            </Reveal>
          ))}
        </div>

        {/* Unified timeline */}
        <div className="pt-2 border-t border-[var(--bos-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
              Unified engagement timeline
            </span>
            <Chip tone="green">DELIVERED</Chip>
          </div>
          <div className="relative pl-3.5 max-h-[150px] overflow-hidden">
            <div className="absolute left-[3px] top-1 bottom-1 w-px bg-[var(--bos-line-strong)]" />
            {TIMELINE.slice(0, eventsShown).map((event, i) => (
              <Reveal key={event.event} show={eventsShown > i} delay={0.03}>
                <div className="relative pb-1.5">
                  <span className="absolute -left-3.5 top-[6px] w-[7px] h-[7px] rounded-full bg-[var(--bos-accent)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--bos-text-secondary)]">{event.event}</span>
                    <span className="text-[9px] text-[var(--bos-text-tertiary)] font-mono">{event.time}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </MiniApp>
    </SceneLayout>
  );
}
