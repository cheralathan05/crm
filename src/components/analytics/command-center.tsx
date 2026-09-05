"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FolderKanban,
  GitBranch,
  Layers,
  ListOrdered,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type {
  CommandOverviewData,
  BusinessPulseMetric,
} from "@/lib/analytics/analytics-pulse.service";
import type { AttentionItem } from "@/lib/analytics/attention-center.service";
import type { EarlyDeliveryReport } from "@/lib/analytics/early-delivery.service";
import type { CommercialCashflowReport } from "@/lib/analytics/commercial-cashflow.service";
import type { TimelineEvent } from "@/lib/analytics/timeline.service";
import { ActionPreviewModal } from "./action-preview-modal";
import { MetricLineageModal } from "./metric-lineage-modal";
import { RootCauseModal } from "./root-cause-modal";
import { DrillDownModal, DrillDownItem } from "./drill-down-modal";

export type CommandCenterTab =
  | "OVERVIEW"
  | "ATTENTION"
  | "PROJECT_CONTROL"
  | "EARLY_DELIVERY"
  | "COMMERCIAL"
  | "REPORTS"
  | "ASK_AI";

export function BusinessCommandCenter() {
  const [activeTab, setActiveTab] = useState<CommandCenterTab>("OVERVIEW");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core Data States
  const [overview, setOverview] = useState<CommandOverviewData | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [earlyDelivery, setEarlyDelivery] = useState<EarlyDeliveryReport | null>(null);
  const [commercial, setCommercial] = useState<CommercialCashflowReport | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [projectControl, setProjectControl] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);

  // Modals & Drawers States
  const [actionPreview, setActionPreview] = useState<{
    isOpen: boolean;
    title: string;
    actionType: string;
    entityTitle: string;
    currentValue: string;
    newValue: string;
    affectedEntities: string[];
    impactDescription: string;
    payload: any;
  } | null>(null);

  const [metricLineage, setMetricLineage] = useState<{
    isOpen: boolean;
    metricName: string;
    definition: string;
    currentValue: string;
    formula: string;
    lineageSteps?: any[];
    sourceTables: string[];
  } | null>(null);

  const [rootCauseData, setRootCauseData] = useState<any | null>(null);

  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    categoryName: string;
    items: DrillDownItem[];
  } | null>(null);

  // Ask Business OS State
  const [askQuestion, setAskQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [aiResponse, setAiResponse] = useState<any | null>(null);

  // Report Generator State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ────────────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      const [ovRes, attRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/analytics/attention"),
      ]);

      if (ovRes.ok) {
        const json = await ovRes.json();
        if (json.ok) setOverview(json.data);
      }
      if (attRes.ok) {
        const json = await attRes.json();
        if (json.ok) setAttentionItems(json.data.items);
      }
    } catch (e) {
      console.error("Error fetching overview:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Lazy tab data loaders
  useEffect(() => {
    if (activeTab === "EARLY_DELIVERY" && !earlyDelivery) {
      fetch("/api/analytics/early-delivery")
        .then((r) => r.json())
        .then((j) => j.ok && setEarlyDelivery(j.data));
    }
    if (activeTab === "COMMERCIAL" && !commercial) {
      fetch("/api/analytics/financial")
        .then((r) => r.json())
        .then((j) => j.ok && setCommercial(j.data));
    }
    if (activeTab === "REPORTS" && reports.length === 0) {
      fetch("/api/analytics/reports")
        .then((r) => r.json())
        .then((j) => j.ok && setReports(j.data));
      fetch("/api/analytics/timeline")
        .then((r) => r.json())
        .then((j) => j.ok && setTimeline(j.data.events));
    }
    if (activeTab === "PROJECT_CONTROL" && !projectControl) {
      // Fetch first project
      fetch("/api/projects")
        .then((r) => r.json())
        .then((j) => {
          const prjId = j.data?.[0]?.id || j.projects?.[0]?.id;
          if (!prjId) return null;
          return fetch(`/api/analytics/projects/${prjId}`);
        })
        .then((r) => r && r.json())
        .then((j) => j.ok && setProjectControl(j.data))
        .catch(() => {});
    }
  }, [activeTab]);

  // ────────────────────────────────────────────────────────────────
  // ACTION EXECUTION DISPATCHER (Action Completion Loop)
  // ────────────────────────────────────────────────────────────────
  const handleExecuteAction = async (actionType: string, payload: any) => {
    try {
      const res = await fetch("/api/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, payload }),
      });
      const json = await res.json();
      if (json.ok) {
        // Automatically re-fetch to reflect state updates immediately
        await fetchAllData();
      } else {
        alert(json.message || "Failed to complete action.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // ASK BUSINESS OS HANDLER
  // ────────────────────────────────────────────────────────────────
  const handleAsk = async (qText?: string) => {
    const query = qText || askQuestion;
    if (!query.trim()) return;
    setIsAsking(true);
    setAiResponse(null);
    try {
      const res = await fetch("/api/analytics/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const json = await res.json();
      if (json.ok) {
        setAiResponse(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAsking(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // ONE-CLICK EXECUTIVE REPORT GENERATOR
  // ────────────────────────────────────────────────────────────────
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Monthly Business Operations Report" }),
      });
      const json = await res.json();
      if (json.ok) {
        // Open PDF in new tab
        window.open(json.data.downloadPdfUrl, "_blank");
        // Reload reports list
        fetch("/api/analytics/reports")
          .then((r) => r.json())
          .then((j) => j.ok && setReports(j.data));
      } else {
        alert("Failed to generate report: " + json.message);
      }
    } catch (e: any) {
      alert("Report generation error: " + e.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
        <span className="text-xs font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
          INITIALIZING BUSINESS COMMAND CENTER · VERIFYING RECORDS
        </span>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 01. HEADER: BUSINESS COMMAND CENTER & NAVIGATION TABS        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--bos-line)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--bos-success)] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-accent)] font-semibold">
              OPERATIONAL INTELLIGENCE & DECISION LAYER
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--bos-text-primary)] mt-1">
            BUSINESS COMMAND CENTER
          </h1>
          <p className="text-xs text-[var(--bos-text-secondary)] mt-1">
            Converting real transactional events into signals, explanations, decisions, and verified results.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleAsk("What should I handle first?")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-sunken)] text-xs font-medium text-[var(--bos-text-primary)] transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
            <span>Ask Business OS</span>
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
          >
            {isGeneratingReport ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Generate Business Report</span>
          </button>

          <button
            onClick={fetchAllData}
            title="Refresh analytics data"
            className="p-1.5 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--bos-line)] overflow-x-auto no-scrollbar">
        {[
          { id: "OVERVIEW", label: "Command Center" },
          { id: "ATTENTION", label: `Attention Center (${attentionItems.length})` },
          { id: "PROJECT_CONTROL", label: "Project Control Room" },
          { id: "EARLY_DELIVERY", label: "Early Delivery & Flow" },
          { id: "COMMERCIAL", label: "Money & Cashflow" },
          { id: "REPORTS", label: "Reports & Governance" },
          { id: "ASK_AI", label: "Ask Business OS" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CommandCenterTab)}
            className={`px-3.5 py-2 text-xs font-medium tracking-wide whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
                : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 02. TAB: SIGNATURE COMMAND CENTER FIRST SCREEN               */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "OVERVIEW" && overview && (
        <div className="space-y-6">
          {/* A. BUSINESS PULSE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                01 · BUSINESS PULSE
              </span>
              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                {overview.sinceLastVisitText}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {overview.pulse.map((p) => (
                <div
                  key={p.category}
                  className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                      {p.category}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold tracking-wider ${
                        p.status === "HEALTHY"
                          ? "bg-[var(--bos-success)]/10 text-[var(--bos-success)]"
                          : p.status === "ATTENTION"
                            ? "bg-[var(--bos-warning)]/10 text-[var(--bos-warning)]"
                            : "bg-[var(--bos-error)]/10 text-[var(--bos-error)]"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--bos-text-primary)] leading-tight line-clamp-2">
                    {p.headline}
                  </p>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] leading-relaxed line-clamp-2">
                    {p.evidence}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* B. "DO THIS NEXT" (Rule 05) */}
          {overview.doThisNext && (
            <div className="p-4 rounded-sm border border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-[2px] bg-[var(--bos-accent)] text-white text-[9px] font-mono font-bold uppercase tracking-wider">
                    NEXT BEST ACTION
                  </span>
                  <span className="text-xs font-mono text-[var(--bos-accent)] font-semibold">
                    Priority Impact: {overview.doThisNext.priorityScore}/100
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[var(--bos-text-primary)]">
                  {overview.doThisNext.title}
                </h3>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  <span className="font-semibold text-[var(--bos-text-primary)]">Why: </span>
                  {overview.doThisNext.why}
                </p>
              </div>
              <button
                onClick={() => {
                  setActionPreview({
                    isOpen: true,
                    title: overview.doThisNext!.title,
                    actionType: overview.doThisNext!.actionType,
                    entityTitle: overview.doThisNext!.title,
                    currentValue: "Awaiting Action",
                    newValue: "Verified & Resolved",
                    affectedEntities: [overview.doThisNext!.entityType, "Project Flow", "Financial State"],
                    impactDescription: overview.doThisNext!.impact,
                    payload: {
                      paymentId: overview.doThisNext!.entityId,
                      taskId: overview.doThisNext!.entityId,
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-semibold shadow-xs whitespace-nowrap transition-colors"
              >
                <span>{overview.doThisNext.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* C. ATTENTION REQUIRED & WHAT CHANGED (Two Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Attention Required */}
            <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-[var(--bos-warning)]" />
                  ATTENTION REQUIRED ({attentionItems.length})
                </span>
                <button
                  onClick={() => setActiveTab("ATTENTION")}
                  className="text-[10px] font-mono text-[var(--bos-accent)] hover:underline"
                >
                  VIEW ALL →
                </button>
              </div>

              {attentionItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--bos-text-secondary)]">
                  ✓ Zero items requiring immediate administrative action.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {attentionItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] hover:border-[var(--bos-line-strong)] transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--bos-text-primary)] truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-[var(--bos-accent)] shrink-0">
                          {item.age}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--bos-text-secondary)] leading-relaxed">
                        {item.why}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="font-mono text-[var(--bos-text-tertiary)]">
                          {item.priorityReason}
                        </span>
                        <button
                          onClick={() => {
                            setActionPreview({
                              isOpen: true,
                              title: item.title,
                              actionType: item.actionType,
                              entityTitle: item.title,
                              currentValue: "Pending Action",
                              newValue: "Resolved",
                              affectedEntities: [item.projectName || "General", item.sourceType],
                              impactDescription: item.impact,
                              payload: item.actionPayload,
                            });
                          }}
                          className="font-medium text-[var(--bos-accent)] hover:underline"
                        >
                          [{item.actionLabel}]
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What Changed */}
            <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                  WHAT CHANGED SINCE LAST VISIT
                </span>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                  {overview.whatChanged.length} events
                </span>
              </div>

              {overview.whatChanged.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--bos-text-secondary)]">
                  No new events recorded since your previous session.
                </div>
              ) : (
                <div className="space-y-2">
                  {overview.whatChanged.slice(0, 4).map((event) => (
                    <div
                      key={event.id}
                      className="p-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] text-xs flex items-start gap-2"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                          event.isAlert ? "bg-[var(--bos-warning)]" : "bg-[var(--bos-success)]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[var(--bos-text-primary)] font-medium leading-snug">
                          {event.text}
                        </p>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] mt-0.5 block">
                          {new Date(event.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* D. METRIC SUMMARY GRIDS: EXECUTION · MONEY · PROJECTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Execution Card */}
            <div
              onClick={() => {
                setMetricLineage({
                  isOpen: true,
                  metricName: "Execution Completion & Early Verified",
                  definition: "Proportion of defined project sprint tasks verified Done, including early completions.",
                  currentValue: `${overview.execution.completionRate}% (${overview.execution.completed}/${overview.execution.total})`,
                  formula: "(Completed Tasks / Total Tasks) * 100",
                  lineageSteps: [
                    { label: "Completed & Verified Tasks", amount: `${overview.execution.completed}`, operator: "+", source: "ClientTask with status DONE/COMPLETED" },
                    { label: "Total Tasks Provisioned", amount: `${overview.execution.total}`, operator: "=", source: "Total ClientTask rows across workspace projects" },
                  ],
                  sourceTables: ["ClientTask", "TaskSubmission", "TaskReview"],
                });
              }}
              className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3 cursor-pointer hover:border-[var(--bos-line-strong)] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                  EXECUTION
                </span>
                <span className="text-xs font-mono font-bold text-[var(--bos-accent)]">
                  {overview.execution.completionRate}% Done
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Completed</span>
                  <p className="font-mono font-semibold text-[var(--bos-text-primary)]">
                    {overview.execution.completed}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Verified Early</span>
                  <p className="font-mono font-semibold text-[var(--bos-success)]">
                    {overview.execution.verifiedEarly}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">In Review</span>
                  <p className="font-mono font-semibold text-[var(--bos-warning)]">
                    {overview.execution.inReview}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Blocked</span>
                  <p className="font-mono font-semibold text-[var(--bos-error)]">
                    {overview.execution.blocked}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Card */}
            <div
              onClick={() => {
                setMetricLineage({
                  isOpen: true,
                  metricName: "Confirmed Cash & Commercial Position",
                  definition: "Liquid confirmed collections vs outstanding accounts receivable.",
                  currentValue: `₹${overview.financial.confirmedCash.toLocaleString()} Confirmed`,
                  formula: "Sum(PaymentRequest.amount where status = CONFIRMED)",
                  lineageSteps: [
                    { label: "Confirmed Collections", amount: `₹${overview.financial.confirmedCash.toLocaleString()}`, operator: "+", source: "PaymentRequest (CONFIRMED)" },
                    { label: "Outstanding Receivables", amount: `₹${overview.financial.outstanding.toLocaleString()}`, operator: "=", source: "PaymentRequest (SENT/READY)" },
                  ],
                  sourceTables: ["PaymentRequest", "PaymentReceipt", "FinancialAuditLog"],
                });
              }}
              className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3 cursor-pointer hover:border-[var(--bos-line-strong)] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                  MONEY
                </span>
                <span className="text-xs font-mono font-bold text-[var(--bos-success)]">
                  ₹{overview.financial.confirmedCash.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Confirmed Cash</span>
                  <p className="font-mono font-semibold text-[var(--bos-success)]">
                    ₹{overview.financial.confirmedCash.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Outstanding</span>
                  <p className="font-mono font-semibold text-[var(--bos-text-primary)]">
                    ₹{overview.financial.outstanding.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Awaiting Verification</span>
                  <p className="font-mono font-semibold text-[var(--bos-warning)]">
                    ₹{overview.financial.awaitingConfirmation.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Overdue</span>
                  <p className="font-mono font-semibold text-[var(--bos-error)]">
                    ₹{overview.financial.overdue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Health Card */}
            <div
              onClick={() => setActiveTab("PROJECT_CONTROL")}
              className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3 cursor-pointer hover:border-[var(--bos-line-strong)] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                  PROJECTS
                </span>
                <span className="text-xs font-mono font-bold text-[var(--bos-accent)]">
                  {overview.projects.total} Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Healthy</span>
                  <p className="font-mono font-semibold text-[var(--bos-success)]">
                    {overview.projects.healthy}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Attention</span>
                  <p className="font-mono font-semibold text-[var(--bos-warning)]">
                    {overview.projects.attention}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">Blocked</span>
                  <p className="font-mono font-semibold text-[var(--bos-error)]">
                    {overview.projects.blocked}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* E. BUSINESS SCORECARD (Rule 67) */}
          <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                ORGANIZATIONAL HEALTH SCORECARD · TRANSPARENT CATEGORIES
              </span>
              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                Zero arbitrary AI scores
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {overview.scorecard.map((cat) => (
                <div
                  key={cat.category}
                  onClick={() => {
                    setMetricLineage({
                      isOpen: true,
                      metricName: `Scorecard: ${cat.category}`,
                      definition: cat.reason,
                      currentValue: cat.scoreText,
                      formula: cat.calculationLineage,
                      sourceTables: [cat.evidence],
                    });
                  }}
                  className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] hover:border-[var(--bos-line-strong)] transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold text-[var(--bos-text-primary)]">
                      {cat.category}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] ${
                        cat.status === "HEALTHY"
                          ? "bg-[var(--bos-success)]/10 text-[var(--bos-success)]"
                          : "bg-[var(--bos-warning)]/10 text-[var(--bos-warning)]"
                      }`}
                    >
                      {cat.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--bos-text-primary)]">
                    {cat.scoreText}
                  </p>
                  <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
                    {cat.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 03. TAB: ATTENTION CENTER (Rules 03 & 04)                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "ATTENTION" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--bos-text-primary)]">
                Attention Center · Ranked Action Pipeline
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)]">
                Ranked using real factors: downstream blockages, financial amounts, client impact, and age.
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">
              {attentionItems.length} active items
            </span>
          </div>

          <div className="space-y-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] hover:border-[var(--bos-line-strong)] transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-[2px] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] text-[9px] font-mono font-bold tracking-wider">
                      SCORE: {item.priorityScore}
                    </span>
                    <span className="text-xs font-bold text-[var(--bos-text-primary)]">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--bos-text-tertiary)] font-mono">
                    <span>Owner: {item.owner}</span>
                    <span>{item.age}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] text-xs">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                      RATIONALE (WHY)
                    </span>
                    <p className="text-[var(--bos-text-primary)] mt-0.5">{item.why}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                      IMPACT
                    </span>
                    <p className="text-[var(--bos-text-secondary)] mt-0.5">{item.impact}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    Priority factors: {item.priorityReason}
                  </span>
                  <button
                    onClick={() => {
                      setActionPreview({
                        isOpen: true,
                        title: item.title,
                        actionType: item.actionType,
                        entityTitle: item.title,
                        currentValue: "Pending Action",
                        newValue: "Verified & Resolved",
                        affectedEntities: [item.projectName || "General", item.sourceType],
                        impactDescription: item.impact,
                        payload: item.actionPayload,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium transition-colors"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 04. TAB: PROJECT CONTROL ROOM & EXECUTION MAP (Rules 12-15)  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "PROJECT_CONTROL" && (
        <div className="space-y-5">
          {!projectControl ? (
            <div className="text-center py-12 text-xs text-[var(--bos-text-secondary)]">
              Loading Project Control Room data...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Project Top Overview */}
              <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-[var(--bos-accent)] font-semibold">
                      PROJECT CONTROL ROOM · {projectControl.project.code}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--bos-success)]/10 text-[var(--bos-success)] text-[9px] font-mono font-bold">
                      {projectControl.project.health}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                    {projectControl.project.name}
                  </h2>
                  <p className="text-xs text-[var(--bos-text-secondary)]">
                    Client: {projectControl.project.clientName} · Stage: {projectControl.project.stage} · {projectControl.project.tasksCount} total work items
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRootCauseData(projectControl.rootCause)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-sunken)] text-xs font-medium text-[var(--bos-text-primary)] transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                    <span>Show Root Cause Graph</span>
                  </button>
                </div>
              </div>

              {/* Execution Map (Rule 13) */}
              <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                    PROJECT EXECUTION MAP (DELIVERABLES → WORK ITEMS → REVIEWS)
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--bos-accent)]">
                    {projectControl.project.progress}% Complete
                  </span>
                </div>

                <div className="space-y-4">
                  {projectControl.deliverables.map((deliv: any) => (
                    <div
                      key={deliv.id}
                      className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-[var(--bos-accent)]" />
                          <span className="text-xs font-bold text-[var(--bos-text-primary)]">
                            {deliv.title}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-[2px] bg-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                          {deliv.status}
                        </span>
                      </div>

                      {/* Tasks breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {deliv.tasks.map((t: any) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] font-bold text-[var(--bos-text-tertiary)]">
                                {t.code || "TASK"}
                              </span>
                              <span
                                className={`text-[8px] font-mono font-bold px-1 rounded-[1px] ${
                                  t.status === "DONE"
                                    ? "bg-[var(--bos-success)]/10 text-[var(--bos-success)]"
                                    : t.status === "BLOCKED"
                                      ? "bg-[var(--bos-error)]/10 text-[var(--bos-error)]"
                                      : "bg-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                            <p className="text-[var(--bos-text-primary)] font-medium line-clamp-1">
                              {t.title}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-[var(--bos-text-secondary)]">
                              <span>{t.layer || "Frontend"}</span>
                              <span>{t.assigneeName || "Unassigned"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 05. TAB: EARLY DELIVERY & FLOW (Rules 16-21)                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "EARLY_DELIVERY" && earlyDelivery && (
        <div className="space-y-6">
          {/* Breakdown cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                VERIFIED EARLY
              </span>
              <p className="text-xl font-bold font-mono text-[var(--bos-success)]">
                {earlyDelivery.breakdown.verifiedEarlyCount}
              </p>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Passed verification on first submission without rework.
              </p>
            </div>

            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                EARLY + REWORK
              </span>
              <p className="text-xl font-bold font-mono text-[var(--bos-warning)]">
                {earlyDelivery.breakdown.earlyWithReworkCount}
              </p>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Submitted early but required revision iterations.
              </p>
            </div>

            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                ON-TIME VERIFIED
              </span>
              <p className="text-xl font-bold font-mono text-[var(--bos-text-primary)]">
                {earlyDelivery.breakdown.onTimeVerifiedCount}
              </p>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Delivered and approved on scheduled maturity.
              </p>
            </div>

            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                FLOW EFFICIENCY
              </span>
              <p className="text-xl font-bold font-mono text-[var(--bos-accent)]">
                {earlyDelivery.flow.flowEfficiencyRatio}%
              </p>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Ratio of active execution time vs total waiting/cycle time.
              </p>
            </div>
          </div>

          {/* Early Verified Deliverables Table */}
          <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
              VERIFIED EARLY DELIVERABLES & DAYS SAVED (RULE 17)
            </span>

            {earlyDelivery.earlyVerifiedItems.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--bos-text-secondary)]">
                No deliverables completed ahead of schedule in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {earlyDelivery.earlyVerifiedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-[var(--bos-accent)]">
                          {item.code}
                        </span>
                        <span className="font-bold text-[var(--bos-text-primary)]">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                        {item.whyEarly}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <span className="text-[9px] font-mono text-[var(--bos-text-tertiary)] block">
                          TIME SAVED
                        </span>
                        <span className="font-mono font-bold text-[var(--bos-success)]">
                          +{item.daysSaved} days
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-[var(--bos-text-tertiary)] block">
                          OWNER
                        </span>
                        <span className="text-[var(--bos-text-primary)] font-medium">
                          {item.employeeName}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queue Intelligence (Rule 21) */}
          <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
              WORK QUEUES & WAITING INTELLIGENCE (RULE 21)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {earlyDelivery.queues.map((q) => (
                <div
                  key={q.queueName}
                  className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)] truncate">
                      {q.queueName}
                    </span>
                    <span
                      className={`text-[8px] font-mono font-bold px-1 rounded-[1px] ${
                        q.status === "CRITICAL"
                          ? "bg-[var(--bos-error)]/10 text-[var(--bos-error)]"
                          : q.status === "ELEVATED"
                            ? "bg-[var(--bos-warning)]/10 text-[var(--bos-warning)]"
                            : "bg-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="text-base font-bold font-mono text-[var(--bos-text-primary)]">
                    {q.itemCount} items
                  </p>
                  <p className="text-[10px] text-[var(--bos-text-secondary)]">
                    Avg wait: {q.avgWaitHours}h · Oldest: {q.oldestItemAgeHours}h
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 06. TAB: COMMERCIAL & CASHFLOW (Rules 35-39)                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "COMMERCIAL" && commercial && (
        <div className="space-y-6">
          {/* Top Commercial Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                CONTRACT VALUE
              </span>
              <p className="text-lg font-bold font-mono text-[var(--bos-text-primary)]">
                ₹{commercial.commercial.currentContractValue.toLocaleString()}
              </p>
              <p className="text-[10px] text-[var(--bos-text-secondary)]">Approved client scope value</p>
            </div>

            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                CONFIRMED CASH
              </span>
              <p className="text-lg font-bold font-mono text-[var(--bos-success)]">
                ₹{commercial.commercial.confirmedPaymentsValue.toLocaleString()}
              </p>
              <p className="text-[10px] text-[var(--bos-text-secondary)]">Settled in bank account</p>
            </div>

            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                OUTSTANDING
              </span>
              <p className="text-lg font-bold font-mono text-[var(--bos-warning)]">
                ₹{commercial.commercial.outstandingValue.toLocaleString()}
              </p>
              <p className="text-[10px] text-[var(--bos-text-secondary)]">Invoiced awaiting payment</p>
            </div>

            <div className="p-3.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
                PROFITABILITY
              </span>
              <p className="text-xs font-mono font-medium text-[var(--bos-text-tertiary)] leading-tight">
                {commercial.commercial.profitabilityStatement}
              </p>
            </div>
          </div>

          {/* Cashflow Timeline */}
          <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
              REAL CASHFLOW TIMELINE · ACTUAL VS EXPECTED (RULE 37)
            </span>

            <div className="space-y-2">
              {commercial.cashflowTimeline.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.type === "ACTUAL_CONFIRMED"
                          ? "bg-[var(--bos-success)]"
                          : item.type === "OVERDUE"
                            ? "bg-[var(--bos-error)]"
                            : "bg-[var(--bos-warning)]"
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-[var(--bos-text-primary)]">
                        {item.clientName} ({item.reference})
                      </span>
                      <span className="text-[10px] text-[var(--bos-text-secondary)] block">
                        {item.type.replace(/_/g, " ")} · Status: {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        item.type === "ACTUAL_CONFIRMED"
                          ? "text-[var(--bos-success)]"
                          : "text-[var(--bos-text-primary)]"
                      }`}
                    >
                      ₹{item.amount.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--bos-text-tertiary)] block">
                      {new Date(item.dueDateOrConfirmedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 07. TAB: REPORTS & GOVERNANCE (Rules 40-46)                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "REPORTS" && (
        <div className="space-y-6">
          <div className="p-4 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-[0.16em] font-semibold text-[var(--bos-text-primary)]">
                  FROZEN REPORT SNAPSHOTS & AUDIT LOGS (RULES 44-46)
                </h3>
                <p className="text-xs text-[var(--bos-text-secondary)] mt-0.5">
                  Snapshots are immutable point-in-time freezes. Changing live DB records never mutates historical reports.
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[var(--bos-accent)] text-white text-xs font-medium hover:bg-[var(--bos-accent-hover)] transition-colors disabled:opacity-50"
              >
                {isGeneratingReport ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Generate Snapshot</span>
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--bos-accent)]" />
                      <span className="font-semibold text-[var(--bos-text-primary)]">
                        {rep.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--bos-line)] text-[9px] font-mono">
                        v{rep.version}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1 line-clamp-1">
                      {rep.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/api/analytics/reports/${rep.id}/download?format=pdf`}
                      target="_blank"
                      className="px-2.5 py-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-line)] text-[11px] font-medium text-[var(--bos-text-primary)] transition-colors"
                    >
                      PDF
                    </a>
                    <a
                      href={`/api/analytics/reports/${rep.id}/download?format=csv`}
                      download
                      className="px-2.5 py-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-line)] text-[11px] font-medium text-[var(--bos-text-primary)] transition-colors"
                    >
                      CSV
                    </a>
                    <a
                      href={`/api/analytics/reports/${rep.id}/download?format=json`}
                      download
                      className="px-2.5 py-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-line)] text-[11px] font-medium text-[var(--bos-text-primary)] transition-colors"
                    >
                      JSON
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 08. TAB: ASK BUSINESS OS (Rules 51-55)                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "ASK_AI" && (
        <div className="space-y-5 max-w-3xl mx-auto">
          <div className="text-center space-y-1.5 py-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-accent)] font-semibold">
              NATURAL LANGUAGE QUERY ENGINE
            </span>
            <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
              Ask Business OS
            </h2>
            <p className="text-xs text-[var(--bos-text-secondary)]">
              Direct factual answers grounded 100% in your database with zero hallucination.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface-panel)] shadow-xs">
            <Search className="w-4 h-4 text-[var(--bos-text-tertiary)] ml-2" />
            <input
              type="text"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="e.g. Which payments are waiting? Show me all blocked work..."
              className="w-full bg-transparent text-xs text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-hidden px-2"
            />
            <button
              onClick={() => handleAsk()}
              disabled={isAsking}
              className="px-3.5 py-1.5 rounded-sm bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
            >
              {isAsking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Query"}
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-[var(--bos-text-tertiary)]">
              SUGGESTIONS:
            </span>
            {[
              "Which payments are waiting?",
              "Show me all blocked work",
              "Which work was completed early?",
              "Show scope changes",
            ].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setAskQuestion(s);
                  handleAsk(s);
                }}
                className="px-2.5 py-1 rounded-[2px] border border-[var(--bos-line)] bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-sunken)] text-[11px] text-[var(--bos-text-secondary)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* AI Response Card (Rule 52: Strict Structure) */}
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-primary)]">
                    GROUNDED ANSWER · {aiResponse.confidence} CONFIDENCE
                  </span>
                </div>
              </div>

              {/* Answer */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-bold">
                  ANSWER
                </span>
                <p className="text-sm font-semibold text-[var(--bos-text-primary)] leading-relaxed">
                  {aiResponse.answer}
                </p>
              </div>

              {/* Why & Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-sunken)] text-xs">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block font-medium">
                    WHY (RATIONALE)
                  </span>
                  <p className="text-[var(--bos-text-primary)] mt-0.5">{aiResponse.why}</p>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block font-medium">
                    IMPACT
                  </span>
                  <p className="text-[var(--bos-text-secondary)] mt-0.5">{aiResponse.impact}</p>
                </div>
              </div>

              {/* Evidence */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block font-medium">
                  SUPPORTING EVIDENCE RECORDS
                </span>
                <ul className="mt-1 space-y-1">
                  {aiResponse.evidence.map((e: string, i: number) => (
                    <li key={i} className="text-xs text-[var(--bos-text-secondary)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--bos-line)]">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                    RECOMMENDED ACTION
                  </span>
                  <p className="text-xs font-semibold text-[var(--bos-text-primary)]">
                    {aiResponse.recommendedAction}
                  </p>
                </div>

                {aiResponse.actionPreview && (
                  <button
                    onClick={() => {
                      setActionPreview({
                        isOpen: true,
                        title: aiResponse.recommendedAction,
                        actionType: aiResponse.actionPayload?.actionType || "CONFIRM_ACTION",
                        entityTitle: aiResponse.sources[0]?.title || "Target Record",
                        currentValue: aiResponse.actionPreview.current,
                        newValue: aiResponse.actionPreview.new,
                        affectedEntities: [aiResponse.actionPreview.affected],
                        impactDescription: aiResponse.impact,
                        payload: aiResponse.actionPayload,
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-sm bg-[var(--bos-accent)] text-white text-xs font-medium hover:bg-[var(--bos-accent-hover)] transition-colors"
                  >
                    Preview & Execute
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* GLOBAL MODALS (Action Preview, Lineage, Root Cause, DrillDown)*/}
      {/* ──────────────────────────────────────────────────────────── */}
      {actionPreview && (
        <ActionPreviewModal
          isOpen={actionPreview.isOpen}
          onClose={() => setActionPreview(null)}
          onConfirm={async () => {
            await handleExecuteAction(actionPreview.actionType, actionPreview.payload);
          }}
          title={actionPreview.title}
          actionType={actionPreview.actionType}
          entityTitle={actionPreview.entityTitle}
          currentValue={actionPreview.currentValue}
          newValue={actionPreview.newValue}
          affectedEntities={actionPreview.affectedEntities}
          impactDescription={actionPreview.impactDescription}
        />
      )}

      {metricLineage && (
        <MetricLineageModal
          isOpen={metricLineage.isOpen}
          onClose={() => setMetricLineage(null)}
          metricName={metricLineage.metricName}
          definition={metricLineage.definition}
          currentValue={metricLineage.currentValue}
          formula={metricLineage.formula}
          lineageSteps={metricLineage.lineageSteps}
          sourceTables={metricLineage.sourceTables}
        />
      )}

      {rootCauseData && (
        <RootCauseModal
          isOpen={Boolean(rootCauseData)}
          onClose={() => setRootCauseData(null)}
          data={rootCauseData}
        />
      )}

      {drillDown && (
        <DrillDownModal
          isOpen={drillDown.isOpen}
          onClose={() => setDrillDown(null)}
          title={drillDown.title}
          categoryName={drillDown.categoryName}
          items={drillDown.items}
        />
      )}
    </div>
  );
}
