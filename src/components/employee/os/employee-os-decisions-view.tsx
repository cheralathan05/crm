"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Calendar,
  User,
  Shield,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionsViewProps {
  projectId: string;
}

export function EmployeeOSDecisionsView({ projectId }: DecisionsViewProps) {
  const [loading, setLoading] = useState(true);
  const [decisionsData, setDecisionsData] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/employee/os/decisions?projectId=${projectId}`);
        const json = await res.json();
        if (json.ok) {
          setDecisionsData(json.data);
        }
      } catch (err) {
        console.error("Error loading decisions:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <span>LOADING PROJECT MEMORY & DECISIONS...</span>
      </div>
    );
  }

  const { decisions = [], projectName } = decisionsData || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Header */}
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
          PROJECT MEMORY
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
          Decision Feed
        </h1>
        <p className="text-xs text-[var(--bos-text-secondary)]">
          Searchable record of architectural, scope, and technical decisions made for {projectName}.
        </p>
      </div>

      <div className="space-y-4">
        {decisions.length > 0 ? (
          decisions.map((dec: any) => (
            <div
              key={dec.id}
              className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-base text-[var(--bos-text-primary)]">
                  {dec.title}
                </h3>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(dec.decidedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-1.5 text-xs">
                <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase block">
                  DECISION
                </span>
                <p className="text-[var(--bos-text-primary)] leading-relaxed">{dec.decision}</p>
                <span className="font-mono text-[10px] font-bold text-blue-400 uppercase block pt-1">
                  RATIONALE
                </span>
                <p className="text-[var(--bos-text-secondary)] leading-relaxed">{dec.reason}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)] pt-1">
                <span>Owner: <strong className="text-[var(--bos-text-primary)]">{dec.decisionOwner}</strong></span>
                {dec.impact && <span className="text-purple-400">Impact: {dec.impact}</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 rounded-3xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center text-xs text-[var(--bos-text-secondary)]">
            No formal architecture decisions recorded for this project yet.
          </div>
        )}
      </div>
    </div>
  );
}
