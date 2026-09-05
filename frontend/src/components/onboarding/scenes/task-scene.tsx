"use client";

import { MiniApp, Chip, Row, useSequence, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const MODULES = ["AUTHENTICATION", "PAYMENTS", "PRODUCTS", "CHECKOUT", "ADMIN"];

export function TaskScene() {
  // 0 project, 1-5 modules branch, 6 task card selected
  const step = useSequence(MODULES.length + 3, 560);
  const taskSelected = step >= MODULES.length + 2;
  const modulesShown = Math.min(step - 1, MODULES.length);

  return (
    <SceneLayout
      code="06"
      label="TASK"
      title="Task engine"
      description="Project scope splits into executable work — each task with an owner, priority, deadline and a visible status."
      capabilities={[
        "Project automatically breaks into modules and tasks",
        "Priority, assignee, deadline and estimated effort",
        "A clear lifecycle: backlog → in progress → done",
      ]}
      connectsTo="Employee"
    >
      <MiniApp title="PROJECT — MODULES" status={taskSelected ? "TASK #104" : "BREAKDOWN"} statusTone={taskSelected ? "accent" : "neutral"}>
        {/* Project node */}
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[var(--bos-accent)]" />
          <span className="text-[11px] font-medium text-[var(--bos-text-primary)]">E-Commerce Platform</span>
        </div>

        {/* Branch line */}
        <div className="ml-[3px] w-px h-4 bg-[var(--bos-line-strong)]" />

        {/* Modules */}
        <div className="grid grid-cols-3 gap-1.5 mb-1">
          {MODULES.slice(0, modulesShown).map((module, i) => (
            <Reveal key={module} show={step >= i + 1} delay={0.04}>
              <div
                className={`px-2 py-1.5 rounded-sm border text-[9px] tracking-[0.1em] truncate text-center ${
                  i === 1 && taskSelected
                    ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                    : "border-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                }`}
              >
                {module}
              </div>
            </Reveal>
          ))}
        </div>

        {/* Selected task */}
        {taskSelected && (
          <Reveal show delay={0.1}>
            <div className="mt-2 p-3 rounded-sm border border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[var(--bos-accent)]">TASK #104</span>
                <Chip tone="blue">IN PROGRESS</Chip>
              </div>
              <div className="text-[12px] font-medium text-[var(--bos-text-primary)] mb-2">
                Build Payment API
              </div>
              <Row label="Priority" value={<Chip tone="red" dot={false}>HIGH</Chip>} />
              <Row label="Assignee" value="Backend Developer" />
              <Row label="Deadline" value="12 AUG" />
            </div>
          </Reveal>
        )}
      </MiniApp>
    </SceneLayout>
  );
}
