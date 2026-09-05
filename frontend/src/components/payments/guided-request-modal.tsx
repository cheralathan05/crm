"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  FolderKanban,
  FileCheck2,
  Calendar,
  IndianRupee,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface GuidedRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GuidedRequestModal({ isOpen, onClose, onSuccess }: GuidedRequestModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [milestones, setMilestones] = useState<any[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [isStandalone, setIsStandalone] = useState(false);

  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [currency, setCurrency] = useState("INR");
  const [dueDate, setDueDate] = useState("");
  const [paymentRule, setPaymentRule] = useState<"FIXED" | "PARTIAL_ALLOWED">("FIXED");
  const [payeeMobile, setPayeeMobile] = useState("+91 98765 43210");
  const [payeeUpi, setPayeeUpi] = useState("businessos@hdfcbank");

  // Load clients & their projects from /api/payments/options
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setError(null);
      return;
    }

    setDataLoading(true);
    fetch("/api/payments/options")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && Array.isArray(json.clients) && json.clients.length > 0) {
          setClients(json.clients);
          if (json.clients.length === 1) {
            setSelectedClientId(json.clients[0].id);
            setProjects(json.clients[0].projects || []);
            if (json.clients[0].projects?.length === 1) {
              setSelectedProjectId(json.clients[0].projects[0].id);
              setMilestones(json.clients[0].projects[0].milestones || []);
            }
          }
        } else {
          // Fallback to /api/clients
          fetch("/api/clients")
            .then((r) => r.json())
            .then((cj) => {
              const list = Array.isArray(cj.clients)
                ? cj.clients
                : Array.isArray(cj.rows)
                ? cj.rows.map((r: any) => r.client || r)
                : [];
              setClients(list);
              if (list.length === 1) {
                setSelectedClientId(list[0].id);
              }
            })
            .catch(() => {});
        }
      })
      .catch((e) => {
        console.error(e);
        fetch("/api/clients")
          .then((r) => r.json())
          .then((cj) => {
            const list = Array.isArray(cj.clients)
              ? cj.clients
              : Array.isArray(cj.rows)
              ? cj.rows.map((r: any) => r.client || r)
              : [];
            setClients(list);
            if (list.length === 1) {
              setSelectedClientId(list[0].id);
            }
          })
          .catch(() => {});
      })
      .finally(() => setDataLoading(false));
  }, [isOpen]);

  // When client changes, update projects list
  useEffect(() => {
    if (!selectedClientId) {
      setProjects([]);
      setSelectedProjectId("");
      setMilestones([]);
      setSelectedMilestoneId("");
      return;
    }

    const foundClient = clients.find((c) => c.id === selectedClientId);
    if (foundClient?.projects && foundClient.projects.length > 0) {
      setProjects(foundClient.projects);
      if (foundClient.projects.length === 1) {
        setSelectedProjectId(foundClient.projects[0].id);
        setMilestones(foundClient.projects[0].milestones || []);
      }
    } else {
      fetch(`/api/projects?clientId=${selectedClientId}`)
        .then((res) => res.json())
        .then((json) => {
          const projs = json.projects || json.data || [];
          setProjects(projs);
          if (projs.length === 1) {
            setSelectedProjectId(projs[0].id);
            setMilestones(projs[0].milestones || []);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [selectedClientId, clients]);

  // When project changes, fetch or resolve project milestones
  useEffect(() => {
    if (!selectedProjectId) {
      setMilestones([]);
      setSelectedMilestoneId("");
      return;
    }
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (proj?.milestones && Array.isArray(proj.milestones) && proj.milestones.length > 0) {
      setMilestones(proj.milestones);
    } else {
      fetch(`/api/projects/${selectedProjectId}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.project?.milestones) {
            setMilestones(j.project.milestones);
          }
        })
        .catch(() => {});
    }
  }, [selectedProjectId, projects]);

  // When milestone selected, auto-fill amount & reason
  const handleMilestoneSelect = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setIsStandalone(false);
    const m = milestones.find((x) => x.id === milestoneId);
    if (m) {
      setTitle(`Payment for ${m.title}`);
      setReason(`${m.phase || "Milestone"}: ${m.title}`);
      if (m.paymentAmount) {
        setAmount(m.paymentAmount);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          projectId: selectedProjectId || null,
          milestoneId: isStandalone ? null : selectedMilestoneId || null,
          title: title || `Payment Request - ${reason}`,
          reason: reason || "Commercial services delivery",
          amount: Number(amount),
          currency,
          dueDate: dueDate || null,
          paymentRule,
          payeeMobile: payeeMobile.trim(),
          payeeUpi: payeeUpi.trim(),
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.message || "Failed to create payment request");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedMilestone = milestones.find((m) => m.id === selectedMilestoneId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--bos-accent)] text-white">
                Step {step} of 4
              </span>
              <h2 className="text-[16px] font-serif font-bold text-[var(--bos-text-primary)]">
                Request Payment
              </h2>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
              Connect a real client, project, and commercial milestone
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-panel)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[12.5px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[12.5px] font-medium text-[var(--bos-text-secondary)]">
                  Step 1: Select Client Organization
                </label>
                {clients.length > 0 && (
                  <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                    {clients.length} client{clients.length === 1 ? "" : "s"} available
                  </span>
                )}
              </div>

              {dataLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)] mx-auto" />
                  <p className="text-[12px] text-[var(--bos-text-tertiary)]">
                    Loading verified client records...
                  </p>
                </div>
              ) : clients.length === 0 ? (
                <div className="p-8 rounded-lg border border-dashed border-[var(--bos-border-subtle)] text-center space-y-2">
                  <Building2 className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
                  <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                    No Clients Found
                  </h4>
                  <p className="text-[12px] text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                    There are no client accounts in your workspace. Please create or import a client first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClientId(c.id)}
                      className={`w-full p-3.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                        selectedClientId === c.id
                          ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/5 shadow-xs"
                          : "border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-[var(--bos-surface-panel)] text-[var(--bos-accent)] border border-[var(--bos-border-subtle)]">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[13.5px] font-semibold text-[var(--bos-text-primary)]">
                            {c.companyName}
                          </h4>
                          <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                            {c.industry || "Authorized Client Account"}
                            {c.projects?.length ? ` • ${c.projects.length} Project${c.projects.length === 1 ? "" : "s"}` : ""}
                          </p>
                        </div>
                      </div>
                      {selectedClientId === c.id && (
                        <CheckCircle2 className="w-5 h-5 text-[var(--bos-accent)]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12.5px] font-medium text-[var(--bos-text-secondary)]">
                    Select Project for {selectedClient?.companyName}
                  </label>
                  {projects.length > 0 && (
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      {projects.length} project{projects.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {projects.length === 0 ? (
                  <div className="p-5 rounded-lg border border-dashed border-[var(--bos-border-subtle)] text-center space-y-2">
                    <FolderKanban className="w-6 h-6 text-[var(--bos-text-tertiary)] mx-auto" />
                    <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
                      No projects found for {selectedClient?.companyName}.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStandalone(true);
                        setSelectedProjectId("");
                        setSelectedMilestoneId("");
                        setStep(3);
                      }}
                      className="px-3 py-1.5 rounded text-[12px] bg-[var(--bos-accent)] text-white font-medium shadow-xs cursor-pointer"
                    >
                      Proceed with Standalone Payment Request
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setIsStandalone(false);
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                          selectedProjectId === p.id && !isStandalone
                            ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/5"
                            : "border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderKanban className="w-4 h-4 text-[var(--bos-accent)]" />
                          <div>
                            <span className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                              {p.name}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] ml-2">
                              ({p.code})
                            </span>
                          </div>
                        </div>
                        {selectedProjectId === p.id && !isStandalone && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--bos-accent)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProjectId && (
                <div className="pt-3 border-t border-[var(--bos-border-subtle)] space-y-2">
                  <label className="block text-[12.5px] font-medium text-[var(--bos-text-secondary)]">
                    Select Commercial Milestone (Billing Condition)
                  </label>
                  {milestones.length > 0 ? (
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {milestones.map((m) => {
                        const isPaid = m.invoiceStatus === "PAID";
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleMilestoneSelect(m.id)}
                            className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                              selectedMilestoneId === m.id && !isStandalone
                                ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/5"
                                : "border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)]"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10.5px] font-bold text-[var(--bos-accent)]">
                                  {m.phase}
                                </span>
                                <span className="text-[13px] font-medium text-[var(--bos-text-primary)]">
                                  {m.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                    isPaid
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                      : "bg-[var(--bos-surface-panel)] text-[var(--bos-text-tertiary)]"
                                  }`}
                                >
                                  {isPaid ? "ALREADY PAID" : m.invoiceStatus || "UNINVOICED"}
                                </span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-[13px] text-[var(--bos-text-primary)]">
                              ₹{Number(m.paymentAmount || 0).toLocaleString("en-IN")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[var(--bos-text-tertiary)] italic">
                      No milestones configured for this project.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsStandalone(true);
                      setSelectedMilestoneId("");
                      setReason("");
                      setAmount("");
                    }}
                    className={`w-full p-2.5 rounded-lg border text-center text-[12px] font-medium transition cursor-pointer ${
                      isStandalone
                        ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/5 text-[var(--bos-accent)] font-semibold"
                        : "border-dashed border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-surface-sunken)]"
                    }`}
                  >
                    + Standalone Custom Commercial Billing Reason
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                  Payment Reason / Description
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Phase 1 Architecture & Core Foundation"
                  className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[13px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                    Amount Due
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--bos-text-tertiary)] font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="15000"
                      className="w-full pl-8 pr-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[13.5px] font-mono font-bold text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[13px] text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--bos-text-secondary)] mb-1.5">
                  Payment Rule
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentRule("FIXED")}
                    className={`p-2.5 rounded-lg border text-center text-[12px] font-medium transition cursor-pointer ${
                      paymentRule === "FIXED"
                        ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/5 text-[var(--bos-accent)] font-semibold"
                        : "border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] bg-[var(--bos-surface-sunken)]"
                    }`}
                  >
                    Exact Amount (Fixed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentRule("PARTIAL_ALLOWED")}
                    className={`p-2.5 rounded-lg border text-center text-[12px] font-medium transition cursor-pointer ${
                      paymentRule === "PARTIAL_ALLOWED"
                        ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/5 text-[var(--bos-accent)] font-semibold"
                        : "border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] bg-[var(--bos-surface-sunken)]"
                    }`}
                  >
                    Allow Partial Payments
                  </button>
                </div>
              </div>

              {/* Recipient Mobile Number & UPI VPA Configuration */}
              <div className="pt-3 border-t border-[var(--bos-border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--bos-accent)]">
                    Payment Instruments (Mobile & QR)
                  </span>
                  <span className="text-[10.5px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Attached to Email & QR
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-medium text-[var(--bos-text-secondary)] mb-1">
                      Recipient Mobile (GPay / PhonePe / Paytm)
                    </label>
                    <input
                      type="text"
                      value={payeeMobile}
                      onChange={(e) => setPayeeMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[13px] font-mono text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-[var(--bos-text-secondary)] mb-1">
                      Recipient UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      value={payeeUpi}
                      onChange={(e) => setPayeeUpi(e.target.value)}
                      placeholder="businessos@hdfcbank"
                      className="w-full px-3 py-2 rounded-md bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[13px] font-mono text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--bos-text-tertiary)]">
                  The verified UPI QR code image will be generated and directly attached to the payment email sent to the client.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-3">
                <h3 className="text-[12px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)] tracking-wider">
                  Payment Request Summary
                </h3>

                <div className="flex justify-between items-baseline border-b border-[var(--bos-border-subtle)] pb-2.5">
                  <span className="text-[12.5px] text-[var(--bos-text-secondary)]">Client:</span>
                  <span className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                    {selectedClient?.companyName}
                  </span>
                </div>

                <div className="flex justify-between items-baseline border-b border-[var(--bos-border-subtle)] pb-2.5">
                  <span className="text-[12.5px] text-[var(--bos-text-secondary)]">Project:</span>
                  <span className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                    {selectedProject?.name || "Standalone Commercial Request"}
                  </span>
                </div>

                {selectedMilestone && !isStandalone && (
                  <div className="flex justify-between items-baseline border-b border-[var(--bos-border-subtle)] pb-2.5">
                    <span className="text-[12.5px] text-[var(--bos-text-secondary)]">Milestone Condition:</span>
                    <span className="text-[13px] font-mono text-[var(--bos-accent)]">
                      {selectedMilestone.phase} — {selectedMilestone.title}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-baseline border-b border-[var(--bos-border-subtle)] pb-2.5">
                  <span className="text-[12.5px] text-[var(--bos-text-secondary)]">Recipient Mobile:</span>
                  <span className="text-[13px] font-mono font-bold text-[var(--bos-accent)]">
                    {payeeMobile}
                  </span>
                </div>

                <div className="flex justify-between items-baseline border-b border-[var(--bos-border-subtle)] pb-2.5">
                  <span className="text-[12.5px] text-[var(--bos-text-secondary)]">UPI ID:</span>
                  <span className="text-[13px] font-mono text-[var(--bos-text-primary)]">
                    {payeeUpi}
                  </span>
                </div>

                <div className="flex justify-between items-baseline border-b border-[var(--bos-border-subtle)] pb-2.5">
                  <span className="text-[12.5px] text-[var(--bos-text-secondary)]">Reason:</span>
                  <span className="text-[13px] font-medium text-[var(--bos-text-primary)]">
                    {reason}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-[13px] font-bold text-[var(--bos-text-primary)]">
                    Total Amount Requested:
                  </span>
                  <span className="text-[18px] font-mono font-bold text-[var(--bos-accent)]">
                    ₹{Number(amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[12px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Creates a secure UPI QR session, sends notification to client, and waits for verifiable proof.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12.5px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={
                (step === 1 && !selectedClientId) ||
                (step === 2 && !selectedProjectId && !isStandalone) ||
                (step === 3 && (!amount || !reason))
              }
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--bos-accent)] text-white text-[12.5px] font-medium shadow-xs disabled:opacity-50 cursor-pointer transition hover:brightness-95"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded bg-[var(--bos-accent)] text-white text-[13px] font-medium shadow-md disabled:opacity-50 cursor-pointer transition hover:brightness-95"
            >
              {loading ? "Generating Request..." : "Create Payment Request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
