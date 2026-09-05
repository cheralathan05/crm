"use client";

import {
  Search,
  Plus,
  Users,
  Shield,
  FolderKanban,
  Settings,
  Download,
  Mail,
  Sparkles,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmployeeOSHeaderProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  departmentFilter: string;
  onDepartmentChange: (dep: string) => void;
  onInviteEmployee: () => void;
  onImportPeople: () => void;
  onOpenRolesPermissions: () => void;
  onOpenTeams: () => void;
  onOpenWorkforceSettings: () => void;
  onOpenCopilot: () => void;
};

export function EmployeeOSHeader({
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  onInviteEmployee,
  onImportPeople,
  onOpenRolesPermissions,
  onOpenTeams,
  onOpenWorkforceSettings,
  onOpenCopilot,
}: EmployeeOSHeaderProps) {
  return (
    <header className="border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/95 backdrop-blur-xs sticky top-0 z-30 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left: Brand / Title / Hierarchy */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-[var(--bos-accent)] uppercase">
              EMPLOYEES
            </span>
            <span className="text-[var(--bos-text-tertiary)] text-[11px]">/</span>
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] font-medium">
              Workforce Identity & Access
            </span>
          </div>
          <h1 className="text-[18px] lg:text-[20px] font-bold text-[var(--bos-text-primary)] tracking-tight mt-0.5">
            Workforce Command Center
          </h1>
          <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5 hidden sm:block">
            Manage people, access, teams and delivery responsibility from one connected workforce system.
          </p>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          
          {/* AI Workforce Intelligence button */}
          <button
            type="button"
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-accent-subtle)]/30 hover:bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent)]/20 text-[12px] font-mono font-semibold transition-all cursor-pointer shadow-2xs"
            title="Ask Ollama workforce intelligence"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>

          {/* Teams button */}
          <button
            type="button"
            onClick={onOpenTeams}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] hover:bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-[12px] font-medium transition-colors cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-sky-600" />
            <span>Teams</span>
          </button>

          {/* Roles & Permissions button */}
          <button
            type="button"
            onClick={onOpenRolesPermissions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] hover:bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>Roles & Permissions</span>
          </button>

          {/* Import People button */}
          <button
            type="button"
            onClick={onImportPeople}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] hover:bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Import People</span>
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenWorkforceSettings}
            className="p-2 rounded-lg bg-[var(--bos-bg)] hover:bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
            title="Workforce Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Primary Action: + INVITE EMPLOYEE */}
          <button
            type="button"
            onClick={onInviteEmployee}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Invite Employee</span>
          </button>

        </div>

      </div>
    </header>
  );
}
