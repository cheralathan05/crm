"use client";

import { useState, useEffect } from "react";
import {
  Server,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DependencyRadarProps {
  projectId: string;
  projectName: string;
}

export function EmployeeOSDependencyRadarView({ projectId, projectName }: DependencyRadarProps) {
  const [loading, setLoading] = useState(true);
  const [radarData, setRadarData] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/employee/os/dependencies?projectId=${projectId}`);
        const json = await res.json();
        if (json.ok) {
          setRadarData(json.data);
        }
      } catch (err) {
        console.error("Error loading dependency radar:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <span>CALCULATING DEPENDENCY RADAR...</span>
      </div>
    );
  }

  const { iNeed = [], whoIAmWaitingFor = [], whoIsWaitingForMe = [] } = radarData || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Header */}
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
          PROJECT DEPENDENCY GRAPH
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
          Dependency Radar
        </h1>
        <p className="text-xs text-[var(--bos-text-secondary)]">
          Real-time visibility into upstream requirements, downstream dependents, and active bottlenecks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. I NEED */}
        <div className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                I NEED ({iNeed.length})
              </span>
            </div>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              API contracts, data schemas, and specifications required for your workstream.
            </p>
            <div className="space-y-2 pt-1">
              {iNeed.map((item: any) => (
                <div key={item.id} className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-400">{item.name}</span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--bos-surface-subtle)] text-[var(--bos-text-tertiary)]">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--bos-text-secondary)]">{item.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. WHO I AM WAITING FOR */}
        <div className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                WHO I AM WAITING FOR ({whoIAmWaitingFor.length})
              </span>
            </div>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Uncompleted upstream tasks currently blocking your progress.
            </p>
            <div className="space-y-2 pt-1">
              {whoIAmWaitingFor.length > 0 ? (
                whoIAmWaitingFor.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs space-y-1">
                    <span className="font-semibold text-[var(--bos-text-primary)] block truncate">{item.waitingOnTask}</span>
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
                      <span>Owner: {item.waitingOnPerson} ({item.waitingOnRole})</span>
                      <span className="text-rose-400 font-bold">{item.prerequisiteStatus}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-[var(--bos-surface-subtle)] text-xs text-[var(--bos-text-secondary)] text-center">
                  Zero blocking upstream tasks. You are clear to build!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. WHO IS WAITING FOR ME */}
        <div className="p-5 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                WHO IS WAITING FOR ME ({whoIsWaitingForMe.length})
              </span>
            </div>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Downstream teammates and tasks waiting for your completion.
            </p>
            <div className="space-y-2 pt-1">
              {whoIsWaitingForMe.length > 0 ? (
                whoIsWaitingForMe.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-xs space-y-1">
                    <span className="font-semibold text-[var(--bos-text-primary)] block truncate">{item.blockedTask}</span>
                    <div className="text-[10.5px] font-mono text-purple-400">
                      Waiting on: {item.myTaskTitle}
                    </div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">
                      Teammate: {item.blockedPerson} ({item.blockedRole})
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-[var(--bos-surface-subtle)] text-xs text-[var(--bos-text-secondary)] text-center">
                  No downstream tasks are waiting on your assigned items.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
