"use client";

import {
  Users,
  UserCheck,
  Mail,
  UserX,
  UserMinus,
  Briefcase,
  AlertOctagon,
  BatteryCharging,
  Percent,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TeamPulseMetrics = {
  totalPeople: number;
  active: number;
  pendingInvites: number;
  suspended: number;
  unassigned: number;
  activeWork: number;
  overCapacity: number;
  availableCapacity: number;
  teamUtilization: number;
  accessIssues: number;
};

export type TeamPulseStripProps = {
  metrics: TeamPulseMetrics;
  activeFilter?: string;
  onSelectFilter: (filterKey: string) => void;
};

export function TeamPulseStrip({
  metrics,
  activeFilter = "ALL",
  onSelectFilter,
}: TeamPulseStripProps) {
  const cards = [
    {
      key: "ALL",
      label: "TOTAL EMPLOYEES",
      value: metrics.totalPeople,
      icon: Users,
      color: "text-[var(--bos-text-primary)]",
      bgColor: "bg-[var(--bos-surface)]",
      borderColor: "border-[var(--bos-border)]",
      status: "Headcount",
    },
    {
      key: "ACTIVE",
      label: "ACTIVE",
      value: metrics.active,
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/5",
      borderColor: "border-emerald-500/20",
      status: "Operational",
    },
    {
      key: "INVITED",
      label: "PENDING INVITATIONS",
      value: metrics.pendingInvites,
      icon: Mail,
      color: "text-purple-600",
      bgColor: "bg-purple-500/5",
      borderColor: "border-purple-500/20",
      status: "Awaiting token",
    },
    {
      key: "SUSPENDED",
      label: "SUSPENDED",
      value: metrics.suspended,
      icon: UserX,
      color: "text-rose-600",
      bgColor: "bg-rose-500/5",
      borderColor: "border-rose-500/20",
      status: "Access revoked",
    },
    {
      key: "UNASSIGNED",
      label: "UNASSIGNED",
      value: metrics.unassigned,
      icon: UserMinus,
      color: "text-amber-600",
      bgColor: "bg-amber-500/5",
      borderColor: "border-amber-500/20",
      status: "Ready for work",
    },
    {
      key: "ACTIVE_WORK",
      label: "ACTIVE WORK",
      value: metrics.activeWork,
      icon: Briefcase,
      color: "text-sky-600",
      bgColor: "bg-sky-500/5",
      borderColor: "border-sky-500/20",
      status: "In execution",
    },
    {
      key: "OVERLOADED",
      label: "OVERLOADED",
      value: metrics.overCapacity,
      icon: AlertOctagon,
      color: "text-rose-600",
      bgColor: "bg-rose-500/5",
      borderColor: "border-rose-500/20",
      status: "> 100% capacity",
    },
    {
      key: "AVAILABLE",
      label: "AVAILABLE CAPACITY",
      value: metrics.availableCapacity,
      icon: BatteryCharging,
      color: "text-teal-600",
      bgColor: "bg-teal-500/5",
      borderColor: "border-teal-500/20",
      status: "< 80% capacity",
    },
    {
      key: "UTILIZATION",
      label: "TEAM UTILIZATION",
      value: `${metrics.teamUtilization}%`,
      icon: Percent,
      color: metrics.teamUtilization > 95 ? "text-rose-600" : "text-[var(--bos-accent)]",
      bgColor: "bg-[var(--bos-accent-subtle)]/20",
      borderColor: "border-[var(--bos-accent)]/20",
      status: "Hours allocation",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeFilter === c.key;

        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelectFilter(isSelected && c.key !== "ALL" ? "ALL" : c.key)}
            className={cn(
              "p-3 rounded-xl border text-left transition-all duration-150 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[90px]",
              c.bgColor,
              c.borderColor,
              isSelected
                ? "ring-2 ring-[var(--bos-accent)] shadow-sm -translate-y-0.5"
                : "hover:border-[var(--bos-accent)]/50 hover:shadow-xs",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] line-clamp-1">
                {c.label}
              </span>
              <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110", c.color)} />
            </div>

            <div className="my-1">
              <span className={cn("text-[19px] font-mono font-bold tracking-tight", c.color)}>
                {c.value}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)]">
              <span>{c.status}</span>
              {isSelected && (
                <span className="text-[9px] font-bold text-[var(--bos-accent)]">● Active</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
