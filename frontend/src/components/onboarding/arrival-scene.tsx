"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BusinessOSMark } from "@/components/business-os-mark";
import { useSequence } from "./kit";

const LAYERS = ["WORKSPACE ENGINE", "CLIENT LAYER", "WORK LAYER", "DELIVERY LAYER"];

export function ArrivalScene({
  user,
  onNext,
}: {
  user: { name: string };
  onNext: () => void;
}) {
  // 0: mark · 1-4: layers · 5: ready
  const step = useSequence(6, 210);
  const ready = step >= 5;
  const firstName = user.name.split(/\s+/)[0] || "there";

  return (
    <div className="w-full flex flex-col items-center text-center py-4">
      {/* The mark */}
      <div className="relative mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-[var(--bos-text-primary)]"
        >
          <BusinessOSMark size="xl" className="w-16 h-16 sm:w-20 sm:h-20" />
        </motion.div>

        {/* Extending horizontal line */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-px bg-[var(--bos-accent)]"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 220, opacity: step >= 1 ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Layer labels */}
      <div className="h-5 mb-10 flex items-center gap-3">
        {LAYERS.map((layer, i) => (
          <motion.span
            key={layer}
            initial={{ opacity: 0 }}
            animate={{ opacity: step >= i + 1 ? 0.85 : 0 }}
            transition={{ duration: 0.25 }}
            className="text-[9px] tracking-[0.22em] uppercase text-[var(--bos-text-secondary)] font-mono"
          >
            {i > 0 && <span className="mr-3 opacity-40">·</span>}
            {layer}
          </motion.span>
        ))}
      </div>

      {/* Ready state */}
      <div className="min-h-[150px] sm:min-h-[170px] flex flex-col items-center">
        <AnimatePresence>
          {ready && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-2 mb-5 text-[9px] tracking-[0.2em] uppercase text-[var(--bos-success)] font-mono">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)]"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.4, 1] }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                />
                SYSTEM READY
              </div>

              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--bos-text-primary)] leading-tight">
                Welcome, {firstName}.
              </h1>
              <p className="mt-3 text-sm sm:text-[15px] text-[var(--bos-text-secondary)]">
                Your business, connected.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={onNext}
                  className="bos-btn bos-btn--primary w-full sm:w-auto"
                  autoFocus
                >
                  Explore Business OS
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
