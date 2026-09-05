"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BusinessOSMark } from "@/components/business-os-mark";
import { Tag } from "../onboarding/kit";
import { emptyConfig, type WorkspaceConfig } from "@/lib/workspace-config";
import { WorkspacePreview } from "./preview";
import { WorkspaceProgress } from "./progress";
import { SaveIndicator } from "./fields";
import { CompanyStep, BusinessDNA, OperatingModelStep, TeamModelStep, WorkModelStep, PersonalizationStep } from "./steps";
import { WorkspaceReview } from "./review";
import { WorkspaceCompletion } from "./completion";
import { cn } from "@/lib/utils";

type Phase = "intro" | "steps" | "review" | "creating" | "ready";

const STEP_COMPONENTS = [
  CompanyStep,
  BusinessDNA,
  OperatingModelStep,
  TeamModelStep,
  WorkModelStep,
  PersonalizationStep,
] as const;

const STEP_CODES = ["01 / IDENTITY", "02 / BUSINESS DNA", "03 / OPERATING MODEL", "04 / TEAM", "05 / WORK MODEL", "06 / PERSONALIZE"];

const STEP_TITLES = [
  "Start with your company.",
  "What kind of business are you building?",
  "How does work move through your business?",
  "Who will work inside this workspace?",
  "What kind of work will your workspace manage?",
  "Make Business OS feel like yours.",
];

function canContinue(step: number, config: WorkspaceConfig): boolean {
  switch (step) {
    case 0: return config.companyName.trim().length >= 2;
    case 1: return !!config.business.industry;
    case 2: return config.setup.leadSources.length > 0;
    case 3: return !!config.setup.teamSize;
    case 4: return config.setup.workTypes.length > 0;
    default: return true;
  }
}

function resumeStep(config: WorkspaceConfig): number {
  if (!config.companyName.trim()) return 0;
  if (!config.business.industry) return 1;
  if (config.setup.leadSources.length === 0) return 2;
  if (!config.setup.teamSize) return 3;
  if (config.setup.workTypes.length === 0) return 4;
  return 5;
}

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export function WorkspaceSetupController({
  user,
  initialConfig,
  prefillCompany,
}: {
  user: { name: string; email: string };
  initialConfig: WorkspaceConfig | null;
  prefillCompany: string;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(() => resumeStep(initialConfig ?? emptyConfig(prefillCompany)));
  const [direction, setDirection] = useState(1);
  const [config, setConfig] = useState<WorkspaceConfig>(() => initialConfig ?? emptyConfig(prefillCompany));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const saveTimer = useRef<number | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(config));
  const busyRef = useRef(false);
  const advancingRef = useRef(false);

  const update = useCallback((fn: (prev: WorkspaceConfig) => WorkspaceConfig) => {
    setConfig((prev) => fn(prev));
  }, []);

  /* ── Autosave: debounced PATCH, flushed on navigation ── */

  const persist = useCallback(async (latest: WorkspaceConfig) => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/onboarding/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latest),
      });
      if (!res.ok) {
        setSaveStatus("error");
        return false;
      }
      lastSavedRef.current = JSON.stringify(latest);
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, []);

  const scheduleSave = useCallback((latest: WorkspaceConfig) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persist(latest);
    }, 800);
  }, [persist]);

  useEffect(() => {
    if (phase === "intro" || phase === "creating" || phase === "ready") return;
    const serialized = JSON.stringify(config);
    if (serialized === lastSavedRef.current) return;
    scheduleSave(config);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [config, phase, scheduleSave]);

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
  }, []);

  /* ── Arrival transition ── */

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("steps"), 1750);
    return () => window.clearTimeout(t);
  }, []);

  /* ── Navigation ── */

  const next = useCallback(() => {
    if (phase !== "steps") return;
    if (!canContinue(step, config)) return;
    // Guard against double-click / double-keypress in the same tick.
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    persist(config);
    if (step < 5) {
      setDirection(1);
      setStep(step + 1);
    } else {
      setDirection(1);
      setPhase("review");
    }
  }, [phase, step, config, persist]);

  // Re-arm navigation after the step/phase actually changes.
  useEffect(() => {
    advancingRef.current = false;
  }, [step, phase]);

  const back = useCallback(() => {
    if (phase === "review") {
      setDirection(-1);
      setPhase("steps");
      setStep(5);
      return;
    }
    if (phase === "steps" && step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  }, [phase, step]);

  const editStep = useCallback((target: number) => {
    setDirection(-1);
    setPhase("steps");
    setStep(target);
  }, []);

  /* ── Final transaction ── */

  const complete = useCallback(async () => {
    if (busyRef.current || creating) return;
    busyRef.current = true;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/onboarding/workspace/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!data.ok) {
        busyRef.current = false;
        setCreating(false);
        setCreateError(data.message ?? "Unable to create your workspace. Please try again.");
        return;
      }
      setPhase("creating");
    } catch {
      busyRef.current = false;
      setCreating(false);
      setCreateError("Unable to create your workspace. Please try again.");
    }
  }, [creating, config]);

  // creating → ready transition — cleaned up if the user leaves mid-creation.
  useEffect(() => {
    if (phase !== "creating") return;
    const t = window.setTimeout(() => setPhase("ready"), 2000);
    return () => window.clearTimeout(t);
  }, [phase]);

  /* ── Keyboard navigation (subscribed once; reads refs for latest state) ── */

  const phaseRef = useRef(phase);
  const configRef = useRef(config);
  const creatingRef = useRef(creating);
  const nextRef = useRef(next);
  const backRef = useRef(back);
  const completeRef = useRef(complete);
  const persistRef = useRef(persist);

  // Keep the latest values in the refs after every render (the listener is
  // subscribed once, so the refs carry the current state without re-subscribing).
  useEffect(() => {
    phaseRef.current = phase;
    configRef.current = config;
    creatingRef.current = creating;
    nextRef.current = next;
    backRef.current = back;
    completeRef.current = complete;
    persistRef.current = persist;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON")) return;
      const p = phaseRef.current;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (p === "review" && !creatingRef.current) completeRef.current();
        else nextRef.current();
      } else if (e.key === "ArrowLeft") {
        backRef.current();
      } else if (e.key === "Escape") {
        if (p === "steps") {
          if (saveTimer.current) window.clearTimeout(saveTimer.current);
          persistRef.current(configRef.current);
          setPhase("review");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ActiveStep = STEP_COMPONENTS[step];

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header strip */}
        <div className="flex items-center justify-between px-5 sm:px-10 py-4 border-b border-[var(--bos-line)]">
          <div className="flex items-center gap-3">
            <Tag>
              Workspace setup <span className="opacity-40">/ 06</span>
            </Tag>
            <span className="hidden sm:block text-[9px] font-mono tracking-[0.16em] uppercase text-[var(--bos-text-tertiary)]">
              {phase === "review" ? "REVIEW" : phase === "creating" ? "CREATING" : phase === "ready" ? "READY" : STEP_CODES[step]}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <SaveIndicator status={saveStatus} />
            <span className="hidden md:block text-[10px] text-[var(--bos-text-tertiary)] tracking-[0.08em] uppercase">
              Welcome, <span className="text-[var(--bos-text-primary)] font-medium">{user.name}</span>
            </span>
          </div>
        </div>

        {/* Stage */}
        <div className="flex-1 relative overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            {phase === "intro" && (
              <motion.div
                key="intro"
                className="absolute inset-0 flex items-center justify-center"
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4 }}
              >
                <IntroScene userName={user.name} />
              </motion.div>
            )}

            {phase === "steps" && (
              <motion.div
                key={`step-${step}`}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full px-5 sm:px-10 py-6 grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-14 items-center min-h-[520px]"
              >
                <h1 className="sr-only">Workspace setup — {STEP_TITLES[step]}</h1>
                <WorkspacePreview config={config} activeStep={step} />
                <div className="w-full max-w-md justify-self-end">
                  <div className="max-h-[520px] overflow-y-auto pr-1">
                    <ActiveStep config={config} update={update} onNext={next} />
                  </div>
                </div>
              </motion.div>
            )}

            {phase === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="w-full px-5 sm:px-10 py-8"
              >
                <h1 className="sr-only">Review your workspace</h1>
                <WorkspaceReview
                  config={config}
                  onEditStep={editStep}
                  onComplete={complete}
                  completing={creating}
                />
                {createError && (
                  <p className="mt-4 text-xs text-[var(--bos-error)] text-center" role="alert">
                    {createError}
                  </p>
                )}
              </motion.div>
            )}

            {phase === "creating" && (
              <motion.div
                key="creating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <h1 className="sr-only">Creating your workspace</h1>
                <CreatingScene companyName={config.companyName} />
              </motion.div>
            )}

            {phase === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                <WorkspaceCompletion companyName={config.companyName} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom bar — progress + back */}
        <div className="relative z-20 border-t border-[var(--bos-line)] bg-[var(--bos-bg)]/70 backdrop-blur-sm">
          <div className="flex items-center gap-6 px-5 sm:px-10 py-4">
            <div className="w-20 shrink-0">
              {(phase === "steps" || phase === "review") && (
                <button
                  onClick={back}
                  className="group inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Back
                </button>
              )}
            </div>
            <div className="flex-1 max-w-xl mx-auto">
              <WorkspaceProgress current={step} phase={phase} />
            </div>
            <div className="w-20 shrink-0 flex justify-end">
              {phase === "steps" && (
                <button
                  onClick={next}
                  disabled={!canContinue(step, config)}
                  className={cn(
                    "group inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase transition-colors",
                    canContinue(step, config)
                      ? "text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
                      : "text-[var(--bos-text-tertiary)] opacity-50 cursor-not-allowed",
                  )}
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

/* ── Intro: the system compresses into your workspace ── */

const CORE_MODULES = ["CLIENTS", "REQUIREMENTS", "PROJECTS", "TASKS", "EMPLOYEES", "GITHUB", "DELIVERY"];

function IntroScene({ userName }: { userName: string }) {
  return (
    <div className="flex flex-col items-center text-center px-6">
      <div className="relative flex items-center justify-center mb-8" style={{ width: 280, height: 60 }}>
        {CORE_MODULES.map((module, i) => (
          <motion.span
            key={module}
            initial={{ opacity: 0, x: (i - CORE_MODULES.length / 2) * 90, y: i % 2 === 0 ? -18 : 18 }}
            animate={{ opacity: [0, 1, 1, 0], x: 0, y: 0 }}
            transition={{ duration: 1.1, delay: i * 0.05, times: [0, 0.25, 0.75, 1] }}
            className="absolute text-[9px] font-mono tracking-[0.2em] text-[var(--bos-text-tertiary)]"
          >
            {module}
          </motion.span>
        ))}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 18 }}
          className="w-12 h-12 rounded-full bg-[var(--bos-accent-subtle)] flex items-center justify-center"
        >
          <BusinessOSMark size="lg" className="text-[var(--bos-accent)]" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        <div className="text-[10px] tracking-[0.24em] uppercase text-[var(--bos-text-tertiary)] font-mono mb-3">
          Your workspace
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--bos-text-primary)] leading-tight mb-2">
          Welcome, {userName}.
        </h1>
        <p className="text-sm text-[var(--bos-text-secondary)]">
          Let&apos;s configure your workspace.
        </p>
      </motion.div>
    </div>
  );
}

/* ── Creating: configuration readiness ── */

const CREATION_LAYERS = ["IDENTITY", "BUSINESS", "OPERATIONS", "TEAM", "WORK", "PREFERENCES"];

function CreatingScene({ companyName }: { companyName: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    CREATION_LAYERS.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => {
          setPct(Math.round(((i + 1) / CREATION_LAYERS.length) * 100));
        }, 200 + i * 260),
      );
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div className="flex flex-col items-center text-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-14 h-14 rounded-full bg-[var(--bos-accent-subtle)] flex items-center justify-center mb-6"
      >
        <BusinessOSMark size="xl" className="text-[var(--bos-accent)]" />
      </motion.div>

      <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--bos-text-tertiary)] font-mono mb-2">
        Building {companyName || "your workspace"}
      </div>

      <div className="w-64 mb-5">
        {CREATION_LAYERS.map((layer, i) => (
          <div key={layer} className="flex items-center justify-between py-1">
            <span
              className={cn(
                "text-[9px] font-mono tracking-[0.14em] transition-colors",
                pct >= ((i + 1) / CREATION_LAYERS.length) * 100 ? "text-[var(--bos-text-secondary)]" : "text-[var(--bos-text-tertiary)] opacity-50",
              )}
            >
              {layer}
            </span>
            <motion.span
              initial={{ scale: 0 }}
              animate={pct >= ((i + 1) / CREATION_LAYERS.length) * 100 ? { scale: 1 } : { scale: 0 }}
              className="w-3 h-3 rounded-full bg-[var(--bos-success)] flex items-center justify-center"
            >
              <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                <path d="M1 3.2L2.4 4.6L5 1.4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </motion.span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 w-64">
        <div className="flex-1 h-px bg-[var(--bos-line-strong)] overflow-hidden">
          <motion.div
            className="h-full bg-[var(--bos-accent)]"
            initial={{ width: "0%" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-[11px] font-mono tabular-nums text-[var(--bos-accent)]">{pct}%</span>
      </div>

      <div className="text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono mt-3">
        Workspace configuration
      </div>
    </div>
  );
}
