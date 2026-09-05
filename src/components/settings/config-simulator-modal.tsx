"use client";

import { useState } from "react";
import {
  Sparkles,
  Shield,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Play,
  Loader2,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfigSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: { id: string; fullName: string; email: string; role?: { name: string } | null }[];
}

export function ConfigSimulatorModal({
  isOpen,
  onClose,
  employees,
}: ConfigSimulatorModalProps) {
  const [activeTab, setActiveTab] = useState<"POLICY" | "ACCESS">("POLICY");

  // Policy Simulator State
  const [selectedKey, setSelectedKey] = useState("security.mfa_enforcement");
  const [proposedValue, setProposedValue] = useState<any>("MANDATORY");
  const [policySimulating, setPolicySimulating] = useState(false);
  const [policyResult, setPolicyResult] = useState<any>(null);

  // Access Simulator State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || "");
  const [selectedModule, setSelectedModule] = useState("PAYMENTS");
  const [selectedAction, setSelectedAction] = useState<"VIEW" | "CREATE" | "EDIT" | "DELETE" | "APPROVE" | "MANAGE">("APPROVE");
  const [accessSimulating, setAccessSimulating] = useState(false);
  const [accessResult, setAccessResult] = useState<any>(null);

  if (!isOpen) return null;

  const runPolicySimulation = async () => {
    setPolicySimulating(true);
    setPolicyResult(null);
    try {
      const res = await fetch("/api/settings/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: selectedKey, proposedValue }),
      });
      const data = await res.json();
      if (data.ok) {
        setPolicyResult(data.simulation);
      }
    } catch {
      // Ignore
    } finally {
      setPolicySimulating(false);
    }
  };

  const runAccessSimulation = async () => {
    setAccessSimulating(true);
    setAccessResult(null);
    try {
      const res = await fetch("/api/settings/access-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          module: selectedModule,
          action: selectedAction,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAccessResult(data.result);
      }
    } catch {
      // Ignore
    } finally {
      setAccessSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bos-line)] bg-[var(--bos-surface-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-[16px] font-semibold text-[var(--bos-text-primary)]">
                Control Plane Simulators
              </h3>
            </div>
            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
              Non-destructive evaluation of policies, blast radius, and access authorizations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] p-1 rounded-lg hover:bg-[var(--bos-surface)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--bos-line)] bg-[var(--bos-surface)] px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("POLICY")}
            className={cn(
              "pb-2.5 text-[13px] font-medium border-b-2 transition",
              activeTab === "POLICY"
                ? "border-blue-500 text-blue-400 font-semibold"
                : "border-transparent text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            Policy Simulator ("What happens if...")
          </button>
          <button
            onClick={() => setActiveTab("ACCESS")}
            className={cn(
              "pb-2.5 text-[13px] font-medium border-b-2 transition",
              activeTab === "ACCESS"
                ? "border-blue-500 text-blue-400 font-semibold"
                : "border-transparent text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            Access Simulator (RBAC Decision Trace)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === "POLICY" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider block mb-1">
                    Select Target Policy
                  </label>
                  <select
                    value={selectedKey}
                    onChange={(e) => {
                      setSelectedKey(e.target.value);
                      if (e.target.value === "security.mfa_enforcement") setProposedValue("MANDATORY");
                      else if (e.target.value === "workflow.proof_review_required") setProposedValue(true);
                      else if (e.target.value === "payments.confirmation_workflow") setProposedValue("ADMIN_CONFIRMATION");
                      else if (e.target.value === "portal.client_payment_visibility") setProposedValue(false);
                      else if (e.target.value === "integrations.excel_sync_policy") setProposedValue("DISABLED");
                    }}
                    className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none focus:border-blue-500"
                  >
                    <option value="security.mfa_enforcement">MFA Requirement Policy</option>
                    <option value="workflow.proof_review_required">Proof of Work Verification</option>
                    <option value="payments.confirmation_workflow">Payment Confirmation Workflow</option>
                    <option value="portal.client_payment_visibility">Client Payment Visibility</option>
                    <option value="integrations.excel_sync_policy">Excel Hub Sync Mode</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider block mb-1">
                    Simulate Proposed Value
                  </label>
                  {selectedKey === "security.mfa_enforcement" && (
                    <select
                      value={proposedValue}
                      onChange={(e) => setProposedValue(e.target.value)}
                      className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="MANDATORY">MANDATORY (All Members)</option>
                      <option value="ADMINS_ONLY">ADMINS_ONLY (Privilege Only)</option>
                      <option value="OPTIONAL">OPTIONAL (Low Friction)</option>
                    </select>
                  )}
                  {selectedKey === "workflow.proof_review_required" && (
                    <select
                      value={String(proposedValue)}
                      onChange={(e) => setProposedValue(e.target.value === "true")}
                      className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="true">True (Mandatory Proof Verification)</option>
                      <option value="false">False (Bypass QA Verification)</option>
                    </select>
                  )}
                  {selectedKey === "payments.confirmation_workflow" && (
                    <select
                      value={proposedValue}
                      onChange={(e) => setProposedValue(e.target.value)}
                      className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="ADMIN_CONFIRMATION">Admin Confirmation Required</option>
                      <option value="DUAL_VERIFICATION">Dual Verification (Admin + Owner)</option>
                      <option value="GATEWAY_WEBHOOK">Direct Automatic Confirmation</option>
                    </select>
                  )}
                  {selectedKey === "portal.client_payment_visibility" && (
                    <select
                      value={String(proposedValue)}
                      onChange={(e) => setProposedValue(e.target.value === "true")}
                      className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="false">False (Shield Financials from Portal)</option>
                      <option value="true">True (Allow Client Invoice View)</option>
                    </select>
                  )}
                  {selectedKey === "integrations.excel_sync_policy" && (
                    <select
                      value={proposedValue}
                      onChange={(e) => setProposedValue(e.target.value)}
                      className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="DISABLED">DISABLED (Read-Only / No Sync)</option>
                      <option value="EXPORT_ONLY">EXPORT_ONLY (OS Master)</option>
                      <option value="BIDIRECTIONAL_CONFIRM">BIDIRECTIONAL_CONFIRM</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={runPolicySimulation}
                  disabled={policySimulating}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition disabled:opacity-50"
                >
                  {policySimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating blast radius...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Simulate Policy Impact
                    </>
                  )}
                </button>
              </div>

              {/* Simulation Output */}
              {policyResult && (
                <div className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface-subtle)] space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase">
                        Simulation Outcome
                      </span>
                      <h4 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                        {policyResult.scenario}
                      </h4>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase",
                        policyResult.isSafe
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {policyResult.isSafe ? "Safe to Apply" : "High Friction"}
                    </span>
                  </div>

                  {/* Numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                      <div className="text-[16px] font-mono font-bold text-[var(--bos-text-primary)]">
                        {policyResult.affectedUsersCount}
                      </div>
                      <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                        Affected Users
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                      <div className="text-[16px] font-mono font-bold text-[var(--bos-text-primary)]">
                        {policyResult.affectedWorkflowsCount}
                      </div>
                      <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                        Workflows
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                      <div className="text-[16px] font-mono font-bold text-[var(--bos-text-primary)]">
                        {policyResult.blockedActionsCount}
                      </div>
                      <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                        Blocked Actions
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-center">
                      <div className="text-[16px] font-mono font-bold text-[var(--bos-text-primary)]">
                        {policyResult.impactDetails.rollbackFeasibility}
                      </div>
                      <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-medium">
                        Rollback
                      </div>
                    </div>
                  </div>

                  {/* Blocked Actions */}
                  {policyResult.impactDetails.blockedActions.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-[var(--bos-text-primary)] uppercase font-mono">
                        Blocked Actions / Gates Enforced:
                      </div>
                      <ul className="text-[12px] text-[var(--bos-text-secondary)] list-disc list-inside space-y-1">
                        {policyResult.impactDetails.blockedActions.map((b: string, i: number) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Consequences */}
                  {policyResult.impactDetails.consequences.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-[var(--bos-text-primary)] uppercase font-mono">
                        Operational Consequences:
                      </div>
                      <ul className="text-[12px] text-[var(--bos-text-secondary)] list-disc list-inside space-y-1">
                        {policyResult.impactDetails.consequences.map((c: string, i: number) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-[11px] text-[var(--bos-text-muted)] flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                    <span>This simulation is read-only and made zero changes to production state.</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider block mb-1">
                    Principal (Employee)
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.role?.name || "Member"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider block mb-1">
                    Target Module
                  </label>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                  >
                    <option value="PAYMENTS">PAYMENTS (Financial Ledger)</option>
                    <option value="SECURITY">SECURITY (Policies & Keys)</option>
                    <option value="SETTINGS">SETTINGS (Control Plane)</option>
                    <option value="TASKS">TASKS (Engineering Execution)</option>
                    <option value="CLIENT_PORTAL">CLIENT_PORTAL (Client Surface)</option>
                    <option value="PROJECTS">PROJECTS (Project Management)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase tracking-wider block mb-1">
                    Action
                  </label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value as any)}
                    className="w-full bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-3 py-2 text-[13px] text-[var(--bos-text-primary)] focus:outline-none"
                  >
                    <option value="VIEW">VIEW</option>
                    <option value="CREATE">CREATE</option>
                    <option value="EDIT">EDIT</option>
                    <option value="DELETE">DELETE (Destructive)</option>
                    <option value="APPROVE">APPROVE (Verification Signoff)</option>
                    <option value="MANAGE">MANAGE (Admin Root)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={runAccessSimulation}
                  disabled={accessSimulating}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50"
                >
                  {accessSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating RBAC trace...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Simulate Authorization
                    </>
                  )}
                </button>
              </div>

              {/* Access Decision Card */}
              {accessResult && (
                <div className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface-subtle)] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[var(--bos-line)] pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase">
                        Access Decision
                      </span>
                      <h4 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                        {accessResult.principal.name} → {accessResult.context.action} on {accessResult.context.module}
                      </h4>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-bold font-mono uppercase tracking-wider",
                        accessResult.decision === "ALLOWED"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      )}
                    >
                      {accessResult.decision === "ALLOWED" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          ALLOWED
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          DENIED
                        </>
                      )}
                    </span>
                  </div>

                  {/* Exact Rationale */}
                  <div className="p-3 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] text-[13px] text-[var(--bos-text-secondary)]">
                    <strong className="text-[var(--bos-text-primary)]">Reason: </strong>
                    {accessResult.reason}
                  </div>

                  {/* Step by step permission trace */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-mono uppercase text-[var(--bos-text-muted)]">
                      Authorization Evaluation Trace
                    </div>
                    <div className="space-y-1.5">
                      {accessResult.permissionTrace.map((step: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-[12px] p-2 rounded border border-[var(--bos-line)] bg-[var(--bos-surface)]/50"
                        >
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 mt-0.5",
                              step.result === "PASS" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
                              step.result === "FAIL" && "bg-rose-500/10 text-rose-400 border border-rose-500/30",
                              step.result === "NEUTRAL" && "bg-[var(--bos-line)] text-[var(--bos-text-muted)]"
                            )}
                          >
                            {step.result}
                          </span>
                          <div>
                            <span className="font-semibold text-[var(--bos-text-primary)]">
                              {step.step}:
                            </span>{" "}
                            <span className="text-[var(--bos-text-secondary)]">{step.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
