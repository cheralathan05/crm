"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "./notification-badge";
import { Tooltip } from "./tooltip";

interface SidebarItemProps {
  item: NavItem;
  /** True when the sidebar is collapsed to icon-only. */
  collapsed?: boolean;
  badgeCount?: number;
  /** GitHub connection state (item.status === "github"). */
  githubConnected?: boolean;
  /** Called after any navigation (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Called when a collapsed parent is clicked — expands the sidebar. */
  onExpand?: () => void;
}

/** Active state works for nested routes: /clients/123 keeps Clients active. */
function isRouteActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(href + "/");
}

export function SidebarItem({
  item,
  collapsed = false,
  badgeCount = 0,
  githubConnected = false,
  onNavigate,
  onExpand,
}: SidebarItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasChildren = !!item.children?.length;

  const active = isRouteActive(pathname, item.href);
  const activeView = item.children?.find((child) => {
    if (pathname !== item.href) return false;
    const view = searchParams.get("view");
    if (!child.view) return !view; // "All X" — active when no view selected
    return view === child.view;
  });

  // Submenu follows the active route: any nested view keeps it open, and it
  // stays open once expanded (pure derivation — no state to sync).
  // Note: a submenu whose view is the current route cannot be collapsed — the
  // active view must stay visible (its chevron becomes a no-op by design).
  const [everExpanded, setEverExpanded] = useState(!!activeView);
  const open = everExpanded || !!activeView;

  const badge = item.badgeKey && badgeCount > 0 ? badgeCount : 0;
  const Icon = item.icon;

  /* ── Collapsed: icon-only with tooltip ─────────────────── */
  if (collapsed) {
    return (
      <Tooltip label={item.label}>
        <Link
          href={item.href}
          onClick={() => {
            if (hasChildren) {
              onExpand?.(); // expand the sidebar to reveal the submenu
            } else {
              onNavigate?.();
            }
          }}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex items-center justify-center h-9 w-full rounded-sm transition-colors duration-150",
            active
              ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
              : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <Icon className="w-[17px] h-[17px]" aria-hidden="true" />
          {badge > 0 && (
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" />
          )}
          {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--bos-accent)]" />
          )}
        </Link>
      </Tooltip>
    );
  }

  /* ── Expanded: label + optional submenu ────────────────── */
  return (
    <div className="relative">        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 h-8 px-2.5 pr-6 rounded-sm text-[13px] transition-colors duration-150",
            active
              ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
              : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]",
          )}
        >
          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate flex-1">{item.label}</span>
          {item.badgeKey && badge > 0 && <NotificationBadge count={badge} />}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setEverExpanded((o) => !o)}
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={open}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-sm",
              "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150",
            )}
          >
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        )}

      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[var(--bos-accent)]" />
      )}

      {item.status === "github" && (
        <div className="flex items-center gap-1.5 pl-[38px] pr-2.5 pt-1">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              githubConnected ? "bg-[var(--bos-success)]" : "bg-[var(--bos-text-tertiary)]",
            )}
            aria-hidden="true"
          />
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
            {githubConnected ? "Connected" : "Not connected"}
          </span>
        </div>
      )}

      {hasChildren && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0, y: -4 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
              aria-label={`${item.label} submenu`}
            >
              {item.children!.map((child) => {
                const childHref = child.view ? `${item.href}?view=${child.view}` : item.href;
                const childActive =
                  pathname === item.href &&
                  (child.view
                    ? searchParams.get("view") === child.view
                    : !searchParams.has("view"));
                return (
                  <li key={child.label}>
                    <Link
                      href={childHref}
                      onClick={onNavigate}
                      aria-current={childActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 h-7 pl-[38px] pr-2.5 rounded-sm text-[12px] transition-colors duration-150",
                        childActive
                          ? "text-[var(--bos-accent)] font-medium"
                          : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]",
                      )}
                    >
                      <span
                        className={cn(
                          "w-1 h-1 rounded-full shrink-0",
                          childActive
                            ? "bg-[var(--bos-accent)]"
                            : "bg-[var(--bos-border-strong)]",
                        )}
                        aria-hidden="true"
                      />
                      {child.label}
                    </Link>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
