"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Check,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SmartAssignmentModalProps = {
  employee?: any;
  onClose: () => void;
  onAssigned: () => void;
};

export function SmartAssignmentModal({
  employee,
  onClose,
  onAssigned,
}: SmartAssignmentModalProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchUnassignedTasks = async () => {
      try {
        setLoadingTasks(true);
        const res = await fetch("/api/tasks");
        const json = await res.json();
        if (json.ok && json.tasks) {
          const openTasks = json.tasks.filter((t: any) => t.status !== "DONE" && t.status !== "COMPLETED");
          setTasks(openTasks);
          if (openTasks.length > 0) {
            setSelectedTaskId(openTasks[0].id);
          }
        }
      } catch {}
      finally {
        setLoadingTasks(false);
      }
    };
    fetchUnassignedTasks();
  }, []);

  const runAnalysis = async (taskId: string) => {
    if (!taskId) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/employees/ai-staffing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json();
      if (json.ok) {
        setAnalysis(json);
      }
    } catch {}
    finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedTaskId) {
      runAnalysis(selectedTaskId);
    }
  }, [selectedTaskId]);

  const handleAssign = async (empId: string, empName: string) => {
    if (!selectedTaskId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId: empId,
          assigneeName: empName,
        }),
      });
      if (res.ok) {
        onAssigned();
        onClose();
      }
    } catch {}
    finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Smart Staffing & Assignment Engine
              </h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Grounded matching analyzing real candidate skills, active workload, and dependency risks.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Task Selector (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-[11px] font-mono text-[var(--bos-text-secondary)] uppercase font-bold block">
              Select Open Task to Staff
            </label>
            {loadingTasks ? (
              <div className="p-6 text-center text-[12px] font-mono text-[var(--bos-text-tertiary)]">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-[var(--bos-text-tertiary)] italic">No open tasks available.</div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer",
                      selectedTaskId === t.id
                        ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] shadow-xs"
                        : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/60",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">{t.code || "TSK"}</span>
                      <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)]">{t.priority}</span>
                    </div>
                    <h5 className="text-[12.5px] font-semibold text-[var(--bos-text-primary)] mt-1 line-clamp-1">{t.title}</h5>
                    <span className="text-[10.5px] font-mono text-[var(--bos-text-tertiary)] block mt-0.5">
                      {t.project?.name || "General Project"} · {t.layer || "CORE"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: AI Match Analysis (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] uppercase font-bold block">
              Candidate Fit & Risk Analysis
            </span>

            {analyzing ? (
              <div className="p-8 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] flex flex-col items-center justify-center gap-2 text-[12px] font-mono text-[var(--bos-text-secondary)]">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
                <span>Analyzing capability fit & workload...</span>
              </div>
            ) : analysis?.candidates?.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-[var(--bos-accent-subtle)]/30 border border-[var(--bos-accent)]/20 rounded-lg text-[12px] text-[var(--bos-text-primary)]">
                  {analysis.analysisSummary}
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {analysis.candidates.map((cand: any) => (
                    <div
                      key={cand.employeeId}
                      className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-[13px] text-[var(--bos-text-primary)]">{cand.fullName}</strong>
                          <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">({cand.roleName})</span>
                          <span className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded",
                            cand.riskLevel === "LOW" ? "bg-emerald-500/10 text-emerald-600" :
                            cand.riskLevel === "MEDIUM" ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
                          )}>
                            {cand.riskLevel} RISK
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">{cand.matchReason}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--bos-text-tertiary)] mt-1">
                          <span>Match Score: <strong className="text-emerald-600">{cand.matchScore}%</strong></span>
                          <span>·</span>
                          <span>Active Workload: {cand.capacityPercentage}%</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={assigning}
                        onClick={() => handleAssign(cand.employeeId, cand.fullName)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[11px] font-semibold transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Assign Task
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-[12px] text-[var(--bos-text-tertiary)]">
                Select a task to view candidate match analysis.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
