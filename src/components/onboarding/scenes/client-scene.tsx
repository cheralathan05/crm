"use client";

import { MiniApp, Avatar, Chip, Row, useSequence, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const TIMELINE = [
  { label: "Lead created", time: "2d ago" },
  { label: "Contacted", time: "2d ago" },
  { label: "Intro meeting", time: "1d ago" },
  { label: "Requirement submitted", time: "2m ago" },
];

export function ClientScene() {
  const step = useSequence(TIMELINE.length + 2, 650);
  const timelineVisible = step - 1; // timeline events appear one by one

  return (
    <SceneLayout
      code="01"
      label="CLIENTS"
      title="Client intelligence"
      description="Every relationship begins with one connected client record — profile, contacts, activity, and the full history of the engagement."
      capabilities={[
        "Client profile with contacts and relationship status",
        "Requirement, proposal and project links on one record",
        "A timeline of every interaction, automatically kept",
      ]}
      connectsTo="Requirement"
    >
      <MiniApp title="CLIENTS" status="ACTIVE" statusTone="green">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name="ABC Technologies" className="w-9 h-9 text-[11px]" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[var(--bos-text-primary)] truncate">
              ABC Technologies
            </div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">
              Project Owner · since 2d
            </div>
          </div>
          <div className="ml-auto flex gap-1.5">
            <Chip tone="accent">Requirements 03</Chip>
            <Chip tone="blue">Projects 01</Chip>
          </div>
        </div>

        <Row label="Primary contact" value="Arun Technologies" />
        <Row label="Last activity" value="2m ago" />

        {/* Relationship timeline */}
        <div className="mt-3 pt-3 border-t border-[var(--bos-line)]">
          <div className="text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono mb-2">
            Relationship timeline
          </div>
          <div className="relative pl-3.5">
            <div className="absolute left-[3px] top-1 bottom-1 w-px bg-[var(--bos-line-strong)]" />
            {TIMELINE.map((event, i) => (
              <Reveal key={event.label} show={timelineVisible > i} delay={0.1}>
                <div className="relative pb-2">
                  <span
                    className={`absolute -left-3.5 top-[5px] w-[7px] h-[7px] rounded-full ${
                      i === TIMELINE.length - 1 && timelineVisible > i
                        ? "bg-[var(--bos-accent)]"
                        : "bg-[var(--bos-border-strong)]"
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--bos-text-secondary)]">{event.label}</span>
                    <span className="text-[9px] text-[var(--bos-text-tertiary)]">{event.time}</span>
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
