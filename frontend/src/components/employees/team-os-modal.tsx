"use client";

import { useState } from "react";
import {
  FolderKanban,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TeamOSModalProps = {
  employees: any[];
  onClose: () => void;
  onTeamCreated: () => void;
};

export function TeamOSModal({ employees = [], onClose, onTeamCreated }: TeamOSModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("ENGINEERING");
  const [description, setDescription] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onTeamCreated();
        onClose();
      } else {
        setError(json.message || "Failed to create team.");
      }
    } catch {
      setError("Network error creating team.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Create Delivery Team</h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">Organize team members into cross-functional project squads.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[12px]">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateTeam} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Team Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Core Platform Architecture"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Team Code</label>
              <input
                type="text"
                placeholder="e.g. TEAM-PLATFORM"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
              >
                <option value="ENGINEERING">Engineering</option>
                <option value="DESIGN">Design & UX</option>
                <option value="PRODUCT">Product</option>
                <option value="QA">QA & Testing</option>
                <option value="OPERATIONS">Operations</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Team Lead</label>
              <select
                value={teamLeadId}
                onChange={(e) => setTeamLeadId(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
              >
                <option value="">No Lead Assigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Description / Mission</label>
            <textarea
              rows={2}
              placeholder="What is this team's primary delivery mission?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--bos-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--bos-border)] text-[12px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Create Team</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
