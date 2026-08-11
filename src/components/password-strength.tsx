"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { scorePassword, type PasswordStrength } from "@/lib/validation";

const strengthLabels = ["", "WEAK", "FAIR", "STRONG"] as const;
const strengthColors = ["", "var(--bos-error)", "var(--bos-warning)", "var(--bos-success)"];

interface PasswordStrengthProps {
  value: string;
  className?: string;
}

export function PasswordStrength({
  value,
  className,
}: PasswordStrengthProps) {
  if (!value) return null;

  const score = scorePassword(value);

  if (score === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center gap-2.5 mt-2", className)}
    >
      {/* Segments */}
      <div className="flex gap-[3px] flex-1 max-w-[80px]">
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={cn(
              "h-[2px] flex-1 rounded-full transition-colors duration-300",
              segment <= score
                ? "bg-current"
                : "bg-[var(--bos-line-strong)]",
            )}
            style={
              segment <= score
                ? { color: strengthColors[score] }
                : undefined
            }
          />
        ))}
      </div>

      {/* Label */}
      <span
        className="text-[10px] font-medium tracking-[0.12em] uppercase"
        style={{ color: strengthColors[score] }}
      >
        {strengthLabels[score]}
      </span>
    </motion.div>
  );
}