"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Sun, Moon, Monitor } from "lucide-react";
import {
  navForIndustry,
  projectForWorkType,
  PROJECT_MILESTONES,
} from "@/lib/workspace-config";
import type { WorkspaceConfig } from "@/lib/workspace-config";
import { Chip, Tag } from "../onboarding/kit";
import { cn } from "@/lib/utils";

/* ── Layer container: springs in when its layer activates ── */

function Layer({
  show,
  label,
  children,
}: {
  show: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="border-t border-[var(--bos-line)]"
        >
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
            <Tag>{label}</Tag>
            <motion.span
              className="h-px flex-1 mx-3 bg-gradient-to-r from-[var(--bos-accent)]/50 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              style={{ transformOrigin: "left" }}
            />
          </div>
          <div className="px-3.5 pb-3.5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Workflow map (operating model) ─────────────── */

function WorkflowMap({
  leadSource,
  approvalFlow,
  executionMode,
}: {
  leadSource: string;
  approvalFlow: string;
  executionMode: string;
}) {
  const nodes = [
    { label: leadSource ? leadSource.split(" ")[0].toUpperCase() : "LEAD", active: !!leadSource },
    { label: "REQUIREMENT", active: true },
    { label: "REVIEW", active: true },
    { label: "PROPOSAL", active: true },
    { label: approvalFlow ? approvalFlow.split(" ")[0].toUpperCase() : "APPROVAL", active: !!approvalFlow },
    { label: "PROJECT", active: true },
    { label: executionMode ? executionMode.toUpperCase() : "TASKS", active: !!executionMode },
    { label: "DELIVERY", active: true },
  ];
  return (
    <div className="flex items-center justify-between gap-0.5 overflow-x-auto no-scrollbar">
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center gap-0.5 shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              "px-1.5 py-1 rounded-[2px] text-[7.5px] font-mono tracking-[0.08em] whitespace-nowrap",
              node.active
                ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)]"
                : "text-[var(--bos-text-tertiary)] border border-transparent",
            )}
          >
            {node.label}
          </motion.div>
          {i < nodes.length - 1 && (
            <span className="text-[8px] text-[var(--bos-text-tertiary)]">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Project card (work model) ──────────────────── */

function ProjectCard({ workType, index }: { workType: string; index: number }) {
  // Deterministic per-type progress — visual configuration, not real data.
  const progress = [72, 46, 24, 12, 100][index % 5];
  return (
    <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] p-2.5 min-w-[150px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-medium text-[var(--bos-text-primary)] truncate">
          {projectForWorkType(workType)}
        </span>
        <Chip tone={progress > 60 ? "green" : "accent"} dot={false}>
          {progress}%
        </Chip>
      </div>
      <div className="flex items-end gap-1 h-5">
        {PROJECT_MILESTONES.map((m, i) => (
          <div key={m} className="flex-1 flex flex-col items-center gap-0.5" title={m}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: progress >= (i + 1) * 20 ? "100%" : "0%" }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              className={cn(
                "w-full rounded-[1px]",
                i === 2 ? "bg-[var(--bos-accent)]" : "bg-[var(--bos-border-strong)]",
              )}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[7px] font-mono text-[var(--bos-text-tertiary)]">
        <span>{PROJECT_MILESTONES[0]}</span>
        <span>{PROJECT_MILESTONES[4]}</span>
      </div>
    </div>
  );
}

/* ── The full preview ───────────────────────────── */

export function WorkspacePreview({
  config,
  activeStep,
  ready = false,
}: {
  config: WorkspaceConfig;
  /** 0-5 — the layer currently being configured. */
  activeStep: number;
  ready?: boolean;
}) {
  const displayName = config.companyName.trim() || "YOUR WORKSPACE";
  const dark = config.preferences.theme === "DARK";

  return (
    <div className={cn(dark && "dark")}>
      <motion.div
        layout
        className="w-full border border-[var(--bos-border)] bg-[var(--bos-surface)] rounded-sm shadow-[var(--bos-shadow-md)] overflow-hidden"
      >
        {/* Window chrome */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--bos-border-strong)]" />
            <span className="w-2 h-2 rounded-full bg-[var(--bos-border-strong)]" />
            <span className="w-2 h-2 rounded-full bg-[var(--bos-border-strong)]" />
            <span className="ml-2 text-[8px] tracking-[0.18em] text-[var(--bos-text-tertiary)] uppercase font-mono">
              Workspace preview
            </span>
          </div>
          <Chip tone={ready ? "green" : "amber"}>{ready ? "READY" : "CONFIGURING"}</Chip>
        </div>

        {/* Workspace header — identity enters here */}
        <div className="px-3.5 pt-3.5 pb-3 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/40">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={displayName}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-[17px] font-semibold tracking-tight text-[var(--bos-text-primary)] truncate"
                >
                  {displayName}
                </motion.div>
              </AnimatePresence>
              <div className="text-[8px] tracking-[0.22em] uppercase text-[var(--bos-text-tertiary)] font-mono mt-0.5">
                Business OS
              </div>
            </div>
            {config.business.industry && activeStep >= 1 && (
              <Chip tone="blue" dot={false} className="shrink-0">
                {config.business.industry}
              </Chip>
            )}
          </div>

          {/* Navigation — adapts to the business */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar">
            {navForIndustry(config.business.industry).map((item) => (
              <span
                key={item}
                className={cn(
                  "shrink-0 px-2 py-1 text-[7.5px] font-mono tracking-[0.12em] uppercase rounded-[2px]",
                  item === "REQUIREMENTS"
                    ? "bg-[var(--bos-accent)] text-white"
                    : "text-[var(--bos-text-tertiary)]",
                )}
              >
                {item}
              </span>
            ))}
            <span className="ml-auto shrink-0 flex items-center gap-1.5 text-[7.5px] text-[var(--bos-text-tertiary)]">
              {config.preferences.theme === "DARK" ? (
                <Moon className="w-2.5 h-2.5" />
              ) : config.preferences.theme === "LIGHT" ? (
                <Sun className="w-2.5 h-2.5" />
              ) : (
                <Monitor className="w-2.5 h-2.5" />
              )}
              {config.preferences.theme}
            </span>
          </div>
        </div>

        <div className="max-h-[430px] overflow-y-auto">
          {/* Business layer — services strip */}
          <Layer show={activeStep >= 1} label="BUSINESS">
            <div className="flex flex-wrap gap-1">
              {config.business.services.length > 0 ? (
                config.business.services.map((s) => (
                  <Chip key={s} tone="neutral" dot={false}>
                    {s}
                  </Chip>
                ))
              ) : (
                <span className="text-[9px] text-[var(--bos-text-tertiary)]">
                  Services appear here as you define them
                </span>
              )}
              {config.business.targetCustomers.length > 0 && (
                <span className="text-[9px] text-[var(--bos-text-tertiary)] ml-1">
                  · for {config.business.targetCustomers.slice(0, 2).join(", ")}
                </span>
              )}
            </div>
          </Layer>

          {/* Operations layer — live workflow */}
          <Layer show={activeStep >= 2} label="OPERATIONS">
            <WorkflowMap
              leadSource={config.setup.leadSources[0] ?? ""}
              approvalFlow={config.setup.approvalFlow[0] ?? ""}
              executionMode={config.setup.executionMode}
            />
            {config.setup.leadSources.length > 1 && (
              <div className="text-[8px] text-[var(--bos-text-tertiary)] mt-1.5">
                +{config.setup.leadSources.length - 1} more sources
              </div>
            )}
          </Layer>

          {/* People layer — team */}
          <Layer show={activeStep >= 3} label="TEAM">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {config.setup.roles.length === 0 ? (
                  <span className="text-[9px] text-[var(--bos-text-tertiary)]">
                    Roles appear here
                  </span>
                ) : (
                  config.setup.roles.slice(0, 6).map((role, i) => (
                    <motion.span
                      key={role}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 18 }}
                      className="w-6 h-6 rounded-full border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center text-[8px] font-semibold"
                      title={role}
                    >
                      {role.slice(0, 1)}
                    </motion.span>
                  ))
                )}
              </div>
              <div className="text-right">
                {config.setup.teamSize && (
                  <div className="text-[11px] font-medium text-[var(--bos-text-primary)]">
                    {config.setup.teamSize}
                  </div>
                )}
                <div className="text-[7.5px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
                  {config.setup.roles.length > 0
                    ? `${config.setup.roles.length} roles`
                    : "Team layer"}
                </div>
              </div>
            </div>
          </Layer>

          {/* Work layer — project structures */}
          <Layer show={activeStep >= 4} label="WORK">
            {config.setup.workTypes.length === 0 ? (
              <span className="text-[9px] text-[var(--bos-text-tertiary)]">
                Representative projects appear here
              </span>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {config.setup.workTypes.slice(0, 3).map((workType, i) => (
                  <ProjectCard key={workType} workType={workType} index={i} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-[8px] text-[var(--bos-text-tertiary)]">
              <span>{config.setup.projectDuration || "—"} typical duration</span>
              <span className="opacity-40">·</span>
              <span>{config.setup.clientVolume || "—"} active volume</span>
              {config.setup.currentTools.length > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="truncate">tools: {config.setup.currentTools.join(", ")}</span>
                </>
              )}
            </div>
          </Layer>

          {/* Workspace layer — preferences */}
          <Layer show={activeStep >= 5} label="PREFERENCES">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
              <span className="text-[var(--bos-text-tertiary)]">Landing</span>
              <span className="text-[var(--bos-text-secondary)] text-right">
                {config.preferences.defaultLanding}
              </span>
              <span className="text-[var(--bos-text-tertiary)]">Timezone</span>
              <span className="text-[var(--bos-text-secondary)] text-right">
                {config.preferences.timezone}
              </span>
              <span className="text-[var(--bos-text-tertiary)]">Date format</span>
              <span className="text-[var(--bos-text-secondary)] text-right">
                {config.preferences.dateFormat}
              </span>
              <span className="text-[var(--bos-text-tertiary)]">Notifications</span>
              <span className="text-[var(--bos-text-secondary)] text-right flex justify-end gap-0.5">
                {(
                  [
                    ["tasks", config.notifications.tasks],
                    ["clients", config.notifications.clients],
                    ["projects", config.notifications.projects],
                  ] as const
                )
                  .filter(([, on]) => on)
                  .map(([key]) => (
                    <span key={key} className="inline-flex items-center gap-0.5">
                      <Check className="w-2 h-2 text-[var(--bos-success)]" strokeWidth={3} />
                      {key}
                    </span>
                  ))}
              </span>
            </div>
          </Layer>
        </div>

        {/* Status footer */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-[var(--bos-line)] bg-[var(--bos-bg)]/40">
          <span className="text-[8px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)] font-mono">
            {ready ? "Workspace operational" : "Workspace under construction"}
          </span>
          <span className="flex items-center gap-1.5 text-[8px] text-[var(--bos-text-tertiary)]">
            <span className="w-1 h-1 rounded-full bg-[var(--bos-success)] animate-pulse" />
            live
          </span>
        </div>
      </motion.div>
    </div>
  );
}
