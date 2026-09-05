"use client";

import { useState, useEffect } from "react";
import {
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  AlertTriangle,
  Clock,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
  Loader2,
  Mail,
  UserPlus,
  Send,
  Radio,
} from "lucide-react";
import {
  ProjectTeamOverviewData,
  ProjectTeamGroup,
  ProjectTeamMemberSummary,
} from "@/lib/projects/project-team.service";
import { AdminInviteMemberModal } from "./admin-invite-member-modal";
import { AdminTeamDetailModal } from "./admin-team-detail-modal";

interface AdminProjectTeamViewProps {
  projectId: string;
  projectName: string;
  onNavigateTab?: (tab: string, context?: any) => void;
}

export function AdminProjectTeamView({
  projectId,
  projectName,
  onNavigateTab,
}: AdminProjectTeamViewProps) {
  const [data, setData] = useState<ProjectTeamOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteDefaultTeam, setInviteDefaultTeam] = useState<"FRONTEND" | "BACKEND" | "DATABASE" | "QA">("FRONTEND");
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<ProjectTeamGroup | null>(null);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/team`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to load project team structure.");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Error loading project team.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchTeamData();
  }, [projectId]);

  if (loading && !data) {
    return (
      <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center gap-3 font-mono text-xs text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span>Loading Project Team &amp; Workload Intelligence...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/50 border border-rose-500/30 text-center space-y-3 font-mono">
        <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">Failed to load team data</h3>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={fetchTeamData}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const teams = data?.teams;
  const communication = data?.communication;
  const attention = data?.attention;

  const handleOpenInvite = (team: "FRONTEND" | "BACKEND" | "DATABASE" | "QA" = "FRONTEND") => {
    setInviteDefaultTeam(team);
    setInviteModalOpen(true);
  };

  const handleOpenTeamDetail = (teamGroup: ProjectTeamGroup) => {
    setSelectedTeamDetail(teamGroup);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase tracking-wider">
              Project Execution Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Strict Project-First Architecture
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Project Teams &amp; Personnel
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Every project owns its own teams, employees, roles, and workloads. Zero cross-project leakage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenInvite("FRONTEND")}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Section 17: Admin Project Overview (Team, Communication, Attention) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {/* TEAM Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>TEAM ({data?.totalMembers || 0})</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Members</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Frontend</span>
              <strong className="text-white">{teams?.FRONTEND?.memberCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Backend</span>
              <strong className="text-white">{teams?.BACKEND?.memberCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Database</span>
              <strong className="text-white">{teams?.DATABASE?.memberCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">QA</span>
              <strong className="text-white">{teams?.QA?.memberCount || 0}</strong>
            </div>
          </div>
        </div>

        {/* COMMUNICATION Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>COMMUNICATION</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Threads</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Unread</span>
              <strong className={communication?.unreadCount ? "text-amber-400" : "text-slate-300"}>
                {communication?.unreadCount || 0}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Direct</span>
              <strong className="text-white">{communication?.directCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Team</span>
              <strong className="text-white">{communication?.teamCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Cross-Team</span>
              <strong className="text-white">{communication?.crossTeamCount || 0}</strong>
            </div>
          </div>
        </div>

        {/* ATTENTION Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>ATTENTION</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Real Status</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 uppercase block">Blockers</span>
              <strong className={`text-base block mt-0.5 ${attention?.blockersCount ? "text-rose-400" : "text-slate-300"}`}>
                {attention?.blockersCount || 0}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 uppercase block">Reviews</span>
              <strong className={`text-base block mt-0.5 ${attention?.reviewsCount ? "text-amber-400" : "text-slate-300"}`}>
                {attention?.reviewsCount || 0}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 uppercase block">Dependencies</span>
              <strong className={`text-base block mt-0.5 ${attention?.dependenciesCount ? "text-blue-400" : "text-slate-300"}`}>
                {attention?.dependenciesCount || 0}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: The 4 Teams (FRONTEND, BACKEND, DATABASE, QA) */}
      <div className="space-y-6">
        {(["FRONTEND", "BACKEND", "DATABASE", "QA"] as const).map((teamKey) => {
          const teamGroup = teams?.[teamKey];
          const members = teamGroup?.members || [];

          return (
            <div
              key={teamKey}
              className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-5"
            >
              {/* Team Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold font-mono text-white tracking-wider">
                    {teamKey}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 font-semibold">
                    {members.length} MEMBERS
                  </span>
                  {teamGroup && teamGroup.blockersCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold">
                      {teamGroup.blockersCount} BLOCKER
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 font-mono text-xs">
                  <button
                    onClick={() => teamGroup && handleOpenTeamDetail(teamGroup)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    View Team Detail
                  </button>
                  <button
                    onClick={() => handleOpenInvite(teamKey)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-semibold transition cursor-pointer"
                  >
                    + Invite {teamGroup?.displayName || teamKey}
                  </button>
                </div>
              </div>

              {/* Members Grid */}
              {members.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2 font-mono">
                  <p className="text-xs text-slate-500">No {teamGroup?.displayName.toLowerCase()} members yet.</p>
                  <button
                    onClick={() => handleOpenInvite(teamKey)}
                    className="text-xs text-blue-400 hover:underline cursor-pointer font-bold"
                  >
                    Invite first {teamGroup?.displayName} member →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member) => {
                    let dotColor = "bg-emerald-500";
                    let statusLabel = "Available";
                    if (member.status === "WORKING") {
                      dotColor = "bg-blue-500";
                      statusLabel = "Working";
                    } else if (member.status === "IN_REVIEW") {
                      dotColor = "bg-amber-500";
                      statusLabel = "In Review";
                    }

                    return (
                      <div
                        key={member.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-white group-hover:text-blue-400 transition">
                              {member.name}
                            </h4>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                              <span className="text-slate-300">{statusLabel}</span>
                            </span>
                          </div>

                          <p className="text-xs font-mono text-slate-400">
                            {member.role}
                          </p>

                          {member.currentTaskTitle ? (
                            <p className="text-xs text-slate-300 font-mono truncate bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                              {member.currentTaskTitle}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-600 font-mono italic">
                              No active task assigned.
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">
                            {member.assignedCount} assigned · {member.completedCount} completed
                          </span>
                          <button
                            onClick={() => onNavigateTab && onNavigateTab("communication", { targetEmployee: member })}
                            className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-semibold"
                          >
                            [ Message ]
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <AdminInviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
        defaultTeam={inviteDefaultTeam}
        onSuccess={() => {
          fetchTeamData();
        }}
      />

      <AdminTeamDetailModal
        isOpen={!!selectedTeamDetail}
        onClose={() => setSelectedTeamDetail(null)}
        team={selectedTeamDetail}
        projectId={projectId}
        projectName={projectName}
        onInviteMember={() => {
          if (selectedTeamDetail) {
            handleOpenInvite(selectedTeamDetail.teamName);
          }
        }}
        onMessageTeam={(team) => {
          setSelectedTeamDetail(null);
          if (onNavigateTab) onNavigateTab("communication", { targetTeam: team });
        }}
        onMessageEmployee={(member) => {
          setSelectedTeamDetail(null);
          if (onNavigateTab) onNavigateTab("communication", { targetEmployee: member });
        }}
      />
    </div>
  );
}
