"use client";

import { motion } from "framer-motion";
import { Tag, FlowArrow } from "./kit";

export function SceneLayout({
  code,
  label,
  title,
  description,
  capabilities,
  connectsTo,
  children,
}: {
  code: string;
  label: string;
  title: string;
  description: string;
  capabilities: string[];
  connectsTo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-14 items-center">
      {/* Preview — the miniature real application */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>

      {/* Editorial column */}
      <motion.div
        className="space-y-5 sm:space-y-6 max-w-md"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div>
          <Tag className="mb-3">
            {code} <span className="opacity-40">/ {label}</span>
          </Tag>
          <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-tight leading-[1.05] text-[var(--bos-text-primary)]">
            {title}
          </h1>
          <p className="mt-3 text-[13px] sm:text-sm leading-relaxed text-[var(--bos-text-secondary)]">
            {description}
          </p>
        </div>

        {/* Inner capabilities */}
        <ul className="space-y-1.5">
          {capabilities.map((cap) => (
            <motion.li
              key={cap}
              className="flex items-start gap-2.5 text-[12px] text-[var(--bos-text-secondary)]"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-[var(--bos-accent)] shrink-0" />
              <span>{cap}</span>
            </motion.li>
          ))}
        </ul>

        {/* Connection to the next stage */}
        <div className="pt-1">
          <FlowArrow label={`Connects to ${connectsTo}`} delay={0.3} />
        </div>
      </motion.div>
    </div>
  );
}
