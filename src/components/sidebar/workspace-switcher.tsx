"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface WorkspaceSwitcherProps {
  companyName: string;
  collapsed?: boolean;
  /** Called after any navigation (closes the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * Workspace switcher. Built for one workspace today but architected for
 * many: the dropdown lists the current workspace, then workspace actions.
 * The company name is always the authenticated user's real workspace name.
 */
export function WorkspaceSwitcher({
  companyName,
  collapsed = false,
  onNavigate,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = initialsOf(companyName || "W");
  const displayName = companyName || "Untitled workspace";

  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative px-2">
      {/* Trigger — wrapped in a tooltip only when collapsed */}
      {collapsed ? (
        <Tooltip label={displayName} className="w-full">
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Workspace: ${displayName}`}
            className="flex items-center justify-center w-full h-10 rounded-sm transition-colors duration-150 text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent-ring)] text-[10px] font-semibold text-[var(--bos-accent)] shrink-0">
              {initials}
            </span>
          </button>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Workspace: ${displayName}`}
          className={cn(
            "flex items-center gap-2.5 w-full h-10 px-2 rounded-sm transition-colors duration-150",
            open
              ? "bg-[var(--bos-overlay)] text-[var(--bos-text-primary)]"
              : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent-ring)] text-[10px] font-semibold text-[var(--bos-accent)] shrink-0">
            {initials}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[12px] font-medium truncate leading-tight">
              {displayName}
            </span>
            <span className="block text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] leading-tight">
              Business Workspace
            </span>
          </span>
          <ChevronsUpDown
            className="w-3.5 h-3.5 shrink-0 text-[var(--bos-text-tertiary)]"
            aria-hidden="true"
          />
        </button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="menu"
            aria-label="Workspace actions"
            className={cn(
              "absolute z-50 mt-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] shadow-[var(--bos-shadow-lg)] p-1",
              collapsed ? "left-2 w-60" : "left-2 right-2",
            )}
          >
            <div className="px-2 py-1.5">
              <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-1">
                Current workspace
              </div>
              <div className="flex items-center gap-2 rounded-sm px-1.5 py-1.5 bg-[var(--bos-accent-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-sm bg-[var(--bos-bg)] border border-[var(--bos-accent-ring)] text-[9px] font-semibold text-[var(--bos-accent)]">
                  {initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-medium truncate">{displayName}</span>
                  <span className="block text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
                    Business Workspace
                  </span>
                </span>
                <Check className="w-3.5 h-3.5 text-[var(--bos-accent)] shrink-0" aria-hidden="true" />
              </div>
            </div>

            <div className="h-px bg-[var(--bos-line)] my-1" />

            <Link
              href="/settings?view=workspace"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              role="menuitem"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Workspace settings
            </Link>
            <div
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-[12px] text-[var(--bos-text-tertiary)]"
              title="Multi-workspace support arrives with the workspace management module."
            >
              <Plus className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
              Create workspace
              <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.12em]">Soon</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
