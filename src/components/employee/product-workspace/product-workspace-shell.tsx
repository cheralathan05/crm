"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home,
  FolderKanban,
  Play,
  FileCode,
  Sparkles,
  Command,
  LogOut,
  ChevronDown,
  Loader2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";

// Dedicated Views
import { EmployeeProductHomeView } from "./employee-product-home";
import { VisualProductMapView } from "./visual-product-map-view";
import { FeaturePageView } from "./feature-page-view";
import { BuildWorkspaceView } from "./build-workspace-view";
import { BuildJourneySignatureView } from "./build-journey-signature-view";
import { EmployeeOSResponsibilityView } from "@/components/employee/os/employee-os-responsibility-view";

// Modals
import { ProofCaptureModal } from "./proof-capture-modal";
import { PreSubmissionModal } from "./pre-submission-modal";
import { AIBuildReviewModal } from "./ai-build-review-modal";
import { HandoffModal } from "./handoff-modal";
import { BlockerModal } from "./blocker-modal";
import { EmployeeOSCommandPalette } from "@/components/employee/os/employee-os-command-palette";
import { EmployeeOSAICoachDrawer } from "@/components/employee/os/employee-os-ai-coach-drawer";

type ActiveTab = "HOME" | "MAP" | "FEATURE" | "BUILD" | "RESPONSIBILITY" | "JOURNEY";

interface WorkspaceShellProps {
  onLogout: () => void;
  previewEmployeeId?: string | null;
}

export function EmployeeProductWorkspaceShell({
  onLogout,
  previewEmployeeId,
}: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("HOME");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [homeData, setHomeData] = useState<any | null>(null);
  const [briefData, setBriefData] = useState<any | null>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFeatureName, setSelectedFeatureName] = useState<string>("Core Application Experience");

  // Modals
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAIReviewModalOpen, setIsAIReviewModalOpen] = useState(false);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  const fetchWorkspace = useCallback(async (projectId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (projectId) qs.set("projectId", projectId);
      if (previewEmployeeId) qs.set("previewEmployeeId", previewEmployeeId);

      const [homeRes, briefRes] = await Promise.all([
        fetch(`/api/employee/product/home?${qs.toString()}`),
        fetch(`/api/employee/project-brief?${qs.toString()}`),
      ]);

      const homeJson = await homeRes.json();
      const briefJson = await briefRes.json();

      if (!homeJson.ok && !briefJson.ok) {
        throw new Error(homeJson.message || briefJson.message || "Failed to load product workspace.");
      }

      if (homeJson.ok) {
        setHomeData(homeJson.data);
        if (homeJson.data.currentBuild?.featureName) {
          setSelectedFeatureName(homeJson.data.currentBuild.featureName);
        }
      }

      if (briefJson.ok) {
        const briefObj = briefJson.brief || briefJson.data;
        setBriefData(briefObj);
        const projs = briefJson.availableProjects || briefJson.allProjects || [];
        setAllProjects(projs);
        if (!selectedProjectId) {
          setSelectedProjectId(briefObj?.projectId || homeJson.data?.project?.id || null);
        }
      }
    } catch (err: any) {
      setError(err.message || "Error loading workspace.");
    } finally {
      setLoading(false);
    }
  }, [previewEmployeeId, selectedProjectId]);

  useEffect(() => {
    fetchWorkspace(selectedProjectId || undefined);
  }, [selectedProjectId, fetchWorkspace]);

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] relative flex flex-col font-sans selection:bg-[var(--bos-accent)] selection:text-white">
      <SystemGrid />
      <AmbientBackground />

      {/* ── TOP HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[var(--bos-surface-panel)]/90 backdrop-blur-md border-b border-[var(--bos-border)] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <BusinessOSLogo size="md" />
            <div className="hidden sm:block">
              <span className="font-extrabold text-xs tracking-wider text-[var(--bos-text-primary)] block">
                PRODUCT WORKSPACE
              </span>
              <span className="font-mono text-[9px] text-[var(--bos-text-tertiary)] uppercase block">
                Single Source of Truth
              </span>
            </div>
          </div>

          {allProjects.length > 1 && (
            <div className="relative">
              <select
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl px-3 py-1.5 pr-8 text-xs font-mono text-[var(--bos-text-primary)] outline-none cursor-pointer"
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

        {/* Primary View Switcher */}
        <nav className="hidden md:flex items-center gap-1 bg-[var(--bos-surface)] p-1 rounded-2xl border border-[var(--bos-border)] font-mono text-xs">
          {[
            { key: "HOME", label: "Home", icon: Home },
            { key: "MAP", label: "Product Map", icon: FolderKanban },
            { key: "BUILD", label: "Build Workspace", icon: Play },
            { key: "JOURNEY", label: "Build Journey", icon: Sparkles },
            { key: "RESPONSIBILITY", label: "Responsibility", icon: FileCode },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-medium",
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

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsPaletteOpen(true)}
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

      {/* Secondary Mobile Nav */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto p-2 bg-[var(--bos-surface-panel)] border-b border-[var(--bos-border)] px-4 font-mono text-xs">
        {[
          { key: "HOME", label: "Home" },
          { key: "MAP", label: "Product Map" },
          { key: "BUILD", label: "Build Workspace" },
          { key: "JOURNEY", label: "Build Journey" },
          { key: "RESPONSIBILITY", label: "Responsibility" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key as any)}
            className={cn(
              "px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer",
              activeTab === item.key ? "bg-[var(--bos-accent)] text-white font-bold" : "text-[var(--bos-text-secondary)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
            <span>SYNCHRONIZING PRODUCT WORKSPACE...</span>
          </div>
        ) : error ? (
          <div className="p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-rose-500/30 text-center space-y-3">
            <p className="text-rose-400 font-mono text-xs">{error}</p>
            <button
              onClick={() => fetchWorkspace(selectedProjectId || undefined)}
              className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {activeTab === "HOME" && (
              <EmployeeProductHomeView
                data={homeData}
                onNavigateToBuild={() => setActiveTab("BUILD")}
                onOpenProductMap={() => setActiveTab("MAP")}
                onOpenFeature={(fName) => {
                  setSelectedFeatureName(fName);
                  setActiveTab("FEATURE");
                }}
              />
            )}

            {activeTab === "MAP" && (
              <VisualProductMapView
                projectId={homeData?.project?.id || selectedProjectId || ""}
                onSelectFeature={(fName) => {
                  setSelectedFeatureName(fName);
                  setActiveTab("FEATURE");
                }}
              />
            )}

            {activeTab === "FEATURE" && (
              <FeaturePageView
                projectId={homeData?.project?.id || selectedProjectId || ""}
                featureName={selectedFeatureName}
                onStartBuild={() => setActiveTab("BUILD")}
                onBack={() => setActiveTab("HOME")}
              />
            )}

            {activeTab === "BUILD" && (
              <BuildWorkspaceView
                homeData={homeData}
                onOpenProofModal={() => setIsProofModalOpen(true)}
                onOpenBlockerModal={() => setIsBlockerModalOpen(true)}
                onOpenAIReviewModal={() => setIsAIReviewModalOpen(true)}
                onOpenHandoffModal={() => setIsHandoffModalOpen(true)}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                onOpenSignatureView={() => setActiveTab("JOURNEY")}
              />
            )}

            {activeTab === "JOURNEY" && (
              <BuildJourneySignatureView
                buildId={homeData?.currentBuild?.id}
                onReturnToBuild={() => setActiveTab("BUILD")}
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
                  responsibility: homeData?.yourArea?.responsibility || "Implementation",
                  workstream: homeData?.employee?.workstream || "FRONTEND",
                }}
              />
            )}
          </>
        )}
      </main>

      {/* ── MODALS & DRAWERS ───────────────────────────────────────── */}
      {homeData && (
        <>
          <ProofCaptureModal
            isOpen={isProofModalOpen}
            onClose={() => setIsProofModalOpen(false)}
            buildId={homeData.currentBuild.id}
            featureName={homeData.currentBuild.featureName}
            onProofCaptured={() => fetchWorkspace(selectedProjectId || undefined)}
          />

          <PreSubmissionModal
            isOpen={isSubmitModalOpen}
            onClose={() => setIsSubmitModalOpen(false)}
            buildId={homeData.currentBuild.id}
            onSubmitted={(subData) => {
              fetchWorkspace(selectedProjectId || undefined);
              setActiveTab("JOURNEY");
            }}
          />

          <AIBuildReviewModal
            isOpen={isAIReviewModalOpen}
            onClose={() => setIsAIReviewModalOpen(false)}
            buildId={homeData.currentBuild.id}
            featureName={homeData.currentBuild.featureName}
            expectedResult={homeData.currentBuild.expectedResult}
          />

          <HandoffModal
            isOpen={isHandoffModalOpen}
            onClose={() => setIsHandoffModalOpen(false)}
            buildId={homeData.currentBuild.id}
            featureName={homeData.currentBuild.featureName}
            onHandoffExecuted={() => fetchWorkspace(selectedProjectId || undefined)}
          />

          <BlockerModal
            isOpen={isBlockerModalOpen}
            onClose={() => setIsBlockerModalOpen(false)}
            buildId={homeData.currentBuild.id}
            featureName={homeData.currentBuild.featureName}
            onBlockerReported={() => fetchWorkspace(selectedProjectId || undefined)}
          />

          <EmployeeOSAICoachDrawer
            isOpen={isCoachOpen}
            onClose={() => setIsCoachOpen(false)}
            projectId={homeData.project.id}
            projectName={homeData.project.name}
            projectRole={homeData.employee.role}
            workstream={homeData.employee.workstream}
            previewEmployeeId={previewEmployeeId}
          />

          <EmployeeOSCommandPalette
            isOpen={isPaletteOpen}
            onClose={() => setIsPaletteOpen(false)}
            onSelectAction={(actionType, payload) => {
              if (actionType === "NAV") setActiveTab(payload);
              if (actionType === "OPEN_COACH") setIsCoachOpen(true);
            }}
            projectData={briefData}
          />
        </>
      )}
    </div>
  );
}
