"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { WorkspaceConfig } from "@/lib/workspace-config";
import {
  INDUSTRIES,
  BUSINESS_TYPES,
  BUSINESS_MODELS,
  SERVICES,
  TARGET_CUSTOMERS,
  LEAD_SOURCES,
  APPROVAL_FLOWS,
  EXECUTION_MODES,
  TEAM_SIZES,
  ROLES,
  WORK_TYPES,
  PROJECT_DURATIONS,
  CLIENT_VOLUMES,
  CURRENT_TOOLS,
  TIMEZONES,
  DATE_FORMATS,
  LANDING_AREAS,
} from "@/lib/workspace-config";
import {
  Question,
  ChoiceGrid,
  MultiChoiceGrid,
  TextField,
  Segmented,
  ToggleRow,
} from "./fields";
import { cn } from "@/lib/utils";

export type StepProps = {
  config: WorkspaceConfig;
  update: (fn: (prev: WorkspaceConfig) => WorkspaceConfig) => void;
  onNext: () => void;
};

function ContinueButton({ enabled, onNext, label = "Continue" }: { enabled: boolean; onNext: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onNext}
      disabled={!enabled}
      className={cn(
        "w-full h-11 mt-7 rounded-sm text-[12px] font-semibold tracking-[0.02em] flex items-center justify-center gap-2 transition-all",
        enabled
          ? "bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)] cursor-pointer"
          : "bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)] cursor-not-allowed",
      )}
    >
      {label}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

/* ── 01 · IDENTITY ─────────────────────────────── */

export function CompanyStep({ config, update, onNext }: StepProps) {
  const name = config.companyName;
  const valid = name.trim().length >= 2;

  return (
    <div>
      <Question eyebrow="01 / IDENTITY" title="Start with your company." hint="What should we call your business?">
        <TextField
          id="ws-company"
          label="Company name"
          value={name}
          onChange={(v) => update((p) => ({ ...p, companyName: v }))}
          placeholder="e.g. Acme Technologies"
          autoComplete="organization"
        />
      </Question>

      <Question eyebrow="01 / IDENTITY" title="Legal details" hint="Optional — these can be added from Settings later.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <TextField
            id="ws-legal"
            label="Legal name"
            optional
            value={config.profile.legalName}
            onChange={(v) => update((p) => ({ ...p, profile: { ...p.profile, legalName: v } }))}
          />
          <TextField
            id="ws-website"
            label="Website"
            optional
            value={config.profile.website}
            onChange={(v) => update((p) => ({ ...p, profile: { ...p.profile, website: v } }))}
            placeholder="https://"
          />
          <TextField
            id="ws-email"
            label="Business email"
            optional
            type="email"
            value={config.profile.businessEmail}
            onChange={(v) => update((p) => ({ ...p, profile: { ...p.profile, businessEmail: v } }))}
          />
          <TextField
            id="ws-phone"
            label="Business phone"
            optional
            type="tel"
            value={config.profile.businessPhone}
            onChange={(v) => update((p) => ({ ...p, profile: { ...p.profile, businessPhone: v } }))}
          />
        </div>
      </Question>

      <ContinueButton enabled={valid} onNext={onNext} />
    </div>
  );
}

/* ── 02 · BUSINESS DNA ─────────────────────────── */

export function BusinessDNA({ config, update, onNext }: StepProps) {
  const business = config.business;

  return (
    <div>
      <Question eyebrow="02 / BUSINESS DNA" title="What kind of business are you building?" hint="Business OS adapts to how you work.">
        <ChoiceGrid
          label="Industry"
          options={INDUSTRIES}
          value={business.industry}
          onChange={(v) => update((p) => ({ ...p, business: { ...p.business, industry: v } }))}
          columns={2}
        />
      </Question>

      {business.industry && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="02 / BUSINESS DNA" title="What do you primarily sell?">
            <ChoiceGrid
              label="Business type"
              options={BUSINESS_TYPES}
              value={business.businessType}
              onChange={(v) => update((p) => ({ ...p, business: { ...p.business, businessType: v } }))}
              columns={2}
            />
          </Question>
        </motion.div>
      )}

      {business.businessType && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="02 / BUSINESS DNA" title="What services do you provide?">
            <MultiChoiceGrid
              label="Services"
              options={SERVICES}
              value={business.services}
              onChange={(v) => update((p) => ({ ...p, business: { ...p.business, services: v } }))}
            />
          </Question>
        </motion.div>
      )}

      {business.services.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="02 / BUSINESS DNA" title="Who do you serve?">
            <MultiChoiceGrid
              label="Target customers"
              options={TARGET_CUSTOMERS}
              value={business.targetCustomers}
              onChange={(v) => update((p) => ({ ...p, business: { ...p.business, targetCustomers: v } }))}
            />
          </Question>
        </motion.div>
      )}

      {business.targetCustomers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="02 / BUSINESS DNA" title="How do you charge?">
            <ChoiceGrid
              label="Business model"
              options={BUSINESS_MODELS}
              value={business.businessModel}
              onChange={(v) => update((p) => ({ ...p, business: { ...p.business, businessModel: v } }))}
              columns={2}
            />
          </Question>
        </motion.div>
      )}

      <ContinueButton enabled={!!business.industry} onNext={onNext} />
    </div>
  );
}

/* ── 03 · OPERATING MODEL ──────────────────────── */

export function OperatingModelStep({ config, update, onNext }: StepProps) {
  const setup = config.setup;

  return (
    <div>
      <Question eyebrow="03 / OPERATING MODEL" title="Where does new work usually come from?">
        <MultiChoiceGrid
          label="Lead sources"
          options={LEAD_SOURCES}
          value={setup.leadSources}
          onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, leadSources: v } }))}
        />
      </Question>

      {setup.leadSources.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="03 / OPERATING MODEL" title="How does work become a project?">
            <ChoiceGrid
              label="Approval flow"
              options={APPROVAL_FLOWS}
              value={setup.approvalFlow[0] ?? ""}
              onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, approvalFlow: [v] } }))}
              columns={2}
            />
          </Question>
        </motion.div>
      )}

      {setup.approvalFlow.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="03 / OPERATING MODEL" title="How does your team execute work?">
            <ChoiceGrid
              label="Execution mode"
              options={EXECUTION_MODES}
              value={setup.executionMode}
              onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, executionMode: v } }))}
              columns={2}
            />
          </Question>
        </motion.div>
      )}

      <ContinueButton enabled={setup.leadSources.length > 0} onNext={onNext} />
    </div>
  );
}

/* ── 04 · TEAM ─────────────────────────────────── */

export function TeamModelStep({ config, update, onNext }: StepProps) {
  const setup = config.setup;

  return (
    <div>
      <Question eyebrow="04 / TEAM" title="Who will work inside this workspace?" hint="This configures the workspace — people receive tasks from Business OS later.">
        <ChoiceGrid
          label="Team size"
          options={TEAM_SIZES}
          value={setup.teamSize}
          onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, teamSize: v } }))}
          columns={3}
        />
      </Question>

      {setup.teamSize && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="04 / TEAM" title="Which roles do you have?">
            <MultiChoiceGrid
              label="Roles"
              options={ROLES}
              value={setup.roles}
              onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, roles: v } }))}
            />
          </Question>
        </motion.div>
      )}

      <ContinueButton enabled={!!setup.teamSize} onNext={onNext} />
    </div>
  );
}

/* ── 05 · WORK MODEL ───────────────────────────── */

export function WorkModelStep({ config, update, onNext }: StepProps) {
  const setup = config.setup;

  return (
    <div>
      <Question eyebrow="05 / WORK MODEL" title="What kind of work will your workspace manage?">
        <MultiChoiceGrid
          label="Work types"
          options={WORK_TYPES}
          value={setup.workTypes}
          onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, workTypes: v } }))}
        />
      </Question>

      {setup.workTypes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="05 / WORK MODEL" title="Typical project duration">
            <ChoiceGrid
              label="Project duration"
              options={PROJECT_DURATIONS}
              value={setup.projectDuration}
              onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, projectDuration: v } }))}
              columns={2}
            />
          </Question>
        </motion.div>
      )}

      {setup.projectDuration && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="05 / WORK MODEL" title="Typical client volume">
            <ChoiceGrid
              label="Client volume"
              options={CLIENT_VOLUMES}
              value={setup.clientVolume}
              onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, clientVolume: v } }))}
              columns={2}
            />
          </Question>
        </motion.div>
      )}

      {setup.clientVolume && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Question eyebrow="05 / WORK MODEL" title="Current tools" hint="Business OS replaces the glue between them.">
            <MultiChoiceGrid
              label="Current tools"
              options={CURRENT_TOOLS}
              value={setup.currentTools}
              onChange={(v) => update((p) => ({ ...p, setup: { ...p.setup, currentTools: v } }))}
            />
          </Question>
        </motion.div>
      )}

      <ContinueButton enabled={setup.workTypes.length > 0} onNext={onNext} />
    </div>
  );
}

/* ── 06 · PERSONALIZE ──────────────────────────── */

export function PersonalizationStep({ config, update, onNext }: StepProps) {
  const prefs = config.preferences;

  return (
    <div>
      <Question eyebrow="06 / PERSONALIZE" title="Make Business OS feel like yours.">
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-medium text-[var(--bos-text-secondary)] mb-2">Theme</div>
            <Segmented
              label="Theme"
              options={["SYSTEM", "LIGHT", "DARK"] as const}
              value={prefs.theme}
              onChange={(v) => update((p) => ({ ...p, preferences: { ...p.preferences, theme: v } }))}
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-[var(--bos-text-secondary)] mb-2">Default landing area</div>
            <Segmented
              label="Landing"
              options={LANDING_AREAS}
              value={prefs.defaultLanding}
              onChange={(v) => update((p) => ({ ...p, preferences: { ...p.preferences, defaultLanding: v } }))}
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-[var(--bos-text-secondary)] mb-2">Timezone</div>
            <Segmented
              label="Timezone"
              options={TIMEZONES}
              value={prefs.timezone}
              onChange={(v) => update((p) => ({ ...p, preferences: { ...p.preferences, timezone: v } }))}
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-[var(--bos-text-secondary)] mb-2">Date format</div>
            <Segmented
              label="Date format"
              options={DATE_FORMATS}
              value={prefs.dateFormat}
              onChange={(v) => update((p) => ({ ...p, preferences: { ...p.preferences, dateFormat: v } }))}
            />
          </div>
        </div>
      </Question>

      <Question eyebrow="06 / PERSONALIZE" title="Notifications">
        <div>
          {(
            [
              ["tasks", "Task updates", config.notifications.tasks],
              ["clients", "Client activity", config.notifications.clients],
              ["projects", "Project milestones", config.notifications.projects],
              ["proposals", "Proposal status", config.notifications.proposals],
              ["email", "Email digests", config.notifications.email],
              ["system", "System alerts", config.notifications.system],
            ] as const
          ).map(([key, label, checked]) => (
            <ToggleRow
              key={key}
              label={label}
              checked={checked}
              onChange={(next) =>
                update((p) => ({ ...p, notifications: { ...p.notifications, [key]: next } }))
              }
            />
          ))}
        </div>
      </Question>

      <ContinueButton enabled label="Review workspace" onNext={onNext} />
    </div>
  );
}
