"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FolderGit2,
  Package,
  Users,
  Search,
  Command,
  ArrowRight,
  ChevronDown,
  Building2,
  LogOut,
  Sparkles,
  Shield,
  Layers,
  Calendar,
  Activity,
  FileText,
  Filter,
  Check,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";

type TabKey = "MY_WORK" | "PROJECTS" | "DELIVERABLES" | "TEAM" | "ACCESS";

export default function EmployeeWorkPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>("MY_WORK");

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  const fetchWorkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/employee/work");
      const json = await res.json();

      if (json.ok) {
        setData(json);
      } else {
        setError(json.message || "Failed to load employee workspace.");
      }
    } catch {
      setError("Business OS couldn't reach your workspace. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkData();
  }, [fetchWorkData]);

  // Keyboard shortcut for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setOrgDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col items-center justify-center p-6 gap-3 font-sans">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
        <p className="text-xs font-mono text-[var(--bos-text-secondary)] tracking-wider uppercase">
          RESTORING WORKSPACE CONTEXT...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-lg font-medium text-[var(--bos-text-primary)]">Workspace Error</h2>
          <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">{error}</p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={fetchWorkData}
              className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold uppercase rounded-sm"
            >
              Retry
            </button>
            <a
              href="/auth/employee/login"
              className="px-4 py-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] text-xs font-mono font-semibold uppercase rounded-sm"
            >
              Sign In Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { context, work } = data;
  const { employee, organization, role, team, capabilities, organizations } = context;
  const { metrics, sections, projects, deliverables, teamMembers, recentActivities } = work;

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* ── Top Bar ── */}
      <header className="relative z-20 h-14 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-xs">
              ⬡
            </div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
              BUSINESS OS
            </span>
          </div>

          <div className="h-4 w-px bg-[var(--bos-line)]" />

          {/* Organization Switcher */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-xs font-mono text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="font-semibold">{organization.name}</span>
              <ChevronDown className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 p-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm shadow-md z-30 font-mono text-xs space-y-1">
                <span className="text-[9.5px] uppercase tracking-wider text-[var(--bos-text-tertiary)] px-2 py-1 block">
                  YOUR ORGANIZATIONS
                </span>
                {organizations.map((org: any) => (
                  <div
                    key={org.workspaceId}
                    className={`flex items-center justify-between p-2 rounded-xs transition-colors ${
                      org.isCurrent ? "bg-[var(--bos-bg)] font-semibold text-[var(--bos-accent)]" : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-bg)]"
                    }`}
                  >
                    <div>
                      <span className="block">{org.workspaceName}</span>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] font-normal">{org.role}</span>
                    </div>
                    {org.isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-xs bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[10.5px] font-mono text-[var(--bos-text-secondary)]">
            {role.name} · {team.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Command Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quick command</span>
            <kbd className="px-1.5 py-0.5 rounded-xs bg-[var(--bos-bg)] border border-[var(--bos-line)] text-[10px]">
              ⌘K
            </kbd>
          </button>

          {/* User & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-[var(--bos-line)]">
            <span className="text-xs font-mono text-[var(--bos-text-primary)] font-medium hidden md:inline">
              {employee.fullName}
            </span>
            <button
              onClick={handleLogout}
              title="Sign out of Business OS"
              className="p-1.5 rounded-sm hover:bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)] hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--bos-line)] pb-6">
          <div>
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1">
              OPERATING ENVIRONMENT ACTIVE
            </span>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[var(--bos-text-primary)]">
              {greeting}, {employee.fullName.split(" ")[0]}
            </h1>
            <p className="text-xs text-[var(--bos-text-secondary)] mt-1">
              Here's what needs your attention in <strong className="text-[var(--bos-text-primary)]">{organization.name}</strong>.
            </p>
          </div>

          {/* Metric Status Strips */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="px-3 py-2 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)]">
              <span className="text-[9.5px] uppercase text-[var(--bos-text-tertiary)] block">DUE TODAY</span>
              <span className={`text-base font-bold ${metrics.dueTodayCount > 0 ? "text-rose-600" : "text-[var(--bos-text-primary)]"}`}>
                {metrics.dueTodayCount}
              </span>
            </div>
            <div className="px-3 py-2 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)]">
              <span className="text-[9.5px] uppercase text-[var(--bos-text-tertiary)] block">IN PROGRESS</span>
              <span className="text-base font-bold text-[var(--bos-accent)]">{metrics.inProgressCount}</span>
            </div>
            <div className="px-3 py-2 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)]">
              <span className="text-[9.5px] uppercase text-[var(--bos-text-tertiary)] block">BLOCKED</span>
              <span className={`text-base font-bold ${metrics.blockedCount > 0 ? "text-amber-600" : "text-[var(--bos-text-primary)]"}`}>
                {metrics.blockedCount}
              </span>
            </div>
            <div className="px-3 py-2 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)]">
              <span className="text-[9.5px] uppercase text-[var(--bos-text-tertiary)] block">PROJECTS</span>
              <span className="text-base font-bold text-[var(--bos-text-primary)]">{metrics.projectsCount}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--bos-line)] pb-2 font-mono text-xs">
          {[
            { id: "MY_WORK", label: "MY WORK" },
            { id: "PROJECTS", label: `PROJECTS (${projects.length})` },
            { id: "DELIVERABLES", label: `DELIVERABLES (${deliverables.length})` },
            { id: "TEAM", label: `TEAM (${teamMembers.length})` },
            { id: "ACCESS", label: "MY ACCESS" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] font-semibold border border-[var(--bos-border)] shadow-2xs"
                  : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: MY WORK (Execution Backbone) ── */}
        {activeTab === "MY_WORK" && (
          <div className="space-y-8">
            {/* DUE TODAY */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-primary)]">
                    DUE TODAY & OVERDUE
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                  {sections.dueToday.length} item{sections.dueToday.length === 1 ? "" : "s"}
                </span>
              </div>

              {sections.dueToday.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {sections.dueToday.map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-center font-mono">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                  <span className="text-xs font-semibold text-[var(--bos-text-primary)] block">NO WORK DUE TODAY</span>
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] mt-0.5">You're clear for now.</p>
                </div>
              )}
            </section>

            {/* BLOCKED */}
            {sections.blocked.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
                      BLOCKED WORK
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    {sections.blocked.length} item{sections.blocked.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {sections.blocked.map((task: any) => (
                    <TaskCard key={task.id} task={task} isBlocked />
                  ))}
                </div>
              </section>
            )}

            {/* IN PROGRESS */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--bos-accent)]" />
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-primary)]">
                    IN PROGRESS
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                  {sections.inProgress.length} item{sections.inProgress.length === 1 ? "" : "s"}
                </span>
              </div>

              {sections.inProgress.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {sections.inProgress.map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-center font-mono">
                  <span className="text-xs font-medium text-[var(--bos-text-secondary)] block">NO TASKS CURRENTLY IN PROGRESS</span>
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] mt-0.5">Select upcoming work to begin execution.</p>
                </div>
              )}
            </section>

            {/* WAITING FOR REVIEW */}
            {sections.inReview.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-primary)]">
                      WAITING FOR REVIEW & QA
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    {sections.inReview.length} item{sections.inReview.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {sections.inReview.map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )}

            {/* UPCOMING */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)]">
                    UPCOMING & BACKLOG
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                  {sections.upcoming.length} item{sections.upcoming.length === 1 ? "" : "s"}
                </span>
              </div>

              {sections.upcoming.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {sections.upcoming.map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-center font-mono">
                  <span className="text-xs font-medium text-[var(--bos-text-secondary)] block">NO UPCOMING TASKS</span>
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] mt-0.5">All tasks assigned to you are up to date.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── TAB 2: PROJECTS ── */}
        {activeTab === "PROJECTS" && (
          <div className="space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-primary)]">
              ASSIGNED CLIENT PROJECTS
            </h2>

            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="p-5 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 font-mono"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-[var(--bos-accent)] font-bold uppercase tracking-wider block">
                          {proj.code || "PROJECT"} · {proj.clientName}
                        </span>
                        <h3 className="text-base font-medium text-[var(--bos-text-primary)] font-sans mt-0.5">
                          {proj.name}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-xs bg-[var(--bos-bg)] border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)]">
                        {proj.stage}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--bos-text-tertiary)]">Stage Progress</span>
                        <span className="font-semibold text-[var(--bos-text-primary)]">{proj.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--bos-bg)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--bos-accent)] transition-all"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--bos-line)] flex items-center justify-between text-[11px] text-[var(--bos-text-secondary)]">
                      <span>Role: <strong className="text-[var(--bos-text-primary)]">{proj.role}</strong></span>
                      <span>Allocated: {proj.allocation}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-center font-mono">
                <FolderGit2 className="w-6 h-6 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
                <span className="text-xs font-medium text-[var(--bos-text-secondary)] block">NO DIRECT PROJECT ALLOCATIONS</span>
                <p className="text-[11px] text-[var(--bos-text-tertiary)] mt-0.5">You are available for project staffing.</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: DELIVERABLES ── */}
        {activeTab === "DELIVERABLES" && (
          <div className="space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-primary)]">
              PROJECT DELIVERABLES & MILESTONES
            </h2>

            {deliverables.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {deliverables.map((del: any) => (
                  <div
                    key={del.id}
                    className="p-4 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between font-mono text-xs"
                  >
                    <div>
                      <span className="text-[10px] text-[var(--bos-accent)] uppercase block">
                        {del.projectName} · {del.category}
                      </span>
                      <strong className="text-sm font-sans font-medium text-[var(--bos-text-primary)] block mt-0.5">
                        {del.title}
                      </strong>
                    </div>
                    <span className="px-2.5 py-1 rounded-xs bg-[var(--bos-bg)] border border-[var(--bos-line)] text-[10.5px]">
                      {del.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-center font-mono">
                <Package className="w-6 h-6 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
                <span className="text-xs font-medium text-[var(--bos-text-secondary)] block">NO DELIVERABLES PENDING</span>
                <p className="text-[11px] text-[var(--bos-text-tertiary)] mt-0.5">Deliverables are created from approved proposals.</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: TEAM ── */}
        {activeTab === "TEAM" && (
          <div className="space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--bos-text-primary)]">
              ORGANIZATION TEAM · {team.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {teamMembers.map((member: any) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-sm bg-[var(--bos-surface)] border font-mono text-xs space-y-1.5 ${
                    member.isCurrentUser ? "border-[var(--bos-accent)] shadow-2xs" : "border-[var(--bos-line)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-[var(--bos-text-primary)] font-semibold">
                      {member.name} {member.isCurrentUser && <span className="text-[var(--bos-accent)]">(You)</span>}
                    </strong>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                  <span className="text-[11px] text-[var(--bos-text-secondary)] block">{member.role}</span>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] block">{member.department}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: MY ACCESS ── */}
        {activeTab === "ACCESS" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1">
                ACCESS & PERMISSIONS
              </span>
              <h2 className="text-xl font-normal text-[var(--bos-text-primary)]">
                Your Operating System Capabilities
              </h2>
            </div>

            <div className="p-5 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-4 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-emerald-600 font-semibold block mb-2">
                  AUTHORIZED PERMISSIONS:
                </span>
                <div className="space-y-2">
                  {capabilities.permissions.can.map((item: string) => (
                    <div key={item} className="flex items-start gap-2 text-[var(--bos-text-primary)]">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--bos-line)]">
                <span className="text-[10px] uppercase text-[var(--bos-text-tertiary)] font-semibold block mb-2">
                  ORGANIZATION RESTRICTIONS:
                </span>
                <div className="space-y-1 text-[var(--bos-text-tertiary)]">
                  {capabilities.permissions.cannot.map((item: string) => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="opacity-50">—</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Command Palette Modal (⌘K) ── */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[var(--bos-surface)] border border-[var(--bos-border-strong)] rounded-sm shadow-xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 p-3 border-b border-[var(--bos-line)]">
              <Search className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or navigate workspace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-hidden"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
              <span className="text-[9.5px] uppercase tracking-wider text-[var(--bos-text-tertiary)] px-2 py-1 block">
                PERMITTED ACTIONS
              </span>
              {[
                { label: "Switch to My Work", action: () => { setActiveTab("MY_WORK"); setCommandPaletteOpen(false); } },
                { label: "View Assigned Projects", action: () => { setActiveTab("PROJECTS"); setCommandPaletteOpen(false); } },
                { label: "View Deliverables & Milestones", action: () => { setActiveTab("DELIVERABLES"); setCommandPaletteOpen(false); } },
                { label: "View Team Pulse", action: () => { setActiveTab("TEAM"); setCommandPaletteOpen(false); } },
                { label: "Inspect My Access Matrix", action: () => { setActiveTab("ACCESS"); setCommandPaletteOpen(false); } },
                { label: "Sign out of Business OS", action: handleLogout },
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={cmd.action}
                  className="w-full flex items-center justify-between p-2 rounded-xs hover:bg-[var(--bos-bg)] text-left text-[var(--bos-text-primary)] cursor-pointer"
                >
                  <span>{cmd.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--bos-line)] px-6 py-4 flex items-center justify-between text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
        <span>BUSINESS OS · EMPLOYEE EXECUTION WORKSPACE</span>
        <span>CONNECTED OPERATING ENVIRONMENT</span>
      </footer>
    </div>
  );
}

function TaskCard({ task, isBlocked }: { task: any; isBlocked?: boolean }) {
  return (
    <div
      className={`p-4 rounded-sm bg-[var(--bos-surface)] border transition-all font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isBlocked
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-[var(--bos-line)] hover:border-[var(--bos-border-strong)]"
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--bos-accent)] font-bold uppercase tracking-wider">
            {task.code || "TASK"}
          </span>
          {task.project && (
            <span className="text-[10.5px] text-[var(--bos-text-secondary)]">
              · {task.project.name}
            </span>
          )}
          {task.workstream && (
            <span className="px-1.5 py-0.5 rounded-xs bg-[var(--bos-bg)] border border-[var(--bos-line)] text-[9.5px] text-[var(--bos-text-tertiary)]">
              {task.workstream}
            </span>
          )}
        </div>

        <h4 className="text-sm font-sans font-medium text-[var(--bos-text-primary)]">
          {task.title}
        </h4>

        {isBlocked && task.blockedReason && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-sans mt-0.5">
            Blocked reason: {task.blockedReason}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`px-2 py-0.5 rounded-xs text-[10.5px] font-mono ${
            task.status === "IN_PROGRESS"
              ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)]"
              : task.status === "BLOCKED"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              : "bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] border border-[var(--bos-line)]"
          }`}
        >
          {task.status}
        </span>
      </div>
    </div>
  );
}
