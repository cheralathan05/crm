"use client";

import {
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamHealthReport, AttentionItem } from "@/lib/employees/employee.service";

export type WorkforceHealthSectionProps = {
  health: TeamHealthReport | null;
  onSelectEmployee: (empId: string) => void;
  onOpenInvitations: () => void;
  onOpenTasks: () => void;
};

export function WorkforceHealthSection({
  health,
  onSelectEmployee,
  onOpenInvitations,
  onOpenTasks,
}: WorkforceHealthSectionProps) {
  if (!health) return null;

  const {
    activeEmployees,
    assignedEmployees,
    unassignedEmployees,
    employeesAboveCapacity,
    employeesWithBlockedWork,
    employeesWithOverdueWork,
    totalAssignedHours,
    totalCapacityHours,
    teamUtilization,
    needsAttention = [],
  } = health;

  return (
    <div className="space-y-4">
      {/* ── WORKFORCE INTELLIGENCE SUMMARY ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Capacity & Workload Allocation */}
        <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>CAPACITY & ALLOCATION</span>
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-accent)] font-bold">
              {teamUtilization}% Utilization
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px] font-mono">
              <span className="text-[var(--bos-text-secondary)]">Assigned Workload:</span>
              <strong className="text-[var(--bos-text-primary)]">{totalAssignedHours}h / {totalCapacityHours}h</strong>
            </div>
            <div className="w-full h-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  teamUtilization > 100
                    ? "bg-rose-500"
                    : teamUtilization > 85
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
                style={{ width: `${Math.min(teamUtilization, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-secondary)] pt-1 border-t border-[var(--bos-border)]/60">
            <span>{assignedEmployees} Assigned</span>
            <span>·</span>
            <span className={unassignedEmployees > 0 ? "text-amber-600 font-bold" : ""}>
              {unassignedEmployees} Unassigned
            </span>
            <span>·</span>
            <span className={employeesAboveCapacity > 0 ? "text-rose-600 font-bold" : ""}>
              {employeesAboveCapacity} Overloaded
            </span>
          </div>
        </div>

        {/* Card 2: Execution Health & Risk */}
        <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-500" />
              <span>EXECUTION DELIVERY RISKS</span>
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
              Real tasks state
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
            <div className="p-2 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between">
              <span className="text-[var(--bos-text-secondary)]">Blocked:</span>
              <strong className={employeesWithBlockedWork > 0 ? "text-rose-600" : "text-emerald-600"}>
                {employeesWithBlockedWork}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between">
              <span className="text-[var(--bos-text-secondary)]">Overdue:</span>
              <strong className={employeesWithOverdueWork > 0 ? "text-rose-600" : "text-emerald-600"}>
                {employeesWithOverdueWork}
              </strong>
            </div>
          </div>

          <p className="text-[11.5px] text-[var(--bos-text-secondary)] leading-relaxed">
            {employeesWithBlockedWork === 0 && employeesWithOverdueWork === 0
              ? "All active delivery tasks are on track with zero blocked dependencies."
              : `Active attention required for ${employeesWithBlockedWork + employeesWithOverdueWork} operational bottleneck(s).`}
          </p>
        </div>

        {/* Card 3: Role & Capability Readiness */}
        <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>CAPABILITY READINESS</span>
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
              {activeEmployees} Active Nodes
            </span>
          </div>

          <div className="space-y-1.5 text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
            <div className="flex items-center justify-between">
              <span>Verified Skill Profiles:</span>
              <strong className="text-[var(--bos-text-primary)]">
                {activeEmployees - health.employeesWithoutCapabilities} / {activeEmployees}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Access Policy Compliance:</span>
              <strong className={health.accessAnomalies > 0 ? "text-amber-600 font-bold" : "text-emerald-600"}>
                {health.accessAnomalies === 0 ? "100% Effective" : `${health.accessAnomalies} Need Roles`}
              </strong>
            </div>
          </div>

          <div className="pt-1 border-t border-[var(--bos-border)]/60 text-[11px] font-mono text-[var(--bos-text-tertiary)] flex items-center justify-between">
            <span>Pending invites: {health.pendingInvitations}</span>
            <span>System roles: 5 active</span>
          </div>
        </div>

      </div>

      {/* ── WHAT NEEDS ATTENTION (FEED) ───────────────────────────── */}
      {needsAttention.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[12px] font-mono font-bold uppercase text-[var(--bos-text-primary)] tracking-wider">
                WHAT NEEDS ATTENTION ({needsAttention.length})
              </span>
            </div>
            <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
              Grounded in live database state
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {needsAttention.map((item) => {
              const isHigh = item.severity === "HIGH";

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === "OVERLOADED" || item.type === "BLOCKED_WORK" || item.type === "OVERDUE_WORK" || item.type === "ACCESS_ISSUE") {
                      if (item.recordId) onSelectEmployee(item.recordId);
                    } else if (item.type === "EXPIRING_INVITE") {
                      onOpenInvitations();
                    } else if (item.type === "UNASSIGNED_TASK") {
                      onOpenTasks();
                    }
                  }}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between group",
                    isHigh
                      ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/50"
                      : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          "text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded uppercase",
                          isHigh ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600",
                        )}
                      >
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] group-hover:text-[var(--bos-text-primary)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>

                    <h5 className="text-[12px] font-bold text-[var(--bos-text-primary)] line-clamp-1">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-2">
                      {item.description}
                    </p>
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
