"use client";

import { motion } from "framer-motion";
import { ArrowRight, Users, Workflow, FolderKanban, SlidersHorizontal } from "lucide-react";
import {
  navForIndustry,
  projectForWorkType,
  PROJECT_MILESTONES,
} from "@/lib/workspace-config";
import type { WorkspaceConfig } from "@/lib/workspace-config";
import { Chip, Tag } from "../onboarding/kit";
import { cn } from "@/lib/utils";

/* ── Workflow map (from the operating model) ─────────── */

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
    <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              "px-2 py-1 rounded-[2px] text-[8px] font-mono tracking-[0.1em] whitespace-nowrap",
              node.active
                ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)]"
                : "text-[var(--bos-text-tertiary)]",
            )}
          >
            {node.label}
          </span>
          {i < nodes.length - 1 && <span className="text-[8px] text-[var(--bos-text-tertiary)]">→</span>}
        </div>
      ))}
    </div>
  );
}

/* ── Project card (from the work model) ─────────────── */

function ProjectCard({ workType, index }: { workType: string; index: number }) {
  const progress = [72, 46, 24, 12, 100][index % 5];
  return (
    <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] p-3 min-w-[170px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-[var(--bos-text-primary)] truncate">
          {projectForWorkType(workType)}
        </span>
        <Chip tone="neutral" dot={false}>{workType.split(" ")[0]}</Chip>
      </div>
      <div className="flex items-end gap-1 h-6">
        {PROJECT_MILESTONES.map((m, i) => (
          <div key={m} className="flex-1 flex flex-col items-center gap-0.5" title={m}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: progress >= (i + 1) * 20 ? "100%" : "0%" }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
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

/* ── Section shell ──────────────────────────────────── */

function Section({
  icon,
  title,
  meta,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]/60"
    >
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--bos-line)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--bos-accent)]">{icon}</span>
          <span className="text-[10px] font-mono tracking-[0.16em] uppercase text-[var(--bos-text-secondary)]">
            {title}
          </span>
        </div>
        {meta && (
          <span className="text-[8px] font-mono tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
            {meta}
          </span>
        )}
      </header>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}

/* ── The overview ───────────────────────────────────── */

export function DashboardOverview({ config }: { config: WorkspaceConfig }) {
  const displayName = config.companyName.trim() || "Your workspace";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const modules = [
    { label: "Clients", value: "—", hint: "coming" },
    { label: "Projects", value: "—", hint: "coming" },
    { label: "Tasks", value: "—", hint: "coming" },
    { label: "Deliveries", value: "—", hint: "coming" },
  ];

  return (
    <div className="px-5 sm:px-8 py-6 space-y-5">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="w-11 h-11 rounded-full bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent-ring)] flex items-center justify-center text-[13px] font-semibold text-[var(--bos-accent)]">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
              {displayName}
            </h1>
            {config.business.industry && (
              <Chip tone="blue" dot={false}>{config.business.industry}</Chip>
            )}
            <Chip tone="green">Operational</Chip>
          </div>
          <div className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
            {config.business.services.length > 0
              ? config.business.services.join(" · ")
              : "Your workspace is configured and ready."}
          </div>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 text-[9px] font-mono tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)] animate-pulse" />
          System online
        </div>
      </motion.div>

      {/* Module tiles */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {modules.map((m) => (
          <div key={m.label} className="rounded-sm border border-[var(--bos-line)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
                {m.label}
              </span>
              <Tag className="opacity-60">{m.hint}</Tag>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
              {m.value}
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Team */}
        <Section
          icon={<Users className="w-3.5 h-3.5" />}
          title="Team"
          meta={config.setup.roles.length > 0 ? `${config.setup.roles.length} roles` : "not set"}
          delay={0.1}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {config.setup.roles.length === 0 ? (
                <span className="text-[11px] text-[var(--bos-text-tertiary)]">
                  Configured roles will appear here.
                </span>
              ) : (
                config.setup.roles.map((role, i) => (
                  <motion.span
                    key={role}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.05, type: "spring", stiffness: 300, damping: 18 }}
                    className="w-8 h-8 rounded-full border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center text-[10px] font-semibold"
                    title={role}
                  >
                    {role.slice(0, 1)}
                  </motion.span>
                ))
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-[var(--bos-text-primary)] tabular-nums">
                {config.setup.teamSize || "—"}
              </div>
              <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
                Team size
              </div>
            </div>
          </div>
        </Section>

        {/* Work model */}
        <Section
          icon={<FolderKanban className="w-3.5 h-3.5" />}
          title="Work model"
          meta={config.setup.workTypes.length > 0 ? `${config.setup.workTypes.length} types` : "not set"}
          delay={0.15}
        >
          {config.setup.workTypes.length === 0 ? (
            <span className="text-[11px] text-[var(--bos-text-tertiary)]">
              Representative projects for your work types will appear here.
            </span>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {config.setup.workTypes.slice(0, 3).map((workType, i) => (
                <ProjectCard key={workType} workType={workType} index={i} />
              ))}
            </div>
          )}
          {(config.setup.projectDuration || config.setup.clientVolume) && (
            <div className="flex items-center gap-2 mt-3 text-[9px] text-[var(--bos-text-tertiary)]">
              <span>{config.setup.projectDuration || "—"} per project</span>
              <span className="opacity-40">·</span>
              <span>{config.setup.clientVolume || "—"} active</span>
              {config.setup.currentTools.length > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="truncate">tools: {config.setup.currentTools.join(", ")}</span>
                </>
              )}
            </div>
          )}
        </Section>

        {/* Operations workflow */}
        <Section
          icon={<Workflow className="w-3.5 h-3.5" />}
          title="Operations"
          meta="workflow"
          delay={0.2}
        >
          <WorkflowMap
            leadSource={config.setup.leadSources[0] ?? ""}
            approvalFlow={config.setup.approvalFlow[0] ?? ""}
            executionMode={config.setup.executionMode}
          />
          {config.setup.leadSources.length > 0 && (
            <div className="flex items-center gap-2 mt-2.5 text-[9px] text-[var(--bos-text-tertiary)]">
              <span>Sources:</span>
              {config.setup.leadSources.slice(0, 4).map((s) => (
                <Chip key={s} tone="neutral" dot={false}>{s}</Chip>
              ))}
            </div>
          )}
        </Section>

        {/* Preferences */}
        <Section
          icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          title="Preferences"
          meta={config.preferences.theme}
          delay={0.25}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
            <span className="text-[var(--bos-text-tertiary)]">Default landing</span>
            <span className="text-[var(--bos-text-secondary)] text-right">{config.preferences.defaultLanding}</span>
            <span className="text-[var(--bos-text-tertiary)]">Timezone</span>
            <span className="text-[var(--bos-text-secondary)] text-right">{config.preferences.timezone}</span>
            <span className="text-[var(--bos-text-tertiary)]">Date format</span>
            <span className="text-[var(--bos-text-secondary)] text-right">{config.preferences.dateFormat}</span>
            <span className="text-[var(--bos-text-tertiary)]">Navigation</span>
            <span className="text-[var(--bos-text-secondary)] text-right truncate">
              {navForIndustry(config.business.industry).slice(0, 3).join(" · ")}
            </span>
          </div>
        </Section>
      </div>

      {/* Next steps strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-center justify-between gap-4 rounded-sm border border-[var(--bos-line)] px-4 py-3"
      >
        <div className="text-[10px] font-mono tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
          Next — <span className="text-[var(--bos-text-secondary)]">build your first client record</span>
        </div>
        <span className="text-[var(--bos-text-tertiary)]">
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </motion.div>
    </div>
  );
}
