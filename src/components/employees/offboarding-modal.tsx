"use client";

import { useState } from "react";
import {
  UserX,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OffboardingModalProps = {
  employee: any;
  colleagues: any[];
  onClose: () => void;
  onOffboarded: () => void;
};

export function OffboardingModal({
  employee,
  colleagues = [],
  onClose,
  onOffboarded,
}: OffboardingModalProps) {
  const [reassignId, setReassignId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableColleagues = colleagues.filter((c) => c.id !== employee.id && c.status === "ACTIVE");

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const url = `/api/employees/${employee.id}?${reassignId ? `reassignToEmployeeId=${reassignId}&` : ""}${notes ? `notes=${encodeURIComponent(notes)}` : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        onOffboarded();
        onClose();
      } else {
        setError(json.message || "Failed to offboard employee.");
      }
    } catch {
      setError("Network error offboarding employee.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-[15px]">
            <UserX className="w-5 h-5" />
            <span>Offboard Team Member</span>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[12px] text-rose-600 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Revoke Operational Access for {employee.fullName}</strong>
            This will immediately disable their workspace credentials, release active project allocations, and archive their operational profile. All historical delivery records and audit logs will be permanently preserved.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[12px]">
            {error}
          </div>
        )}

        {/* Work Reassignment */}
        <div className="space-y-1.5">
          <label className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
            Reassign Active Tasks & Deliverables To
          </label>
          <select
            value={reassignId}
            onChange={(e) => setReassignId(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-[12.5px]"
          >
            <option value="">Leave Unassigned (Backlog)</option>
            {availableColleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.role?.name || "Team Member"})
              </option>
            ))}
          </select>
        </div>

        {/* Reason / Notes */}
        <div className="space-y-1.5">
          <label className="text-[11.5px] font-mono text-[var(--bos-text-secondary)]">
            Offboarding Notes / Handover Reason
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Completed contractor engagement, transitioned project deliverables."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-[12.5px] focus:outline-hidden focus:border-[var(--bos-accent)]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--bos-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--bos-border)] text-[12px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Confirm Offboarding</span>
          </button>
        </div>

      </div>
    </div>
  );
}
