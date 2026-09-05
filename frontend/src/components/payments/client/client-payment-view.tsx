"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Building2,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Clock,
  AlertCircle,
  FolderKanban,
  ShieldCheck,
  ArrowRight,
  Send,
  ExternalLink,
  QrCode,
  CreditCard,
  Building,
  X,
} from "lucide-react";

interface ClientPaymentViewProps {
  token: string;
  initialData?: any;
}

export function ClientPaymentView({ token, initialData }: ClientPaymentViewProps) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [activeMethod, setActiveMethod] = useState<"upi" | "bank">("upi");

  // Submission State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number | string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/client/payments/${token}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        if (json.data?.amount) {
          setAmountPaid(json.data.amount);
        }
      } else {
        setError(json.message || "Failed to load payment");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchData();
    } else if (initialData.amount) {
      setAmountPaid(initialData.amount);
    }
  }, [token]);

  // Generate QR code whenever session or amount changes
  useEffect(() => {
    if (data?.session?.qrPayload) {
      QRCode.toDataURL(data.session.qrPayload, {
        width: 260,
        margin: 1.5,
        color: {
          dark: "#1a1714",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [data?.session?.qrPayload]);

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      setSubmitError("Please enter your transaction reference / UTR number.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/client/payments/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: Number(amountPaid),
          paymentDate,
          paymentMethod,
          transactionRef: transactionRef.trim(),
          note: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.message || "Submission failed");
      }
      setShowSubmitModal(false);
      fetchData();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const copyMobile = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMobile(true);
    setTimeout(() => setCopiedMobile(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-[var(--bos-text-tertiary)]">
          <div className="w-8 h-8 border-2 border-[var(--bos-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px]">Securing authoritative payment session...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-3 shadow-lg">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-[18px] font-serif font-bold text-[var(--bos-text-primary)]">
            Payment Request Unavailable
          </h2>
          <p className="text-[13px] text-[var(--bos-text-secondary)]">
            {error || "This payment link is invalid, expired, or has already been fulfilled."}
          </p>
        </div>
      </div>
    );
  }

  const isConfirmed = data.status === "CONFIRMED";
  const isAwaiting = data.status === "AWAITING_VERIFICATION";
  const upiId = data.session?.upiId || "businessos@hdfcbank";

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header & Trust Badge */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--bos-border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="font-serif font-bold text-[18px] tracking-tight text-[var(--bos-accent)]">
              BUSINESS OS
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
              Client Payment Portal
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>End-to-End Encrypted Session</span>
          </div>
        </div>

        {/* ── STATUS BANNER IF CONFIRMED OR AWAITING ──────────── */}
        {isConfirmed ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h2 className="text-[20px] font-serif font-bold text-emerald-950 dark:text-emerald-100">
                Payment Confirmed & Reconciled
              </h2>
              <p className="text-[13px] text-emerald-800 dark:text-emerald-300 mt-1">
                Your payment of <strong>₹{data.amount.toLocaleString("en-IN")}</strong> has been verified and officially recorded in the business ledger.
              </p>
            </div>
            {data.receipt && (
              <div className="pt-2">
                <a
                  href={`/api/client/payments/${token}/receipt`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--bos-accent)] text-white text-[13px] font-semibold shadow-sm hover:brightness-95 transition"
                >
                  <Download className="w-4 h-4" /> Download Official Receipt ({data.receipt.receiptNumber})
                </a>
              </div>
            )}
          </div>
        ) : isAwaiting ? (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2.5 shadow-xs">
            <Clock className="w-10 h-10 text-amber-600 mx-auto" />
            <h2 className="text-[18px] font-serif font-bold text-amber-950 dark:text-amber-100">
              Payment Under Verification
            </h2>
            <p className="text-[13px] text-amber-800 dark:text-amber-300 max-w-lg mx-auto">
              Your payment reference (<strong>{data.submission?.transactionRef}</strong>) was received on{" "}
              {new Date(data.submission?.submittedAt || Date.now()).toLocaleTimeString()}. An administrator is verifying the bank credit.
            </p>
          </div>
        ) : null}

        {/* ── SECTION 1: PAYMENT EXPLANATION (CLARITY) ───────── */}
        <div className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs space-y-5">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-mono text-[11px] font-bold text-[var(--bos-accent)] px-2.5 py-0.5 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                {data.reference}
              </span>
              {data.dueDate && (
                <span className="text-[11.5px] font-mono text-[var(--bos-text-tertiary)]">
                  Due by: {new Date(data.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <h1 className="text-[22px] sm:text-[24px] font-serif font-bold text-[var(--bos-text-primary)] mt-2">
              {data.title}
            </h1>
            <p className="text-[13.5px] text-[var(--bos-text-secondary)] mt-1">
              {data.reason}
            </p>
          </div>

          {/* 4-Item Financial Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px]">
            <div>
              <span className="text-[var(--bos-text-tertiary)] block">Project Total:</span>
              <span className="font-mono font-bold text-[14px] text-[var(--bos-text-primary)]">
                ₹{data.financials.agreedTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block">Paid So Far:</span>
              <span className="font-mono font-bold text-[14px] text-emerald-700 dark:text-emerald-300">
                ₹{data.financials.paidSoFar.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block">This Payment:</span>
              <span className="font-mono font-bold text-[14px] text-[var(--bos-accent)]">
                ₹{data.amount.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block">Remaining After:</span>
              <span className="font-mono font-bold text-[14px] text-[var(--bos-text-secondary)]">
                ₹{Math.max(0, data.financials.remainingBalance - data.amount).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {data.project && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
              <FolderKanban className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span>Project: <strong>{data.project.name}</strong> ({data.project.code})</span>
            </div>
          )}
        </div>

        {/* ── SECTION 2: PAYMENT EXPERIENCE (INSTRUMENTS) ─────── */}
        {!isConfirmed && (
          <div className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-4">
              <div>
                <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                  Payment Instruments
                </h3>
                <p className="text-[12px] text-[var(--bos-text-secondary)]">
                  Scan the verified UPI QR or transfer via bank NEFT/IMPS
                </p>
              </div>

              {/* Method Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setActiveMethod("upi")}
                  className={`px-3 py-1 rounded text-[12px] font-medium transition cursor-pointer ${
                    activeMethod === "upi"
                      ? "bg-[var(--bos-surface-panel)] text-[var(--bos-accent)] font-semibold shadow-xs"
                      : "text-[var(--bos-text-secondary)]"
                  }`}
                >
                  UPI QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMethod("bank")}
                  className={`px-3 py-1 rounded text-[12px] font-medium transition cursor-pointer ${
                    activeMethod === "bank"
                      ? "bg-[var(--bos-surface-panel)] text-[var(--bos-accent)] font-semibold shadow-xs"
                      : "text-[var(--bos-text-secondary)]"
                  }`}
                >
                  Bank Transfer
                </button>
              </div>
            </div>

            {activeMethod === "upi" ? (
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-2">
                {/* QR Code Presentation */}
                <div className="flex flex-col items-center p-5 rounded-2xl bg-white border border-[var(--bos-border-subtle)] shadow-md">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="UPI Payment QR Code"
                      className="w-56 h-56 rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
                      Generating QR...
                    </div>
                  )}
                  <span className="mt-2 text-[11px] font-mono text-neutral-600 font-medium">
                    Scan with any UPI App
                  </span>
                </div>

                {/* Details & Direct Action */}
                <div className="space-y-4 max-w-sm text-center md:text-left">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                      Authoritative Recipient VPA
                    </span>
                    <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                      <span className="font-mono font-bold text-[15px] text-[var(--bos-text-primary)]">
                        {upiId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(upiId)}
                        className="p-1.5 rounded bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] transition cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {data.session?.payeeMobile && (
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                        Pay via Mobile (GPay / PhonePe / Paytm)
                      </span>
                      <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                        <span className="font-mono font-bold text-[15px] text-[var(--bos-accent)]">
                          {data.session.payeeMobile}
                        </span>
                        <button
                          onClick={() => copyMobile(data.session.payeeMobile)}
                          className="p-1.5 rounded bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] transition cursor-pointer"
                          title="Copy Mobile Number"
                        >
                          {copiedMobile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                      Exact Amount
                    </span>
                    <p className="text-[26px] font-serif font-bold text-[var(--bos-accent)]">
                      ₹{data.amount.toLocaleString("en-IN")}
                    </p>
                  </div>

                  {data.session?.qrPayload && (
                    <a
                      href={data.session.qrPayload}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12.5px] font-semibold text-[var(--bos-text-primary)] transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                      Open UPI App Directly
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-3 text-[13px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)] block">Beneficiary Name:</span>
                    <strong className="text-[var(--bos-text-primary)]">Business OS Operating Account</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)] block">Bank:</span>
                    <strong className="text-[var(--bos-text-primary)]">HDFC Bank Ltd</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)] block">Account Number:</span>
                    <strong className="font-mono text-[var(--bos-text-primary)]">50200088921471</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)] block">IFSC Code:</span>
                    <strong className="font-mono text-[var(--bos-text-primary)]">HDFC0001234</strong>
                  </div>
                </div>
                <div className="pt-2 text-[12px] text-[var(--bos-text-secondary)] border-t border-[var(--bos-border-subtle)]">
                  Include reference <strong>{data.reference}</strong> in the transfer remarks for instant reconciliation.
                </div>
              </div>
            )}

            {/* "I Have Paid" Action Button */}
            <div className="pt-4 border-t border-[var(--bos-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[12px] text-[var(--bos-text-secondary)]">
                Already transferred? Submit your UTR / Bank Reference for instant verification.
              </span>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-[var(--bos-accent)] hover:brightness-95 text-white text-[13px] font-semibold shadow-md transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Have Paid — Submit Reference</span>
              </button>
            </div>
          </div>
        )}

        {/* ── SUBMISSION MODAL DIALOG ──────────────────────────── */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-3">
                <h3 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                  Submit Payment Reference
                </h3>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[12px]">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmitProof} className="space-y-3.5 text-[12.5px]">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] font-mono font-bold text-[13.5px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                    Transaction Reference Number / UTR
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. 423985123984 or UPI Reference"
                    required
                    className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] font-mono text-[13px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                      Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[12px]"
                    >
                      <option value="UPI">UPI</option>
                      <option value="IMPS">IMPS</option>
                      <option value="NEFT">NEFT / RTGS</option>
                      <option value="CREDIT_CARD">Card / NetBanking</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                    Optional Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Sent via Google Pay"
                    className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-3.5 py-2 rounded text-[12px] text-[var(--bos-text-secondary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded bg-[var(--bos-accent)] text-white font-medium text-[12.5px] shadow-sm disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Proof"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
