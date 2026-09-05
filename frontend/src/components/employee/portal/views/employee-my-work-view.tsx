"use client";

import { useState } from "react";
import {
  Play,
  MessageSquare,
  AlertOctagon,
  CheckCircle2,
  FileCheck2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  ChevronRight,
  Filter,
  AlertTriangle,
  ExternalLink,
  History,
  CheckCircle,
  XCircle,
  UserCheck,
  ChevronDown,
} from "lucide-react";

interface EmployeeMyWorkViewProps {
  portalData: any;
  highlightTaskId?: string | null;
  onOpenSmartContact: (person: any, task: any) => void;
  onOpenBlockerModal: (task: any) => void;
  onOpenHelpModal: (task: any) => void;
  onOpenHandoffModal: (task: any) => void;
  onRefresh: () => void;
}

export function EmployeeMyWorkView({
  portalData,
  highlightTaskId,
  onOpenSmartContact,
  onOpenBlockerModal,
  onOpenHelpModal,
  onOpenHandoffModal,
  onRefresh,
}: EmployeeMyWorkViewProps) {
  const {
    employee,
    currentProject,
    workItems = [],
    myWorkToday,
    productContext,
    executionQueue,
  } = portalData;

  const [viewMode, setViewMode] = useState<"EXECUTION_FOCUS" | "ALL_ITEMS">("EXECUTION_FOCUS");
  const [filter, setFilter] = useState<string>("ALL");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(highlightTaskId || null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [openTraceabilityId, setOpenTraceabilityId] = useState<string | null>(null);

  // Execution Queue from service: One Work Item At A Time (Section 19)
  const currentWork = executionQueue?.current || myWorkToday?.currentWork || workItems[0] || null;
  const nextWork = executionQueue?.next || null;
  const upcomingWork = executionQueue?.upcoming || [];

  // Filter tasks strictly from real states
  const filteredWorkItems = workItems.filter((t: any) => {
    if (filter === "ALL") return true;
    if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
    if (filter === "CHANGES_REQUESTED") return t.status === "CHANGES_REQUESTED";
    if (filter === "BLOCKED") return t.status === "BLOCKED";
    if (filter === "IN_REVIEW") return t.status === "IN_REVIEW" || t.status === "SUBMITTED";
    if (filter === "TODO") return t.status === "TODO" || t.status === "READY";
    if (filter === "COMPLETED") return t.status === "COMPLETED" || t.status === "DONE";
    return true;
  });

  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      const res = await fetch("/api/employee/work/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "IN_PROGRESS" }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to start task:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── 1. PRODUCT WORK HEADER BANNER (Section 18 & 46) ───────────── */}
      <div className="rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--bos-text-primary)]">MY PRODUCT WORK</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] text-xs font-mono font-bold uppercase">
                {employee.discipline} WORKSTREAM
              </span>
            </div>
            <p className="text-xs text-[var(--bos-text-tertiary)] font-mono mt-1">
              Project: {currentProject?.name || "AI-Powered Business CRM Platform"} · Role: {productContext?.yourRole || employee.role}
            </p>
          </div>

          {/* View Mode Toggle: Focus vs All Items */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bos-surface)] rounded-2xl border border-[var(--bos-border)] font-mono text-xs">
            <button
              onClick={() => setViewMode("EXECUTION_FOCUS")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                viewMode === "EXECUTION_FOCUS"
                  ? "bg-[var(--bos-accent)] text-white shadow-xs"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              }`}
            >
              FOCUS (CURRENT / NEXT)
            </button>
            <button
              onClick={() => setViewMode("ALL_ITEMS")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                viewMode === "ALL_ITEMS"
                  ? "bg-[var(--bos-accent)] text-white shadow-xs"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              }`}
            >
              ALL PRODUCT SCOPE ({workItems.length})
            </button>
          </div>
        </div>

        {/* Product Scope Context */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--bos-text-secondary)]">
          <div>
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">YOUR RESPONSIBILITY</span>
            <span className="font-bold text-[var(--bos-text-primary)]">
              {productContext?.yourResponsibility || "Frontend Product Experience"}
            </span>
          </div>
          <div className="border-l border-[var(--bos-border)] pl-4">
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">APPROVED MVP SCOPE</span>
            <span className="font-semibold text-[var(--bos-accent)]">
              {(productContext?.whatClientApproved || ["Pages & content", "Contact forms", "Blog / news", "SEO"]).join(" · ")}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTION FOCUS MODE (Section 19 Master Spec) ──────────── */}
      {viewMode === "EXECUTION_FOCUS" ? (
        <div className="space-y-6">
          {/* A. CURRENT WORK (Primary Product Responsibility) */}
          {currentWork ? (
            <div className="rounded-3xl bg-[var(--bos-surface-panel)] border-2 border-[var(--bos-accent)] shadow-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--bos-border)]">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase tracking-wider">
                    CURRENT WORK
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono font-bold text-[var(--bos-accent)]">
                    PRODUCT AREA: {currentWork.productAreaName || currentWork.sourceRequirementTitle || "Pages & content"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                      currentWork.status === "IN_PROGRESS"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : currentWork.status === "BLOCKED"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : currentWork.status === "CHANGES_REQUESTED"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {currentWork.status}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                  {currentWork.code} · TECHNICAL RESPONSIBILITY
                </div>
                <h2 className="text-2xl font-bold text-[var(--bos-text-primary)]">{currentWork.title}</h2>
                <p className="text-sm font-sans text-[var(--bos-text-secondary)] leading-relaxed">
                  {currentWork.description || currentWork.expectedResult}
                </p>
              </div>

              {/* Dependency Status Card (Section 11) */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)]">
                    UPSTREAM TECHNICAL DEPENDENCY
                  </span>
                  {currentWork.dependencyDetails && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      currentWork.dependencyDetails.isReady ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                    }`}>
                      {currentWork.dependencyDetails.isReady ? "READY" : "WAITING FOR BACKEND"}
                    </span>
                  )}
                </div>

                {currentWork.dependencyDetails ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="font-bold text-[var(--bos-text-primary)]">{currentWork.dependencyDetails.title}</p>
                      <p className="text-[11px] text-[var(--bos-text-secondary)]">
                        Owner: {currentWork.dependencyDetails.ownerName} ({currentWork.dependencyDetails.ownerRole})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onOpenSmartContact(
                            {
                              id: currentWork.dependencyDetails.ownerId,
                              name: currentWork.dependencyDetails.ownerName,
                              role: currentWork.dependencyDetails.ownerRole,
                            },
                            currentWork,
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] hover:bg-[var(--bos-surface-subtle)] text-[11px] font-bold text-[var(--bos-text-primary)] flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                        <span>Message Owner</span>
                      </button>

                      <button
                        onClick={() => onOpenBlockerModal(currentWork)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-[11px] font-bold text-rose-400 flex items-center gap-1.5 cursor-pointer"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Raise Blocker</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--bos-text-tertiary)] italic">Foundational project architecture & approved design system.</p>
                )}
              </div>

              {/* 10-Point Traceability Drawer (Section 16) */}
              <div className="border border-[var(--bos-border)] rounded-2xl overflow-hidden bg-[var(--bos-surface)]">
                <button
                  onClick={() => setOpenTraceabilityId(openTraceabilityId === currentWork.id ? null : currentWork.id)}
                  className="w-full px-5 py-3 flex items-center justify-between text-xs font-mono font-bold text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--bos-accent)]" />
                    <span>WHY THIS WORK EXISTS (TRACEABILITY PANEL)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openTraceabilityId === currentWork.id ? "rotate-180" : ""}`} />
                </button>

                {openTraceabilityId === currentWork.id && (
                  <div className="p-5 border-t border-[var(--bos-border)] grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Proposal</span>
                      <span className="font-bold text-[var(--bos-text-primary)]">PROP-2026-001 v1</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Requirement</span>
                      <span className="font-bold text-[var(--bos-accent)]">{currentWork.tenQuestions?.requirement || "REQ-001"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Product Area</span>
                      <span className="font-bold text-[var(--bos-text-primary)]">{currentWork.productAreaName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Deliverable</span>
                      <span className="font-bold text-[var(--bos-text-primary)]">{currentWork.tenQuestions?.deliverable || "DLV-001"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Workstream</span>
                      <span className="font-bold text-[var(--bos-text-primary)]">{currentWork.workstream}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Role</span>
                      <span className="font-bold text-[var(--bos-text-primary)]">{currentWork.tenQuestions?.role}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Assigned To</span>
                      <span className="font-bold text-[var(--bos-text-primary)]">{currentWork.assigneeName || employee.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Proof Required</span>
                      <span className="font-bold text-amber-400">{currentWork.proofTypeRequired}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bos-border)]">
                <div className="text-xs font-mono text-[var(--bos-text-tertiary)]">
                  Proof Type: <span className="font-bold text-[var(--bos-text-primary)]">{currentWork.proofTypeRequired}</span>
                </div>

                <div className="flex items-center gap-3">
                  {currentWork.status === "TODO" || currentWork.status === "READY" ? (
                    <button
                      onClick={() => handleStartTask(currentWork.id)}
                      disabled={actionLoadingId === currentWork.id}
                      className="px-6 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-mono font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[var(--bos-accent)]/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>START WORK</span>
                    </button>
                  ) : null}

                  <button
                    onClick={() => onOpenHandoffModal(currentWork)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>SUBMIT PROOF FOR REVIEW</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-[var(--bos-text-primary)]">All Assigned Responsibilities Verified</h3>
              <p className="text-xs text-[var(--bos-text-secondary)] font-mono">
                You have completed all active {employee.discipline.toLowerCase()} responsibilities for this project.
              </p>
            </div>
          )}

          {/* B. NEXT WORK (Section 19 Master Spec) */}
          {nextWork && (
            <div className="rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] p-5 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] tracking-wider">
                  NEXT WORK ITEM
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--bos-surface-panel)] text-[10px] text-[var(--bos-text-secondary)]">
                  {nextWork.productAreaName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[var(--bos-text-primary)]">{nextWork.title}</h4>
                  <p className="text-xs text-[var(--bos-text-secondary)] mt-0.5">{nextWork.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase shrink-0">
                  {nextWork.status}
                </span>
              </div>
            </div>
          )}

          {/* C. UPCOMING SCOPE (Section 19 Master Spec) */}
          {upcomingWork.length > 0 && (
            <div className="rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] p-5 space-y-3 font-mono">
              <span className="text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] tracking-wider block">
                UPCOMING APPROVED RESPONSIBILITIES ({upcomingWork.length})
              </span>
              <div className="divide-y divide-[var(--bos-border)] text-xs">
                {upcomingWork.map((task: any) => (
                  <div key={task.id} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div>
                      <span className="font-bold text-[var(--bos-text-primary)]">{task.title}</span>
                      <span className="text-[var(--bos-text-tertiary)] text-[11px] ml-2">({task.productAreaName})</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)] uppercase">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── 3. ALL PRODUCT SCOPE LIST VIEW ─────────────────────────── */
        <div className="space-y-4 font-mono text-xs">
          {filteredWorkItems.map((task: any) => (
            <div
              key={task.id}
              className="p-5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--bos-accent)]">{task.code}</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bos-surface)] text-[10px] text-[var(--bos-text-secondary)] font-bold">
                    {task.productAreaName}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[var(--bos-surface)] text-[var(--bos-text-primary)]">
                  {task.status}
                </span>
              </div>
              <h3 className="font-bold text-sm text-[var(--bos-text-primary)] font-sans">{task.title}</h3>
              <p className="text-xs text-[var(--bos-text-secondary)] font-sans">{task.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--bos-border)] text-[11px]">
                <span className="text-[var(--bos-text-tertiary)]">Proof: {task.proofTypeRequired}</span>
                <button
                  onClick={() => onOpenHandoffModal(task)}
                  className="text-[var(--bos-accent)] hover:underline font-bold"
                >
                  View Details & Submit Proof →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
