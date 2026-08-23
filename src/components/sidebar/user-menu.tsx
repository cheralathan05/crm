"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Settings, SlidersHorizontal, UserRound } from "lucide-react";
import { ROLE_LABELS, type UserRole } from "@/lib/navigation";
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

interface UserMenuProps {
  user: { name: string | null; email: string | null };
  role: UserRole;
  collapsed?: boolean;
  /** Called after navigation (closes the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * Bottom user area — real name, real role. Clicking opens the profile menu.
 */
export function UserMenu({ user, role, collapsed = false, onNavigate }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const displayName = user.name || "Account";
  const initials = initialsOf(displayName);
  const roleLabel = ROLE_LABELS[role] ?? "Member";

  const close = () => setOpen(false);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="relative">
      {/* Trigger — wrapped in a tooltip only when collapsed */}
      {collapsed ? (
        <Tooltip label={displayName} className="w-full">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Account: ${displayName}, ${roleLabel}`}
            className="flex items-center justify-center w-full h-10 rounded-sm transition-colors duration-150 text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent-ring)] text-[10px] font-semibold text-[var(--bos-accent)] shrink-0">
              {initials}
            </span>
          </button>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Account: ${displayName}, ${roleLabel}`}
          className={cn(
            "flex items-center gap-2.5 w-full h-10 px-2 rounded-sm transition-colors duration-150",
            open
              ? "bg-[var(--bos-overlay)] text-[var(--bos-text-primary)]"
              : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent-ring)] text-[10px] font-semibold text-[var(--bos-accent)] shrink-0">
            {initials}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[12px] font-medium truncate leading-tight">
              {displayName}
            </span>
            <span className="block text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] leading-tight">
              {roleLabel}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 shrink-0 text-[var(--bos-text-tertiary)] transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="menu"
            aria-label="Account menu"
            className={cn(
              "absolute z-50 mb-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] shadow-[var(--bos-shadow-lg)] p-1",
              "bottom-full",
              collapsed ? "left-2 w-56" : "left-2 right-2",
            )}
          >
            <div className="px-2 py-1.5 mb-0.5">
              <div className="text-[12px] font-medium text-[var(--bos-text-primary)] truncate">
                {displayName}
              </div>
              <div className="text-[10px] text-[var(--bos-text-tertiary)] truncate">
                {user.email}
              </div>
            </div>
            <div className="h-px bg-[var(--bos-line)] my-1" />

            <Link
              href="/settings?view=profile"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              role="menuitem"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <UserRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Profile
            </Link>
            <Link
              href="/settings?view=profile"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              role="menuitem"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <Settings className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Account settings
            </Link>
            <Link
              href="/settings?view=notifications"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              role="menuitem"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Preferences
            </Link>

            <div className="h-px bg-[var(--bos-line)] my-1" />

            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-error)] transition-colors duration-150"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
