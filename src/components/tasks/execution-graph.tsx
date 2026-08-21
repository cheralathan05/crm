"use client";

import { useState } from "react";
import {
  FileText,
  FileCheck2,
  Layers,
  Globe,
  Server,
  Database,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExecutionGraphProps = {
  project?: any;
  tasks?: any[];
  onSelectNode: (node: { type: string; id: string; name: string }) => void;
};

export function ExecutionGraph({
  project,
  tasks = [],
  onSelectNode,
}: ExecutionGraphProps) {
  const [activeTier, setActiveTier] = useState<string>("ALL");

  if (!project) {
    return (
      <div className="p-6 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl text-center">
        <Layers className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
        <p className="text-[13px] font-medium text-[var(--bos-text-primary)]">Select a Project to View Execution Graph</p>
        <p className="text-[11px] text-[var(--bos-text-secondary)]">The execution graph traces approved proposals into multi-layer engineering tasks.</p>
      </div>
    );
  }

  const deliverables = project.deliverables || [];
  const dbTasks = tasks.filter((t) => t.layer === "DATABASE" || t.workstream === "DATABASE");
  const beTasks = tasks.filter((t) => t.layer === "BACKEND" || t.workstream === "BACKEND");
  const feTasks = tasks.filter((t) => t.layer === "FRONTEND" || t.workstream === "FRONTEND");
  const qaTasks = tasks.filter((t) => t.layer === "TESTING" || t.workstream === "TESTING" || t.workstream === "QA");
  const completedTasks = tasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED");
  const verifiedTasks = tasks.filter((t) => (t.evidenceRecords && t.evidenceRecords.length > 0) || t.status === "DONE");
  const acceptedDelivs = deliverables.filter((d: any) => d.status === "ACCEPTED");

  return (
    <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-5 shadow-xs space-y-4">
      {/* Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--bos-border)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--bos-accent)] font-bold">
              SYSTEM LINEAGE GRAPH
            </span>
            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
              · Real Database Traceability
            </span>
          </div>
          <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
            How Business Intent Becomes Verified Reality
          </h3>
        </div>

        <div className="flex items-center gap-2 text-[10.5px] font-mono text-[var(--bos-text-secondary)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> DB
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> API
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> UI
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> QA
          </span>
        </div>
      </div>

      {/* Relational Flow Stream */}
      <div className="overflow-x-auto">
        <div className="min-w-[960px] flex items-stretch justify-between gap-3 pt-1">
          
          {/* Node 1: Proposal */}
          <div
            onClick={() => onSelectNode({ type: "PROPOSAL", id: project.proposalId || project.id, name: project.proposal?.reference || project.code || "Proposal" })}
            className="flex-1 p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-[9.5px] font-mono text-amber-600 font-bold block uppercase">01. SOURCE</span>
              <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-[var(--bos-accent)] transition-colors">
                Approved Proposal
              </h4>
              <p className="text-[11px] font-mono text-[var(--bos-text-secondary)] mt-0.5">
                {project.proposal?.reference || project.code || "PRJ-2026"} (v{project.proposalVersion || 1})
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)]">
              <span>{project.currency} {(project.budget || 0).toLocaleString()}</span>
              <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div className="flex items-center text-[var(--bos-text-tertiary)]">
            <ArrowRight className="w-3.5 h-3.5 opacity-40" />
          </div>

          {/* Node 2: Approved Requirements */}
          <div
            onClick={() => onSelectNode({ type: "REQUIREMENT", id: project.requirementRequestId || "REQ-001", name: "Approved Requirements" })}
            className="flex-1 p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-[9.5px] font-mono text-sky-600 font-bold block uppercase">02. SCOPE</span>
              <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-[var(--bos-accent)] transition-colors">
                Requirements
              </h4>
              <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                Business & functional rules
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)]">
              <span>Scope Baseline</span>
              <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div className="flex items-center text-[var(--bos-text-tertiary)]">
            <ArrowRight className="w-3.5 h-3.5 opacity-40" />
          </div>

          {/* Node 3: Deliverables */}
          <div
            onClick={() => onSelectNode({ type: "DELIVERABLE", id: deliverables[0]?.id || "ALL", name: `${deliverables.length} Deliverables` })}
            className="flex-1 p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-[9.5px] font-mono text-purple-600 font-bold block uppercase">03. CONTRACT</span>
              <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-[var(--bos-accent)] transition-colors">
                Deliverables ({deliverables.length})
              </h4>
              <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                {acceptedDelivs.length}/{deliverables.length} formally accepted
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)]">
              <span>{deliverables.length} Phase Gates</span>
              <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div className="flex items-center text-[var(--bos-text-tertiary)]">
            <ArrowRight className="w-3.5 h-3.5 opacity-40" />
          </div>

          {/* Node 4: Engineering Multi-Tier Decomposition */}
          <div className="flex-[1.5] p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-left flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-mono text-[var(--bos-accent)] font-bold uppercase">04. ENGINEERING TIERS</span>
              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{tasks.length} Tasks</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onSelectNode({ type: "DATABASE", id: "DATABASE", name: "Database Tasks" })}
                className="p-1.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-purple-500 text-left transition-colors flex items-center justify-between text-[10.5px] font-mono cursor-pointer"
              >
                <span className="text-purple-600 font-bold">DATA</span>
                <span className="text-[var(--bos-text-secondary)]">{dbTasks.length}</span>
              </button>

              <button
                onClick={() => onSelectNode({ type: "BACKEND", id: "BACKEND", name: "Backend Tasks" })}
                className="p-1.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-emerald-500 text-left transition-colors flex items-center justify-between text-[10.5px] font-mono cursor-pointer"
              >
                <span className="text-emerald-600 font-bold">API</span>
                <span className="text-[var(--bos-text-secondary)]">{beTasks.length}</span>
              </button>

              <button
                onClick={() => onSelectNode({ type: "FRONTEND", id: "FRONTEND", name: "Frontend Tasks" })}
                className="p-1.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-sky-500 text-left transition-colors flex items-center justify-between text-[10.5px] font-mono cursor-pointer"
              >
                <span className="text-sky-600 font-bold">UI</span>
                <span className="text-[var(--bos-text-secondary)]">{feTasks.length}</span>
              </button>

              <button
                onClick={() => onSelectNode({ type: "TESTING", id: "TESTING", name: "Testing Tasks" })}
                className="p-1.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-amber-500 text-left transition-colors flex items-center justify-between text-[10.5px] font-mono cursor-pointer"
              >
                <span className="text-amber-600 font-bold">QA</span>
                <span className="text-[var(--bos-text-secondary)]">{qaTasks.length}</span>
              </button>
            </div>

            <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] flex items-center justify-between pt-1 border-t border-[var(--bos-border)]">
              <span>{completedTasks.length}/{tasks.length} Executed</span>
              <span className="text-[var(--bos-accent)] font-semibold">{Math.round((completedTasks.length / (tasks.length || 1)) * 100)}% Done</span>
            </div>
          </div>

          <div className="flex items-center text-[var(--bos-text-tertiary)]">
            <ArrowRight className="w-3.5 h-3.5 opacity-40" />
          </div>

          {/* Node 5: Verification & Evidence */}
          <div
            onClick={() => onSelectNode({ type: "EVIDENCE", id: "EVIDENCE", name: "Verification Evidence" })}
            className="flex-1 p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-emerald-500 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-[9.5px] font-mono text-emerald-600 font-bold block uppercase">05. VERIFIED</span>
              <h4 className="text-[12px] font-bold text-[var(--bos-text-primary)] mt-1 group-hover:text-emerald-600 transition-colors">
                Evidence Proof
              </h4>
              <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                Commits, CI & Tests
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--bos-border)] flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)]">
              <span>{verifiedTasks.length} Proof Records</span>
              <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div className="flex items-center text-[var(--bos-text-tertiary)]">
            <ArrowRight className="w-3.5 h-3.5 opacity-40" />
          </div>

          {/* Node 6: Client Acceptance */}
          <div
            onClick={() => onSelectNode({ type: "ACCEPTANCE", id: "ACCEPTANCE", name: "Client Acceptance" })}
            className={cn(
              "flex-1 p-3.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between border",
              acceptedDelivs.length === deliverables.length && deliverables.length > 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]",
            )}
          >
            <div>
              <span className="text-[9.5px] font-mono font-bold block uppercase">06. ACCEPTANCE</span>
              <h4 className="text-[12px] font-bold mt-1 transition-colors">
                Client Sign-off
              </h4>
              <p className="text-[11px] opacity-80 mt-0.5">
                {acceptedDelivs.length}/{deliverables.length} Deliverables Signed
              </p>
            </div>
            <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-mono opacity-75">
              <span>{acceptedDelivs.length === deliverables.length && deliverables.length > 0 ? "Completed" : "In Progress"}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
