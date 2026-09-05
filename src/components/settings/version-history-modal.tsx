"use client";

import { useState, useEffect } from "react";
import { History, RotateCcw, X, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingKey: string;
  settingName: string;
  currentVersion: number;
  onRollbackSuccess: () => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  settingKey,
  settingName,
  currentVersion,
  onRollbackSuccess,
}: VersionHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollingBackVersion, setRollingBackVersion] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && settingKey) {
      loadHistory();
      setFeedback(null);
    }
  }, [isOpen, settingKey]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/history?key=${encodeURIComponent(settingKey)}`);
      const data = await res.json();
      if (data.ok) {
        setHistory(data.history || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (targetVersion: number) => {
    if (rollingBackVersion !== null) return;
    setRollingBackVersion(targetVersion);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, targetVersion }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback(`Restored to version ${targetVersion} (new version v${data.newVersion})`);
        loadHistory();
        onRollbackSuccess();
      } else {
        setFeedback(data.message || "Rollback failed.");
      }
    } catch (err: any) {
      setFeedback(err.message || "Rollback failed.");
    } finally {
      setRollingBackVersion(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bos-line)] bg-[var(--bos-surface-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              <h3 className="text-[15px] font-semibold text-[var(--bos-text-primary)]">
                Version History & Rollback
              </h3>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
              {settingName} ({settingKey}) • Current: v{currentVersion}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] p-1 rounded-lg hover:bg-[var(--bos-surface)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-5 mt-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center gap-2 text-[12px] text-blue-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* History List */}
        <div className="p-5 max-h-[60vh] overflow-y-auto divide-y divide-[var(--bos-line)] space-y-4">
          {loading ? (
            <div className="py-12 text-center text-[13px] text-[var(--bos-text-muted)]">
              Loading configuration snapshots...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] text-[var(--bos-text-secondary)] font-medium">
                No prior version snapshots recorded yet
              </p>
              <p className="text-[11px] text-[var(--bos-text-muted)] mt-1">
                Version snapshots are automatically created on each setting update.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      v{item.version}
                    </span>
                    {item.version === currentVersion && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                    <span className="text-[12px] text-[var(--bos-text-muted)]">
                      by <strong className="text-[var(--bos-text-secondary)]">{item.changedByName}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--bos-text-muted)] font-mono">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                {item.reason && (
                  <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1 italic">
                    "{item.reason}"
                  </p>
                )}

                {/* Diff Block */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2 rounded bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[11px] font-mono">
                    <div className="text-[9px] uppercase text-[var(--bos-text-muted)] font-semibold">
                      Before
                    </div>
                    <div className="text-[var(--bos-text-muted)] truncate">
                      {item.beforeValue || "null (Initial)"}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-blue-500/5 border border-blue-500/20 text-[11px] font-mono">
                    <div className="text-[9px] uppercase text-blue-400 font-semibold">
                      After
                    </div>
                    <div className="text-blue-300 truncate font-semibold">
                      {item.afterValue}
                    </div>
                  </div>
                </div>

                {/* Rollback Action */}
                {item.version !== currentVersion && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => handleRollback(item.version)}
                      disabled={rollingBackVersion !== null}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border border-[var(--bos-line)] hover:border-amber-500/50 hover:bg-amber-500/10 text-[var(--bos-text-secondary)] hover:text-amber-300 transition"
                    >
                      {rollingBackVersion === item.version ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                      )}
                      Restore this version
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
