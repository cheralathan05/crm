"use client";

import { useState, useEffect } from "react";
import {
  Play,
  CheckCircle2,
  Clock,
  Square,
  AlertCircle,
  FileCode,
  Globe,
  Database,
  Server,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildCenterViewProps {
  projectId: string;
  projectName: string;
  workstream: string;
  projectRole: string;
  selectedTaskId?: string | null;
  onSessionUpdate?: () => void;
}

export function EmployeeOSBuildCenterView({
  projectId,
  projectName,
  workstream,
  projectRole,
  selectedTaskId,
  onSessionUpdate,
}: BuildCenterViewProps) {
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [buildData, setBuildData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"SPEC" | "CONTRACTS" | "DATABASE" | "CRITERIA" | "EVIDENCE">("SPEC");

  // End Session Modal
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [whatChanged, setWhatChanged] = useState("");
  const [whatCompleted, setWhatCompleted] = useState("");
  const [whatRemains, setWhatRemains] = useState("");
  const [blockers, setBlockers] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [markTaskDone, setMarkTaskDone] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      const [sessionRes, buildRes] = await Promise.all([
        fetch("/api/employee/os/build-session"),
        fetch(`/api/employee/build-mode?projectId=${projectId}`),
      ]);
      const sessionJson = await sessionRes.json();
      const buildJson = await buildRes.json();

      if (sessionJson.ok) {
        setActiveSession(sessionJson.activeSession || null);
        setRecentSessions(sessionJson.recentSessions || []);
      }
      if (buildJson.ok) {
        setBuildData(buildJson.data);
      }
    } catch (err) {
      console.error("Error loading build center:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionData();
  }, [projectId]);

  const handleStartSession = async (taskId?: string) => {
    try {
      const res = await fetch("/api/employee/os/build-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          taskId: taskId || selectedTaskId || undefined,
          capabilityName: "Core Implementation",
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setActiveSession(json.session);
        if (onSessionUpdate) onSessionUpdate();
      }
    } catch (err) {
      console.error("Error starting session:", err);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/os/build-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          whatChanged,
          whatCompleted,
          whatRemains,
          blockers,
          evidenceUrl,
          markTaskCompleted: markTaskDone,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setIsEndModalOpen(false);
        setActiveSession(null);
        loadSessionData();
        if (onSessionUpdate) onSessionUpdate();
      }
    } catch (err) {
      console.error("Error ending session:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-sans">
      {/* Active Session Status Bar */}
      {activeSession ? (
        <div className="p-6 rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                ACTIVE BUILD SESSION
              </span>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                {activeSession.task?.title || activeSession.capabilityName}
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)] font-mono">
                Started at {new Date(activeSession.startedAt).toLocaleTimeString()} • {workstream} ({projectRole})
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEndModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Finish & Record Progress</span>
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
              PRIMARY EXECUTION ENGINE
            </span>
            <h1 className="text-2xl font-extrabold text-[var(--bos-text-primary)]">
              Build Center
            </h1>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Structured workspace with design specs, API contracts, schemas, and live progress recording.
            </p>
          </div>

          <button
            onClick={() => handleStartSession()}
            className="px-6 py-3 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Build Session</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto">
        {[
          { key: "SPEC", label: "WHAT & SPECIFICATION" },
          { key: "CONTRACTS", label: "API CONTRACTS" },
          { key: "DATABASE", label: "DATA SCHEMAS" },
          { key: "CRITERIA", label: "ACCEPTANCE CRITERIA" },
          { key: "EVIDENCE", label: "PROOF OF WORK" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap",
              activeTab === tab.key
                ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs"
                : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "SPEC" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                WHAT YOU ARE BUILDING
              </span>
              <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                {buildData?.selectedCapability?.description || "Approved implementation specification for active project deliverables."}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block">
                WHY IT MATTERS TO PRODUCT
              </span>
              <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                Fulfills approved client requirement, connects frontend customer journeys to authenticated backend APIs, and ensures verified milestone delivery.
              </p>
            </div>
          </div>
        )}

        {activeTab === "CONTRACTS" && (
          <div className="space-y-3">
            {(buildData?.apis || []).map((api: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-400">{api.method}</span>
                  <span className="font-mono text-[var(--bos-text-primary)]">{api.path}</span>
                </div>
                <p className="text-xs text-[var(--bos-text-secondary)]">{api.purpose}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "DATABASE" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(buildData?.databaseEntities || []).map((ent: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--bos-text-primary)]">{ent.name}</span>
                  <span className="font-mono text-[10px] text-cyan-400">table: {ent.tableName}</span>
                </div>
                <p className="text-xs text-[var(--bos-text-secondary)]">{ent.purpose}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "CRITERIA" && (
          <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 text-xs">
            <span className="font-mono font-bold uppercase text-[var(--bos-text-secondary)] block">
              VERIFICATION SPECIFICATIONS
            </span>
            <ul className="space-y-2 text-[var(--bos-text-primary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Payload validation meets API contract requirements.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Data persists correctly to database schema without orphans.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Error states and loading indicators operate smoothly.</span>
              </li>
            </ul>
          </div>
        )}

        {activeTab === "EVIDENCE" && (
          <div className="p-5 rounded-2xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 text-xs">
            <span className="font-mono font-bold uppercase text-[var(--bos-text-secondary)] block">
              ATTACHED PROOF OF WORK
            </span>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              When ending a build session, you can attach pull request links, commit hashes, or test outcome evidence.
            </p>
          </div>
        )}
      </div>

      {/* End Session Modal */}
      {isEndModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--bos-text-primary)]">
              Record Build Session Progress
            </h3>
            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-mono text-[var(--bos-text-secondary)] mb-1 uppercase">What was changed / built?</label>
                <textarea
                  value={whatChanged}
                  onChange={(e) => setWhatChanged(e.target.value)}
                  placeholder="Implemented customer list UI components..."
                  className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--bos-text-secondary)] mb-1 uppercase">Evidence Link / PR URL (Optional)</label>
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://github.com/org/repo/pull/12"
                  className="w-full p-2.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markDone"
                  checked={markTaskDone}
                  onChange={(e) => setMarkTaskDone(e.target.checked)}
                  className="rounded cursor-pointer"
                />
                <label htmlFor="markDone" className="text-xs text-[var(--bos-text-primary)] cursor-pointer font-medium">
                  Mark active task as completed & unblock downstream dependencies
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--bos-border)]">
              <button
                onClick={() => setIsEndModalOpen(false)}
                className="px-4 py-2 text-xs font-mono text-[var(--bos-text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                disabled={submitting}
                className="px-5 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase rounded-xl cursor-pointer"
              >
                {submitting ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
