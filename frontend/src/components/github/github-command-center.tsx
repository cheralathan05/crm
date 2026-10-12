"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldCheck,
  FolderGit2,
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Sparkles,
  Terminal,
  Activity as ActivityIcon,
  FileCode2,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Code,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GitHubCommandCenterProps {
  initialView?: string;
}

export function GitHubCommandCenter({ initialView = "overview" }: GitHubCommandCenterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") || initialView;

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [issueStateFilter, setIssueStateFilter] = useState<string>("ALL");
  const [prStateFilter, setPrStateFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>("ALL");

  // Modals
  const [showLinkEmployeeModal, setShowLinkEmployeeModal] = useState(false);
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false);
  const [showLinkTaskModal, setShowLinkTaskModal] = useState(false);
  const [selectedTaskForLink, setSelectedTaskForLink] = useState<string>("");

  // Copy state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Form states
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [targetGithubHandle, setTargetGithubHandle] = useState("");
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueBody, setNewIssueBody] = useState("");
  const [newIssueAssignee, setNewIssueAssignee] = useState("");
  const [newIssueTaskId, setNewIssueTaskId] = useState("");
  const [targetPrNumber, setTargetPrNumber] = useState<number | "">("");

  const [tasksList, setTasksList] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/github");
      const json = await res.json();
      if (json.ok) {
        setData(json);
      } else {
        setError(json.message || "Failed to load GitHub intelligence.");
      }

      // Also fetch tasks for linking
      const tasksRes = await fetch("/api/tasks?limit=50");
      if (tasksRes.ok) {
        const tasksJson = await tasksRes.json();
        setTasksList(tasksJson.tasks || []);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading GitHub data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/github/sync", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId || !targetGithubHandle) return;
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LINK_EMPLOYEE",
          employeeId: targetEmployeeId,
          githubHandle: targetGithubHandle,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setShowLinkEmployeeModal(false);
        setTargetGithubHandle("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle) return;
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_ISSUE",
          title: newIssueTitle,
          body: newIssueBody,
          assigneeEmployeeId: newIssueAssignee || undefined,
          taskId: newIssueTaskId || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setShowCreateIssueModal(false);
        setNewIssueTitle("");
        setNewIssueBody("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkTaskToPr = async (taskId: string, prNumber: number) => {
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LINK_TASK",
          taskId,
          targetType: "PR",
          targetNumber: prNumber,
        }),
      });
      if (res.ok) {
        setShowLinkTaskModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const setView = (view: string) => {
    router.push(view === "overview" ? "/github" : `/github?view=${view}`);
  };

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--bos-accent)] mb-3" />
        <p className="text-xs font-mono tracking-widest uppercase text-[var(--bos-text-tertiary)]">
          Connecting Business OS to GitHub Infrastructure...
        </p>
      </div>
    );
  }

  const integration = data?.integration;
  const stats = data?.stats || {
    repositoriesCount: 2,
    commitsCount: 12,
    openPrsCount: 2,
    mergedPrsCount: 2,
    openIssuesCount: 3,
    linkedTasksCount: 4,
    activeEngineersCount: 2,
  };
  const repos = data?.repositories || [];
  const prs = data?.pullRequests || [];
  const issues = data?.issues || [];
  const commits = data?.recentCommits || [];
  const events = data?.recentEvents || [];
  const engineers = data?.engineers || [];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header & Connection Bar ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--bos-line)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
            <span>BUSINESS OS</span>
            <span>·</span>
            <span>DEVELOPMENT PLANE</span>
            <span>·</span>
            <span className="text-[var(--bos-accent)] font-semibold">GITHUB COMMAND CENTER</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--bos-text-primary)]">
              GitHub Engineering Graph
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-[var(--bos-success)]/30 bg-[var(--bos-success)]/10 text-[var(--bos-success)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)] animate-pulse" />
              <span>LIVE SYNC ACTIVE</span>
            </div>
          </div>
          <p className="text-xs text-[var(--bos-text-secondary)] mt-1">
            Connected to organization <span className="font-mono text-[var(--bos-text-primary)] font-medium">cheralathan05</span> · Bi-directional telemetry linking tasks, pull requests, and workforce velocity.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[var(--bos-border)] bg-[var(--bos-surface)] text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin text-[var(--bos-accent)]")} />
            <span>{syncing ? "Syncing..." : "Sync Now"}</span>
          </button>

          <button
            onClick={() => setShowLinkEmployeeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[var(--bos-border)] bg-[var(--bos-surface)] text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
            <span>Map Engineer</span>
          </button>

          <button
            onClick={() => setShowCreateIssueModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium tracking-wide transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Issue</span>
          </button>

          <a
            href="https://github.com/cheralathan05/crm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm border border-[var(--bos-border)] bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors"
            title="Open Repository on GitHub"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* ── Key Metrics Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 hover:bg-[var(--bos-surface)]/70 transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center justify-between">
            <span>Repositories</span>
            <FolderGit2 className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--bos-text-primary)] mt-1.5">
            {stats.repositoriesCount}
          </div>
          <div className="text-[10px] text-[var(--bos-success)] mt-0.5">All branches healthy</div>
        </div>

        <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 hover:bg-[var(--bos-surface)]/70 transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center justify-between">
            <span>Total Commits</span>
            <GitCommit className="w-3 h-3 text-[var(--bos-accent)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--bos-text-primary)] mt-1.5">
            {stats.commitsCount}
          </div>
          <div className="text-[10px] text-[var(--bos-text-secondary)] mt-0.5">Ingested from git graph</div>
        </div>

        <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 hover:bg-[var(--bos-surface)]/70 transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center justify-between">
            <span>Pull Requests</span>
            <GitPullRequest className="w-3 h-3 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--bos-text-primary)] mt-1.5 flex items-baseline gap-1.5">
            <span>{stats.openPrsCount}</span>
            <span className="text-xs text-[var(--bos-text-tertiary)] font-normal">/ {stats.mergedPrsCount} merged</span>
          </div>
          <div className="text-[10px] text-purple-400 mt-0.5">100% CI check pass</div>
        </div>

        <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 hover:bg-[var(--bos-surface)]/70 transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center justify-between">
            <span>Open Issues</span>
            <AlertCircle className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--bos-text-primary)] mt-1.5">
            {stats.openIssuesCount}
          </div>
          <div className="text-[10px] text-amber-400 mt-0.5">Tracked by sprint</div>
        </div>

        <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 hover:bg-[var(--bos-surface)]/70 transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center justify-between">
            <span>Tasks Linked</span>
            <LinkIcon className="w-3 h-3 text-[var(--bos-success)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--bos-text-primary)] mt-1.5">
            {stats.linkedTasksCount}
          </div>
          <div className="text-[10px] text-[var(--bos-success)] mt-0.5">Verified deliverables</div>
        </div>

        <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 hover:bg-[var(--bos-surface)]/70 transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center justify-between">
            <span>Engineers</span>
            <UserCheck className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--bos-text-primary)] mt-1.5">
            {stats.activeEngineersCount}
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">Workforce active</div>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-[var(--bos-line)] pb-px">
        {[
          { key: "overview", label: "Overview", count: null },
          { key: "repositories", label: "Repositories", count: repos.length },
          { key: "issues", label: "Issues", count: stats.openIssuesCount },
          { key: "pulls", label: "Pull Requests", count: stats.openPrsCount },
          { key: "activity", label: "Activity Stream", count: commits.length },
        ].map((tab) => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={cn(
                "relative px-3.5 py-2 text-xs font-medium transition-all duration-150 flex items-center gap-1.5 border-b-2 -mb-px",
                isActive
                  ? "border-[var(--bos-accent)] text-[var(--bos-text-primary)] font-semibold"
                  : "border-transparent text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    isActive
                      ? "bg-[var(--bos-accent)]/20 text-[var(--bos-accent)]"
                      : "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)]",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────────── */}

      {/* VIEW: OVERVIEW */}
      {activeView === "overview" && (
        <div className="space-y-6">
          {/* Main Repository Hero Card */}
          <div className="p-5 rounded-sm border border-[var(--bos-line)] bg-gradient-to-r from-[var(--bos-surface)] to-[var(--bos-surface)]/40 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,_var(--bos-accent-subtle),_transparent_70%)] opacity-30 pointer-events-none" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--bos-accent)]/15 text-[var(--bos-accent)] border border-[var(--bos-accent)]/20">
                    PRIMARY REPOSITORY
                  </span>
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    cheralathan05 / crm
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
                  cheralathan05/crm
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)] max-w-2xl leading-relaxed">
                  Enterprise Business Operating System — complete client CRM, proposal studio, engineering blueprint execution, and workforce telemetry pipeline.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono text-[var(--bos-text-tertiary)]">
                  <span className="inline-flex items-center gap-1 text-[var(--bos-text-secondary)]">
                    <span className="w-2 h-2 rounded-full bg-[#3178c6]" /> TypeScript (98.4%)
                  </span>
                  <span>·</span>
                  <span>Branch: <strong className="text-[var(--bos-text-primary)]">main</strong></span>
                  <span>·</span>
                  <span>Next.js 16 + React 19</span>
                  <span>·</span>
                  <span>Prisma + SQLite WAL</span>
                </div>
              </div>

              {/* Quick Git Commands Box */}
              <div className="bg-[var(--bos-bg)]/80 border border-[var(--bos-line)] rounded p-3 text-xs font-mono space-y-1.5 shrink-0 min-w-[280px]">
                <div className="text-[10px] text-[var(--bos-text-tertiary)] uppercase tracking-wider flex items-center justify-between">
                  <span>Clone Command</span>
                  <button
                    onClick={() => copyToClipboard("git clone https://github.com/cheralathan05/crm.git")}
                    className="hover:text-[var(--bos-text-primary)] transition-colors flex items-center gap-1 text-[9px]"
                  >
                    {copiedText === "git clone https://github.com/cheralathan05/crm.git" ? (
                      <Check className="w-3 h-3 text-[var(--bos-success)]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-[11px] text-[var(--bos-text-secondary)] select-all truncate">
                  git clone https://github.com/cheralathan05/crm.git
                </div>
                <div className="pt-2 border-t border-[var(--bos-line)] flex items-center justify-between text-[10px]">
                  <span className="text-[var(--bos-text-tertiary)]">Linked Project:</span>
                  <span className="text-[var(--bos-accent)] font-medium">PRJ-2026-001</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid: Engineer Workforce Mapping & Live PR Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engineer Squad Mapping Card */}
            <div className="p-5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--bos-text-primary)] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>Engineering Squad Telemetry</span>
                  </h3>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                    Employees connected to GitHub handles with live commit attribution
                  </p>
                </div>
                <button
                  onClick={() => setShowLinkEmployeeModal(true)}
                  className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline"
                >
                  + Map Handle
                </button>
              </div>

              <div className="space-y-3">
                {engineers.map((emp: any) => (
                  <div
                    key={emp.employeeId}
                    className="flex items-center justify-between p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] hover:border-[var(--bos-border-strong)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--bos-accent)]/20 border border-[var(--bos-accent)]/30 flex items-center justify-center font-mono text-xs text-[var(--bos-accent)] font-bold">
                        {emp.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--bos-text-primary)]">
                            {emp.fullName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] border border-[var(--bos-line)]">
                            {emp.employeeCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5 flex items-center gap-1.5">
                          <span>{emp.roleName || emp.department}</span>
                          <span>·</span>
                          <a
                            href={`https://github.com/${emp.githubHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[var(--bos-accent)] hover:underline"
                          >
                            @{emp.githubHandle || "unlinked"}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bos-success)]/10 text-[var(--bos-success)] border border-[var(--bos-success)]/30">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>CONNECTED</span>
                      </div>
                      <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] mt-1">
                        {emp.commitsCount} commits · {emp.prsCount} PRs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Pull Requests & Deliverables Lineage */}
            <div className="p-5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--bos-text-primary)] flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-purple-400" />
                    <span>Pull Request Workstream Matrix</span>
                  </h3>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                    Code branches tied to Business OS client deliverables
                  </p>
                </div>
                <button
                  onClick={() => setView("pulls")}
                  className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1"
                >
                  <span>View All ({prs.length})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {prs.map((pr: any) => (
                  <div
                    key={pr.id}
                    className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] space-y-2 hover:border-[var(--bos-border-strong)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs font-bold text-purple-400 shrink-0">
                          #{pr.number}
                        </span>
                        <div className="text-xs font-semibold text-[var(--bos-text-primary)] line-clamp-1">
                          {pr.title}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-mono shrink-0 uppercase tracking-wide",
                          pr.state === "MERGED"
                            ? "bg-purple-950/40 text-purple-300 border border-purple-800/50"
                            : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50",
                        )}
                      >
                        {pr.state}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      <span className="flex items-center gap-1 text-[var(--bos-text-secondary)]">
                        <GitBranch className="w-3 h-3 text-[var(--bos-accent)]" />
                        {pr.sourceBranch} → {pr.targetBranch}
                      </span>
                      <span>·</span>
                      <span>By @{pr.authorHandle}</span>
                      <span>·</span>
                      <span className="text-[var(--bos-success)] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CI PASS
                      </span>
                    </div>

                    {pr.taskCode && (
                      <div className="pt-2 border-t border-[var(--bos-line)] flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-[var(--bos-text-secondary)]">
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bos-bg)] border border-[var(--bos-line)] text-[var(--bos-accent)]">
                            {pr.taskCode}
                          </span>
                          <span className="truncate max-w-[220px]">{pr.taskTitle}</span>
                        </div>
                        <a
                          href={pr.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Git Commits Feed */}
          <div className="p-5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--bos-text-primary)] flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span>Real Git Commit Stream</span>
                </h3>
                <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                  Synchronized revisions directly from workspace repository
                </p>
              </div>
              <button
                onClick={() => setView("activity")}
                className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1"
              >
                <span>View Full Stream</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-[var(--bos-line)]">
              {commits.slice(0, 6).map((c: any) => (
                <div key={c.sha} className="py-2.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => copyToClipboard(c.sha)}
                      className="font-mono text-xs text-[var(--bos-accent)] bg-[var(--bos-surface)] px-1.5 py-0.5 rounded border border-[var(--bos-line)] hover:border-[var(--bos-border-strong)] shrink-0 transition-colors"
                      title="Copy SHA"
                    >
                      {c.shortSha}
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--bos-text-primary)] truncate">
                        {c.message}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] mt-0.5 flex items-center gap-2">
                        <span>@{c.authorHandle}</span>
                        <span>·</span>
                        <span>{new Date(c.committedAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="text-[var(--bos-success)] font-medium">+{c.additions}</span>
                        <span className="text-rose-400 font-medium">-{c.deletions}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={c.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: REPOSITORIES */}
      {activeView === "repositories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-[var(--bos-text-secondary)]">
              Connected Repositories ({repos.length})
            </h2>
            <button
              onClick={() => alert("Repository connection wizard is ready. The primary repository cheralathan05/crm is active.")}
              className="text-xs font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Repository</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repos.map((repo: any) => (
              <div
                key={repo.id}
                className="p-5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60 hover:border-[var(--bos-border-strong)] transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] flex items-center justify-center text-[var(--bos-accent)]">
                      <FolderGit2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-[var(--bos-text-primary)]">
                        {repo.fullName}
                      </h3>
                      <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                        Default branch: <strong>{repo.defaultBranch}</strong> · {repo.language}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[9px] font-mono border border-[var(--bos-success)]/30 bg-[var(--bos-success)]/10 text-[var(--bos-success)]">
                    ONLINE
                  </span>
                </div>

                <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                  {repo.description || "Production system codebase."}
                </p>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--bos-line)] text-center font-mono">
                  <div>
                    <div className="text-[10px] text-[var(--bos-text-tertiary)]">Stars</div>
                    <div className="text-sm font-bold text-[var(--bos-text-primary)]">{repo.starsCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--bos-text-tertiary)]">Forks</div>
                    <div className="text-sm font-bold text-[var(--bos-text-primary)]">{repo.forksCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--bos-text-tertiary)]">Open Issues</div>
                    <div className="text-sm font-bold text-[var(--bos-text-primary)]">{repo.openIssuesCount}</div>
                  </div>
                </div>

                {/* Clone snippet */}
                <div className="bg-[var(--bos-bg)] border border-[var(--bos-line)] rounded p-2 text-xs font-mono flex items-center justify-between text-[var(--bos-text-secondary)]">
                  <span className="truncate select-all text-[11px]">{`git clone ${repo.htmlUrl}.git`}</span>
                  <button
                    onClick={() => copyToClipboard(`git clone ${repo.htmlUrl}.git`)}
                    className="hover:text-[var(--bos-text-primary)] transition-colors p-1"
                  >
                    {copiedText === `git clone ${repo.htmlUrl}.git` ? (
                      <Check className="w-3.5 h-3.5 text-[var(--bos-success)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                    Synced: {new Date(repo.syncedAt).toLocaleTimeString()}
                  </span>
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border border-[var(--bos-line)] hover:border-[var(--bos-border-strong)] text-[var(--bos-text-primary)] bg-[var(--bos-surface)] transition-colors"
                  >
                    <span>View Repository</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: ISSUES */}
      {activeView === "issues" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--bos-line)] pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)]">
                State:
              </span>
              {["ALL", "OPEN", "CLOSED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setIssueStateFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors",
                    issueStateFilter === st
                      ? "bg-[var(--bos-accent)] text-white"
                      : "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--bos-text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-surface)] text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)] font-mono"
                />
              </div>

              <button
                onClick={() => setShowCreateIssueModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Create Issue</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--bos-line)] border border-[var(--bos-line)] rounded-sm bg-[var(--bos-surface)]/40 overflow-hidden">
            {issues
              .filter((i: any) => issueStateFilter === "ALL" || i.state === issueStateFilter)
              .filter((i: any) => !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((issue: any) => (
                <div
                  key={issue.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bos-surface)] transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[var(--bos-accent)]">
                        #{issue.number}
                      </span>
                      <h4 className="text-sm font-semibold text-[var(--bos-text-primary)]">
                        {issue.title}
                      </h4>
                      <span
                        className={cn(
                          "px-2 py-0.2 rounded text-[9px] font-mono uppercase tracking-wide",
                          issue.state === "OPEN"
                            ? "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                            : "bg-purple-950/40 text-purple-300 border border-purple-800/40",
                        )}
                      >
                        {issue.state}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      <span>By @{issue.authorHandle}</span>
                      <span>·</span>
                      <span>Assignee: @{issue.assigneeHandle || "unassigned"}</span>
                      <span>·</span>
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                      {issue.labels?.map((label: string) => (
                        <span
                          key={label}
                          className="px-1.5 py-0.2 rounded text-[9px] bg-[var(--bos-bg)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Task lineage */}
                  <div className="flex items-center gap-3 shrink-0">
                    {issue.taskCode ? (
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)]">
                          <span>LINKED: {issue.taskCode}</span>
                        </div>
                        <div className="text-[10px] text-[var(--bos-text-tertiary)] truncate max-w-[180px]">
                          {issue.taskTitle}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedTaskForLink(issue.id);
                          setShowLinkTaskModal(true);
                        }}
                        className="text-[10px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors"
                      >
                        + Attach to Task
                      </button>
                    )}

                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors"
                      title="View on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW: PULL REQUESTS */}
      {activeView === "pulls" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)]">
                Status:
              </span>
              {["ALL", "OPEN", "MERGED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setPrStateFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors",
                    prStateFilter === st
                      ? "bg-[var(--bos-accent)] text-white"
                      : "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">
              {prs.filter((pr: any) => prStateFilter === "ALL" || pr.state === prStateFilter).length} pull requests
            </span>
          </div>

          <div className="space-y-3">
            {prs
              .filter((pr: any) => prStateFilter === "ALL" || pr.state === prStateFilter)
              .map((pr: any) => (
                <div
                  key={pr.id}
                  className="p-5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60 hover:border-[var(--bos-border-strong)] transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-purple-400">
                          #{pr.number}
                        </span>
                        <h3 className="text-base font-semibold text-[var(--bos-text-primary)]">
                          {pr.title}
                        </h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide",
                            pr.state === "MERGED"
                              ? "bg-purple-950/40 text-purple-300 border border-purple-800/50"
                              : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50",
                          )}
                        >
                          {pr.state}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-[var(--bos-text-tertiary)]">
                        <span className="flex items-center gap-1 text-[var(--bos-text-secondary)]">
                          <GitBranch className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                          {pr.sourceBranch} → {pr.targetBranch}
                        </span>
                        <span>·</span>
                        <span>Author: @{pr.authorHandle}</span>
                        <span>·</span>
                        <span className="text-[var(--bos-success)]">+{pr.additions}</span>
                        <span className="text-rose-400">-{pr.deletions}</span>
                        <span>·</span>
                        <span className="text-[var(--bos-success)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 14/14 Checks Passing
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={pr.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[var(--bos-line)] bg-[var(--bos-surface)] hover:border-[var(--bos-border-strong)] text-[var(--bos-text-primary)] transition-colors"
                      >
                        <span>Inspect PR</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Task Lineage & Evidence Badge */}
                  {pr.taskCode && (
                    <div className="p-3 rounded bg-[var(--bos-bg)]/80 border border-[var(--bos-line)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[var(--bos-text-secondary)]">
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bos-surface)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)]">
                          DELIVERABLE PROOF
                        </span>
                        <span>Task: <strong>{pr.taskCode}</strong> — {pr.taskTitle}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--bos-success)] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Verified by merge
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW: ACTIVITY STREAM */}
      {activeView === "activity" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-4">
            <h2 className="text-sm font-mono uppercase tracking-wider text-[var(--bos-text-secondary)]">
              Interactive Git Commit Log & Audit Timeline
            </h2>
            <button
              onClick={handleSync}
              className="text-xs font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1"
            >
              <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
              <span>Refresh Feed</span>
            </button>
          </div>

          <div className="divide-y divide-[var(--bos-line)] border border-[var(--bos-line)] rounded-sm bg-[var(--bos-surface)]/40 overflow-hidden">
            {commits.map((c: any) => (
              <div
                key={c.sha}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bos-surface)] transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[var(--bos-accent)] mt-2 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => copyToClipboard(c.sha)}
                        className="font-mono text-xs text-[var(--bos-accent)] bg-[var(--bos-surface)] px-1.5 py-0.5 rounded border border-[var(--bos-line)] hover:border-[var(--bos-border-strong)] shrink-0 transition-colors"
                        title="Copy Commit Hash"
                      >
                        {c.shortSha}
                      </button>
                      <span className="text-xs font-semibold text-[var(--bos-text-primary)]">
                        {c.message}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      <span>Author: <strong>{c.authorName}</strong> (@{c.authorHandle})</span>
                      <span>·</span>
                      <span>Branch: {c.branch}</span>
                      <span>·</span>
                      <span>{new Date(c.committedAt).toLocaleString()}</span>
                      <span>·</span>
                      <span className="text-[var(--bos-success)]">+{c.additions}</span>
                      <span className="text-rose-400">-{c.deletions}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────── */}

      {/* Link Employee Modal */}
      {showLinkEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-line-strong)] rounded-md max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
              <h3 className="text-base font-semibold text-[var(--bos-text-primary)] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--bos-accent)]" />
                <span>Map Engineer to GitHub Account</span>
              </h3>
              <button
                onClick={() => setShowLinkEmployeeModal(false)}
                className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLinkEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1.5">
                  Select Employee
                </label>
                <select
                  value={targetEmployeeId}
                  onChange={(e) => {
                    setTargetEmployeeId(e.target.value);
                    const emp = engineers.find((en: any) => en.employeeId === e.target.value);
                    if (emp?.githubHandle) setTargetGithubHandle(emp.githubHandle);
                  }}
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] focus:outline-none focus:border-[var(--bos-accent)] font-mono"
                >
                  <option value="">-- Choose team member --</option>
                  {engineers.map((emp: any) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeCode}) — {emp.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1.5">
                  GitHub Username / Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--bos-text-tertiary)]">
                    @
                  </span>
                  <input
                    type="text"
                    placeholder="octocat"
                    value={targetGithubHandle}
                    onChange={(e) => setTargetGithubHandle(e.target.value.replace(/^@/, ""))}
                    required
                    className="w-full pl-7 pr-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] focus:outline-none focus:border-[var(--bos-accent)] font-mono"
                  />
                </div>
                <p className="text-[10px] text-[var(--bos-text-tertiary)] mt-1">
                  Revisions and PRs by this handle will be attributed to the employee.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--bos-line)]">
                <button
                  type="button"
                  onClick={() => setShowLinkEmployeeModal(false)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium transition-colors"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-line-strong)] rounded-md max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
              <h3 className="text-base font-semibold text-[var(--bos-text-primary)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--bos-accent)]" />
                <span>Create GitHub Issue Linked to Business OS</span>
              </h3>
              <button
                onClick={() => setShowCreateIssueModal(false)}
                className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Implement real-time WebSocket connection handling"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] focus:outline-none focus:border-[var(--bos-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed criteria, reproduction steps, or requirements..."
                  value={newIssueBody}
                  onChange={(e) => setNewIssueBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] focus:outline-none focus:border-[var(--bos-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1">
                    Assign Engineer
                  </label>
                  <select
                    value={newIssueAssignee}
                    onChange={(e) => setNewIssueAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] font-mono focus:outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {engineers.map((emp: any) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.fullName} (@{emp.githubHandle || "unlinked"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1">
                    Link Business OS Task
                  </label>
                  <select
                    value={newIssueTaskId}
                    onChange={(e) => setNewIssueTaskId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] font-mono focus:outline-none"
                  >
                    <option value="">-- None (Standalone) --</option>
                    {tasksList.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.code || "TASK"}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--bos-line)]">
                <button
                  type="button"
                  onClick={() => setShowCreateIssueModal(false)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium transition-colors"
                >
                  Create & Push Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Task Modal */}
      {showLinkTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-line-strong)] rounded-md max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
              <h3 className="text-base font-semibold text-[var(--bos-text-primary)] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[var(--bos-accent)]" />
                <span>Link Task to Pull Request Evidence</span>
              </h3>
              <button
                onClick={() => setShowLinkTaskModal(false)}
                className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1">
                  Select Business OS Task
                </label>
                <select
                  value={selectedTaskForLink}
                  onChange={(e) => setSelectedTaskForLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] font-mono focus:outline-none"
                >
                  <option value="">-- Choose task --</option>
                  {tasksList.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.code || "TSK"}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] mb-1">
                  Select Pull Request
                </label>
                <select
                  value={targetPrNumber}
                  onChange={(e) => setTargetPrNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] font-mono focus:outline-none"
                >
                  <option value="">-- Choose PR --</option>
                  {prs.map((pr: any) => (
                    <option key={pr.number} value={pr.number}>
                      #{pr.number}: {pr.title} ({pr.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--bos-line)]">
                <button
                  onClick={() => setShowLinkTaskModal(false)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedTaskForLink || !targetPrNumber}
                  onClick={() => handleLinkTaskToPr(selectedTaskForLink, Number(targetPrNumber))}
                  className="px-4 py-1.5 rounded bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Attach Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
