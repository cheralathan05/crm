"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SystemRail, FLOW_STAGES } from "./system-rail";
import { RoadmapProgress } from "./roadmap-progress";
import { ArrivalScene } from "./arrival-scene";
import { ClientScene } from "./scenes/client-scene";
import { RequirementScene } from "./scenes/requirement-scene";
import { ReviewScene } from "./scenes/review-scene";
import { ProposalScene } from "./scenes/proposal-scene";
import { ProjectScene } from "./scenes/project-scene";
import { TaskScene } from "./scenes/task-scene";
import { EmployeeScene } from "./scenes/employee-scene";
import { GitHubScene } from "./scenes/github-scene";
import { DeliveryScene } from "./scenes/delivery-scene";
import { FinaleScene } from "./finale-scene";
import { cn } from "@/lib/utils";

type RoadmapUser = { name: string };

const SCENES = [
  { id: "client", Component: ClientScene },
  { id: "requirement", Component: RequirementScene },
  { id: "review", Component: ReviewScene },
  { id: "proposal", Component: ProposalScene },
  { id: "project", Component: ProjectScene },
  { id: "task", Component: TaskScene },
  { id: "employee", Component: EmployeeScene },
  { id: "github", Component: GitHubScene },
  { id: "delivery", Component: DeliveryScene },
] as const;

const BOOT = 0;
const FINALE = SCENES.length + 1; // index 10

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 64 : -64,
    opacity: 0,
    scale: 0.99,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -64 : 64,
    opacity: 0,
    scale: 0.99,
  }),
};

export function Roadmap({ user }: { user: RoadmapUser }) {
  const router = useRouter();
  const [step, setStep] = useState(BOOT);
  const [direction, setDirection] = useState(1);
  const [completing, setCompleting] = useState(false);

  const next = useCallback(() => {
    if (step < FINALE) {
      setDirection(1);
      setStep(step + 1);
    }
  }, [step]);

  const back = useCallback(() => {
    if (step > BOOT) {
      setDirection(-1);
      setStep(step - 1);
    }
  }, [step]);

  // Guard against double-invocation (Escape + button in the same tick).
  const finishingRef = useRef(false);
  const finish = useCallback(async () => {
    if (finishingRef.current || completing) return;
    finishingRef.current = true;
    setCompleting(true);
    try {
      const res = await fetch("/api/onboarding/overview", { method: "POST" });
      if (!res.ok) {
        finishingRef.current = false;
        setCompleting(false);
      } else {
        router.push("/onboarding/company");
      }
    } catch {
      finishingRef.current = false;
      setCompleting(false);
    }
  }, [completing, router]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Don't hijack keys while the user is typing or focused on a control.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON")) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (step === FINALE) finish();
        else next();
      } else if (e.key === "ArrowLeft") {
        back();
      } else if (e.key === "Escape") {
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, finish, next, back]);

  const mode: "boot" | "scenes" | "connected" =
    step === BOOT ? "boot" : step === FINALE ? "connected" : "scenes";
  const activeScene = step >= 1 && step <= SCENES.length ? step - 1 : 0;
  const Scene = step >= 1 && step <= SCENES.length ? SCENES[step - 1].Component : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex-1 flex flex-col">
        {/* Stage + rail */}
        <div className="flex-1 flex items-stretch min-h-0">
          {/* Persistent system rail (desktop) */}
          <aside className="hidden lg:flex w-44 xl:w-52 shrink-0 items-center justify-center border-r border-[var(--bos-line)] px-4">
            <SystemRail active={activeScene} mode={mode} />
          </aside>

          {/* Scene stage */}
          <div className="flex-1 relative flex items-center px-5 sm:px-10 py-6 min-h-[520px] sm:min-h-[560px]">
            {/* Skip intro — always available but subtle */}
            <button
              onClick={() => finish()}
              disabled={completing}
              className="absolute top-4 right-5 sm:right-10 text-[10px] tracking-[0.16em] uppercase text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors z-20 font-mono"
            >
              Skip intro
            </button>

            <AnimatePresence custom={direction} mode="popLayout" initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.42, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full"
              >
                {step === BOOT && <ArrivalScene user={user} onNext={next} />}
                {step === FINALE && (
                  <FinaleScene onFinishSetup={() => finish()} completing={completing} />
                )}
                {Scene && <Scene />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom bar — progress + navigation */}
        <footer className="relative z-20 border-t border-[var(--bos-line)] bg-[var(--bos-bg)]/70 backdrop-blur-sm">
          <div className="flex items-center gap-4 px-5 sm:px-10 py-4">
            <div className="w-24 sm:w-28 shrink-0">
              {step > BOOT && (
                <button
                  onClick={back}
                  className="group inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Back
                </button>
              )}
            </div>

            <div className="flex-1 max-w-md mx-auto">
              <RoadmapProgress current={activeScene} mode={mode} />
            </div>

            <div className="w-24 sm:w-28 shrink-0 flex justify-end">
              {step < FINALE && (
                <button
                  onClick={next}
                  className={cn(
                    "group inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase transition-colors",
                    step === BOOT
                      ? "text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
                  )}
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>

          {/* Stage name strip */}
          <div className="flex items-center justify-between px-5 sm:px-10 py-2 border-t border-[var(--bos-line)]">
            <span className="text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
              {step === BOOT
                ? "BUSINESS OS — ACTIVATION"
                : step === FINALE
                  ? "SYSTEM — CONNECTED"
                  : `${FLOW_STAGES[step - 1].code} / ${FLOW_STAGES[step - 1].label}`}
            </span>
            <span className="hidden sm:block text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
              ← → navigate · space next · esc skip
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
