"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileCheck2,
  Building2,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { PaymentStory } from "@/lib/payments/payment-types";

interface PaymentStoryDrawerProps {
  requestId: string | null;
  onClose: () => void;
  onPaymentConfirmed: () => void;
}

export function PaymentStoryDrawer({
  requestId,
  onClose,
  onPaymentConfirmed,
}: PaymentStoryDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<PaymentStory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [promptText, setPromptText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/payments/${requestId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setStory(json.data);
        } else {
          setError(json.message || "Failed to load payment story");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (!requestId) return null;

  const handleConfirm = async () => {
    if (!confirm("Are you sure you want to confirm this payment? This will create a permanent financial transaction, generate an official receipt, register it in Document Center, and notify the client.")) {
      return;
    }
    setConfirming(true);
    try {
      const res = await fetch(`/api/payments/${requestId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: story?.submission?.id,
          note: "Admin verified and confirmed payment receipt",
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      onPaymentConfirmed();
      onClose();
    } catch (err: any) {
      alert(`Confirmation error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleClarify = async () => {
    if (!promptText.trim()) return;
    try {
      const res = await fetch(`/api/payments/${requestId}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText.trim(),
          submissionId: story?.submission?.id,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setClarifying(false);
      onPaymentConfirmed();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReject = async () => {
    if (!promptText.trim()) return;
    try {
      const res = await fetch(`/api/payments/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: promptText.trim(),
          submissionId: story?.submission?.id,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setRejecting(false);
      onPaymentConfirmed();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const copyPayLink = () => {
    if (!story) return;
    const fullUrl = `${window.location.origin}${story.request.tokenUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--bos-surface-panel)] border-l border-[var(--bos-border-subtle)] h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bos-accent)] text-white">
              Payment Story
            </span>
            <span className="text-[13px] font-mono font-bold text-[var(--bos-text-primary)]">
              {story?.request.reference || "Loading..."}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--bos-text-tertiary)]">
              <div className="w-6 h-6 border-2 border-[var(--bos-accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading complete payment story...</span>
            </div>
          ) : error || !story ? (
            <div className="p-4 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
              {error || "Failed to load payment story"}
            </div>
          ) : (
            <>
              {/* Payment Flow Visual Pipeline */}
              <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-3">
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">
                  Payment Verification Timeline
                </h3>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex flex-col items-center gap-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    <span className="text-[var(--bos-text-secondary)]">Requested</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-[var(--bos-border-subtle)] mx-1" />
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      story.request.status !== "READY" && story.request.status !== "SENT"
                        ? "bg-emerald-500 text-white"
                        : "bg-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)]"
                    }`}>
                      {story.request.status !== "READY" && story.request.status !== "SENT" ? "✓" : "2"}
                    </span>
                    <span className="text-[var(--bos-text-secondary)]">Viewed</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-[var(--bos-border-subtle)] mx-1" />
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      story.submission
                        ? "bg-emerald-500 text-white"
                        : "bg-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)]"
                    }`}>
                      {story.submission ? "✓" : "3"}
                    </span>
                    <span className="text-[var(--bos-text-secondary)]">Submitted</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-[var(--bos-border-subtle)] mx-1" />
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      story.transaction
                        ? "bg-emerald-500 text-white"
                        : "bg-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)]"
                    }`}>
                      {story.transaction ? "✓" : "4"}
                    </span>
                    <span className="text-[var(--bos-text-secondary)]">Confirmed</span>
                  </div>
                </div>
              </div>

              {/* Story Step 1: Why & Commercial Condition */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">
                  1. Commercial Reason & Prerequisite
                </span>
                <div className="p-4 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-1.5 text-[12.5px]">
                  <p className="font-semibold text-[var(--bos-text-primary)]">{story.why.title}</p>
                  <p className="text-[var(--bos-text-secondary)]">{story.why.reason}</p>
                  {story.why.milestoneName && (
                    <div className="pt-2 flex items-center gap-2 font-mono text-[11px] text-[var(--bos-accent)]">
                      <span>Milestone:</span>
                      <strong>{story.why.milestoneName}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Story Step 2: Payment Request Details */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">
                  2. Payment Request Issued
                </span>
                <div className="p-4 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2 text-[12.5px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--bos-text-secondary)]">Amount:</span>
                    <span className="font-mono font-bold text-[15px] text-[var(--bos-accent)]">
                      ₹{story.request.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--bos-text-secondary)]">Current Status:</span>
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      {story.request.status}
                    </span>
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-[var(--bos-border-subtle)]">
                    <span className="text-[11px] text-[var(--bos-text-tertiary)]">Secure Link:</span>
                    <button
                      onClick={copyPayLink}
                      className="inline-flex items-center gap-1 text-[11.5px] text-[var(--bos-accent)] font-medium hover:underline cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied Link!" : "Copy Pay Link"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Story Step 3: Client Submission & Proof */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">
                  3. Client Payment Submission
                </span>
                {story.submission ? (
                  <div className="p-4 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2.5 text-[12.5px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Submitted Amount:</span>
                      <strong className="text-[var(--bos-text-primary)]">
                        ₹{story.submission.amountPaid.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Transaction Reference / UTR:</span>
                      <strong className="font-mono text-[var(--bos-text-primary)]">
                        {story.submission.transactionRef}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Payment Method:</span>
                      <span className="text-[var(--bos-text-primary)]">{story.submission.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Submitted Date:</span>
                      <span className="text-[var(--bos-text-tertiary)] font-mono text-[11.5px]">
                        {new Date(story.submission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    {story.submission.note && (
                      <div className="pt-2 border-t border-[var(--bos-border-subtle)] text-[12px] text-[var(--bos-text-secondary)]">
                        Note: {story.submission.note}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-[var(--bos-border-subtle)] text-center text-[12px] text-[var(--bos-text-tertiary)]">
                    No client submission received yet. Waiting for client payment action.
                  </div>
                )}
              </div>

              {/* Story Step 4: Transaction & Official Receipt */}
              {story.transaction && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">
                    4. Confirmed Financial Ledger Transaction
                  </span>
                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-[12.5px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Transaction Number:</span>
                      <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                        {story.transaction.transactionNumber}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--bos-text-secondary)]">Confirmed By:</span>
                      <span className="text-[var(--bos-text-primary)]">
                        {story.transaction.confirmedByName} on {new Date(story.transaction.confirmedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {story.receipt && (
                      <div className="pt-2.5 border-t border-emerald-500/20 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-[var(--bos-text-tertiary)] font-mono">Official Receipt:</span>
                          <p className="font-mono font-bold text-[13px] text-[var(--bos-text-primary)]">
                            {story.receipt.receiptNumber}
                          </p>
                        </div>
                        <a
                          href={`/api/client/payments/${story.request.id}/receipt`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bos-accent)] text-white text-[11.5px] font-medium transition hover:brightness-95"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Receipt
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clarification / Rejection Prompt Box */}
              {(clarifying || rejecting) && (
                <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2">
                  <label className="block text-[12px] font-semibold text-[var(--bos-text-primary)]">
                    {clarifying ? "Reason for requesting clarification:" : "Reason for payment rejection:"}
                  </label>
                  <textarea
                    rows={3}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={
                      clarifying
                        ? "e.g. Transaction reference is missing the bank UTR confirmation..."
                        : "e.g. Unmatched payment amount or invalid reference..."
                    }
                    className="w-full p-2.5 rounded-md bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12.5px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setClarifying(false);
                        setRejecting(false);
                      }}
                      className="px-3 py-1.5 rounded text-[12px] text-[var(--bos-text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={clarifying ? handleClarify : handleReject}
                      className="px-3 py-1.5 rounded bg-[var(--bos-accent)] text-white text-[12px] font-medium"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {story && story.request.status !== "CONFIRMED" && (
          <div className="px-6 py-4 border-t border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setClarifying(true);
                  setRejecting(false);
                }}
                className="px-3 py-1.5 rounded border border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[12px] font-medium text-[var(--bos-text-secondary)] cursor-pointer"
              >
                Clarify
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejecting(true);
                  setClarifying(false);
                }}
                className="px-3 py-1.5 rounded border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-[12px] font-medium text-rose-700 dark:text-rose-300 cursor-pointer"
              >
                Reject
              </button>
            </div>

            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold shadow-sm transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirming ? "Confirming & Issuing Receipt..." : "Confirm Payment Received"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
