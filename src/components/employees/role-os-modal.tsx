"use client";

import { useState } from "react";
import {
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RoleOSModalProps = {
  onClose: () => void;
  onRoleCreated: () => void;
};

export function RoleOSModal({ onClose, onRoleCreated }: RoleOSModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("ENGINEERING");
  const [purpose, setPurpose] = useState("");
  const [responsibilities, setResponsibilities] = useState<string[]>([
    "Architecture and delivery execution",
  ]);
  const [newResp, setNewResp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddResp = () => {
    if (!newResp.trim()) return;
    setResponsibilities([...responsibilities, newResp.trim()]);
    setNewResp("");
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !purpose.trim()) {
      setError("Role name and purpose are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          department,
          purpose: purpose.trim(),
          responsibilities,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onRoleCreated();
        onClose();
      } else {
        setError(json.message || "Failed to create role.");
      }
    } catch {
      setError("Network error creating role.");
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
            <div className="w-7 h-7 rounded-lg bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Create Organization Role</h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">Define purpose, responsibilities, and capability requirements.</p>
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

        <form onSubmit={handleCreateRole} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Role Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Database Architect"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Role Code</label>
              <input
                type="text"
                placeholder="e.g. ROLE-DATA-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
              />
            </div>
          </div>

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
            <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Organizational Purpose *</label>
            <textarea
              rows={2}
              required
              placeholder="Why does this role exist in the company?"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Key Responsibilities</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add responsibility..."
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px]"
              />
              <button
                type="button"
                onClick={handleAddResp}
                className="px-3 py-1 bg-[var(--bos-accent)] text-white rounded-lg text-[12px] font-medium cursor-pointer"
              >
                + Add
              </button>
            </div>
            <ul className="space-y-1 text-[11.5px] text-[var(--bos-text-secondary)] max-h-[120px] overflow-y-auto">
              {responsibilities.map((r, idx) => (
                <li key={idx} className="flex items-center justify-between p-1.5 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)]">
                  <span>• {r}</span>
                  <button
                    type="button"
                    onClick={() => setResponsibilities(responsibilities.filter((_, i) => i !== idx))}
                    className="text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
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
              <span>Create Role</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
