"use client";

import { cn } from "@/lib/utils";

export type Size = "sm" | "md" | "lg" | "xl" | number;

const sizeMap: Record<string, { outer: number; inner: number }> = {
  sm: { outer: 16, inner: 10 },
  md: { outer: 24, inner: 16 },
  lg: { outer: 32, inner: 22 },
  xl: { outer: 48, inner: 34 },
};

function getDimensions(size: Size): { outer: number; inner: number } {
  if (typeof size === "number") {
    return { outer: size, inner: Math.round(size * 0.65) };
  }
  if (typeof size === "string" && sizeMap[size]) {
    return sizeMap[size];
  }
  return sizeMap.md;
}

export interface BusinessOSMarkProps {
  size?: Size;
  className?: string;
  animated?: boolean;
}

/**
 * Business OS symbol
 *
 * An abstract mark representing:
 *   CONNECTION  ·  WORKFLOW  ·  ORGANIZATION  ·  CONTINUITY
 *
 * Three vertical nodes connected by a flowing arc.
 * Minimal, monochrome, architectural.
 */
export function BusinessOSMark({
  size = "md",
  className,
  animated = false,
}: BusinessOSMarkProps) {
  const dims = getDimensions(size);

  return (
    <svg
      width={dims.outer}
      height={dims.outer}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-current shrink-0", animated && "animate-pulse", className)}
      aria-label="Business OS"
      role="img"
    >
      {/* Top node */}
      <circle cx="12" cy="4" r="1.8" className="fill-current" />
      {/* Flow line from top to right */}
      <path
        d="M12 5.8C12 5.8 18 8 18 12C18 16 12 18.2 12 18.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* Flow line from right to bottom */}
      <path
        d="M12 18.2C12 18.2 6 20 6 12C6 7.5 10 6 12 5.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
      {/* Right node */}
      <circle cx="16.5" cy="12" r="1.5" className="fill-current" opacity="0.6" />
      {/* Bottom node */}
      <circle cx="12" cy="20" r="1.8" className="fill-current" />
      {/* Left node */}
      <circle cx="7.5" cy="12" r="1.5" className="fill-current" opacity="0.35" />
    </svg>
  );
}

/**
 * Full "BUSINESS OS" logotype with mark.
 */
export function BusinessOSLogo({
  size = "md",
  className,
  showTagline,
}: BusinessOSLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BusinessOSMark size={size} />
      <div className="flex flex-col">
        <span
          className={cn(
            "font-semibold tracking-tight text-current leading-none",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base",
            size === "xl" && "text-lg",
            typeof size === "number" && (size <= 18 ? "text-xs" : size <= 28 ? "text-sm" : "text-base")
          )}
        >
          BUSINESS
          <span className="font-light opacity-60"> OS</span>
        </span>
        {showTagline && (
          <span className="text-[10px] tracking-[0.18em] text-[var(--bos-text-tertiary)] uppercase mt-0.5">
            Secure Workspace
          </span>
        )}
      </div>
    </div>
  );
}

export interface BusinessOSLogoProps {
  size?: Size;
  className?: string;
  showTagline?: boolean;
}