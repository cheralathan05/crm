"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home,
  Layers,
  Play,
  FolderKanban,
  FileCode,
  Server,
  Users,
  Sparkles,
  Inbox,
  Command,
  HelpCircle,
  LogOut,
  RefreshCw,
  Zap,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";

// Dedicated Views
import { EmployeeOSHomeView } from "./employee-os-home-view";
import { EmployeeOSMyDayView } from "./employee-os-my-day-view";
import { EmployeeOSBuildCenterView } from "./employee-os-build-center-view";
import { EmployeeOSResponsibilityView } from "./employee-os-responsibility-view";
import { EmployeeOSProductExplorerView } from "./employee-os-product-explorer-view";
import { EmployeeOSDependencyRadarView } from "./employee-os-dependency-radar-view";
import { EmployeeOSTeamView } from "./employee-os-team-view";
import { EmployeeOSDecisionsView } from "./employee-os-decisions-view";
import { EmployeeOSInboxView } from "./employee-os-inbox-view";

// Overlays & Drawers
import { EmployeeOSCommandPalette } from "./employee-os-command-palette";
import { EmployeeOSAICoachDrawer } from "./employee-os-ai-coach-drawer";
import { FeatureDetailDrawer } from "@/components/employee/feature-detail-drawer";
import { EmployeeBuildModeModal } from "@/components/employee/employee-build-mode-modal";
import { VisualPageSpec } from "@/lib/employees/employee-project-brief.service";

type ActiveTab =
  | "HOME"
  | "MY_DAY"
  | "PRODUCT"
  | "RESPONSIBILITY"
  | "BUILD"
  | "DEPENDENCIES"
  | "TEAM"
  | "DECISIONS"
  | "INBOX";

interface EmployeeOSShellProps {
  onLogout: () => void;
  previewEmployeeId?: string | null;
}

export function EmployeeOSShell({ onLogout, previewEmployeeId }: EmployeeOSShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("HOME");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data Stores
  const [homeData, setHomeData] = useState<any | null>(null);
  const [briefData, setBriefData] = useState<any | null>(null);
  const [myDayData, setMyDayData] = useState<any | null>(null);
  const [allProjects, setAllProjects] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Overlays
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<VisualPageSpec | null>(null);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);

  const fetchPortalData = useCallback(async (projectId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (projectId) qs.set("projectId", projectId);
      if (previewEmployeeId) qs.set("previewEmployeeId", previewEmployeeId);

      const [homeRes, briefRes, dayRes] = await Promise.all([
        fetch(`/api/employee/os/home?${qs.toString()}`),
        fetch(`/api/employee/project-brief?${qs.toString()}`),
        fetch(`/api/employee/os/my-day?${qs.toString()}`),
      ]);

      const homeJson = await homeRes.json();
      const briefJson = await briefRes.json();
      const dayJson = await dayRes.json();

      if (!homeJson.ok && !briefJson.ok) {
        throw new Error(homeJson.message || briefJson.message || "Failed to load Employee OS.");
      }

      if (homeJson.ok) setHomeData(homeJson.data);
      if (briefJson.ok) {
        const briefObj = briefJson.brief || briefJson.data || null;
        setBriefData(briefObj);
        const projects = briefJson.availableProjects || briefJson.allProjects || [];
        setAllProjects(projects);
        if (!selectedProjectId) {
          setSelectedProjectId(briefObj?.projectId || briefObj?.audit?.projectId || homeJson.data?.project?.id || null);
        }
      }
      if (dayJson.ok) setMyDayData(dayJson.data);
    } catch (err: any) {
      setError(err.message || "Could not connect to workspace.");
    } finally {
      setLoading(false);
    }
  }, [previewEmployeeId, selectedProjectId]);

  useEffect(() => {
    fetchPortalData(selectedProjectId || undefined);
  }, [selectedProjectId, fetchPortalData]);

  const handleStartBuild = (taskId?: string) => {
    if (taskId) setTargetTaskId(taskId);
    setActiveTab("BUILD");
  };

  const navItems: Array<{ key: ActiveTab; label: string; icon: any }> = [
    { key: "HOME", label: "Home", icon: Home },
    { key: "MY_DAY", label: "My Day", icon: Layers },
    { key: "PRODUCT", label: "Product", icon: FolderKanban },
    { key: "RESPONSIBILITY", label: "Responsibility", icon: FileCode },
    { key: "BUILD", label: "Build Center", icon: Play },
    { key: "DEPENDENCIES", label: "Dependencies", icon: Server },
    { key: "TEAM", label: "Team", icon: Users },
    { key: "DECISIONS", label: "Decisions", icon: Sparkles },
    { key: "INBOX", label: "Inbox", icon: Inbox },
  ];

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] relative flex flex-col font-sans selection:bg-[var(--bos-accent)] selection:text-white">
      <SystemGrid />
      <AmbientBackground />

      {/* ── TOP APPLICATION BAR ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[var(--bos-surface-panel)]/90 backdrop-blur-md border-b border-[var(--bos-border)] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand + Project Switcher */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <BusinessOSLogo size="md" />
            <div className="hidden sm:block">
              <span className="font-extrabold text-xs tracking-wider text-[var(--bos-text-primary)] block">
                EMPLOYEE OS 3.0
              </span>
              <span className="font-mono text-[9px] text-[var(--bos-text-tertiary)] uppercase block">
                Single Source of Truth
              </span>
            </div>
          </div>

          {/* Project Switcher */}
          {allProjects.length > 1 && (
            <div className="relative">
              <select
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl px-3 py-1.5 pr-8 text-xs font-mono text-[var(--bos-text-primary)] outline-none cursor-pointer hover:border-[var(--bos-accent)]/50 transition-colors"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-secondary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Center: Primary Navigation Bar */}
        <nav className="hidden xl:flex items-center gap-1 bg-[var(--bos-surface)] p-1 rounded-2xl border border-[var(--bos-border)] font-mono text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-medium",
                  active
                    ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Command Center, AI Coach, User Signout */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Command className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
            <span className="hidden sm:inline">Ctrl+K</span>
          </button>

          <button
            onClick={() => setIsCoachOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Coach</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-[var(--bos-text-secondary)] hover:text-rose-400 hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Secondary Mobile Nav for smaller viewports */}
      <div className="xl:hidden flex items-center gap-1 overflow-x-auto p-2 bg-[var(--bos-surface-panel)] border-b border-[var(--bos-border)] px-4 font-mono text-xs">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={cn(
              "px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer",
              activeTab === item.key
                ? "bg-[var(--bos-accent)] text-white font-bold"
                : "text-[var(--bos-text-secondary)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT WORKSPACE ─────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
            <span>SYNCHRONIZING REAL DATABASE TRUTH...</span>
          </div>
        ) : error ? (
          <div className="p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-rose-500/30 text-center space-y-3">
            <p className="text-rose-400 font-mono text-xs">{error}</p>
            <button
              onClick={() => fetchPortalData(selectedProjectId || undefined)}
              className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {activeTab === "HOME" && (
              <EmployeeOSHomeView
                homeData={homeData}
                onNavigate={(tab) => setActiveTab(tab as any)}
                onStartBuild={handleStartBuild}
              />
            )}

            {activeTab === "MY_DAY" && (
              <EmployeeOSMyDayView
                myDayData={myDayData}
                onStartBuild={handleStartBuild}
              />
            )}

            {activeTab === "PRODUCT" && (
              <EmployeeOSProductExplorerView
                productMap={briefData?.productMap || []}
                architectureConnections={briefData?.architectureConnections || []}
                projectName={briefData?.projectName || homeData?.project?.name || "Project"}
                onSelectFeature={(feat) => setSelectedFeature(feat)}
              />
            )}

            {activeTab === "RESPONSIBILITY" && (
              <EmployeeOSResponsibilityView
                briefData={briefData || {
                  roleOwnership: { youOwn: [], responsibleFor: [], workIncludes: [], consumes: [], dependsOn: [] },
                  productMap: [],
                  architectureConnections: [],
                  acceptanceCriteria: [],
                  projectRole: homeData?.employee?.role || "Engineer",
                  responsibility: "Engineering & Implementation",
                  workstream: homeData?.employee?.workstream || "FRONTEND",
                }}
                onSelectFeature={(feat) => setSelectedFeature(feat)}
              />
            )}

            {activeTab === "BUILD" && (
              <EmployeeOSBuildCenterView
                projectId={homeData?.project?.id || briefData?.projectId || selectedProjectId || ""}
                projectName={homeData?.project?.name || briefData?.projectName || "Project"}
                workstream={homeData?.employee?.workstream || briefData?.workstream || "FRONTEND"}
                projectRole={homeData?.employee?.role || briefData?.projectRole || "Engineer"}
                selectedTaskId={targetTaskId}
                onSessionUpdate={() => fetchPortalData(selectedProjectId || undefined)}
              />
            )}

            {activeTab === "DEPENDENCIES" && (
              <EmployeeOSDependencyRadarView
                projectId={homeData?.project?.id || briefData?.projectId || selectedProjectId || ""}
                projectName={homeData?.project?.name || briefData?.projectName || "Project"}
              />
            )}

            {activeTab === "TEAM" && (
              <EmployeeOSTeamView
                projectData={briefData}
                onAskCoach={(name) => setIsCoachOpen(true)}
              />
            )}

            {activeTab === "DECISIONS" && (
              <EmployeeOSDecisionsView projectId={homeData?.project?.id || briefData?.projectId || selectedProjectId || ""} />
            )}

            {activeTab === "INBOX" && (
              <EmployeeOSInboxView onNavigateToAction={(url) => setActiveTab("BUILD")} />
            )}
          </>
        )}
      </main>

      {/* ── OVERLAYS & MODALS ──────────────────────────────────────── */}
      <EmployeeOSCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={(actionType, payload) => {
          if (actionType === "NAV") setActiveTab(payload);
          if (actionType === "OPEN_COACH") setIsCoachOpen(true);
        }}
        projectData={briefData}
      />

      {(homeData?.project?.id || briefData?.projectId) && (
        <EmployeeOSAICoachDrawer
          isOpen={isCoachOpen}
          onClose={() => setIsCoachOpen(false)}
          projectId={homeData?.project?.id || briefData?.projectId || ""}
          projectName={homeData?.project?.name || briefData?.projectName || "Project"}
          projectRole={homeData?.employee?.role || briefData?.projectRole || "Engineer"}
          workstream={homeData?.employee?.workstream || briefData?.workstream || "FRONTEND"}
          previewEmployeeId={previewEmployeeId}
        />
      )}

      {selectedFeature && (
        <FeatureDetailDrawer
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          projectName={briefData?.projectName || homeData?.project?.name || "Project"}
          workstream={homeData?.employee?.workstream || briefData?.workstream || "FRONTEND"}
          projectRole={homeData?.employee?.role || briefData?.projectRole || "Engineer"}
        />
      )}

      {isBuildModalOpen && (
        <EmployeeBuildModeModal
          isOpen={isBuildModalOpen}
          onClose={() => setIsBuildModalOpen(false)}
          projectId={briefData?.projectId || homeData?.project?.id || ""}
          projectName={briefData?.projectName || homeData?.project?.name || "Project"}
          workstream={briefData?.workstream || homeData?.employee?.workstream || "FRONTEND"}
          projectRole={briefData?.projectRole || homeData?.employee?.role || "Engineer"}
        />
      )}
    </div>
  );
}
