"use client";

import { useState } from "react";
import {
  FolderKanban,
  Users,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Clock,
  Send,
  Layers,
  FileCheck2,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";

interface EmployeeProjectsViewProps {
  portalData: any;
  onOpenSmartContact: (person: any, task?: any) => void;
  onNavigateTab: (tab: string, context?: any) => void;
}

export function EmployeeProjectsView({
  portalData,
  onOpenSmartContact,
  onNavigateTab,
}: EmployeeProjectsViewProps) {
  const {
    currentProject,
    allProjects = [],
    projectRoster = {},
    projectCommunicationHistory = [],
    projectDecisions = [],
    projectActivities = [],
    workItems = [],
    submissions = [],
    employee,
  } = portalData;

  const [activeProjectWorkspaceTab, setActiveProjectWorkspaceTab] = useState<
    "MY_WORK" | "TEAM" | "MESSAGES" | "DEPENDENCIES" | "SUBMISSIONS" | "ACTIVITY"
  >("MY_WORK");

  if (!currentProject && allProjects.length === 0) {
    return (
      <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-3 font-mono">
        <FolderKanban className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
        <h3 className="text-base font-bold text-[var(--bos-text-primary)]">No assigned projects</h3>
        <p className="text-xs text-[var(--bos-text-tertiary)] max-w-sm mx-auto">
          You are currently not allocated to any active projects in this workspace.
        </p>
      </div>
    );
  }

  const activeProj = currentProject || allProjects[0];
  const activeProjMetrics = allProjects.find((p: any) => p.id === activeProj?.id) || {
    role: employee.role,
    status: activeProj?.stage || "In Progress",
    myWorkCount: workItems.length,
    completedCount: workItems.filter((w: any) => w.status === "COMPLETED" || w.status === "DONE").length,
    inProgressCount: workItems.filter((w: any) => w.status === "IN_PROGRESS").length,
    waitingCount: workItems.filter((w: any) => w.status === "TODO" || w.status === "READY").length,
    reviewCount: workItems.filter((w: any) => w.status === "IN_REVIEW").length,
    blockedCount: workItems.filter((w: any) => w.status === "BLOCKED").length,
  };

  const frontendMembers = projectRoster.frontend || [];
  const backendMembers = projectRoster.backend || [];
  const databaseMembers = projectRoster.database || [];
  const qaMembers = projectRoster.qa || [];
  const adminMembers = projectRoster.admin || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── SECTION 3: MY PROJECTS CARDS ───────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">My Assigned Projects</h2>
            <p className="text-xs font-mono text-[var(--bos-text-tertiary)]">
              Projects with active staff allocations or work items ({allProjects.length})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProjects.map((proj: any) => {
            const isCurrent = proj.id === activeProj?.id;
            return (
              <div
                key={proj.id}
                className={`p-5 rounded-3xl border transition-all space-y-4 flex flex-col justify-between ${
                  isCurrent
                    ? "bg-[var(--bos-surface-panel)] border-[var(--bos-accent)]/50 shadow-xl"
                    : "bg-[var(--bos-surface)] border-[var(--bos-border)] hover:border-[var(--bos-border-strong)]"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-bold">
                      {proj.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-emerald-400">
                      {proj.status || "In Progress"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[var(--bos-text-primary)] line-clamp-2">
                    {proj.name}
                  </h3>

                  <div className="text-xs font-mono text-[var(--bos-text-secondary)]">
                    Role: <strong className="text-[var(--bos-text-primary)]">{proj.role || employee.role}</strong>
                  </div>
                </div>

                {/* Real Metrics Breakdown (Section 3 Prompt Spec) */}
                <div className="pt-3 border-t border-[var(--bos-border)] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--bos-text-tertiary)] uppercase">My Work:</span>
                    <strong className="text-[var(--bos-text-primary)]">{proj.myWorkCount || 0} items</strong>
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                    <div className="p-1 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <div className="text-[var(--bos-text-tertiary)] uppercase">Done</div>
                      <div className="font-bold text-emerald-400">{proj.completedCount || 0}</div>
                    </div>
                    <div className="p-1 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <div className="text-[var(--bos-text-tertiary)] uppercase">Prog</div>
                      <div className="font-bold text-blue-400">{proj.inProgressCount || 0}</div>
                    </div>
                    <div className="p-1 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <div className="text-[var(--bos-text-tertiary)] uppercase">Wait</div>
                      <div className="font-bold text-amber-400">{proj.waitingCount || 0}</div>
                    </div>
                    <div className="p-1 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <div className="text-[var(--bos-text-tertiary)] uppercase">Rev</div>
                      <div className="font-bold text-purple-400">{proj.reviewCount || 0}</div>
                    </div>
                    <div className="p-1 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                      <div className="text-[var(--bos-text-tertiary)] uppercase">Blk</div>
                      <div className="font-bold text-rose-400">{proj.blockedCount || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 4: PROJECT WORKSPACE ───────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-6 shadow-xl">
        {/* Workspace Header (Section 4 Prompt Spec) */}
        <div className="space-y-4 border-b border-[var(--bos-border)] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--bos-text-tertiary)] uppercase">
                <span>PROJECT WORKSPACE</span>
                <span>·</span>
                <span className="text-[var(--bos-accent)] font-bold">{activeProj.code}</span>
              </div>
              <h1 className="text-2xl font-bold text-[var(--bos-text-primary)]">
                {activeProj.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Client</span>
                <strong className="text-[var(--bos-text-primary)]">{activeProj.clientName || "Client Delivery"}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">My Role</span>
                <strong className="text-[var(--bos-accent)]">{activeProjMetrics.role || employee.role}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Project Status</span>
                <strong className="text-emerald-400">{activeProjMetrics.status}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">My Progress</span>
                <strong className="text-[var(--bos-text-primary)]">
                  {activeProjMetrics.completedCount} / {activeProjMetrics.myWorkCount} completed
                </strong>
              </div>
            </div>
          </div>

          {/* 6 Tabs for Project Workspace */}
          <div className="flex items-center gap-1 overflow-x-auto font-mono text-xs pt-2">
            {[
              { id: "MY_WORK" as const, label: `My Work (${workItems.length})`, icon: Layers },
              { id: "TEAM" as const, label: `Project Team`, icon: Users },
              { id: "MESSAGES" as const, label: `Messages (${projectCommunicationHistory.length})`, icon: MessageSquare },
              { id: "DEPENDENCIES" as const, label: "Dependencies", icon: AlertCircle },
              { id: "SUBMISSIONS" as const, label: `Submissions (${submissions.length})`, icon: FileCode2 },
              { id: "ACTIVITY" as const, label: `Activity (${projectActivities.length})`, icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeProjectWorkspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveProjectWorkspaceTab(tab.id)}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap font-medium ${
                    isActive
                      ? "bg-[var(--bos-accent)] text-white font-bold shadow-md"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB 1: MY WORK IN THIS PROJECT ──────────────────────── */}
        {activeProjectWorkspaceTab === "MY_WORK" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase text-[var(--bos-text-primary)]">
                Assigned Work Items
              </h3>
              <button
                onClick={() => onNavigateTab("MY_WORK")}
                className="text-xs font-mono text-[var(--bos-accent)] hover:underline cursor-pointer font-bold"
              >
                Open Full Work Board →
              </button>
            </div>

            <div className="space-y-3">
              {workItems.slice(0, 8).map((task: any) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs hover:border-[var(--bos-border-strong)] transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--bos-text-primary)] text-sm">{task.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bos-surface-panel)] text-[var(--bos-accent)]">
                        {task.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.status === "IN_PROGRESS"
                            ? "text-emerald-400 bg-emerald-500/10"
                            : task.status === "BLOCKED"
                            ? "text-rose-400 bg-rose-500/10"
                            : "text-[var(--bos-text-secondary)] bg-[var(--bos-surface-panel)]"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--bos-text-secondary)]">
                      {task.dependencyDetails ? (
                        <span>
                          Dependency: <strong className="text-[var(--bos-text-primary)]">{task.dependencyDetails.title}</strong> · Owner: {task.dependencyDetails.ownerName}
                        </span>
                      ) : (
                        <span>Direct deliverable capability</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigateTab("MY_WORK", { highlightTaskId: task.id })}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] hover:bg-[var(--bos-accent)] hover:text-white transition-all font-bold cursor-pointer"
                    >
                      Open Work →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: PROJECT TEAM (FRONTEND, BACKEND, DATABASE, QA, ADMIN) ── */}
        {activeProjectWorkspaceTab === "TEAM" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FRONTEND */}
              <div className="p-6 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                  <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">FRONTEND</span>
                  <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">{frontendMembers.length} members</span>
                </div>
                {frontendMembers.length === 0 ? (
                  <div className="text-xs text-[var(--bos-text-tertiary)] font-mono py-2">No team member assigned.</div>
                ) : (
                  frontendMembers.map((m: any) => (
                    <TeamMemberRow
                      key={m.id}
                      member={m}
                      onMessage={() => onOpenSmartContact({ name: m.name, role: m.role, employeeId: m.id })}
                    />
                  ))
                )}
              </div>

              {/* BACKEND */}
              <div className="p-6 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">BACKEND</span>
                  <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">{backendMembers.length} members</span>
                </div>
                {backendMembers.length === 0 ? (
                  <div className="text-xs text-[var(--bos-text-tertiary)] font-mono py-2">No team member assigned.</div>
                ) : (
                  backendMembers.map((m: any) => (
                    <TeamMemberRow
                      key={m.id}
                      member={m}
                      onMessage={() => onOpenSmartContact({ name: m.name, role: m.role, employeeId: m.id })}
                    />
                  ))
                )}
              </div>

              {/* DATABASE */}
              <div className="p-6 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                  <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">DATABASE</span>
                  <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">{databaseMembers.length} members</span>
                </div>
                {databaseMembers.length === 0 ? (
                  <div className="text-xs text-[var(--bos-text-tertiary)] font-mono py-2">No team member assigned.</div>
                ) : (
                  databaseMembers.map((m: any) => (
                    <TeamMemberRow
                      key={m.id}
                      member={m}
                      onMessage={() => onOpenSmartContact({ name: m.name, role: m.role, employeeId: m.id })}
                    />
                  ))
                )}
              </div>

              {/* QA */}
              <div className="p-6 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                  <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">QA</span>
                  <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">{qaMembers.length} members</span>
                </div>
                {qaMembers.length === 0 ? (
                  <div className="text-xs text-[var(--bos-text-tertiary)] font-mono py-2">No team member assigned.</div>
                ) : (
                  qaMembers.map((m: any) => (
                    <TeamMemberRow
                      key={m.id}
                      member={m}
                      onMessage={() => onOpenSmartContact({ name: m.name, role: m.role, employeeId: m.id })}
                    />
                  ))
                )}
              </div>

              {/* ADMIN */}
              <div className="p-6 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 md:col-span-2">
                <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                  <span className="text-xs font-mono font-bold text-[var(--bos-accent)] uppercase tracking-wider">ADMIN</span>
                </div>
                {adminMembers.map((m: any) => (
                  <TeamMemberRow
                    key={m.id}
                    member={m}
                    onMessage={() => onOpenSmartContact({ name: m.name, role: m.role })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: PROJECT MESSAGES & RECORD ────────────────────── */}
        {activeProjectWorkspaceTab === "MESSAGES" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">Project Communication History</h3>
                <p className="text-[11px] text-[var(--bos-text-tertiary)]">
                  Live messages recorded automatically against {activeProj.name}
                </p>
              </div>
              <button
                onClick={() => onNavigateTab("MESSAGES")}
                className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Messages Hub</span>
              </button>
            </div>

            {projectCommunicationHistory.length === 0 ? (
              <div className="p-8 text-center text-[var(--bos-text-tertiary)] bg-[var(--bos-surface)] rounded-2xl border border-[var(--bos-border)]">
                No messages yet. Messages sent from work items will automatically be recorded here.
              </div>
            ) : (
              <div className="space-y-3">
                {projectCommunicationHistory.map((msg: any) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <strong className="text-[var(--bos-text-primary)]">{msg.senderName}</strong>
                        <span className="text-[var(--bos-text-tertiary)]">({msg.senderRole || "Member"})</span>
                        <span className="px-1.5 py-0.2 rounded bg-[var(--bos-surface-panel)] text-[9px] uppercase font-bold text-[var(--bos-accent)]">
                          {msg.messageType}
                        </span>
                      </div>
                      <span className="text-[var(--bos-text-tertiary)] text-[10px]">
                        {new Date(msg.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--bos-text-secondary)]">
                      Work: <strong className="text-[var(--bos-text-primary)]">{msg.workTitle}</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bos-surface-panel)] text-sm text-[var(--bos-text-primary)] font-sans">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: DEPENDENCIES ─────────────────────────────────── */}
        {activeProjectWorkspaceTab === "DEPENDENCIES" && (
          <div className="space-y-4 font-mono text-xs">
            <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">Upstream & Downstream Dependencies</h3>
            <div className="space-y-3">
              {workItems.filter((w: any) => !!w.dependencyDetails).map((w: any) => {
                const dep = w.dependencyDetails;
                return (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-[var(--bos-text-primary)]">{w.title}</strong>
                        <span className="text-[var(--bos-text-tertiary)]">({w.code})</span>
                      </div>
                      <div className="text-[11px] text-[var(--bos-text-secondary)]">
                        Depends on: <strong className="text-[var(--bos-accent)]">{dep.title}</strong> ({dep.code})
                      </div>
                      <div className="text-[10px] text-[var(--bos-text-tertiary)]">
                        Owner: {dep.ownerName} ({dep.ownerRole})
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          dep.isReady
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {dep.isReady ? "READY" : "WAITING FOR UPSTREAM"}
                      </span>

                      {dep.ownerId && (
                        <button
                          onClick={() => onOpenSmartContact(dep, w)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] transition-all font-bold cursor-pointer"
                        >
                          Contact Owner
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {workItems.filter((w: any) => !!w.dependencyDetails).length === 0 && (
                <div className="p-8 text-center text-[var(--bos-text-tertiary)] bg-[var(--bos-surface)] rounded-2xl border border-[var(--bos-border)]">
                  No active blocking dependencies on your assigned work items.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: SUBMISSIONS ──────────────────────────────────── */}
        {activeProjectWorkspaceTab === "SUBMISSIONS" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">Deliverable Proof & Submissions</h3>
              <button
                onClick={() => onNavigateTab("SUBMISSIONS")}
                className="text-xs text-[var(--bos-accent)] hover:underline cursor-pointer font-bold"
              >
                View All Submissions →
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="p-8 text-center text-[var(--bos-text-tertiary)] bg-[var(--bos-surface)] rounded-2xl border border-[var(--bos-border)]">
                No submissions filed yet. When you complete work items, submit proof to initiate QA review.
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <strong className="text-sm text-[var(--bos-text-primary)]">{sub.featureName}</strong>
                      <div className="text-[11px] text-[var(--bos-text-secondary)]">
                        Status: <span className="text-[var(--bos-accent)] uppercase">{sub.status}</span> · Version: v{sub.version}
                      </div>
                    </div>

                    <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: ACTIVITY ─────────────────────────────────────── */}
        {activeProjectWorkspaceTab === "ACTIVITY" && (
          <div className="space-y-4 font-mono text-xs">
            <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">Project Operational Events</h3>
            {projectActivities.length === 0 ? (
              <div className="p-8 text-center text-[var(--bos-text-tertiary)] bg-[var(--bos-surface)] rounded-2xl border border-[var(--bos-border)]">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {projectActivities.slice(0, 15).map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between gap-4"
                  >
                    <div>
                      <strong className="text-xs text-[var(--bos-text-primary)]">{act.title}</strong>
                      {act.detail && <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">{act.detail}</p>}
                    </div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] shrink-0">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamMemberRow({ member, onMessage }: { member: any; onMessage: () => void }) {
  return (
    <div className="p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between gap-3 font-mono text-xs hover:border-[var(--bos-border-strong)] transition-all">
      <div className="space-y-1">
        <div className="font-bold text-[var(--bos-text-primary)] flex items-center gap-2">
          <span>{member.name}</span>
          {member.isYou && (
            <span className="px-1.5 py-0.2 rounded bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-[10px] font-extrabold">
              YOU
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--bos-text-secondary)]">{member.role}</div>
        <div className="text-[10px] text-[var(--bos-text-tertiary)]">Focus: {member.currentFocus || "Active Delivery"}</div>
      </div>

      {!member.isYou && (
        <button
          onClick={onMessage}
          className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-bold text-[var(--bos-text-primary)] hover:bg-[var(--bos-accent)] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Message</span>
        </button>
      )}
    </div>
  );
}
