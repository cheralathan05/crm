"use client";

import {
  Users,
  MessageSquare,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamViewProps {
  projectData: any;
  onAskCoach?: (teammateName: string) => void;
}

export function EmployeeOSTeamView({ projectData, onAskCoach }: TeamViewProps) {
  const staff = projectData?.staffAllocations || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Header */}
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
          PROJECT SQUAD MATRIX
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
          Team & Responsibility Map
        </h1>
        <p className="text-xs text-[var(--bos-text-secondary)]">
          Live responsibility map connecting assigned engineering squad members to project workstreams.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {staff.length > 0 ? (
          staff.map((alloc: any) => (
            <div
              key={alloc.id}
              className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-bold flex items-center justify-center text-sm border border-[var(--bos-accent)]/20">
                    {alloc.employee?.fullName?.slice(0, 2).toUpperCase() || "EM"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--bos-text-primary)]">
                      {alloc.employee?.fullName}
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                      {alloc.projectRole}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs space-y-1">
                  <span className="font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] block">
                    ALLOCATED WORKSTREAM
                  </span>
                  <span className="font-semibold text-[var(--bos-text-primary)]">
                    {alloc.workstream || "Engineering"} ({alloc.allocationPercentage}%)
                  </span>
                </div>
              </div>

              <button
                onClick={() => onAskCoach && onAskCoach(alloc.employee?.fullName)}
                className="w-full py-2 rounded-xl bg-[var(--bos-surface-subtle)] hover:bg-[var(--bos-accent)] hover:text-white transition-all text-xs font-mono text-[var(--bos-text-secondary)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contact via Context</span>
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center text-xs text-[var(--bos-text-secondary)]">
            No additional staff allocations recorded in this project yet.
          </div>
        )}
      </div>
    </div>
  );
}
