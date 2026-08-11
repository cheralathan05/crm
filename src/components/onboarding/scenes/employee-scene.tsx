"use client";

import { MiniApp, Chip, Bar, Avatar, useSequence, Reveal, FlowArrow } from "../kit";
import { SceneLayout } from "../scene-layout";

export function EmployeeScene() {
  // 0 admin assigns, 1 employee receives, 2 work card, 3 blocked thread, 4 resolved
  const step = useSequence(5, 900);

  return (
    <SceneLayout
      code="07"
      label="EMPLOYEE"
      title="Employee workspace"
      description="Work travels from the admin system into a personal workspace — everyone sees exactly the work that belongs to them."
      capabilities={[
        "A personal work queue: tasks, deadlines and progress",
        "Accept tasks and move them through their lifecycle",
        "Collaboration threads that unblock work in real time",
      ]}
      connectsTo="GitHub"
    >
      <MiniApp title="EMPLOYEE WORKSPACE" status={step >= 1 ? "TASK RECEIVED" : "ASSIGNING"} statusTone={step >= 1 ? "green" : "amber"}>
        {/* Admin → employee handoff */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar name="Admin" />
            <span className="text-[10px] text-[var(--bos-text-secondary)]">Admin</span>
          </div>
          <FlowArrow label="Assigns" delay={0.1} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--bos-text-secondary)]">Backend Dev</span>
            <Avatar name="Backend Dev" />
          </div>
        </div>

        {/* Work card */}
        <Reveal show={step >= 2} delay={0.05}>
          <div className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[var(--bos-text-primary)]">Build Payment API</span>
              <Chip tone="red" dot={false}>HIGH</Chip>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--bos-text-secondary)] mb-2">
              <span>Due tomorrow</span>
              <span className="tabular-nums">62%</span>
            </div>
            <Bar value={62} />
            <div className="flex items-center gap-3 mt-2 text-[9px] text-[var(--bos-text-tertiary)] uppercase tracking-wider">
              <span>Comments 4</span>
              <span>Files 2</span>
              <span className="ml-auto text-[var(--bos-text-secondary)] normal-case tracking-normal">TASK #104</span>
            </div>
          </div>
        </Reveal>

        {/* Collaboration thread */}
        <Reveal show={step >= 3} delay={0.1}>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar name="Backend Dev" className="w-5 h-5 text-[8px]" />
              <span className="text-[10px] text-[var(--bos-text-secondary)]">
                “Payment API is blocked by gateway credentials.”
              </span>
              {step >= 4 ? (
                <Chip tone="green">RESOLVED</Chip>
              ) : (
                <Chip tone="red">BLOCKED</Chip>
              )}
            </div>
            <Reveal show={step >= 4} delay={0.1}>
              <div className="flex items-center gap-2">
                <Avatar name="Admin" className="w-5 h-5 text-[8px]" />
                <span className="text-[10px] text-[var(--bos-text-secondary)]">“Credentials added — resume.”</span>
                <Chip tone="blue">IN PROGRESS</Chip>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </MiniApp>
    </SceneLayout>
  );
}
