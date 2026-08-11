"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared authentication surface.
 *
 * Provides the consistent structure for all auth pages:
 * - Full viewport composition
 * - Integrated form area
 * - Appropriate spacing at all breakpoints
 */
export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex flex-col w-full min-h-screen",
        "lg:flex-row",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Left brand zone — visible on desktop, collapses on mobile.
 */
export function AuthBrandZone({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "hidden lg:flex lg:w-[55%] xl:w-[58%]",
        "flex-col justify-between",
        "p-10 xl:p-14",
        "relative",
        "border-r border-[var(--bos-line)]",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Right authentication panel.
 */
export function AuthPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col justify-center",
        "px-6 py-12 sm:px-10 lg:px-14 xl:px-20",
        "min-h-screen lg:min-h-0",
        "max-w-[520px] lg:max-w-none",
        "mx-auto lg:mx-0",
        "w-full",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="auth-panel-content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-sm"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Auth section header.
 */
export function AuthHeader({
  section,
  title,
  subtitle,
}: {
  section: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-10">
      <div className="section-number mb-4">
        <span className="opacity-30">—</span> {section}
      </div>
      <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[var(--bos-text-primary)] leading-[1.15] mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-[var(--bos-text-secondary)] leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Auth field wrapper.
 */
export function AuthField({
  label,
  children,
  error,
  className,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      <label className="bos-label">{label}</label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-[var(--bos-error)] mt-1.5"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Auth divider.
 */
export function AuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-[var(--bos-line)]" />
      <span className="text-[10px] tracking-[0.18em] text-[var(--bos-text-tertiary)] uppercase font-medium">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--bos-line)]" />
    </div>
  );
}

/**
 * Auth footer links row.
 */
export function AuthFooterLinks({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mt-6">
      {children}
    </div>
  );
}

/**
 * Auth bottom action.
 */
export function AuthBottomAction({
  label,
  linkLabel,
  href,
  onClick,
}: {
  label: string;
  linkLabel: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <p className="mt-8 text-center text-xs text-[var(--bos-text-tertiary)]">
      {label}{" "}
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="bos-link bos-link--accent font-medium"
        >
          {linkLabel}
        </button>
      ) : (
        <a href={href} className="bos-link bos-link--accent font-medium">
          {linkLabel}
        </a>
      )}
    </p>
  );
}