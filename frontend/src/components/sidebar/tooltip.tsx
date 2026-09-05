"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip for the collapsed sidebar. Uses fixed positioning so it always
 * escapes scroll containers (the nav column) and overlays the content area.
 * Shows on hover and keyboard focus; screen readers get the aria-label
 * already set on the trigger.
 */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  function show() {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  }

  function hide() {
    setPos(null);
  }

  return (
    <span
      ref={wrapRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={cn("inline-flex", className)}
    >
      {children}
      {pos && (
        <span
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className="pointer-events-none fixed z-[80] -translate-y-1/2 whitespace-nowrap rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] px-2 py-1 text-[10px] font-medium text-[var(--bos-text-primary)] shadow-[var(--bos-shadow-md)]"
        >
          {label}
        </span>
      )}
    </span>
  );
}
