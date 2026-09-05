"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  Flame,
  FolderKanban,
  GitBranch,
  History,
  Layers,
  Loader2,
  Lock,
  Mail,
  MoreVertical,
  Plus,
  Radio,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  UserCheck,
  UserX,
  Users,
  X,
  Zap,
  Edit,
  TrendingUp,
  Percent,
  CheckSquare,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmployeeWorkspaceDrawerProps = {
  employeeId: string;
  roles?: any[];
  teams?: any[];
  onClose: () => void;
  onUpdated?: () => void;
  onOpenAssignTask?: (employee: any) => void;
  onOpenOffboard?: (employee: any) => void;
};

export function EmployeeWorkspaceDrawer({
  employeeId,
  roles = [],
  teams = [],
  onClose,
  onUpdated,
  onOpenAssignTask,
  onOpenOffboard,
}: EmployeeWorkspaceDrawerProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "reviews" | "work" | "projects" | "tasks" | "deliverables" | "teams" | "permissions" | "activity" | "security" | "invitations" | "performance"
  >("overview");

  // Build Review Decisions
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleExecuteReview = async (projectId: string, submissionId: string, decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED", comment?: string) => {
    setDecidingId(submissionId);
    try {
      const res = await fetch(`/api/projects/${projectId}/reviews/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          comment: comment || (decision === "APPROVED" ? "Approved by Admin via Employee Workspace." : "Changes requested by Admin."),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadDetails();
        if (onUpdated) onUpdated();
      }
    } catch (e) {
      console.error("Error submitting review decision:", e);
    } finally {
      setDecidingId(null);
    }
  };

  // Action Dialog States
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangeRole, setShowChangeRole] = useState(false);
  const [showMoveTeam, setShowMoveTeam] = useState(false);

  // Edit State
  const [editFullName, setEditFullName] = useState("");
  const [editPreferredName, setEditPreferredName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCapacityTarget, setEditCapacityTarget] = useState(40);
  const [savingEdit, setSavingEdit] = useState(false);

  // Role Change State
  const [targetRoleId, setTargetRoleId] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  // Team Move State
  const [targetTeamId, setTargetTeamId] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/employees/${employeeId}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setEditFullName(json.employee.fullName);
        setEditPreferredName(json.employee.preferredName || "");
        setEditPhone(json.employee.phone || "");
        setEditDepartment(json.employee.department);
        setEditTimezone(json.employee.timezone);
        setEditLocation(json.employee.location || "");
        setEditCapacityTarget(json.employee.capacityTargetHours || 40);
        setTargetRoleId(json.role?.id || "");
        setTargetTeamId(json.team?.id || "");
      } else {
        setError(json.message || "Failed to load employee details.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading employee.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) loadDetails();
  }, [employeeId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          preferredName: editPreferredName || null,
          phone: editPhone || null,
          department: editDepartment,
          timezone: editTimezone,
          location: editLocation || null,
          capacityTargetHours: editCapacityTarget,
        }),
      });
      if (res.ok) {
        setShowEditProfile(false);
        loadDetails();
        onUpdated?.();
      }
    } catch {}
    finally {
      setSavingEdit(false);
    }
  };

  const handleChangeRole = async () => {
    if (!targetRoleId) return;
    setSavingRole(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: targetRoleId }),
      });
      if (res.ok) {
        setShowChangeRole(false);
        loadDetails();
        onUpdated?.();
      }
    } catch {}
    finally {
      setSavingRole(false);
    }
  };

  const handleMoveTeam = async () => {
    if (!targetTeamId) return;
    setSavingTeam(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: targetTeamId }),
      });
      if (res.ok) {
        setShowMoveTeam(false);
        loadDetails();
        onUpdated?.();
      }
    } catch {}
    finally {
      setSavingTeam(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bos-bg)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Loading Employee Execution Workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bos-bg)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-[18px] font-bold text-[var(--bos-text-primary)]">Unable to Open Employee Workspace</h3>
        <p className="text-[13px] text-[var(--bos-text-secondary)] max-w-md">{error || "Employee not found."}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] font-medium cursor-pointer"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const {
    employee,
    role,
    team,
    user,
    executionHealth,
    projects = [],
    tasks = [],
    deliverables = [],
    permissions,
    invitations = [],
    auditTrail = [],
    buildSubmissions = [],
  } = data;

  const pendingSubmissions = buildSubmissions.filter(
    (s: any) => s.status === "SUBMITTED" || s.status === "READY_FOR_REVIEW" || s.status === "IN_REVIEW" || s.status === "ANALYZING" || s.status === "QUEUED"
  );

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col overflow-hidden animate-in fade-in duration-150">
      
      {/* ── TOP HEADER ────────────────────────────────────────────── */}
      <header className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)] px-6 py-3 shrink-0 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-[12px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors pr-2 border-r border-[var(--bos-border)] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Directory</span>
          </button>

          <div className="w-9 h-9 rounded-full bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold font-mono text-[13px] border border-[var(--bos-accent)]/20 shrink-0">
            {employee.avatar ? (
              <img src={employee.avatar} alt={employee.fullName} className="w-full h-full rounded-full object-cover" />
            ) : (
              employee.fullName.slice(0, 2).toUpperCase()
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">{employee.fullName}</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-tertiary)] font-bold">
                {employee.employeeCode}
              </span>
              <span className={cn(
                "text-[9.5px] font-mono font-bold px-2 py-0.2 rounded uppercase",
                employee.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                employee.status === "INVITED" ? "bg-purple-500/10 text-purple-600 border border-purple-500/20" :
                "bg-rose-500/10 text-rose-600 border border-rose-500/20"
              )}>
                {employee.status}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
              {role?.name || "General Specialist"} · {team?.name || employee.department} · {employee.email} · Last active: {employee.lastActiveAt ? new Date(employee.lastActiveAt).toLocaleDateString() : "Never"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowEditProfile(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-[var(--bos-text-secondary)]" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => setShowChangeRole(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-purple-500 text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>Change Role</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMoveTeam(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-sky-500 text-[12px] font-medium transition-colors cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-sky-600" />
            <span>Move Team</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAssignTask?.(employee)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-medium transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Work</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenOffboard?.(employee)}
            className="px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-rose-500 text-[12px] font-medium text-rose-600 transition-colors cursor-pointer"
          >
            Suspend
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── EXECUTION HEALTH STRIP ─────────────────────────────────── */}
      <div className="bg-[var(--bos-surface)]/80 border-b border-[var(--bos-border)] px-6 py-2.5 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-[12px] font-mono">
          <div className="p-2 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
            <span className="text-[var(--bos-text-tertiary)]">PROJECTS:</span>
            <strong className="text-[var(--bos-text-primary)]">{executionHealth.activeProjectsCount}</strong>
          </div>
          <div className="p-2 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
            <span className="text-[var(--bos-text-tertiary)]">ACTIVE TASKS:</span>
            <strong className="text-[var(--bos-text-primary)]">{executionHealth.activeTasksCount}</strong>
          </div>
          <div className="p-2 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
            <span className="text-[var(--bos-text-tertiary)]">COMPLETED:</span>
            <strong className="text-emerald-600">{executionHealth.completedTasksCount}</strong>
          </div>
          <div className="p-2 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
            <span className="text-[var(--bos-text-tertiary)]">DUE SOON:</span>
            <strong className="text-amber-600">{executionHealth.dueSoonCount}</strong>
          </div>
          <div className="p-2 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
            <span className="text-[var(--bos-text-tertiary)]">BLOCKED:</span>
            <strong className="text-rose-600">{executionHealth.blockedCount}</strong>
          </div>
          <div className="p-2 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
            <span className="text-[var(--bos-text-tertiary)]">OVERDUE:</span>
            <strong className="text-rose-600">{executionHealth.overdueCount}</strong>
          </div>
          <div className="p-2 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] flex items-center justify-between">
            <span className="text-[var(--bos-text-tertiary)]">CAPACITY:</span>
            <strong className={cn(
              executionHealth.capacityPercentage > 100 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"
            )}>
              {executionHealth.capacityPercentage}% ({executionHealth.totalAssignedHours}h)
            </strong>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE TABS NAVIGATION ───────────────────────────── */}
      <div className="bg-[var(--bos-surface)] border-b border-[var(--bos-border)] px-6 shrink-0 flex items-center gap-1 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Zap },
          {
            id: "reviews",
            label: `Review Requests (${buildSubmissions.length})`,
            icon: ShieldCheck,
            badge: pendingSubmissions.length > 0 ? `${pendingSubmissions.length} Pending` : undefined,
          },
          { id: "work", label: `Work DNA (${tasks.length})`, icon: CheckCircle2 },
          { id: "projects", label: `Projects (${projects.length})`, icon: FolderKanban },
          { id: "tasks", label: `Tasks (${tasks.length})`, icon: CheckSquare },
          { id: "deliverables", label: `Deliverables (${deliverables.length})`, icon: Target },
          { id: "teams", label: `Teams`, icon: Users },
          { id: "permissions", label: "Permissions", icon: Lock },
          { id: "activity", label: `Activity (${auditTrail.length})`, icon: History },
          { id: "security", label: "Security", icon: ShieldCheck },
          { id: "invitations", label: `Invitations (${invitations.length})`, icon: Mail },
          { id: "performance", label: "Performance", icon: TrendingUp },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-[12px] font-mono font-medium transition-all whitespace-nowrap cursor-pointer relative",
                isActive
                  ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-bold"
                  : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.badge && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold font-mono animate-pulse">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── MAIN WORKSPACE BODY ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1500px]">

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* PENDING REVIEW REQUESTS ALERT BANNER */}
            {pendingSubmissions.length > 0 && (
              <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-150">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                      {pendingSubmissions.length} BUILD REVIEW REQUEST{pendingSubmissions.length > 1 ? "S" : ""} DELIVERED TO ADMIN
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("reviews")}
                    className="text-[11px] font-mono text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View All in Review Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {pendingSubmissions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold">
                            {sub.submissionCode} • v{sub.version}
                          </span>
                          <span className="font-bold text-[13px] text-[var(--bos-text-primary)]">
                            {sub.featureName}
                          </span>
                          <span className="text-[11px] text-[var(--bos-text-tertiary)] font-mono">
                            ({sub.project?.name || "Project"})
                          </span>
                        </div>
                        <p className="text-[12px] text-[var(--bos-text-secondary)]">
                          {sub.whatYouBuilt}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--bos-text-tertiary)] pt-1">
                          <span className="text-emerald-400">✓ {sub.proofs?.length || 0} proofs attached</span>
                          <span>•</span>
                          <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                        <button
                          disabled={decidingId === sub.id}
                          onClick={() => handleExecuteReview(sub.project?.id, sub.id, "APPROVED")}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {decidingId === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>Approve Build</span>
                        </button>
                        <button
                          onClick={() => setActiveTab("reviews")}
                          className="px-3.5 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] rounded-lg transition-colors cursor-pointer"
                        >
                          Inspect Evidence
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Relational Flow Graph Strip */}
            <div className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3">
              <span className="text-[10.5px] font-mono font-bold uppercase text-[var(--bos-accent)] tracking-wider block">
                ORGANIZATIONAL EXECUTION GRAPH
              </span>
              <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11.5px] font-mono">
                <div className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Person</span>
                  <strong>{employee.fullName}</strong>
                </div>
                <span>→</span>
                <div className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Team</span>
                  <strong>{team?.name || "General Delivery"}</strong>
                </div>
                <span>→</span>
                <div className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Projects</span>
                  <strong>{projects.length} Allocated</strong>
                </div>
                <span>→</span>
                <div className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Deliverables</span>
                  <strong>{deliverables.length} Owned</strong>
                </div>
                <span>→</span>
                <div className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Tasks</span>
                  <strong>{tasks.length} Assigned</strong>
                </div>
              </div>
            </div>

            {/* Identity & Responsibilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">Identity & Operational Profile</h4>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between py-1 border-b border-[var(--bos-border)]/60">
                    <span className="text-[var(--bos-text-tertiary)]">Email:</span>
                    <span className="font-mono text-[var(--bos-text-primary)]">{employee.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--bos-border)]/60">
                    <span className="text-[var(--bos-text-tertiary)]">Phone:</span>
                    <span className="font-mono text-[var(--bos-text-primary)]">{employee.phone || "NOT PROVIDED"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--bos-border)]/60">
                    <span className="text-[var(--bos-text-tertiary)]">Timezone:</span>
                    <span className="font-mono text-[var(--bos-text-primary)]">{employee.timezone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--bos-border)]/60">
                    <span className="text-[var(--bos-text-tertiary)]">Location:</span>
                    <span className="font-mono text-[var(--bos-text-primary)]">{employee.location || "Remote"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--bos-border)]/60">
                    <span className="text-[var(--bos-text-tertiary)]">Employment Type:</span>
                    <span className="font-mono text-[var(--bos-text-primary)]">{employee.employmentType}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--bos-text-tertiary)]">Joined:</span>
                    <span className="font-mono text-[var(--bos-text-primary)]">{new Date(employee.joinedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">Primary Delivery Focus</h4>
                <p className="text-[12.5px] text-[var(--bos-text-secondary)] leading-relaxed">
                  {employee.primaryResponsibility || "Responsible for active engineering execution and milestone deliverables."}
                </p>
                {employee.secondaryResponsibilities?.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] font-bold block">Secondary Accountabilities</span>
                    <ul className="text-[11.5px] text-[var(--bos-text-secondary)] space-y-1 mt-1">
                      {employee.secondaryResponsibilities.map((sr: string, idx: number) => (
                        <li key={idx}>• {sr}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: BUILD REVIEWS & SUBMISSIONS */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">Build Reviews & Submissions</h3>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  Review build requests, inspect verification proofs (PRs, Screenshots, Tests), and execute admin approval decisions.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                {buildSubmissions.length} Total Submissions
              </span>
            </div>

            {buildSubmissions.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-2">
                <ShieldCheck className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
                <p className="text-xs font-mono text-[var(--bos-text-secondary)]">No build submissions recorded yet for this employee.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {buildSubmissions.map((sub: any) => {
                  const isPending = sub.status === "SUBMITTED" || sub.status === "READY_FOR_REVIEW" || sub.status === "IN_REVIEW" || sub.status === "ANALYZING" || sub.status === "QUEUED";
                  const isApproved = sub.status === "APPROVED";
                  const isChanges = sub.status === "CHANGES_REQUESTED";

                  return (
                    <div
                      key={sub.id}
                      className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl space-y-4 shadow-xs"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-[var(--bos-border)]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-mono text-[10.5px] font-bold">
                              {sub.submissionCode} • Version {sub.version}
                            </span>
                            <h4 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                              {sub.featureName}
                            </h4>
                            {sub.task && (
                              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[10.5px] font-bold">
                                Task: {sub.task.code || "TSK"} • {sub.task.title}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] block">
                            Project: {sub.project?.name || "Project"} • Role: {sub.responsibility || "Implementation"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-xl font-mono text-[11px] font-bold uppercase",
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : isChanges
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                            )}
                          >
                            {isPending ? "AWAITING ADMIN REVIEW" : sub.status}
                          </span>

                          {isPending && (
                            <button
                              disabled={decidingId === sub.id}
                              onClick={() => handleExecuteReview(sub.project?.id, sub.id, "APPROVED")}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {decidingId === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* What was built */}
                      <div className="p-3.5 bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-xl text-xs space-y-1">
                        <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] block">
                          WHAT WAS BUILT:
                        </span>
                        <p className="text-[var(--bos-text-primary)] font-medium leading-relaxed">
                          {sub.whatYouBuilt}
                        </p>
                      </div>

                      {/* Attached Proofs (3 Sections) */}
                      <div className="space-y-2">
                        <span className="font-mono text-[10px] uppercase font-bold text-[var(--bos-text-secondary)] block">
                          ATTACHED VERIFICATION PROOFS ({sub.proofs?.length || 0}):
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {sub.proofs?.map((p: any) => {
                            const isImage = p.type === "SCREENSHOT" || p.evidenceUrl?.startsWith("data:image") || p.evidenceUrl?.includes("blob:") || p.evidenceUrl?.match(/\.(png|jpe?g|webp|gif|svg)/i);

                            return (
                              <div
                                key={p.id}
                                className="p-3.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs space-y-2 flex flex-col justify-between"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-[var(--bos-text-primary)] truncate">
                                      {p.title}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-mono text-[9px] uppercase font-bold shrink-0">
                                      {p.type}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-2">
                                    {p.whatChanged}
                                  </p>

                                  {/* Visual Image Preview */}
                                  {isImage && p.evidenceUrl && (
                                    <div
                                      onClick={() => setSelectedImage(p.evidenceUrl)}
                                      className="rounded-lg overflow-hidden border border-[var(--bos-border)] bg-black/20 relative group cursor-pointer"
                                      title="Click to zoom screenshot"
                                    >
                                      <img
                                        src={p.evidenceUrl}
                                        alt={p.title}
                                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-mono font-bold">
                                        🔍 Click to Enlarge
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-1 border-t border-[var(--bos-border)]/60 space-y-1">
                                  {p.evidenceUrl && !isImage && (
                                    <a
                                      href={p.evidenceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10.5px] font-mono text-purple-400 hover:underline flex items-center gap-1 truncate"
                                    >
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{p.evidenceUrl}</span>
                                    </a>
                                  )}
                                  {p.testOutcome && (
                                    <span className="font-mono text-[10px] text-emerald-400 block">
                                      Outcome: {p.testOutcome}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WORK DNA & TASK ORIGIN */}
        {activeTab === "work" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">Work DNA Lineage</h3>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">Every assigned task is traceable to approved proposals and client requirements.</p>
              </div>
              <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">{tasks.length} Total Tasks</span>
            </div>

            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded",
                        task.layer === "DATABASE" ? "bg-purple-500/10 text-purple-600" :
                        task.layer === "BACKEND" ? "bg-emerald-500/10 text-emerald-600" :
                        task.layer === "FRONTEND" ? "bg-sky-500/10 text-sky-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {task.code || "TSK"}
                      </span>
                      <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">{task.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.submission && (
                        <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          SUBMITTED (v{task.submission.version})
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] font-bold">
                        {task.status}
                      </span>
                    </div>
                  </div>

                  {/* Lineage Path */}
                  <div className="p-2.5 bg-[var(--bos-bg)] rounded-lg text-[11px] font-mono text-[var(--bos-text-tertiary)] flex items-center gap-2 flex-wrap">
                    <span>Project: <strong className="text-[var(--bos-text-primary)]">{task.projectName}</strong></span>
                    <span>→</span>
                    <span>Deliverable: <strong className="text-[var(--bos-text-primary)]">{task.deliverableTitle || "Core Scope"}</strong></span>
                    {task.sourceRequirementId && (
                      <>
                        <span>→</span>
                        <span>REQ: <strong className="text-[var(--bos-text-primary)]">{task.sourceRequirementId}</strong></span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)] pt-1">
                    <span>Due: {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "Scheduled"}</span>
                    <span>{task.passedCriteriaCount}/{task.criteriaCount || 1} criteria verified</span>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
                  No active tasks assigned to this employee.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROJECTS */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p: any) => (
                <div key={p.id} className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">{p.code || "PRJ"}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-bold">{p.stage}</span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{p.name}</h4>
                  <div className="text-[11.5px] text-[var(--bos-text-secondary)] space-y-1 font-mono">
                    <div>Client: {p.clientName}</div>
                    <div>Project Role: {p.projectRole}</div>
                    <div>Allocation: {p.allocationPercentage}%</div>
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <div className="col-span-2 p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
                  No active project allocations recorded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TASKS */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            {tasks.map((task: any) => (
              <div key={task.id} className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">{task.code}</span>
                    <strong className="text-[13px] text-[var(--bos-text-primary)]">{task.title}</strong>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">{task.projectName} · {task.layer} · {task.estimatedHours}h est</span>
                </div>
                <div className="flex items-center gap-2">
                  {task.submission && (
                    <button
                      onClick={() => setActiveTab("reviews")}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                      ✓ Review Submission (v{task.submission.version})
                    </button>
                  )}
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bos-bg)] text-[var(--bos-text-secondary)]">{task.status}</span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
                No tasks assigned.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DELIVERABLES */}
        {activeTab === "deliverables" && (
          <div className="space-y-3">
            {deliverables.map((d: any) => (
              <div key={d.id} className="p-4 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">{d.title}</h4>
                  <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">{d.projectName} · {d.category}</span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bos-bg)] text-purple-600">{d.status}</span>
              </div>
            ))}
            {deliverables.length === 0 && (
              <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
                No deliverables currently owned by this employee.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TEAMS */}
        {activeTab === "teams" && (
          <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
            <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">Assigned Squad / Team</h3>
            {team ? (
              <div className="p-4 bg-[var(--bos-bg)] rounded-xl border border-[var(--bos-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-[14px] text-[var(--bos-text-primary)]">{team.name}</strong>
                  <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">{team.code}</span>
                </div>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">{team.description || "Operational cross-functional engineering squad."}</p>
                <div className="text-[11.5px] font-mono text-[var(--bos-text-tertiary)] pt-1">
                  Team Lead: {team.teamLead ? `${team.teamLead.fullName} (${team.teamLead.employeeCode})` : "None"}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--bos-text-tertiary)] italic">No team assigned.</p>
            )}
          </div>
        )}

        {/* TAB 7: PERMISSIONS */}
        {activeTab === "permissions" && (
          <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
            <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">Role-Based Permission Matrix</h3>
            <div className="p-3.5 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)] text-[12px] text-[var(--bos-text-secondary)]">
              <strong className="text-[var(--bos-text-primary)] block mb-1">Access Origin:</strong>
              {permissions.explanation}
            </div>

            <div className="space-y-2 text-[12px] font-mono">
              <div className="p-2.5 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] flex justify-between">
                <span>Projects:</span>
                <span className="text-emerald-600 font-bold">View & Edit Assigned</span>
              </div>
              <div className="p-2.5 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] flex justify-between">
                <span>Tasks:</span>
                <span className="text-emerald-600 font-bold">View, Create & Verify</span>
              </div>
              <div className="p-2.5 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] flex justify-between">
                <span>Deliverables:</span>
                <span className="text-emerald-600 font-bold">View & Submit</span>
              </div>
              <div className="p-2.5 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] flex justify-between">
                <span>Billing & System Admin:</span>
                <span className="text-rose-600 font-bold">Restricted</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ACTIVITY */}
        {activeTab === "activity" && (
          <div className="space-y-3">
            {auditTrail.map((ev: any) => (
              <div key={ev.id} className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[var(--bos-accent)]">{ev.action}</span>
                  <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">{new Date(ev.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[var(--bos-text-secondary)]">{ev.detail}</p>
                <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)] block">Actor: {ev.actorName || "System"}</span>
              </div>
            ))}
            {auditTrail.length === 0 && (
              <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
                No activity logs recorded.
              </div>
            )}
          </div>
        )}

        {/* TAB 9: SECURITY */}
        {activeTab === "security" && (
          <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
            <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">Security & Authentication State</h3>
            <div className="space-y-2 text-[12px]">
              <div className="p-3 bg-[var(--bos-bg)] rounded-lg flex items-center justify-between">
                <span>Account Status:</span>
                <span className="font-mono font-bold text-emerald-600">{user?.status || employee.status}</span>
              </div>
              <div className="p-3 bg-[var(--bos-bg)] rounded-lg flex items-center justify-between">
                <span>Email Verification:</span>
                <span className="font-mono text-emerald-600">{user?.emailVerified ? "Verified ✓" : "Pending Activation"}</span>
              </div>
              <div className="p-3 bg-[var(--bos-bg)] rounded-lg flex items-center justify-between">
                <span>Last Authentication:</span>
                <span className="font-mono">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: INVITATIONS */}
        {activeTab === "invitations" && (
          <div className="space-y-3">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-[var(--bos-text-primary)]">{inv.recipientEmail}</strong>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bos-bg)] text-purple-600 font-bold">{inv.status}</span>
                  </div>
                  <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">Sent: {inv.sentAt ? new Date(inv.sentAt).toLocaleString() : "Pending"}</span>
                </div>
              </div>
            ))}
            {invitations.length === 0 && (
              <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
                No invitation history recorded.
              </div>
            )}
          </div>
        )}

        {/* TAB 11: PERFORMANCE */}
        {activeTab === "performance" && (
          <div className="p-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl space-y-4">
            <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">Execution Performance & Delivery Reliability</h3>
            <div className="grid grid-cols-3 gap-3 font-mono text-[12px]">
              <div className="p-3 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)]">
                <span className="text-[var(--bos-text-tertiary)] text-[10px] block">COMPLETION RATE</span>
                <strong className="text-[18px] text-emerald-600">{executionHealth.completionRate}%</strong>
              </div>
              <div className="p-3 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)]">
                <span className="text-[var(--bos-text-tertiary)] text-[10px] block">COMPLETED TASKS</span>
                <strong className="text-[18px] text-[var(--bos-text-primary)]">{executionHealth.completedTasksCount}</strong>
              </div>
              <div className="p-3 bg-[var(--bos-bg)] rounded-lg border border-[var(--bos-border)]">
                <span className="text-[var(--bos-text-tertiary)] text-[10px] block">TOTAL EFFORT</span>
                <strong className="text-[18px] text-[var(--bos-accent)]">{executionHealth.totalAssignedHours}h</strong>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── ACTION MODAL 1: EDIT PROFILE ──────────────────────────── */}
      {showEditProfile && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold">Edit Operational Profile</h3>
              <button onClick={() => setShowEditProfile(false)}><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-[12px]">
              <div>
                <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Capacity Target (Hours/Week)</label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={editCapacityTarget}
                  onChange={(e) => setEditCapacityTarget(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--bos-border)]">
                <button type="button" onClick={() => setShowEditProfile(false)} className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)]">Cancel</button>
                <button type="submit" disabled={savingEdit} className="px-4 py-1.5 bg-[var(--bos-accent)] text-white rounded-lg font-semibold">
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ACTION MODAL 2: CHANGE ROLE ──────────────────────────── */}
      {showChangeRole && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold">Change Organization Role</h3>
              <button onClick={() => setShowChangeRole(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 text-[12px]">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Select Target Role</label>
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.department})</option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--bos-border)]">
                <button type="button" onClick={() => setShowChangeRole(false)} className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)]">Cancel</button>
                <button type="button" disabled={savingRole} onClick={handleChangeRole} className="px-4 py-1.5 bg-purple-600 text-white rounded-lg font-semibold">
                  {savingRole ? "Updating..." : "Confirm Role Change"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE LIGHTBOX MODAL ─────────────────────────────────── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-6 animate-in fade-in duration-150 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl p-4 shadow-2xl space-y-3 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border)]">
              <span className="font-mono text-xs font-bold uppercase text-emerald-400">
                Screenshot Verification Proof
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg hover:bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center rounded-xl bg-black/40 p-2">
              <img
                src={selectedImage}
                alt="Enlarged screenshot proof"
                className="max-h-[72vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
