"use client";

import { useState } from "react";
import {
  Settings,
  CheckCircle2,
  X,
  Sliders,
  Bell,
  Clock,
  ShieldCheck,
} from "lucide-react";

export type WorkforceSettingsModalProps = {
  onClose: () => void;
};

export function WorkforceSettingsModal({ onClose }: WorkforceSettingsModalProps) {
  const [defaultCapacity, setDefaultCapacity] = useState(40);
  const [defaultTimezone, setDefaultTimezone] = useState("UTC+05:30");
  const [overloadThreshold, setOverloadThreshold] = useState(100);
  const [autoInvite, setAutoInvite] = useState(true);
  const [escalationDays, setEscalationDays] = useState(3);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Workforce Operational Policies</h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">Configure organizational capacity defaults and delivery alerts.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved && (
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[12px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Workforce policies saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-[12px]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Standard Weekly Capacity</label>
              <input
                type="number"
                min={10}
                max={60}
                value={defaultCapacity}
                onChange={(e) => setDefaultCapacity(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Default Timezone</label>
              <select
                value={defaultTimezone}
                onChange={(e) => setDefaultTimezone(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
              >
                <option value="UTC+05:30">UTC+05:30 (IST)</option>
                <option value="UTC+00:00">UTC+00:00 (GMT)</option>
                <option value="UTC-05:00">UTC-05:00 (EST)</option>
                <option value="UTC-08:00">UTC-08:00 (PST)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Overload Alert Threshold (%)</label>
            <input
              type="number"
              min={80}
              max={150}
              value={overloadThreshold}
              onChange={(e) => setOverloadThreshold(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
            />
            <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">Triggers alert when assigned hours exceed target percentage.</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Deadline Escalation Window (Days)</label>
            <input
              type="number"
              min={1}
              max={14}
              value={escalationDays}
              onChange={(e) => setEscalationDays(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg"
            />
            <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">Marks tasks as 'DUE SOON' within this number of days.</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoInv"
              checked={autoInvite}
              onChange={(e) => setAutoInvite(e.target.checked)}
              className="rounded border-[var(--bos-border)] accent-[var(--bos-accent)]"
            />
            <label htmlFor="autoInv" className="text-[11.5px] text-[var(--bos-text-secondary)]">
              Automatically dispatch cryptographic email on new employee creation
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--bos-border)]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--bos-border)]">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-[var(--bos-accent)] text-white font-semibold">Save Settings</button>
          </div>
        </form>

      </div>
    </div>
  );
}
