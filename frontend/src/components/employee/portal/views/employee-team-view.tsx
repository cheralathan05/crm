"use client";

import { useState } from "react";
import { Users, Search, MessageSquare, ShieldCheck, Mail, FolderKanban, CheckCircle2 } from "lucide-react";

interface EmployeeTeamViewProps {
  portalData: any;
  onOpenSmartContact: (person: any, task?: any) => void;
}

export function EmployeeTeamView({
  portalData,
  onOpenSmartContact,
}: EmployeeTeamViewProps) {
  const { projectRoster = {}, currentProject, employee } = portalData;
  const [filterDiscipline, setFilterDiscipline] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const allMembers = [
    ...(projectRoster.frontend || []),
    ...(projectRoster.backend || []),
    ...(projectRoster.database || []),
    ...(projectRoster.qa || []),
    ...(projectRoster.admin || []),
  ];

  const filteredMembers = allMembers.filter((m) => {
    if (filterDiscipline !== "ALL" && m.discipline !== filterDiscipline && m.department !== filterDiscipline) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--bos-text-primary)]">Project Team Directory</h1>
          <p className="text-xs font-mono text-[var(--bos-text-tertiary)] mt-1">
            Real Engineering Team & Assigned Staff · Project: {currentProject?.name || "Active Delivery"}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search colleagues..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Discipline Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
        {["ALL", "FRONTEND", "BACKEND", "DATABASE", "QA", "MANAGEMENT"].map((d) => (
          <button
            key={d}
            onClick={() => setFilterDiscipline(d)}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
              filterDiscipline === d
                ? "bg-[var(--bos-accent)] text-white font-bold"
                : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-2 font-mono">
          <Users className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
          <div className="text-sm font-bold text-[var(--bos-text-primary)]">No team members found</div>
          <p className="text-xs text-[var(--bos-text-tertiary)]">
            No colleagues matching this filter criteria in this project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member: any) => (
            <div
              key={member.id}
              className="p-5 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] hover:border-[var(--bos-border-strong)] transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-[var(--bos-text-primary)] flex items-center gap-2">
                      <span>{member.name}</span>
                      {member.isYou && (
                        <span className="px-1.5 py-0.2 rounded bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-[10px] font-extrabold font-mono">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-[var(--bos-text-secondary)]">{member.role}</div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">
                    {member.discipline || member.department}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1 font-mono text-xs">
                  <div className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">Current Focus</div>
                  <div className="text-[11px] text-[var(--bos-text-secondary)] font-sans">
                    {member.currentFocus || "Active project execution"}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--bos-border)] flex items-center justify-between font-mono text-xs">
                <span className="text-[10px] text-[var(--bos-text-tertiary)]">{member.email}</span>

                {!member.isYou && (
                  <button
                    onClick={() => onOpenSmartContact(member)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
