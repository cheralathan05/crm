"use client";

import React from "react";
import {
  Home,
  Briefcase,
  FolderKanban,
  MessageSquare,
  Users,
  FileCheck2,
  FileCode,
  Bell,
  Activity,
  User,
  Shield,
  AlertOctagon,
  HelpCircle,
  Command,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  X,
  Sparkles,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessOSLogo, BusinessOSMark } from "@/components/business-os-mark";
import type { EmployeePortalTab } from "./employee-os-container";

interface EmployeePortalSidebarProps {
  activeTab: EmployeePortalTab;
  onSelectTab: (tab: EmployeePortalTab) => void;
  portalData: any;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onOpenMessageAdmin: () => void;
  onOpenBlocker: () => void;
  onOpenHelp: () => void;
  onOpenCommandPalette: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  key: EmployeePortalTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function EmployeePortalSidebar({
  activeTab,
  onSelectTab,
  portalData,
  selectedProjectId,
  onSelectProject,
  onOpenMessageAdmin,
  onOpenBlocker,
  onOpenHelp,
  onOpenCommandPalette,
  onLogout,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: EmployeePortalSidebarProps) {
  const navGroups: { group: string; items: NavItemDef[] }[] = [
    {
      group: "WORKSPACE",
      items: [
        { key: "HOME", label: "Home", icon: Home },
        {
          key: "MY_WORK",
          label: "My Work",
          icon: Briefcase,
          badge: portalData?.metrics?.inProgressCount || portalData?.myWork?.assigned,
        },
        { key: "PROJECTS", label: "My Projects", icon: FolderKanban },
      ],
    },
    {
      group: "COLLABORATION",
      items: [
        {
          key: "MESSAGES",
          label: "Messages",
          icon: MessageSquare,
          badge: portalData?.metrics?.unreadMessagesCount,
        },
        { key: "TEAM", label: "My Team", icon: Users },
      ],
    },
    {
      group: "EXECUTION & QUALITY",
      items: [
        { key: "REVIEWS", label: "Reviews", icon: FileCheck2 },
        {
          key: "SUBMISSIONS",
          label: "Proof & Submissions",
          icon: FileCode,
          badge: portalData?.metrics?.pendingSubmissionsCount,
        },
      ],
    },
    {
      group: "INTELLIGENCE",
      items: [
        {
          key: "NOTIFICATIONS",
          label: "Notifications",
          icon: Bell,
          badge: portalData?.metrics?.attentionCount,
        },
        { key: "ACTIVITY", label: "Activity", icon: Activity },
        { key: "PROFILE", label: "Profile", icon: User },
      ],
    },
  ];

  const employeeName = portalData?.employee?.name || "Employee";
  const employeeRole = portalData?.employee?.role || "Specialist";
  const myTeam = portalData?.myTeam || "FRONTEND";
  const status = portalData?.myWorkToday?.currentWork?.status || "IN_EXECUTION";

  const renderContent = () => (
    <div className="flex flex-col h-full select-none bg-[var(--bos-surface-panel)]">
      {/* ── TOP: BRAND & COLLAPSE ── */}
      <div
        className={cn(
          "flex items-center shrink-0 h-16 border-b border-[var(--bos-border)] transition-all duration-200",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            className="cursor-pointer hover:opacity-80 transition-opacity p-1.5 rounded-xl hover:bg-[var(--bos-surface)] flex items-center justify-center"
          >
            <BusinessOSMark size="md" />
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <BusinessOSLogo size="sm" />
              <div className="flex flex-col">
                <span className="font-extrabold text-[11px] tracking-wider text-[var(--bos-text-primary)] font-mono leading-none">
                  BUSINESS OS
                </span>
                <span className="text-[9px] font-mono font-bold text-[var(--bos-accent)] uppercase tracking-widest mt-0.5">
                  EMPLOYEE
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
                className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── EMPLOYEE PROFILE CARD ── */}
      {!collapsed ? (
        <div className="p-3 m-2.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--bos-accent)] to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm font-mono shrink-0 shadow-xs">
            {employeeName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-[var(--bos-text-primary)] truncate block">
                {employeeName}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--bos-text-tertiary)] mt-0.5">
              <span className="text-[var(--bos-accent)] font-medium truncate">{employeeRole}</span>
              <span>•</span>
              <span className="px-1.5 py-0.2 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-[9px] font-bold text-blue-400">
                {myTeam}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-3 flex justify-center border-b border-[var(--bos-border)]">
          <div
            title={`${employeeName} (${employeeRole}) - ${status}`}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--bos-accent)] to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs font-mono shadow-xs cursor-pointer"
          >
            {employeeName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* ── PROJECT SWITCHER ── */}
      {!collapsed && portalData?.allProjects?.length > 1 && (
        <div className="px-3 pb-2">
          <label className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] px-1 mb-1 block">
            ACTIVE PROJECT
          </label>
          <div className="relative">
            <select
              value={selectedProjectId || ""}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full appearance-none bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl px-2.5 py-1.5 pr-7 text-xs font-mono text-[var(--bos-text-primary)] outline-none cursor-pointer focus:border-[var(--bos-accent)] transition-colors"
            >
              {portalData.allProjects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code}: ` : ""}{p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* ── NAVIGATION LIST ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-3 font-mono text-xs">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-0.5">
            {!collapsed ? (
              <div className="px-2.5 pt-1 pb-1 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                {group.group}
              </div>
            ) : (
              <div className="my-1.5 h-px bg-[var(--bos-border)] mx-2" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.key);
                    onCloseMobile();
                  }}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer font-medium relative text-left",
                    collapsed ? "justify-center px-0" : "justify-between",
                    isActive
                      ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-[var(--bos-text-tertiary)]")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && item.badge > 0 ? (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[9px] font-extrabold shrink-0",
                        isActive
                          ? "bg-white text-[var(--bos-accent)]"
                          : "bg-[var(--bos-accent)]/15 text-[var(--bos-accent)] border border-[var(--bos-accent)]/30"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}

                  {collapsed && item.badge && item.badge > 0 ? (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--bos-accent)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}

        {/* ── QUICK ACTIONS (IN SIDEBAR) ── */}
        <div className="pt-2">
          {!collapsed ? (
            <div className="px-2.5 pt-1 pb-1 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
              QUICK ACTIONS
            </div>
          ) : (
            <div className="my-1.5 h-px bg-[var(--bos-border)] mx-2" />
          )}

          <div className="space-y-1 mt-1">
            <button
              type="button"
              onClick={onOpenMessageAdmin}
              title={collapsed ? "Message Admin" : undefined}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] transition-colors cursor-pointer text-left text-[11px]",
                collapsed && "justify-center px-0 py-2"
              )}
            >
              <Shield className="w-3.5 h-3.5 text-[var(--bos-accent)] shrink-0" />
              {!collapsed && <span className="truncate">Message Admin</span>}
            </button>

            <button
              type="button"
              onClick={onOpenBlocker}
              title={collapsed ? "Report Blocker" : undefined}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer text-left text-[11px]",
                collapsed && "justify-center px-0 py-2"
              )}
            >
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              {!collapsed && <span className="truncate">Blocker</span>}
            </button>

            <button
              type="button"
              onClick={onOpenHelp}
              title={collapsed ? "Request Help" : undefined}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer text-left text-[11px]",
                collapsed && "justify-center px-0 py-2"
              )}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              {!collapsed && <span className="truncate">Help</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* ── FOOTER: COMMAND PALETTE & SIGN OUT ── */}
      <div className="p-2.5 border-t border-[var(--bos-border)] space-y-1 font-mono text-xs shrink-0">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title={collapsed ? "Search (Ctrl+K)" : undefined}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer",
            collapsed ? "justify-center px-0" : "justify-between"
          )}
        >
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-[var(--bos-accent)] shrink-0" />
            {!collapsed && <span className="text-xs">Command Menu</span>}
          </div>
          {!collapsed && (
            <kbd className="px-1.5 py-0.5 rounded-md border border-[var(--bos-border)] bg-[var(--bos-surface)] text-[9px]">
              Ctrl+K
            </kbd>
          )}
        </button>

        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP PERSISTENT SIDEBAR ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-[var(--bos-surface-panel)] border-r border-[var(--bos-border)] backdrop-blur-xl transition-all duration-300 ease-in-out shadow-lg",
          collapsed ? "w-[72px]" : "w-64 xl:w-72"
        )}
      >
        {renderContent()}
      </aside>

      {/* ── MOBILE OVERLAY DRAWER ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] bg-[var(--bos-surface-panel)] border-r border-[var(--bos-border)] flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}
