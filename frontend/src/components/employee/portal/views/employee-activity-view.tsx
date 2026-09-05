"use client";

import { Activity, Clock, MessageSquare, AlertOctagon, CheckCircle2, FileCode, Users, Shield, Send } from "lucide-react";

interface EmployeeActivityViewProps {
  portalData: any;
  onNavigateTab: (tab: string, context?: any) => void;
}

export function EmployeeActivityView({
  portalData,
  onNavigateTab,
}: EmployeeActivityViewProps) {
  const { currentProject, projectActivities = [], employee } = portalData;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "MESSAGE_SENT":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "BLOCKER_REPORTED":
        return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case "WORK_HANDOFF":
        return <Send className="w-4 h-4 text-emerald-400" />;
      case "HELP_REQUESTED":
        return <AlertOctagon className="w-4 h-4 text-amber-400" />;
      case "DECISION_RECORDED":
        return <Shield className="w-4 h-4 text-purple-400" />;
      case "TASK_COMPLETED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "TASK_STARTED":
        return <FileCode className="w-4 h-4 text-cyan-400" />;
      case "TEAM_MEMBER_ADDED":
        return <Users className="w-4 h-4 text-indigo-400" />;
      default:
        return <Activity className="w-4 h-4 text-[var(--bos-accent)]" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--bos-text-primary)]">Execution & Activity Stream</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-xs font-mono font-bold uppercase">
              Immutable Project Trail
            </span>
          </div>
          <p className="text-xs text-[var(--bos-text-tertiary)] font-mono mt-1">
            Real operational events, messages, blockers, and transitions · Project: {currentProject?.name || "Active Workspace"}
          </p>
        </div>
      </div>

      {/* Activity Timeline */}
      {projectActivities.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-3 font-mono">
          <Clock className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--bos-text-primary)]">No recent activity</h3>
          <p className="text-xs text-[var(--bos-text-tertiary)] max-w-sm mx-auto">
            Zero activity events recorded yet. Operational events and messages will automatically stream here.
          </p>
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] shadow-xl space-y-6">
          <div className="relative pl-6 border-l-2 border-[var(--bos-border)] space-y-6">
            {projectActivities.map((act: any) => {
              const eventDate = new Date(act.createdAt);
              return (
                <div key={act.id} className="relative group">
                  {/* Timeline node */}
                  <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-[var(--bos-surface)] border-2 border-[var(--bos-border)] group-hover:border-[var(--bos-accent)] flex items-center justify-center transition-colors">
                    {getActivityIcon(act.type)}
                  </div>

                  {/* Content card */}
                  <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] group-hover:border-[var(--bos-border-strong)] transition-all space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--bos-text-primary)]">
                          {act.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] uppercase">
                          {act.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--bos-text-tertiary)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {eventDate.toLocaleDateString()}
                      </span>
                    </div>

                    {act.detail && (
                      <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                        {act.detail}
                      </p>
                    )}

                    <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between font-mono text-[10px] text-[var(--bos-text-tertiary)]">
                      <span>Recorded by: <strong className="text-[var(--bos-text-primary)]">{act.actorName || "Business OS Engine"}</strong></span>
                      {act.type.includes("MESSAGE") && (
                        <button
                          onClick={() => onNavigateTab("MESSAGES")}
                          className="text-[var(--bos-accent)] hover:underline cursor-pointer font-bold"
                        >
                          View Messages →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
