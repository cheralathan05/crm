"use client";

import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { BusinessOSMark } from "@/components/business-os-mark";
import { useSequence, Reveal } from "./kit";

const CORE = ["CLIENT", "REQUIREMENT", "REVIEW", "PROPOSAL", "PROJECT", "TASK", "EMPLOYEE", "GITHUB", "DELIVERY"];
const SATELLITES = ["MESSAGES", "PAYMENTS", "ACTIVITIES", "NOTIFICATIONS", "AUTOMATION", "ANALYTICS"];

export function FinaleScene({
  onFinishSetup,
  completing,
}: {
  onFinishSetup: () => void;
  completing: boolean;
}) {
  // 0-8 core nodes, 9 satellites, 10 connected
  const step = useSequence(CORE.length + 3, 520);
  const connected = step >= CORE.length + 2;
  const coreShown = Math.min(step, CORE.length);
  const satellitesShown = connected ? SATELLITES.length : Math.max(0, step - CORE.length);

  return (
    <div className="w-full grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
      {/* Architecture visualization */}
      <div className="relative flex flex-col items-center py-2">
        {/* Core spine */}
        <div className="relative flex flex-col items-center">
          {CORE.slice(0, coreShown).map((node, i) => {
            const isDelivery = node === "DELIVERY";
            return (
              <div key={node} className="flex flex-col items-center">
                {i > 0 && (
                  <motion.div
                    className="w-px h-3.5 bg-[var(--bos-accent)]"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className={`px-3 py-1.5 rounded-sm border text-[9px] tracking-[0.14em] font-mono ${
                    isDelivery
                      ? "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white"
                      : "border-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                  }`}
                >
                  {node}
                </motion.div>
              </div>
            );
          })}

          {/* Satellites ring */}
          <div className="mt-5 flex items-center justify-center gap-1.5 flex-wrap max-w-sm">
            {SATELLITES.slice(0, satellitesShown).map((sat) => (
              <motion.span
                key={sat}
                initial={{ opacity: 0 }}
                animate={{ opacity: connected ? 0.65 : 1 }}
                transition={{ duration: 0.4 }}
                className="px-2 py-0.5 text-[8px] tracking-[0.12em] font-mono rounded-full border border-[var(--bos-line)] text-[var(--bos-text-tertiary)]"
              >
                {sat}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* Connected statement */}
      <div className="max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: connected ? 1 : 0, y: connected ? 0 : 12 }}
          transition={{ duration: 0.6 }}
          className="space-y-5"
        >
          <div className="flex items-center gap-2 text-[9px] tracking-[0.2em] uppercase text-[var(--bos-accent)] font-mono">
            <BusinessOSMark size="sm" />
            SYSTEM CONNECTED
          </div>

          <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight leading-[1.05] text-[var(--bos-text-primary)]">
            From first conversation to final delivery.
          </h2>
          <p className="text-sm text-[var(--bos-text-secondary)] leading-relaxed">
            Clients, requirements, proposals, projects, tasks, employees, code — one connected operating
            system for everything your business does.
          </p>

          <button
            onClick={onFinishSetup}
            disabled={completing}
            className="bos-btn bos-btn--primary w-full sm:w-auto"
          >
            {completing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                Set up your workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <Reveal show={connected} delay={0.4}>
            <p className="text-[10px] text-[var(--bos-text-tertiary)]">
              One more step — name your workspace and it is yours.
            </p>
          </Reveal>
        </motion.div>
      </div>
    </div>
  );
}
