"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ImportPeopleModalProps = {
  roles: any[];
  teams: any[];
  onClose: () => void;
  onImportComplete: () => void;
};

export function ImportPeopleModal({
  roles = [],
  teams = [],
  onClose,
  onImportComplete,
}: ImportPeopleModalProps) {
  const [csvText, setCsvText] = useState(
    `Full Name,Email,Department,Role,Team
Sarah Connor,sarah@example.com,ENGINEERING,Staff Full-Stack Engineer,Platform Architecture
David Miller,david@example.com,QA,QA Automation & Verification Lead,Platform Architecture`,
  );
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleParse = () => {
    try {
      setError(null);
      const lines = csvText.trim().split("\n");
      if (lines.length <= 1) {
        setError("Please enter CSV content with at least one record row.");
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          rows.push({
            fullName: parts[0],
            email: parts[1],
            department: parts[2] || "ENGINEERING",
            roleName: parts[3] || roles[0]?.name || "Staff Full-Stack Engineer",
            teamName: parts[4] || teams[0]?.name || "Platform Architecture",
          });
        }
      }

      if (rows.length === 0) {
        setError("Could not parse any valid employee rows from CSV.");
        return;
      }

      setParsedRows(rows);
    } catch {
      setError("Error parsing CSV format. Please ensure comma-separated syntax.");
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setError(null);

    let count = 0;
    try {
      for (const row of parsedRows) {
        const targetRole = roles.find((r) => r.name.toLowerCase() === row.roleName.toLowerCase()) || roles[0];
        const targetTeam = teams.find((t) => t.name.toLowerCase() === row.teamName.toLowerCase()) || teams[0];

        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: row.fullName,
            email: row.email,
            department: row.department,
            roleId: targetRole?.id,
            teamId: targetTeam?.id,
            sendInvitation: true,
          }),
        });

        if (res.ok) count++;
      }

      setSuccessCount(count);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch {
      setError("An error occurred during bulk employee creation.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Batch Import Workforce
              </h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Import team members via CSV data and trigger onboarding invitations.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        {successCount !== null && (
          <div className="px-6 py-2.5 bg-emerald-600 text-white text-[12px] font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Successfully imported and onboarded {successCount} team member(s)!</span>
          </div>
        )}

        {error && (
          <div className="px-6 py-2.5 bg-rose-500/10 text-rose-600 border-b border-rose-500/20 text-[12px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
                CSV Input (Header: Full Name, Email, Department, Role, Team)
              </label>
              <button
                type="button"
                onClick={handleParse}
                className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline cursor-pointer"
              >
                Parse & Preview Rows →
              </button>
            </div>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 font-mono text-[11.5px] bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl focus:outline-hidden focus:border-[var(--bos-accent)]"
            />
          </div>

          {/* Parsed Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-[var(--bos-text-tertiary)]">
                PARSED PREVIEW ({parsedRows.length} PEOPLE READY)
              </span>

              <div className="border border-[var(--bos-border)] rounded-xl overflow-hidden text-[11.5px]">
                <table className="w-full text-left">
                  <thead className="bg-[var(--bos-bg)] border-b border-[var(--bos-border)] text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                    <tr>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Team</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bos-border)] font-mono">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bos-bg)]">
                        <td className="py-2 px-3 font-bold text-[var(--bos-text-primary)]">{r.fullName}</td>
                        <td className="py-2 px-3 text-[var(--bos-text-secondary)]">{r.email}</td>
                        <td className="py-2 px-3">{r.department}</td>
                        <td className="py-2 px-3 text-[var(--bos-accent)]">{r.roleName}</td>
                        <td className="py-2 px-3">{r.teamName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--bos-border)] bg-[var(--bos-bg)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--bos-border)] text-[12px] font-medium text-[var(--bos-text-secondary)]"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0 || importing}
            onClick={handleExecuteImport}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Execute Batch Import ({parsedRows.length})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
