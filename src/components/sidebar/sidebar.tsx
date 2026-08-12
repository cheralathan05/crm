"use client";

import { useMemo } from "react";
import { Bell, HelpCircle, Search, X } from "lucide-react";
import { BusinessOSLogo, BusinessOSMark } from "@/components/business-os-mark";
import {
  navForRole,
  settingsForRole,
  type NavSection,
  type UserRole,
} from "@/lib/navigation";
import type { SidebarCounts } from "@/lib/sidebar-data";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "./notification-badge";
import { SidebarItem } from "./sidebar-item";
import { Tooltip } from "./tooltip";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

interface SidebarProps {
  user: { name: string | null; email: string | null };
  role: UserRole;
  companyName: string;
  counts: SidebarCounts;
  githubConnected: boolean;
  /** True when the sidebar is collapsed to icon-only (desktop). */
  collapsed?: boolean;
  /** True when rendered inside the mobile drawer. */
  mobile?: boolean;
  /** Closes the mobile drawer / expanded sidebar after navigation. */
  onNavigate?: () => void;
  /** Expands the sidebar from collapsed (triggered by a collapsed parent). */
  onExpand?: () => void;
  /** Opens the global command menu. */
  onOpenCommand: () => void;
  /** Closes the mobile drawer. */
  onCloseDrawer?: () => void;
}

function Section({
  section,
  collapsed,
  counts,
  githubConnected,
  onNavigate,
  onExpand,
}: {
  section: NavSection;
  collapsed: boolean;
  counts: SidebarCounts;
  githubConnected: boolean;
  onNavigate?: () => void;
  onExpand?: () => void;
}) {
  return (
    <div>
      {collapsed ? (
        <div className="mx-3 my-2 h-px bg-[var(--bos-line-strong)]" aria-hidden="true" />
      ) : (
        <div className="px-2.5 pt-4 pb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
          {section.label}
        </div>
      )}
      <ul className="space-y-0.5">
        {section.items.map((item) => (
          <li key={item.href}>
            <SidebarItem
              item={item}
              collapsed={collapsed}
              badgeCount={item.badgeKey ? counts[item.badgeKey] : 0}
              githubConnected={githubConnected}
              onNavigate={onNavigate}
              onExpand={onExpand}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The Business OS navigation backbone — quiet, clear, powerful.
 * Rendered both as the desktop/tablet sidebar and inside the mobile drawer.
 */
export function Sidebar({
  user,
  role,
  companyName,
  counts,
  githubConnected,
  collapsed = false,
  mobile = false,
  onNavigate,
  onExpand,
  onOpenCommand,
  onCloseDrawer,
}: SidebarProps) {
  const sections = useMemo(() => navForRole(role), [role]);
  const settings = useMemo(() => settingsForRole(role), [role]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bos-bg)]">
      {/* ── Top: brand + workspace ─────────────────────── */}
      <div
        className={cn(
          "flex items-center shrink-0 h-14 border-b border-[var(--bos-line)]",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        {collapsed ? (
          <Tooltip label="Business OS">
            <span aria-hidden="true">
              <BusinessOSMark size="md" />
            </span>
          </Tooltip>
        ) : (
          <>
            <BusinessOSLogo size="md" />
            {mobile && onCloseDrawer && (
              <button
                type="button"
                onClick={onCloseDrawer}
                aria-label="Close navigation"
                className="ml-auto flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Workspace switcher ─────────────────────────── */}
      <div className="shrink-0 pt-2.5">
        <WorkspaceSwitcher companyName={companyName} collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {/* ── Global search trigger ──────────────────────── */}
      <div className="shrink-0 px-2 pt-2 pb-1">
        {collapsed ? (
          <Tooltip label="Search (⌘K)">
            <button
              type="button"
              onClick={onOpenCommand}
              aria-label="Search anything"
              className="flex items-center justify-center w-full h-9 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
            >
              <Search className="w-[17px] h-[17px]" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onOpenCommand}
            className="flex items-center gap-2 w-full h-9 px-2.5 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-secondary)] transition-colors duration-150"
          >
            <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left text-[12px]">Search anything…</span>
            <kbd className="px-1 py-0.5 rounded-[3px] border border-[var(--bos-line)] text-[9px] font-mono text-[var(--bos-text-tertiary)]">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* ── Main navigation ────────────────────────────── */}
      <nav
        aria-label="Modules"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-1 scroll-smooth"
      >
        {sections.map((section) => (
          <Section
            key={section.label}
            section={section}
            collapsed={collapsed}
            counts={counts}
            githubConnected={githubConnected}
            onNavigate={onNavigate}
            onExpand={onExpand}
          />
        ))}
      </nav>

      {/* ── Settings (pinned near the bottom) ───────────── */}
      <div className="shrink-0 px-2 pb-1 border-t border-[var(--bos-line)] pt-1.5">
        <SidebarItem
          item={settings}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onExpand={onExpand}
        />
      </div>

      {/* ── Footer: help · notifications · profile ─────── */}
      <div
        className={cn(
          "shrink-0 border-t border-[var(--bos-line)]",
          collapsed ? "px-2 py-2" : "px-2 py-1.5",
        )}
      >
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-1")}>
          <Tooltip label="Help & support">
            <a
              href="/settings?view=profile"
              aria-label="Help & support"
              className={cn(
                "flex items-center justify-center h-8 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150",
                collapsed ? "w-full" : "w-8",
              )}
            >
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
            </a>
          </Tooltip>

          <Tooltip label="Notifications">
            <a
              href="/settings?view=notifications"
              aria-label={`Notifications${counts.notifications > 0 ? `, ${counts.notifications} unread` : ""}`}
              className={cn(
                "relative flex items-center justify-center h-8 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150",
                collapsed ? "w-full" : "w-8",
              )}
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              <NotificationBadge count={counts.notifications} className="absolute -top-0.5 -right-0.5" />
            </a>
          </Tooltip>

          {!collapsed && <div className="flex-1" />}
        </div>

        <div className={cn(collapsed ? "mt-2" : "mt-1.5 pt-1.5 border-t border-[var(--bos-line)]")}>
          <UserMenu user={user} role={role} collapsed={collapsed} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}
