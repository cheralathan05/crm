"use client";

import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  MessageSquare,
  Users,
  ShieldCheck,
  AlertOctagon,
  FileCheck2,
} from "lucide-react";

interface EmployeeHomeViewProps {
  portalData: any;
  onNavigateTab: (tab: string, context?: any) => void;
  onOpenSmartContact: (person: any, task: any) => void;
  onOpenBlockerModal: (task: any) => void;
}

export function EmployeeHomeView({
  portalData,
  onNavigateTab,
  onOpenSmartContact,
  onOpenBlockerModal,
}: EmployeeHomeViewProps) {
  const { employee, currentProject, myWorkToday, attentionItems = [], metrics } = portalData;

  const currentWork = myWorkToday?.currentWork;
  const dependency = currentWork?.dependency;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── 1. HERO SECTION: MY WORK TODAY ───────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--bos-accent)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Tagline */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 text-[var(--bos-accent)] text-xs font-mono font-bold uppercase tracking-wider">
                MY WORK TODAY
              </span>
              <span className="text-xs font-mono text-[var(--bos-text-tertiary)] uppercase">
                Single Source of Truth
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-[var(--bos-text-secondary)]">
              <span>ROLE:</span>
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] font-bold text-[var(--bos-text-primary)]">
                {myWorkToday?.role || employee.role}
              </span>
            </div>
          </div>

          {/* MY CURRENT WORK CARD (Section 2 Prompt Spec) */}
          <div className="p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[var(--bos-accent)] tracking-wider">
                MY CURRENT WORK
              </span>
              {currentWork && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    currentWork.status === "IN_PROGRESS"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : currentWork.status === "BLOCKED"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}
                >
                  {currentWork.status}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Project</span>
                <span className="font-bold text-sm text-[var(--bos-text-primary)] block truncate">
                  {currentProject?.name || "No Active Project"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Role</span>
                <span className="font-bold text-sm text-[var(--bos-accent)] block truncate">
                  {myWorkToday?.role || employee.role}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Current Work</span>
                <span className="font-bold text-sm text-[var(--bos-text-primary)] block truncate">
                  {currentWork ? `${currentWork.code}: ${currentWork.title}` : "Awaiting assignment"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Next Action</span>
                <span className="font-medium text-xs text-[var(--bos-text-secondary)] block truncate">
                  {myWorkToday?.nextAction || "Select deliverable in My Work"}
                </span>
              </div>
            </div>

            {currentWork && (
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => onNavigateTab("MY_WORK", { highlightTaskId: currentWork.id })}
                  className="px-5 py-2 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-mono font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>CONTINUE WORK</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* 5 Core Questions Grid */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
              10-Second Clarity · Operational Questions
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              {/* 1. What am I working on? */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1.5">
                <span className="text-[10px] text-[var(--bos-accent)] font-bold uppercase block">
                  1. WHAT AM I WORKING ON?
                </span>
                <p className="font-bold text-[var(--bos-text-primary)] text-sm">
                  {currentWork?.title || currentProject?.name || "General Delivery"}
                </p>
                <p className="text-[11px] text-[var(--bos-text-tertiary)]">
                  Discipline: {employee.discipline} · Priority: {currentWork?.priority || "NORMAL"}
                </p>
              </div>

              {/* 2. What do I need to do? */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1.5">
                <span className="text-[10px] text-blue-400 font-bold uppercase block">
                  2. WHAT DO I NEED TO DO?
                </span>
                <p className="font-medium text-[var(--bos-text-primary)] text-xs">
                  {myWorkToday?.nextAction || "Check assigned tasks and submit proof upon verification."}
                </p>
                <button
                  onClick={() => onNavigateTab("MY_WORK")}
                  className="text-[10px] text-[var(--bos-accent)] hover:underline cursor-pointer font-bold block pt-1"
                >
                  Open My Work →
                </button>
              </div>

              {/* 3. Who do I work with? */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1.5">
                <span className="text-[10px] text-purple-400 font-bold uppercase block">
                  3. WHO DO I WORK WITH?
                </span>
                <p className="font-medium text-[var(--bos-text-primary)] text-xs truncate">
                  {dependency ? `${dependency.ownerName} (${dependency.ownerRole})` : "Project Delivery Team"}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {dependency?.ownerId && (
                    <button
                      onClick={() => onOpenSmartContact(dependency, currentWork)}
                      className="text-[10px] text-purple-400 hover:underline cursor-pointer font-bold"
                    >
                      Contact Dependency Owner →
                    </button>
                  )}
                  <button
                    onClick={() => onNavigateTab("PROJECTS")}
                    className="text-[10px] text-[var(--bos-text-tertiary)] hover:underline cursor-pointer"
                  >
                    View Team
                  </button>
                </div>
              </div>

              {/* 4. Is anything blocking me? */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1.5">
                <span className="text-[10px] text-rose-400 font-bold uppercase block">
                  4. IS ANYTHING BLOCKING ME?
                </span>
                {currentWork?.status === "BLOCKED" ? (
                  <div>
                    <p className="text-rose-400 font-bold text-xs">
                      BLOCKED: {currentWork.blockedReason || "Unresolved dependency"}
                    </p>
                    <button
                      onClick={() => onOpenBlockerModal(currentWork)}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer font-bold block pt-1"
                    >
                      View Blocker Details →
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-emerald-400 font-medium text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Path is clear · No active blockers</span>
                    </p>
                    <button
                      onClick={() => onOpenBlockerModal(currentWork)}
                      className="text-[10px] text-[var(--bos-text-tertiary)] hover:text-rose-400 cursor-pointer block pt-1"
                    >
                      Report New Blocker
                    </button>
                  </div>
                )}
              </div>

              {/* 5. What happened recently? */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">
                    5. WHAT HAPPENED RECENTLY?
                  </span>
                  <button
                    onClick={() => onNavigateTab("ACTIVITY")}
                    className="text-[10px] text-[var(--bos-accent)] hover:underline cursor-pointer"
                  >
                    View All Activity →
                  </button>
                </div>
                {portalData?.projectActivities?.length > 0 ? (
                  <p className="font-medium text-[var(--bos-text-secondary)] text-xs line-clamp-2">
                    {portalData.projectActivities[0].title}: {portalData.projectActivities[0].detail}
                  </p>
                ) : (
                  <p className="text-[var(--bos-text-tertiary)] text-xs italic">
                    No recent events logged yet. Project communication and milestones stream automatically.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. REAL ATTENTION FEED ───────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-mono font-bold text-[var(--bos-text-primary)] uppercase tracking-wider">
              Needs Your Attention
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[10px] font-mono text-[var(--bos-text-secondary)]">
              {attentionItems.length}
            </span>
          </div>
          <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">Real Database Events Only</span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-[var(--bos-text-primary)]">
              You're clear. No action required.
            </div>
            <p className="text-xs text-[var(--bos-text-tertiary)] max-w-md mx-auto">
              All dependencies are progressing, your submitted proofs have no outstanding revisions, and there are no active blockers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attentionItems.map((item: any) => {
              const isBlocker = item.type === "BLOCKER";
              const isMsg = item.type === "MESSAGE";
              const isDep = item.type === "DEPENDENCY_READY";
              const isChange = item.type === "CHANGES_REQUESTED";

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-3xl border transition-all ${
                    isBlocker
                      ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50"
                      : isDep
                      ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50"
                      : isChange
                      ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                      : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] hover:border-[var(--bos-border-strong)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isBlocker
                            ? "bg-rose-500/10 text-rose-400"
                            : isDep
                            ? "bg-emerald-500/10 text-emerald-400"
                            : isChange
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-[var(--bos-accent)]/10 text-[var(--bos-accent)]"
                        }`}
                      >
                        {isBlocker ? (
                          <AlertOctagon className="w-4 h-4" />
                        ) : isDep ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isChange ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-[var(--bos-text-primary)]">{item.title}</div>
                        <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--bos-border)] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => onNavigateTab(item.actionTab, { url: item.actionUrl })}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono font-bold text-[var(--bos-text-primary)] hover:bg-[var(--bos-accent)] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3. REAL EXECUTION METRICS ────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
          <div className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">Total Work Items</div>
          <div className="text-2xl font-bold text-[var(--bos-text-primary)] mt-1">{metrics?.totalWorkItems || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-emerald-500/20">
          <div className="text-[10px] text-emerald-400 uppercase">In Progress</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics?.inProgressCount || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-rose-500/20">
          <div className="text-[10px] text-rose-400 uppercase">Blocked</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{metrics?.blockedCount || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
          <div className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">Completed</div>
          <div className="text-2xl font-bold text-[var(--bos-text-primary)] mt-1">{metrics?.completedCount || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-accent)]/20">
          <div className="text-[10px] text-[var(--bos-accent)] uppercase">Unread Threads</div>
          <div className="text-2xl font-bold text-[var(--bos-accent)] mt-1">{metrics?.unreadMessagesCount || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-purple-500/20">
          <div className="text-[10px] text-purple-400 uppercase">In Review</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{metrics?.pendingSubmissionsCount || 0}</div>
        </div>
      </section>
    </div>
  );
}
