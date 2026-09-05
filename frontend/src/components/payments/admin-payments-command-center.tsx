"use client";

import React, { useState, useEffect } from "react";
import {
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Download,
  Building2,
  FolderKanban,
  FileText,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  Send,
  HelpCircle,
} from "lucide-react";
import { GuidedRequestModal } from "./guided-request-modal";
import { PaymentStoryDrawer } from "./payment-story-drawer";

interface AdminPaymentsCommandCenterProps {
  initialData?: any;
}

export function AdminPaymentsCommandCenter({ initialData }: AdminPaymentsCommandCenterProps) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "verification" | "requests" | "ledger" | "receipts">("overview");
  const [search, setSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/payments");
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showSpinner) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchDashboardData();
    }
  }, []);

  const metrics = data?.metrics || {
    totalAgreedValue: 0,
    totalConfirmed: 0,
    outstandingBalance: 0,
    awaitingCount: 0,
    awaitingAmount: 0,
    overdueCount: 0,
    currency: "INR",
  };

  const moneyInMotion = data?.moneyInMotion || {
    requested: 0,
    viewed: 0,
    started: 0,
    awaitingVerification: 0,
    confirmed: 0,
    receiptIssued: 0,
  };

  const awaitingList = data?.awaitingVerification || [];
  const requestsList = data?.requests || [];
  const transactionsList = data?.recentTransactions || [];
  const receiptsList = data?.receipts || [];

  const filteredRequests = search.trim()
    ? requestsList.filter((r: any) =>
        r.reference.toLowerCase().includes(search.toLowerCase()) ||
        r.clientName.toLowerCase().includes(search.toLowerCase()) ||
        (r.projectName && r.projectName.toLowerCase().includes(search.toLowerCase())) ||
        r.reason.toLowerCase().includes(search.toLowerCase())
      )
    : requestsList;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[var(--bos-border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold uppercase bg-[var(--bos-accent)] text-white">
              <IndianRupee className="w-3 h-3" /> Payments OS
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
              Authoritative Financial Operating Layer
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[26px] font-serif font-bold text-[var(--bos-text-primary)]">
            Financial Operating System
          </h1>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1 max-w-3xl">
            Real commercial workflow connecting clients, proposals, billing conditions, verified payments, and authoritative receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)] text-[12.5px] font-medium transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[var(--bos-accent)]" : "text-[var(--bos-text-secondary)]"}`} />
            <span>Sync Ledger</span>
          </button>
          <button
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[var(--bos-accent)] hover:brightness-95 text-white text-[12.5px] font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Request Payment</span>
          </button>
        </div>
      </div>

      {/* ── TOP ACTION CENTER & METRICS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Needs Verification (Highlighted Action) */}
        <div
          onClick={() => setActiveTab("verification")}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            metrics.awaitingCount > 0
              ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500"
              : "bg-[var(--bos-surface-panel)] border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold">
              Awaiting Verification
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-serif font-bold text-[var(--bos-text-primary)]">
              {metrics.awaitingCount}
            </span>
            <span className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
              (₹{metrics.awaitingAmount.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-[11.5px] text-[var(--bos-text-tertiary)] mt-1 flex items-center gap-1">
            <span>Requires Admin confirmation</span>
            <ArrowRight className="w-3 h-3 text-[var(--bos-accent)]" />
          </p>
        </div>

        {/* Card 2: Confirmed Revenue */}
        <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold">
              Confirmed Collected
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-[26px] font-serif font-bold text-[var(--bos-text-primary)]">
              ₹{metrics.totalConfirmed.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11.5px] text-[var(--bos-text-tertiary)] mt-1 font-mono">
            {transactionsList.length} verified transactions in ledger
          </p>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold">
              Outstanding Balance
            </span>
            <Clock className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
          </div>
          <div className="mt-2">
            <span className="text-[26px] font-serif font-bold text-[var(--bos-text-primary)]">
              ₹{metrics.outstandingBalance.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11.5px] text-[var(--bos-text-tertiary)] mt-1 font-mono">
            Total Agreed: ₹{metrics.totalAgreedValue.toLocaleString("en-IN")}
          </p>
        </div>

        {/* Card 4: Overdue Attention */}
        <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-secondary)] font-semibold">
              Overdue Attention
            </span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-[26px] font-serif font-bold text-[var(--bos-text-primary)]">
              {metrics.overdueCount}
            </span>
          </div>
          <p className="text-[11.5px] text-[var(--bos-text-tertiary)] mt-1">
            {metrics.overdueCount === 0 ? "All requests are on schedule" : "Requests requiring follow up"}
          </p>
        </div>
      </div>

      {/* ── MONEY IN MOTION OPERATIONAL PIPELINE ────────────── */}
      <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11.5px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">
            Money in Motion — Operational Pipeline
          </span>
          <span className="text-[11px] font-mono text-[var(--bos-accent)]">
            Total Pipeline: {requestsList.length} Requests
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-[12px]">
          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[11px] text-[var(--bos-text-secondary)]">Requested</span>
            <p className="font-serif font-bold text-[16px] text-[var(--bos-text-primary)] mt-0.5">
              {moneyInMotion.requested}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[11px] text-[var(--bos-text-secondary)]">Client Viewed</span>
            <p className="font-serif font-bold text-[16px] text-[var(--bos-text-primary)] mt-0.5">
              {moneyInMotion.viewed}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[11px] text-[var(--bos-text-secondary)]">Started</span>
            <p className="font-serif font-bold text-[16px] text-[var(--bos-text-primary)] mt-0.5">
              {moneyInMotion.started}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">Verification</span>
            <p className="font-serif font-bold text-[16px] text-amber-900 dark:text-amber-200 mt-0.5">
              {moneyInMotion.awaitingVerification}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">Confirmed</span>
            <p className="font-serif font-bold text-[16px] text-emerald-900 dark:text-emerald-200 mt-0.5">
              {moneyInMotion.confirmed}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[11px] text-[var(--bos-text-secondary)]">Receipt Issued</span>
            <p className="font-serif font-bold text-[16px] text-[var(--bos-text-primary)] mt-0.5">
              {moneyInMotion.receiptIssued}
            </p>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS & SEARCH ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: "overview", label: "Overview" },
            { key: "verification", label: "Awaiting Verification", count: awaitingList.length },
            { key: "requests", label: "Payment Requests", count: requestsList.length },
            { key: "ledger", label: "Confirmed Ledger", count: transactionsList.length },
            { key: "receipts", label: "Receipt Vault", count: receiptsList.length },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[12.5px] font-medium transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--bos-surface-panel)] text-[var(--bos-accent)] border border-[var(--bos-accent)] shadow-xs font-semibold"
                    : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] border border-[var(--bos-border-subtle)] hover:bg-[var(--bos-surface-panel)]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-bold ${
                      isActive
                        ? "bg-[var(--bos-accent)] text-white"
                        : "bg-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--bos-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, client, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12.5px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
          />
        </div>
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────── */}
      {activeTab === "verification" ? (
        /* ================= AWAITING VERIFICATION INBOX ================= */
        <div className="space-y-4">
          {awaitingList.length === 0 ? (
            <div className="p-12 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[var(--bos-text-primary)]">
                All payments verified & reconciled
              </h3>
              <p className="text-xs text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                No client payment submissions are currently awaiting administrative review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {awaitingList.map((item: any) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-[var(--bos-surface-panel)] border border-amber-500/30 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-[var(--bos-accent)] px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                        {item.reference}
                      </span>
                      <h3 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)] mt-1.5">
                        {item.title}
                      </h3>
                      <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                        Client: <strong className="text-[var(--bos-text-primary)]">{item.clientName}</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      NEEDS VERIFICATION
                    </span>
                  </div>

                  {item.submission && (
                    <div className="p-3.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-1.5 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-[var(--bos-text-secondary)]">Amount Submitted:</span>
                        <strong className="font-mono text-[13px] text-[var(--bos-accent)]">
                          ₹{item.submission.amountPaid.toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--bos-text-secondary)]">Transaction Reference / UTR:</span>
                        <strong className="font-mono text-[var(--bos-text-primary)]">
                          {item.submission.transactionRef}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--bos-text-secondary)]">Method:</span>
                        <span className="text-[var(--bos-text-primary)]">{item.submission.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[var(--bos-text-tertiary)] pt-1 border-t border-[var(--bos-border-subtle)]">
                        <span>Submitted:</span>
                        <span className="font-mono">{new Date(item.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      Project: {item.projectName || "General Scope"}
                    </span>
                    <button
                      onClick={() => setSelectedRequestId(item.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[var(--bos-accent)] hover:brightness-95 text-white text-[12px] font-medium shadow-xs cursor-pointer transition"
                    >
                      <span>Review & Confirm</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "requests" ? (
        /* ================= ALL PAYMENT REQUESTS TABLE ================= */
        <div className="rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-[var(--bos-surface-sunken)] border-b border-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)] font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Client & Project</th>
                  <th className="px-5 py-3.5">Reason / Milestone</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bos-border-subtle)]">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[var(--bos-text-tertiary)]">
                      No matching payment requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r: any) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRequestId(r.id)}
                      className="hover:bg-[var(--bos-surface-sunken)] transition cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-[var(--bos-accent)]">
                        {r.reference}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[var(--bos-text-primary)]">{r.clientName}</p>
                        <p className="text-[11.5px] text-[var(--bos-text-secondary)]">{r.projectName || "General"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--bos-text-secondary)]">
                        {r.reason}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[var(--bos-text-primary)]">
                        ₹{r.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold border ${
                          r.status === "CONFIRMED"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : r.status === "AWAITING_VERIFICATION"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border-[var(--bos-border-subtle)]"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--bos-text-tertiary)] font-mono text-[11.5px]">
                        {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequestId(r.id);
                          }}
                          className="px-3 py-1.5 rounded border border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)] text-[11.5px] font-medium transition cursor-pointer"
                        >
                          View Story
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "ledger" ? (
        /* ================= CONFIRMED TRANSACTIONS LEDGER ================= */
        <div className="rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase font-bold text-[var(--bos-text-tertiary)] tracking-wider">
              Immutable Financial Ledger Entries
            </span>
            <span className="font-mono text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
              Total Confirmed: ₹{metrics.totalConfirmed.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-[var(--bos-surface-sunken)] border-b border-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)] font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Transaction ID</th>
                  <th className="px-5 py-3.5">Client & Project</th>
                  <th className="px-5 py-3.5">Method & Reference</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Confirmed By</th>
                  <th className="px-5 py-3.5">Confirmed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bos-border-subtle)]">
                {transactionsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[var(--bos-text-tertiary)]">
                      No confirmed transactions in ledger yet.
                    </td>
                  </tr>
                ) : (
                  transactionsList.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[var(--bos-surface-sunken)] transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {t.transactionNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[var(--bos-text-primary)]">{t.clientName}</p>
                        <p className="text-[11.5px] text-[var(--bos-text-secondary)]">{t.projectName || "General"}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--bos-text-secondary)]">
                        {t.paymentMethod} — {t.reference}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[var(--bos-text-primary)]">
                        ₹{t.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--bos-text-secondary)]">
                        {t.confirmedByName}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11.5px] text-[var(--bos-text-tertiary)]">
                        {new Date(t.confirmedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "receipts" ? (
        /* ================= RECEIPT VAULT ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {receiptsList.length === 0 ? (
            <div className="col-span-2 p-12 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
              <FileCheck2 className="w-10 h-10 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[var(--bos-text-primary)]">No receipts issued yet</h3>
              <p className="text-xs text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                Official PDF receipts are automatically generated and registered upon payment confirmation.
              </p>
            </div>
          ) : (
            receiptsList.map((rec: any) => (
              <div
                key={rec.id}
                className="p-5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)]/50 transition-all shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] text-[var(--bos-accent)] border border-[var(--bos-border-subtle)]">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-mono font-bold text-[14px] text-[var(--bos-text-primary)]">
                          {rec.receiptNumber}
                        </h4>
                        <p className="text-[12px] text-[var(--bos-text-secondary)]">
                          Client: {rec.clientName}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      OFFICIAL RECEIPT
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[12px] text-[var(--bos-text-secondary)]">Total Confirmed:</span>
                    <span className="font-mono font-bold text-[15px] text-[var(--bos-accent)]">
                      ₹{rec.amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[var(--bos-text-tertiary)] font-mono">
                    <span>Date: {new Date(rec.paymentDate).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Ref: {rec.reference}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--bos-border-subtle)]">
                  <span className="text-[11px] text-[var(--bos-text-tertiary)] font-mono">
                    Confirmed by {rec.confirmedByName}
                  </span>
                  <a
                    href={`/api/documents/${rec.id}/file`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bos-accent)] text-white text-[12px] font-medium transition hover:brightness-95"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ================= OVERVIEW TAB ================= */
        <div className="space-y-6">
          {/* Section: Needs Immediate Action */}
          {awaitingList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-primary)] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Action Required — Payment Submissions Needing Confirmation ({awaitingList.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {awaitingList.slice(0, 2).map((item: any) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-xl bg-[var(--bos-surface-panel)] border border-amber-500/30 shadow-xs flex justify-between items-center gap-4"
                  >
                    <div>
                      <span className="font-mono text-[10.5px] font-bold text-[var(--bos-accent)]">
                        {item.reference}
                      </span>
                      <h4 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                        {item.title}
                      </h4>
                      <p className="text-[12px] text-[var(--bos-text-secondary)]">
                        {item.clientName} • UTR: {item.submission?.transactionRef}
                      </p>
                      <p className="font-mono font-bold text-[14px] text-[var(--bos-accent)] mt-1">
                        ₹{item.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedRequestId(item.id)}
                      className="px-3.5 py-2 rounded bg-[var(--bos-accent)] text-white text-[12px] font-medium shadow-xs hover:brightness-95 transition cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Recent Payment Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                Recent Payment Requests ({requestsList.length})
              </h3>
              <button
                onClick={() => setActiveTab("requests")}
                className="text-[12px] text-[var(--bos-accent)] font-medium hover:underline cursor-pointer"
              >
                View all requests →
              </button>
            </div>

            <div className="rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-[var(--bos-surface-sunken)] border-b border-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)] font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Reference</th>
                      <th className="px-5 py-3.5">Client</th>
                      <th className="px-5 py-3.5">Reason</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Story</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bos-border-subtle)]">
                    {requestsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-[var(--bos-text-tertiary)]">
                          No payment requests created yet. Click &quot;+ Request Payment&quot; above.
                        </td>
                      </tr>
                    ) : (
                      requestsList.slice(0, 5).map((r: any) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRequestId(r.id)}
                          className="hover:bg-[var(--bos-surface-sunken)] transition cursor-pointer"
                        >
                          <td className="px-5 py-3.5 font-mono font-bold text-[var(--bos-accent)]">
                            {r.reference}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-[var(--bos-text-primary)]">
                            {r.clientName}
                          </td>
                          <td className="px-5 py-3.5 text-[var(--bos-text-secondary)]">
                            {r.reason}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-[var(--bos-text-primary)]">
                            ₹{r.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold border ${
                              r.status === "CONFIRMED"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : r.status === "AWAITING_VERIFICATION"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border-[var(--bos-border-subtle)]"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequestId(r.id);
                              }}
                              className="px-2.5 py-1 text-[11.5px] font-medium text-[var(--bos-accent)] hover:underline cursor-pointer"
                            >
                              Story
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guided "+ Request Payment" Modal */}
      <GuidedRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={() => fetchDashboardData(true)}
      />

      {/* Payment Story & Verification Side Drawer */}
      <PaymentStoryDrawer
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onPaymentConfirmed={() => fetchDashboardData(true)}
      />
    </div>
  );
}
