"use client";

import {
  X,
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  GitPullRequest,
  Send,
} from "lucide-react";
import { ProjectTeamGroup, ProjectTeamMemberSummary } from "@/lib/projects/project-team.service";

interface AdminTeamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: ProjectTeamGroup | null;
  projectName: string;
  projectId: string;
  onInviteMember: () => void;
  onMessageTeam: (teamName: string) => void;
  onMessageEmployee: (employee: ProjectTeamMemberSummary) => void;
}

export function AdminTeamDetailModal({
  isOpen,
  onClose,
  team,
  projectName,
  projectId,
  onInviteMember,
  onMessageTeam,
  onMessageEmployee,
}: AdminTeamDetailModalProps) {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                {team.teamName} TEAM
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Project: {projectName}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {team.displayName} Execution Team
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {team.memberCount} members · {team.activeWorkloadCount} active tasks · {team.blockersCount} active blockers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onMessageTeam(team.teamName)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Message Team</span>
            </button>
            <button
              onClick={onInviteMember}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Workload Summary Tiles */}
        <div className="grid grid-cols-3 gap-3 font-mono text-center">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">TEAM MEMBERS</span>
            <span className="text-2xl font-bold text-white mt-1 block">{team.memberCount}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">ASSIGNED TASKS</span>
            <span className="text-2xl font-bold text-blue-400 mt-1 block">{team.assignedTasksCount}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">COMPLETED WORK</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{team.completedTasksCount}</span>
          </div>
        </div>

        {/* Team Members List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
            Assigned Personnel &amp; Current Workload
          </h3>

          {team.members.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 font-mono">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No {team.displayName.toLowerCase()} members yet.</p>
              <button
                onClick={onInviteMember}
                className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-600/30 transition cursor-pointer"
              >
                + Invite First {team.displayName} Member
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {team.members.map((member) => {
                let statusColor = "bg-emerald-500 text-emerald-400";
                let statusLabel = "Available";
                if (member.status === "WORKING") {
                  statusColor = "bg-blue-500 text-blue-400";
                  statusLabel = "Working";
                } else if (member.status === "IN_REVIEW") {
                  statusColor = "bg-amber-500 text-amber-400";
                  statusLabel = "In Review";
                }

                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-white">{member.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                          {member.role}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                          <span className="text-slate-300">{statusLabel}</span>
                        </span>
                      </div>

                      {member.currentTaskTitle ? (
                        <p className="text-xs text-slate-300 font-mono truncate">
                          <strong className="text-slate-500">Current Work: </strong>
                          {member.currentTaskTitle}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 font-mono italic">
                          No active task in progress.
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                        <span>{member.assignedCount} assigned</span>
                        <span>·</span>
                        <span>{member.completedCount} completed</span>
                        <span>·</span>
                        <span>{member.inProgressCount} in progress</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onMessageEmployee(member)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>Message</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
