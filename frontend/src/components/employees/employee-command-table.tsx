"use client";

import { useState } from "react";
import {
  MoreVertical,
  FolderKanban,
  CheckSquare,
  Mail,
  Shield,
  UserX,
  ExternalLink,
  ChevronRight,
  Clock,
  Flame,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmployeeCommandTableProps = {
  employees: any[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  departmentFilter: string;
  onDepartmentChange: (dep: string) => void;
  roleFilter: string;
  onRoleChange: (r: string) => void;
  sortBy: string;
  onSortChange: (s: any) => void;
  onSelectEmployee: (emp: any) => void;
  onAssignTask: (emp: any) => void;
  onAssignProject: (emp: any) => void;
  onResendInvite: (emp: any) => void;
  onOffboard: (emp: any) => void;
};

export function EmployeeCommandTable({
  employees = [],
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  roleFilter,
  onRoleChange,
  sortBy,
  onSortChange,
  onSelectEmployee,
  onAssignTask,
  onAssignProject,
  onResendInvite,
  onOffboard,
}: EmployeeCommandTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      
      {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[var(--bos-surface)] p-3 border border-[var(--bos-border)] rounded-xl">
        
        {/* Search with semantic understanding */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[var(--bos-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, role, 'frontend', 'unassigned', 'overloaded', project..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="px-2.5 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px] font-mono text-[var(--bos-text-secondary)] focus:outline-hidden"
          >
            <option value="">All Departments</option>
            <option value="ENGINEERING">Engineering</option>
            <option value="DESIGN">Design & UX</option>
            <option value="PRODUCT">Product</option>
            <option value="QA">QA & Testing</option>
            <option value="OPERATIONS">Operations</option>
          </select>

          {/* Role Category Filter */}
          <select
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="px-2.5 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px] font-mono text-[var(--bos-text-secondary)] focus:outline-hidden"
          >
            <option value="">All Roles</option>
            <option value="DEVELOPER">Developers</option>
            <option value="DESIGNER">Designers</option>
            <option value="QA">QA Specialists</option>
            <option value="LEAD">Leads & Architects</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-[11.5px] font-mono text-[var(--bos-text-secondary)] focus:outline-hidden cursor-pointer"
            >
              <option value="recently_added">Recently Added</option>
              <option value="name">Name (A-Z)</option>
              <option value="workload">Highest Workload</option>
              <option value="due_work">Upcoming / Overdue Work</option>
              <option value="last_active">Last Active</option>
            </select>
          </div>

        </div>

      </div>

      {/* ── ENTERPRISE DIRECTORY TABLE ─────────────────────────────── */}
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-[var(--bos-border)] bg-[var(--bos-bg)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                <th className="py-3 px-4">EMPLOYEE / ID</th>
                <th className="py-3 px-3">ROLE & TEAM</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">CURRENT PROJECTS</th>
                <th className="py-3 px-3">ACTIVE WORK</th>
                <th className="py-3 px-3">CAPACITY UTILIZATION</th>
                <th className="py-3 px-3">ACCESS LEVEL</th>
                <th className="py-3 px-3">LAST ACTIVE</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bos-border)] text-[12px]">
              {employees.map((emp) => {
                const isOverCapacity = emp.capacityPercentage > 100;
                const isBlocked = emp.blockedCount > 0;
                const isOverdue = emp.overdueCount > 0;

                return (
                  <tr
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp)}
                    className="hover:bg-[var(--bos-bg)] transition-colors cursor-pointer group"
                  >
                    {/* Person Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold font-mono text-[11px] shrink-0 border border-[var(--bos-accent)]/20">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.fullName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            emp.fullName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)] transition-colors">
                              {emp.fullName}
                            </span>
                            <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] border border-[var(--bos-border)] font-bold">
                              {emp.employeeCode || "NOT ASSIGNED"}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] block">
                            {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role & Team Column */}
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-medium text-[var(--bos-text-primary)] block">
                          {emp.role?.name || "NOT ASSIGNED"}
                        </span>
                        <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
                          {emp.team?.name || emp.department}
                        </span>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "text-[9.5px] font-mono font-bold px-2 py-0.5 rounded uppercase",
                          emp.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : emp.status === "INVITED"
                              ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              : "bg-rose-500/10 text-rose-600 border border-rose-500/20",
                        )}
                      >
                        {emp.status}
                      </span>
                    </td>

                    {/* Projects Column */}
                    <td className="py-3 px-3">
                      {emp.currentProjects?.length > 0 ? (
                        <div className="space-y-0.5">
                          <span className="font-medium text-[var(--bos-text-primary)]">
                            {emp.currentProjects[0].name}
                          </span>
                          {emp.currentProjects.length > 1 && (
                            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">
                              +{emp.currentProjects.length - 1} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] italic">
                          NOT ASSIGNED
                        </span>
                      )}
                    </td>

                    {/* Active Work Column */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 text-[var(--bos-text-primary)] font-semibold">
                          <span>{emp.activeTaskCount} Tasks</span>
                          {isBlocked && (
                            <span className="text-rose-600 text-[10px] font-bold" title="Blocked tasks">
                              (⚠️ {emp.blockedCount})
                            </span>
                          )}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-amber-600 block">
                            {emp.overdueCount} overdue
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Capacity Utilization Column */}
                    <td className="py-3 px-3">
                      <div className="space-y-1 max-w-[140px]">
                        <div className="flex items-center justify-between text-[10.5px] font-mono">
                          <span
                            className={cn(
                              "font-bold",
                              isOverCapacity ? "text-rose-600" : "text-[var(--bos-text-primary)]",
                            )}
                          >
                            {emp.capacityPercentage}%
                          </span>
                          <span className="text-[var(--bos-text-tertiary)]">
                            {emp.totalAssignedHours}h / {emp.capacityTargetHours}h
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              isOverCapacity
                                ? "bg-rose-500"
                                : emp.capacityPercentage > 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.min(emp.capacityPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Access Level Column */}
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-mono">
                        {emp.accessStatus === "ACTIVE" ? (
                          <span className="text-emerald-600 font-semibold">✓ Effective</span>
                        ) : emp.accessStatus === "PENDING_INVITE" ? (
                          <span className="text-purple-600">Pending Invite</span>
                        ) : (
                          <span className="text-amber-600">No Role</span>
                        )}
                      </span>
                    </td>

                    {/* Last Active Column */}
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                        {emp.lastActiveAt ? new Date(emp.lastActiveAt).toLocaleDateString() : "Never"}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right">
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === emp.id ? null : emp.id)}
                          className="p-1 rounded-md hover:bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === emp.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl shadow-xl z-40 py-1 text-[12px] font-medium space-y-0.5 animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onSelectEmployee(emp);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex items-center gap-2 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Workspace Drawer</span>
                            </button>

                            <a
                              href={`/employee/onboarding?previewEmployeeId=${emp.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-3 py-1.5 text-left hover:bg-[var(--bos-bg)] text-[var(--bos-accent)] flex items-center gap-2 cursor-pointer"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>Preview As Employee</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onAssignTask(emp);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex items-center gap-2 cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Assign Task</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onAssignProject(emp);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex items-center gap-2 cursor-pointer"
                            >
                              <FolderKanban className="w-3.5 h-3.5 text-sky-600" />
                              <span>Assign Project</span>
                            </button>

                            {emp.status === "INVITED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onResendInvite(emp);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-[var(--bos-bg)] text-purple-600 flex items-center gap-2 cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Resend Invite</span>
                              </button>
                            )}

                            <div className="border-t border-[var(--bos-border)] my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onOffboard(emp);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-rose-500/10 text-rose-600 flex items-center gap-2 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspend / Offboard</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
