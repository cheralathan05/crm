"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Pencil } from "lucide-react";
import type { WorkspaceConfig } from "@/lib/workspace-config";
import { cn } from "@/lib/utils";

const READINESS = [
  { label: "IDENTITY", check: (c: WorkspaceConfig) => c.companyName.trim().length >= 2 },
  { label: "BUSINESS", check: (c: WorkspaceConfig) => !!c.business.industry },
  { label: "OPERATIONS", check: (c: WorkspaceConfig) => c.setup.leadSources.length > 0 },
  { label: "TEAM", check: (c: WorkspaceConfig) => !!c.setup.teamSize },
  { label: "WORK MODEL", check: (c: WorkspaceConfig) => c.setup.workTypes.length > 0 },
  { label: "PREFERENCES", check: () => true },
];

export function WorkspaceReview({
  config,
  onEditStep,
  onComplete,
  completing,
}: {
  config: WorkspaceConfig;
  onEditStep: (step: number) => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const [revealed, setRevealed] = useState(0);
  const revealedRef = useRef(0);

  // Readiness sequence — deterministic, one check at a time.
  useEffect(() => {
    const timers: number[] = [];
    READINESS.forEach((_, i) => {
      timers.push(window.setTimeout(() => {
        revealedRef.current = i + 1;
        setRevealed(i + 1);
      }, 500 + i * 260));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const done = revealed >= READINESS.length;

  const sections: { title: string; step: number; values: string[] }[] = [
    {
      title: "Company",
      step: 0,
      values: [config.companyName, config.profile.website, config.profile.businessEmail].filter(Boolean),
    },
    {
      title: "Business",
      step: 1,
      values: [
        config.business.industry,
        config.business.businessType,
        config.business.services.join(" · "),
      ].filter(Boolean),
    },
    {
      title: "Operations",
      step: 2,
      values: [
        config.setup.leadSources.join(" · "),
        config.setup.approvalFlow.join(" · "),
        config.setup.executionMode,
      ].filter(Boolean),
    },
    {
      title: "Team",
      step: 3,
      values: [config.setup.teamSize, `${config.setup.roles.length} roles`].filter(Boolean),
    },
    {
      title: "Work",
      step: 4,
      values: [
        config.setup.workTypes.join(" · "),
        config.setup.projectDuration,
        config.setup.clientVolume,
      ].filter(Boolean),
    },
    {
      title: "Preferences",
      step: 5,
      values: [
        `${config.preferences.theme} theme`,
        config.preferences.defaultLanding,
        config.preferences.timezone,
        config.preferences.dateFormat,
      ].filter(Boolean),
    },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-start max-w-4xl mx-auto w-full">
      {/* Readiness + summary */}
      <div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono mb-2">
            Workspace readiness
          </div>
          <div className="border border-[var(--bos-line)] rounded-sm overflow-hidden">
            {READINESS.map((item, i) => {
              const passed = item.check(config);
              const show = i < revealed;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--bos-line)] last:border-0"
                >
                  <span
                    className={cn(
                      "text-[10px] font-mono tracking-[0.14em] transition-colors",
                      show && passed ? "text-[var(--bos-text-secondary)]" : "text-[var(--bos-text-tertiary)]",
                    )}
                  >
                    {item.label}
                  </span>
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={show && passed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className="w-4 h-4 rounded-full bg-[var(--bos-success)] flex items-center justify-center"
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                  </motion.span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[9px] font-mono tracking-[0.16em] uppercase text-[var(--bos-text-tertiary)]">
            <span>Workspace configuration</span>
            <span className="text-[var(--bos-accent)]">{done ? "100%" : `${Math.round((revealed / READINESS.length) * 100)}%`}</span>
          </div>
        </motion.div>

        {/* Full config summary */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 border border-[var(--bos-border)] bg-[var(--bos-surface)] rounded-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[var(--bos-line)] flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
              {config.companyName || "Your Business OS"}
            </span>
            <span className="text-[8px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
              Your business os
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6">
            {sections.map((section) => (
              <div key={section.title} className="px-4 py-2.5 border-b border-[var(--bos-line)] last:border-0 sm:[&:nth-last-child(2)]:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
                    {section.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditStep(section.step)}
                    className="inline-flex items-center gap-1 text-[8px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors font-mono"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    Edit
                  </button>
                </div>
                <div className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
                  {section.values.length > 0 ? (
                    section.values.map((v) => <div key={v}>{v}</div>)
                  ) : (
                    <span className="text-[var(--bos-text-tertiary)]">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Create */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={done ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="lg:sticky lg:top-6 lg:w-64"
      >
        <div className="border border-[var(--bos-line)] rounded-sm p-4 bg-[var(--bos-bg)]">
          <div className="text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono mb-2">
            Final step
          </div>
          <p className="text-[12px] text-[var(--bos-text-secondary)] mb-4 leading-relaxed">
            Everything is connected. Creating your workspace locks this configuration in —
            you can change any of it later from Settings.
          </p>
          <button
            type="button"
            onClick={onComplete}
            disabled={completing || !done}
            className={cn(
              "w-full h-11 rounded-sm text-[12px] font-semibold flex items-center justify-center gap-2 transition-all",
              completing || !done
                ? "bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)] cursor-not-allowed"
                : "bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)] cursor-pointer",
            )}
          >
            {completing ? "Creating…" : "Create my workspace"}
            {!completing && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
