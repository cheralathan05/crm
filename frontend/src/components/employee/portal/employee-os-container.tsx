"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home,
  Briefcase,
  FolderKanban,
  MessageSquare,
  Users,
  FileCheck2,
  FileCode,
  Bell,
  LogOut,
  Command,
  ChevronDown,
  Loader2,
  AlertOctagon,
  Shield,
  Sparkles,
  Activity,
  User,
  HelpCircle,
  Menu,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";
import { EmployeePortalSidebar } from "./employee-portal-sidebar";

// Dedicated Views
import { EmployeeHomeView } from "./views/employee-home-view";
import { EmployeeMyWorkView } from "./views/employee-my-work-view";
import { EmployeeProjectsView } from "./views/employee-projects-view";
import { EmployeeMessagesView } from "./views/employee-messages-view";
import { EmployeeTeamView } from "./views/employee-team-view";
import { EmployeeReviewsView } from "./views/employee-reviews-view";
import { EmployeeSubmissionsView } from "./views/employee-submissions-view";
import { EmployeeNotificationsView } from "./views/employee-notifications-view";
import { EmployeeActivityView } from "./views/employee-activity-view";
import { EmployeeProfileView } from "./views/employee-profile-view";

// Modals
import { WorkBlockerModal } from "./modals/work-blocker-modal";
import { WorkHandoffModal } from "./modals/work-handoff-modal";
import { WorkHelpModal } from "./modals/work-help-modal";
import { SmartContactModal } from "./modals/smart-contact-modal";
import { EmployeeOSCommandPalette } from "@/components/employee/os/employee-os-command-palette";

export type EmployeePortalTab =
  | "HOME"
  | "MY_WORK"
  | "PROJECTS"
  | "MESSAGES"
  | "TEAM"
  | "REVIEWS"
  | "SUBMISSIONS"
  | "NOTIFICATIONS"
  | "ACTIVITY"
  | "PROFILE";

interface EmployeeOSContainerProps {
  onLogout: () => void;
  initialTab?: EmployeePortalTab;
  previewEmployeeId?: string | null;
}

export function EmployeeOSContainer({
  onLogout,
  initialTab = "HOME",
  previewEmployeeId,
}: EmployeeOSContainerProps) {
  const [activeTab, setActiveTab] = useState<EmployeePortalTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sidebar Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Portal State
  const [portalData, setPortalData] = useState<any | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Cross-view Navigation Context
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Modals
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [selectedBlockerTask, setSelectedBlockerTask] = useState<any | null>(null);

  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [selectedHandoffTask, setSelectedHandoffTask] = useState<any | null>(null);

  const [isSmartContactOpen, setIsSmartContactOpen] = useState(false);
  const [contactTargetPerson, setContactTargetPerson] = useState<any | null>(null);
  const [contactTargetTask, setContactTargetTask] = useState<any | null>(null);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Fetch Full Portal Data from canonical service
  const fetchPortal = useCallback(async (projId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (projId) qs.set("projectId", projId);
      if (previewEmployeeId) qs.set("previewEmployeeId", previewEmployeeId);

      const res = await fetch(`/api/employee/work-portal?${qs.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to load Employee OS.");
      }

      setPortalData(json.data);
      if (!selectedProjectId && json.data.currentProject?.id) {
        setSelectedProjectId(json.data.currentProject.id);
      }
    } catch (err: any) {
      setError(err.message || "Connection to Business OS failed.");
    } finally {
      setLoading(false);
    }
  }, [previewEmployeeId, selectedProjectId]);

  useEffect(() => {
    fetchPortal(selectedProjectId || undefined);
  }, [selectedProjectId, fetchPortal]);

  // Tab Navigation with Deep Linking
  const handleNavigateTab = (tab: string, context?: any) => {
    const validTabs: Record<string, EmployeePortalTab> = {
      HOME: "HOME",
      MY_WORK: "MY_WORK",
      PROJECTS: "PROJECTS",
      MESSAGES: "MESSAGES",
      TEAM: "TEAM",
      REVIEWS: "REVIEWS",
      SUBMISSIONS: "SUBMISSIONS",
      NOTIFICATIONS: "NOTIFICATIONS",
      ACTIVITY: "ACTIVITY",
      PROFILE: "PROFILE",
    };

    const targetTab = validTabs[tab] || "HOME";
    setActiveTab(targetTab);

    if (context?.highlightTaskId) {
      setHighlightTaskId(context.highlightTaskId);
    }
    if (context?.threadId) {
      setActiveThreadId(context.threadId);
    }
  };

  // Open Blocker Modal
  const handleOpenBlocker = (task?: any) => {
    const target = task || portalData?.myWorkToday?.currentWork || portalData?.workItems?.[0];
    if (target) {
      setSelectedBlockerTask(target);
      setIsBlockerModalOpen(true);
    } else {
      setActiveTab("MY_WORK");
    }
  };

  // Open Handoff Modal
  const handleOpenHandoff = (task?: any) => {
    const target = task || portalData?.myWorkToday?.currentWork || portalData?.workItems?.[0];
    if (target) {
      setSelectedHandoffTask(target);
      setIsHandoffModalOpen(true);
    } else {
      setActiveTab("MY_WORK");
    }
  };

  // Open Help Modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selectedHelpTask, setSelectedHelpTask] = useState<any | null>(null);

  const handleOpenHelp = (task?: any) => {
    const target = task || portalData?.myWorkToday?.currentWork || portalData?.workItems?.[0];
    if (target) {
      setSelectedHelpTask(target);
      setIsHelpModalOpen(true);
    } else {
      setActiveTab("MY_WORK");
    }
  };

  // Open Smart Contact
  const handleOpenSmartContact = (person: any, task?: any) => {
    setContactTargetPerson(person);
    setContactTargetTask(task || portalData?.myWorkToday?.currentWork || null);
    setIsSmartContactOpen(true);
  };

  // Message Project Admin (1-Click)
  const handleMessageAdmin = () => {
    const admin = portalData?.projectRoster?.admin?.[0] || {
      name: "Project Administrator",
      role: "Project Manager",
    };
    handleOpenSmartContact(admin, portalData?.myWorkToday?.currentWork || null);
  };

  const tabLabels: Record<EmployeePortalTab, string> = {
    HOME: "Home Overview",
    MY_WORK: "My Work & Execution",
    PROJECTS: "My Projects",
    MESSAGES: "Work Conversations",
    TEAM: "Project Team & Teammates",
    REVIEWS: "Code & Work Reviews",
    SUBMISSIONS: "Proof & Submissions",
    NOTIFICATIONS: "Notifications & Alerts",
    ACTIVITY: "Activity Feed",
    PROFILE: "Employee Profile",
  };

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] relative flex font-sans selection:bg-[var(--bos-accent)] selection:text-white overflow-x-hidden">
      <SystemGrid />
      <AmbientBackground />

      {/* ── LEFT NAVIGATION SIDEBAR ── */}
      <EmployeePortalSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        portalData={portalData}
        selectedProjectId={selectedProjectId}
        onSelectProject={(pId) => setSelectedProjectId(pId)}
        onOpenMessageAdmin={handleMessageAdmin}
        onOpenBlocker={() => handleOpenBlocker()}
        onOpenHelp={() => handleOpenHelp()}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />

      {/* ── RIGHT MAIN WORKSPACE CONTENT CONTAINER ── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "md:pl-[72px]" : "md:pl-64 xl:pl-72"
        )}
      >
        {/* ── STREAMLINED TOP APPLICATION BAR ── */}
        <header className="sticky top-0 z-30 bg-[var(--bos-surface-panel)]/90 backdrop-blur-md border-b border-[var(--bos-border)] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-xs">
          {/* Left: Mobile Toggle + Sidebar Toggle + Current Section Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer shrink-0"
              title="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Desktop Collapse / Expand Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] transition-colors cursor-pointer shrink-0"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-4 h-4 text-[var(--bos-accent)]" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Active View Title */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-accent)] font-bold tracking-wider px-2 py-0.5 rounded-lg bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 hidden sm:inline">
                {activeTab.replace("_", " ")}
              </span>
              <h1 className="font-extrabold text-sm sm:text-base text-[var(--bos-text-primary)] font-mono tracking-tight truncate">
                {tabLabels[activeTab] || "Employee Workspace"}
              </h1>
            </div>
          </div>

          {/* Right: Quick Actions & Status */}
          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            {/* Quick Blocker Button */}
            <button
              onClick={() => handleOpenBlocker()}
              className="hidden lg:flex px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Report blocker on active work"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Blocker</span>
            </button>

            {/* Quick Help Button */}
            <button
              onClick={() => handleOpenHelp()}
              className="hidden lg:flex px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Request help on assigned work"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Help</span>
            </button>

            {/* Command Palette Trigger */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] flex items-center gap-1.5 cursor-pointer"
            >
              <Command className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="hidden sm:inline">Ctrl+K</span>
            </button>
          </div>
        </header>

        {/* ── PROJECT EXECUTION CONTEXT STRIP ── */}
        <div className="bg-[var(--bos-surface-panel)] border-b border-[var(--bos-border)] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 font-mono text-xs z-20 shadow-2xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">PROJECT:</span>
              <strong className="text-blue-400 font-bold">
                {portalData?.myProject?.name || portalData?.currentProject?.name || "Active Workspace"}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 border-l border-[var(--bos-border)] pl-3">
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">ROLE:</span>
              <strong className="text-emerald-400 font-bold">
                {portalData?.myRole || portalData?.employee?.role || "Specialist"}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 border-l border-[var(--bos-border)] pl-3">
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">TEAM:</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold text-[11px] border border-blue-500/20">
                {portalData?.myTeam || "FRONTEND"}
              </span>
            </div>
          </div>

          {/* MY WORK Metrics */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--bos-text-secondary)] flex-wrap">
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">WORK:</span>
            <span className="font-bold text-white">{portalData?.myWork?.assigned || 0} assigned</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">{portalData?.myWork?.completed || 0} done</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">{portalData?.myWork?.inProgress || 0} in progress</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">{portalData?.myWork?.waiting || 0} waiting</span>
            <span>•</span>
            <span className="text-purple-400 font-bold">{portalData?.myWork?.review || 0} review</span>
          </div>
        </div>

        {/* ── EXPANDED RESPONSIVE MAIN WORKSPACE ── */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
              <span>SYNCHRONIZING BUSINESS OS WORK GRAPH...</span>
            </div>
          ) : error ? (
            <div className="p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-rose-500/30 text-center space-y-3 font-mono">
              <p className="text-rose-400 text-xs">{error}</p>
              <button
                onClick={() => fetchPortal(selectedProjectId || undefined)}
                className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-bold uppercase cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          ) : !portalData ? (
            <div className="p-12 text-center text-xs font-mono text-[var(--bos-text-tertiary)]">
              No active employee profile or workspace available.
            </div>
          ) : (
            <>
              {activeTab === "HOME" && (
                <EmployeeHomeView
                  portalData={portalData}
                  onNavigateTab={handleNavigateTab}
                  onOpenSmartContact={handleOpenSmartContact}
                  onOpenBlockerModal={handleOpenBlocker}
                />
              )}

              {activeTab === "MY_WORK" && (
                <EmployeeMyWorkView
                  portalData={portalData}
                  highlightTaskId={highlightTaskId}
                  onOpenSmartContact={handleOpenSmartContact}
                  onOpenBlockerModal={handleOpenBlocker}
                  onOpenHelpModal={handleOpenHelp}
                  onOpenHandoffModal={handleOpenHandoff}
                  onRefresh={() => fetchPortal(selectedProjectId || undefined)}
                />
              )}

              {activeTab === "PROJECTS" && (
                <EmployeeProjectsView
                  portalData={portalData}
                  onOpenSmartContact={handleOpenSmartContact}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === "MESSAGES" && (
                <EmployeeMessagesView
                  initialThreadId={activeThreadId}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === "TEAM" && (
                <EmployeeTeamView
                  portalData={portalData}
                  onOpenSmartContact={handleOpenSmartContact}
                />
              )}

              {activeTab === "REVIEWS" && (
                <EmployeeReviewsView
                  portalData={portalData}
                  onRefresh={() => fetchPortal(selectedProjectId || undefined)}
                />
              )}

              {activeTab === "SUBMISSIONS" && (
                <EmployeeSubmissionsView
                  portalData={portalData}
                  onOpenNewSubmission={() => handleOpenHandoff()}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === "NOTIFICATIONS" && (
                <EmployeeNotificationsView
                  portalData={portalData}
                  onNavigateTab={handleNavigateTab}
                  onRefresh={() => fetchPortal(selectedProjectId || undefined)}
                />
              )}

              {activeTab === "ACTIVITY" && (
                <EmployeeActivityView
                  portalData={portalData}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === "PROFILE" && (
                <EmployeeProfileView
                  portalData={portalData}
                  onNavigateTab={handleNavigateTab}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ── MODALS ── */}
      <WorkBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        onSuccess={() => fetchPortal(selectedProjectId || undefined)}
        task={selectedBlockerTask}
        projectName={portalData?.currentProject?.name}
      />

      <WorkHandoffModal
        isOpen={isHandoffModalOpen}
        onClose={() => setIsHandoffModalOpen(false)}
        onSuccess={() => fetchPortal(selectedProjectId || undefined)}
        task={selectedHandoffTask}
        projectName={portalData?.currentProject?.name}
      />

      <WorkHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onSuccess={() => fetchPortal(selectedProjectId || undefined)}
        task={selectedHelpTask}
        projectName={portalData?.currentProject?.name}
      />

      <SmartContactModal
        isOpen={isSmartContactOpen}
        onClose={() => setIsSmartContactOpen(false)}
        onMessageSent={(threadId) => {
          setActiveTab("MESSAGES");
          setActiveThreadId(threadId);
        }}
        targetPerson={contactTargetPerson}
        task={contactTargetTask}
        projectId={portalData?.currentProject?.id}
        projectName={portalData?.currentProject?.name}
      />

      <EmployeeOSCommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        projectData={portalData?.myWorkToday}
        onSelectAction={(actionType, payload) => {
          if (actionType === "NAVIGATE" && payload) {
            handleNavigateTab(payload);
          } else if (actionType === "SELECT_TASK") {
            setActiveTab("MY_WORK");
          }
          setIsPaletteOpen(false);
        }}
      />
    </div>
  );
}
