"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrimaryActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  showArrow?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

const variants = {
  primary: "bos-btn--primary",
  secondary: "bos-btn--secondary",
  ghost: "bos-btn--ghost",
};

export function PrimaryAction({
  children,
  loading = false,
  success = false,
  showArrow = true,
  variant = "primary",
  className,
  disabled,
  ...props
}: PrimaryActionProps) {
  return (
    <button
      className={cn(
        "bos-btn w-full",
        variants[variant],
        success && "!bg-[var(--bos-success)]",
        className,
      )}
      disabled={disabled || loading || success}
      {...props}
    >
      {loading ? (
        <motion.span
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing</span>
        </motion.span>
      ) : success ? (
        <motion.span
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Complete</span>
        </motion.span>
      ) : (
        <span className="flex items-center gap-2"        >
          <span>{children}</span>
          {showArrow && <ArrowRight className="w-3.5 h-3.5" />}
        </span>
      )}
    </button>
  );
}