"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Mail,
  Shield,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Search,
  Download,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeOSHeader } from "./employee-os-header";
import { TeamPulseStrip } from "./team-pulse-strip";
import { WorkforceHealthSection } from "./workforce-health-section";
import { EmployeeCommandTable } from "./employee-command-table";
import { EmployeeWorkspaceDrawer } from "./employee-workspace-drawer";
import { EmployeeOnboardingWizard } from "./employee-onboarding-wizard";
import { InvitationCenterModal } from "./invitation-center-modal";
// SmartAssignmentModal replaced by /employees/assign-work page flow
import { OffboardingModal } from "./offboarding-modal";
import { RoleOSModal } from "./role-os-modal";
import { TeamOSModal } from "./team-os-modal";
import { ImportPeopleModal } from "./import-people-modal";
import { WorkforceSettingsModal } from "./workforce-settings-modal";
import { CopilotWorkforceModal } from "./copilot-workforce-modal";

export function EmployeesCommandCenter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [workspace, setWorkspace] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any>({
    totalPeople: 0,
    active: 0,
    pendingInvites: 0,
    suspended: 0,
    unassigned: 0,
    activeWork: 0,
    overCapacity: 0,
    availableCapacity: 0,
    teamUtilization: 0,
    accessIssues: 0,
  });
  const [health, setHealth] = useState<any | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState("recently_added");
  const [activePulseFilter, setActivePulseFilter] = useState("ALL");

  // Modal / Drawer State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  // Navigate to full-page assignment flow instead of modal
  const openAssignWork = () => router.push("/employees/assign-work");
  const [offboardingEmployee, setOffboardingEmployee] = useState<any | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showImportPeople, setShowImportPeople] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (departmentFilter) params.append("department", departmentFilter);
      if (roleFilter) params.append("roleId", roleFilter);
      if (sortBy) params.append("sortBy", sortBy);
      if (activePulseFilter && activePulseFilter !== "ALL") params.append("filter", activePulseFilter);

      const res = await fetch(`/api/employees?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setWorkspace(json.workspace);
        setMetrics(json.metrics);
        setHealth(json.health);
        setEmployees(json.employees);
        setRoles(json.roles);
        setTeams(json.teams);
      } else {
        setError(json.message || "Failed to load workforce intelligence data.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, departmentFilter, roleFilter, sortBy, activePulseFilter]);

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] pb-20">
      
      {/* ── 01. WORKFORCE COMMAND HEADER ─────────────────────────── */}
      <EmployeeOSHeader
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        departmentFilter={departmentFilter}
        onDepartmentChange={(dep) => setDepartmentFilter(dep)}
        onInviteEmployee={() => setShowOnboarding(true)}
        onImportPeople={() => setShowImportPeople(true)}
        onOpenRolesPermissions={() => setShowCreateRole(true)}
        onOpenTeams={() => setShowCreateTeam(true)}
        onOpenWorkforceSettings={() => setShowSettings(true)}
        onOpenCopilot={() => setShowCopilot(true)}
      />

      {/* ── 02. MAIN WORKSPACE CONTAINER ─────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Executive Team Pulse Strip (9 Real-Time Metrics) */}
        <TeamPulseStrip
          metrics={metrics}
          activeFilter={activePulseFilter}
          onSelectFilter={(key) => setActivePulseFilter(key)}
        />

        {/* Workforce Health & WHAT NEEDS ATTENTION */}
        <WorkforceHealthSection
          health={health}
          onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
          onOpenInvitations={() => setShowInvitations(true)}
          onOpenTasks={() => openAssignWork()}
        />

        {/* Loading State */}
        {loading && employees.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--bos-text-secondary)] font-mono text-[13px]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
            <span>Loading Workforce Intelligence & Capability Engine…</span>
          </div>
        ) : employees.length === 0 ? (
          /* ── HONEST EMPTY STATE ─────────────────────────────────── */
          <div className="p-12 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-2xl mx-auto space-y-5 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] mx-auto flex items-center justify-center font-bold font-mono text-[22px]">
              ⬡
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[var(--bos-text-primary)]">
                NO ACTIVE TEAM MEMBERS ONBOARDED
              </h3>
              <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed">
                Your organization has not yet onboarded team members. Invite engineering specialists,
                configure role responsibilities, and send secure invitations to start staffing project deliverables.
              </p>
            </div>

            <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-left text-[12px] space-y-2">
              <span className="text-[10.5px] font-mono font-bold text-[var(--bos-accent)] uppercase">
                CONNECTED DELIVERY PIPELINE:
              </span>
              <div className="flex items-center justify-between text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                <span>1. Invite Member</span>
                <span>→</span>
                <span>2. Assign Role & Team</span>
                <span>→</span>
                <span>3. Real Email Token</span>
                <span>→</span>
                <span>4. Project & Task Execution</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowOnboarding(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[13px] font-semibold transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Invite First Employee</span>
              </button>

              <button
                onClick={() => setShowImportPeople(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-[13px] font-medium transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Import via CSV</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── DENSE DIRECTORY TABLE ──────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                  Enterprise Workforce Directory
                </span>
                <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] font-bold">
                  {employees.length} Members
                </span>
              </div>
              {activePulseFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setActivePulseFilter("ALL")}
                  className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
                >
                  Clear filter ({activePulseFilter}) ✕
                </button>
              )}
            </div>

            <EmployeeCommandTable
              employees={employees}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
              departmentFilter={departmentFilter}
              onDepartmentChange={(dep) => setDepartmentFilter(dep)}
              roleFilter={roleFilter}
              onRoleChange={(r) => setRoleFilter(r)}
              sortBy={sortBy}
              onSortChange={(s) => setSortBy(s)}
              onSelectEmployee={(emp) => setSelectedEmployeeId(emp.id)}
              onAssignTask={(emp) => openAssignWork()}
              onAssignProject={(emp) => setSelectedEmployeeId(emp.id)}
              onResendInvite={(emp) => setShowInvitations(true)}
              onOffboard={(emp) => setOffboardingEmployee(emp)}
            />
          </div>
        )}
      </main>

      {/* ── 03. FULL EMPLOYEE WORKSPACE DRAWER (11 TABS & 5 ACTIONS) ─ */}
      {selectedEmployeeId && (
        <EmployeeWorkspaceDrawer
          employeeId={selectedEmployeeId}
          roles={roles}
          teams={teams}
          onClose={() => setSelectedEmployeeId(null)}
          onUpdated={() => loadData()}
          onOpenAssignTask={() => {
            setSelectedEmployeeId(null);
            openAssignWork();
          }}
          onOpenOffboard={(emp) => {
            setSelectedEmployeeId(null);
            setOffboardingEmployee(emp);
          }}
        />
      )}

      {/* ── 04. MULTI-STEP ONBOARDING WIZARD ──────────────────────── */}
      {showOnboarding && (
        <EmployeeOnboardingWizard
          roles={roles}
          teams={teams}
          onClose={() => setShowOnboarding(false)}
          onEmployeeCreated={() => {
            setShowOnboarding(false);
            loadData();
          }}
        />
      )}

      {/* ── 05. INVITATION CENTER MODAL ───────────────────────────── */}
      {showInvitations && (
        <InvitationCenterModal
          onClose={() => setShowInvitations(false)}
          onInvitationUpdated={() => loadData()}
        />
      )}

      {/* ── 06. WORKSTREAM ASSIGNMENT — now a full-page flow at /employees/assign-work ── */}

      {/* ── 07. OFFBOARDING MODAL ─────────────────────────────────── */}
      {offboardingEmployee && (
        <OffboardingModal
          employee={offboardingEmployee}
          colleagues={employees}
          onClose={() => setOffboardingEmployee(null)}
          onOffboarded={() => {
            setOffboardingEmployee(null);
            loadData();
          }}
        />
      )}

      {/* ── 08. ROLE & PERMISSION OS MODAL ────────────────────────── */}
      {showCreateRole && (
        <RoleOSModal
          onClose={() => setShowCreateRole(false)}
          onRoleCreated={() => loadData()}
        />
      )}

      {/* ── 09. TEAM SQUAD OS MODAL ───────────────────────────────── */}
      {showCreateTeam && (
        <TeamOSModal
          employees={employees}
          onClose={() => setShowCreateTeam(false)}
          onTeamCreated={() => loadData()}
        />
      )}

      {/* ── 10. IMPORT PEOPLE BATCH CSV MODAL ─────────────────────── */}
      {showImportPeople && (
        <ImportPeopleModal
          roles={roles}
          teams={teams}
          onClose={() => setShowImportPeople(false)}
          onImportComplete={() => loadData()}
        />
      )}

      {/* ── 11. WORKFORCE SETTINGS MODAL ──────────────────────────── */}
      {showSettings && (
        <WorkforceSettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── 12. GLOBAL WORKFORCE AI COPILOT ───────────────────────── */}
      {showCopilot && (
        <CopilotWorkforceModal
          employees={employees}
          onClose={() => setShowCopilot(false)}
          onSelectEmployee={(empId) => {
            setShowCopilot(false);
            setSelectedEmployeeId(empId);
          }}
        />
      )}

    </div>
  );
}
