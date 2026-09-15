"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban,
  CheckCircle2,
  X,
  Loader2,
  Plus,
  Users,
  Building2,
  Shield,
  ArrowRight,
  Send,
  UserCheck,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TeamOSModalProps = {
  employees: any[];
  onClose: () => void;
  onTeamCreated: () => void;
  onInviteMemberToTeam?: (team: { id: string; name: string; projectId?: string; projectName?: string; projectCode?: string }) => void;
};

export function TeamOSModal({
  employees = [],
  onClose,
  onTeamCreated,
  onInviteMemberToTeam,
}: TeamOSModalProps) {
  const [activeTab, setActiveTab] = useState<"LIST" | "CREATE">("LIST");
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Projects for selector
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [department, setDepartment] = useState("ENGINEERING");
  const [description, setDescription] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success Created State
  const [createdTeam, setCreatedTeam] = useState<any | null>(null);

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const res = await fetch("/api/employees/teams");
      const json = await res.json();
      if (json.ok && Array.isArray(json.teams)) {
        setTeams(json.teams);
        if (json.teams.length === 0) {
          setActiveTab("CREATE");
        }
      }
    } catch {}
    finally {
      setLoadingTeams(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await fetch("/api/projects");
      const json = await res.json();
      const list = Array.isArray(json?.projects) ? json.projects : Array.isArray(json?.data) ? json.data : [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch {}
    finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchProjects();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          department,
          description: description.trim() || undefined,
          teamLeadId: teamLeadId || undefined,
          projectId: selectedProjectId || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok && json.team) {
        setCreatedTeam(json.team);
        onTeamCreated();
        fetchTeams();
      } else {
        setError(json.message || "Failed to create team.");
      }
    } catch {
      setError("Network error creating team.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteToTeam = (team: any) => {
    if (onInviteMemberToTeam) {
      onInviteMemberToTeam({
        id: team.id,
        name: team.name,
        projectId: team.project?.id || team.projectId,
        projectName: team.project?.name || team.projectName,
        projectCode: team.project?.code || team.projectCode,
      });
      onClose();
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--bos-text-primary)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface-panel)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)] tracking-tight">
                Engineering Delivery Teams
              </h3>
              <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                Organize specialists into cross-functional project squads with verified deliverable ownership.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Tabs */}
        {!createdTeam && (
          <div className="px-6 py-2.5 bg-[var(--bos-bg)] border-b border-[var(--bos-border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 bg-[var(--bos-surface)] p-1 rounded-lg border border-[var(--bos-border)]">
              <button
                type="button"
                onClick={() => setActiveTab("LIST")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                  activeTab === "LIST"
                    ? "bg-[var(--bos-accent)] text-white shadow-xs"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Teams ({teams.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("CREATE")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                  activeTab === "CREATE"
                    ? "bg-[var(--bos-accent)] text-white shadow-xs"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Team</span>
              </button>
            </div>

            {activeTab === "LIST" && (
              <button
                type="button"
                onClick={() => setActiveTab("CREATE")}
                className="text-xs text-[var(--bos-accent)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>+ Add Team</span>
              </button>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {createdTeam ? (
            /* POST-CREATION CELEBRATION & INVITE PROMPT */
            <div className="space-y-5 animate-in zoom-in-95 duration-200 py-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-[var(--bos-text-primary)]">
                  Team &ldquo;{createdTeam.name}&rdquo; Created!
                </h4>
                <p className="text-xs text-[var(--bos-text-secondary)] max-w-md mx-auto">
                  {createdTeam.project
                    ? `Configured for project ${createdTeam.project.name}. You can now invite engineers into this team.`
                    : "Delivery team configured in workspace. Ready to invite team members."}
                </p>
              </div>

              {/* Team Spec Card */}
              <div className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-left space-y-3 max-w-md mx-auto text-xs shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)]">
                    TEAM SUMMARY
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)]">
                    {createdTeam.code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block font-mono uppercase">Target Project</span>
                    <strong className="text-[var(--bos-text-primary)] block truncate text-[12px]">
                      {createdTeam.project?.name || "Workspace General"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block font-mono uppercase">Department</span>
                    <span className="text-sky-600 dark:text-sky-400 font-semibold block text-[12px]">
                      {createdTeam.department}
                    </span>
                  </div>
                </div>

                {createdTeam.description && (
                  <p className="text-[11px] text-[var(--bos-text-secondary)] pt-1 border-t border-[var(--bos-border)]">
                    {createdTeam.description}
                  </p>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => handleInviteToTeam(createdTeam)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-semibold flex items-center justify-center gap-2 transition hover:opacity-90 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>+ Invite Member to this Team</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedTeam(null);
                    setActiveTab("LIST");
                    setName("");
                    setCode("");
                    setDescription("");
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-xs font-semibold transition cursor-pointer"
                >
                  View All Teams
                </button>
              </div>
            </div>
          ) : activeTab === "LIST" ? (
            /* ALL TEAMS LIST VIEW */
            <div className="space-y-3">
              {loadingTeams ? (
                <div className="py-12 text-center text-xs text-[var(--bos-text-secondary)] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
                  <span>Loading organization teams...</span>
                </div>
              ) : teams.length === 0 ? (
                <div className="p-8 text-center bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
                      No Teams Created Yet
                    </h4>
                    <p className="text-xs text-[var(--bos-text-secondary)] mt-0.5">
                      Create project-dedicated delivery squads (Frontend, Backend, Database, QA) and assign workspace talent.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("CREATE")}
                    className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition hover:opacity-90 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Create First Team</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1 truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-bold text-[var(--bos-text-primary)]">
                            {t.name}
                          </h5>
                          <span className="font-mono text-[9.5px] px-1.5 py-0.2 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)]">
                            {t.code}
                          </span>
                          <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold">
                            {t.department}
                          </span>
                        </div>

                        {/* Project context tag */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--bos-text-secondary)]">
                          <Building2 className="w-3.5 h-3.5 text-[var(--bos-accent)] shrink-0" />
                          {t.project ? (
                            <span className="truncate font-medium text-[var(--bos-text-primary)]">
                              Project: {t.project.name} {t.project.code ? `(${t.project.code})` : ""}
                            </span>
                          ) : (
                            <span className="text-[var(--bos-text-tertiary)] italic">Workspace Organization Team</span>
                          )}
                        </div>

                        {t.description && (
                          <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-1">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[10.5px] text-[var(--bos-text-tertiary)] pt-1">
                          <span>
                            {t.memberCount || 0} active member(s)
                          </span>
                          {t.teamLead && (
                            <span>
                              Lead: <strong className="text-[var(--bos-text-secondary)]">{t.teamLead.fullName}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action to Invite to this team */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInviteToTeam(t)}
                          className="px-3.5 py-1.5 rounded-lg bg-[var(--bos-accent-subtle)] hover:bg-[var(--bos-accent)] text-[var(--bos-accent)] hover:text-white border border-[var(--bos-accent)]/20 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>+ Invite Member</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CREATE TEAM FORM */
            <form onSubmit={handleCreateTeam} className="space-y-4 animate-in fade-in duration-150">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Team Name and Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--bos-text-primary)] block">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core Frontend Architecture"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--bos-text-primary)] block">
                    Team Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TEAM-FE"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition"
                  />
                </div>
              </div>

              {/* PROJECT SELECTOR (KEY REQUIREMENT) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--bos-text-primary)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                    <span>Which Project is this Team designated for? *</span>
                  </span>
                  <span className="text-[10.5px] text-[var(--bos-text-tertiary)] font-normal">
                    Select delivery scope
                  </span>
                </label>

                {loadingProjects ? (
                  <div className="py-2 text-xs text-[var(--bos-text-tertiary)] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--bos-accent)]" />
                    <span>Loading projects...</span>
                  </div>
                ) : (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)] transition cursor-pointer"
                  >
                    <option value="">Workspace Organization Team (Cross-Project / General)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ""} {p.client?.companyName ? `— ${p.client.companyName}` : ""}
                      </option>
                    ))}
                  </select>
                )}

                {selectedProject && (
                  <p className="text-[11px] text-[var(--bos-text-secondary)] px-1">
                    Squad members assigned to this team will execute sprint tasks and deliverables under <strong>{selectedProject.name}</strong>.
                  </p>
                )}
              </div>

              {/* Department & Team Lead */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--bos-text-primary)] block">
                    Engineering Discipline / Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)] transition cursor-pointer"
                  >
                    <option value="ENGINEERING">Engineering (Full-Stack / Core)</option>
                    <option value="FRONTEND">Frontend Team (UI / UX / Client)</option>
                    <option value="BACKEND">Backend Team (API / Domain / Services)</option>
                    <option value="DATABASE">Database Team (Schema / Data)</option>
                    <option value="QA">QA Team (Automation / Testing)</option>
                    <option value="DESIGN">Design &amp; Experience</option>
                    <option value="PRODUCT">Product Management</option>
                    <option value="OPERATIONS">Operations &amp; DevOps</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--bos-text-primary)] block">
                    Team Lead
                  </label>
                  <select
                    value={teamLeadId}
                    onChange={(e) => setTeamLeadId(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)] transition cursor-pointer"
                  >
                    <option value="">No Team Lead Designated</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode || emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description / Mission */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--bos-text-primary)] block">
                  Team Mission &amp; Responsibility Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Responsible for design system components, client state management, and UX responsiveness."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--bos-border)]">
                <button
                  type="button"
                  onClick={() => setActiveTab("LIST")}
                  className="px-4 py-2 rounded-xl border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[var(--bos-accent)] hover:opacity-90 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Team Squad</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
