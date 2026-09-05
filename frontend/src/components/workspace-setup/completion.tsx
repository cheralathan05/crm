"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { BusinessOSMark } from "@/components/business-os-mark";
import { Tag } from "../onboarding/kit";

export function WorkspaceCompletion({ companyName }: { companyName: string }) {
  const router = useRouter();

  // Gentle auto-enter as a fallback — the button is the primary action.
  useEffect(() => {
    const t = window.setTimeout(() => router.push("/dashboard"), 4200);
    return () => window.clearTimeout(t);
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center max-w-md w-full"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
          className="relative w-16 h-16 rounded-full bg-[var(--bos-accent-subtle)] flex items-center justify-center mb-6"
        >
          <BusinessOSMark size="xl" className="text-[var(--bos-accent)]" />
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.45, type: "spring", stiffness: 400, damping: 16 }}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--bos-success)] flex items-center justify-center border-2 border-[var(--bos-bg)]"
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
          </motion.span>
        </motion.div>

        <Tag className="mb-3">Workspace ready</Tag>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--bos-text-primary)] leading-tight mb-2"
        >
          Your workspace is ready.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="text-sm text-[var(--bos-text-secondary)] mb-8"
        >
          <span className="font-medium text-[var(--bos-text-primary)]">{companyName}</span> is
          configured. Business OS is built around your business.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          onClick={() => router.push("/dashboard")}
          className="bos-btn bos-btn--primary w-full max-w-xs"
        >
          Enter my Business OS
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>

        <div className="mt-8 flex items-center justify-between text-[9px] tracking-[0.16em] uppercase text-[var(--bos-text-tertiary)] font-mono w-full max-w-xs">
          <span>Private workspace</span>
          <span>Configured</span>
        </div>
      </motion.div>
    </div>
  );
}
