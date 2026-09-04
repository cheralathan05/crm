"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Lock,
  Users,
  Shield,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Mail,
  Sparkles,
  Database,
  Code2,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProjectTeamName,
  PROJECT_TEAM_ROLES,
  TEAM_RESPONSIBILITIES,
} from "@/lib/employees/project-invitation.service";

interface AdminInviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectCode?: string | null;
  defaultTeam?: ProjectTeamName;
  onSuccess?: () => void;
}

type StepNumber = 1 | 2 | 3 | 4 | 5;

const TEAM_CONFIG: Record<
  ProjectTeamName,
  { label: string; icon: any; color: string; bg: string; border: string; desc: string }
> = {
  FRONTEND: {
    label: "Frontend Team",
    icon: Code2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    desc: "User interface, client components, and UX workflows.",
  },
  BACKEND: {
    label: "Backend Team",
    icon: ServerIcon,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    desc: "API endpoints, domain logic, and services.",
  },
  DATABASE: {
    label: "Database Team",
    icon: Database,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    desc: "Schema models, migrations, and query performance.",
  },
  QA: {
    label: "QA Team",
    icon: CheckSquare,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    desc: "Automated test suites, validation, and sign-offs.",
  },
};

function ServerIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}

export function AdminInviteMemberModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectCode,
  defaultTeam = "FRONTEND",
  onSuccess,
}: AdminInviteMemberModalProps) {
  const [currentStep, setCurrentStep] = useState<StepNumber>(2);
  const [selectedTeam, setSelectedTeam] = useState<ProjectTeamName>(defaultTeam);
  const [selectedRole, setSelectedRole] = useState<string>(
    PROJECT_TEAM_ROLES[defaultTeam]?.[0] || "Frontend Developer"
  );
  const [email, setEmail] = useState("");

  // Validation State
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTeam(defaultTeam);
      setSelectedRole(PROJECT_TEAM_ROLES[defaultTeam]?.[0] || "Frontend Developer");
      setCurrentStep(2);
      setEmail("");
      setValidationResult(null);
      setValidationError(null);
      setSuccessData(null);
      setSubmitError(null);
    }
  }, [isOpen, defaultTeam]);

  useEffect(() => {
    const roles = PROJECT_TEAM_ROLES[selectedTeam] || [];
    if (!roles.includes(selectedRole)) {
      setSelectedRole(roles[0] || "Developer");
    }
  }, [selectedTeam, selectedRole]);

  const validateEmailAgainstDb = useCallback(
    async (emailToValidate: string) => {
      const trimmed = emailToValidate.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
        setValidationResult(null);
        setValidationError(null);
        return;
      }

      try {
        setValidatingEmail(true);
        setValidationError(null);

        const qs = new URLSearchParams({
          email: trimmed,
          teamName: selectedTeam,
          projectRole: selectedRole,
        });

        const res = await fetch(`/api/projects/${projectId}/invitations/validate?${qs.toString()}`);
        const json = await res.json();

        if (json.ok) {
          setValidationResult(json.data);
          if (!json.data.canInvite && json.data.isAlreadyMember) {
            setValidationError(json.data.message);
          }
        } else {
          setValidationError(json.message || "Failed to validate email.");
        }
      } catch (err: any) {
        setValidationError(err.message || "Connection error during validation.");
      } finally {
        setValidatingEmail(false);
      }
    },
    [projectId, selectedTeam, selectedRole]
  );

  useEffect(() => {
    if (!email || email.length < 4) {
      setValidationResult(null);
      setValidationError(null);
      return;
    }
    const timer = setTimeout(() => {
      validateEmailAgainstDb(email);
    }, 400);
    return () => clearTimeout(timer);
  }, [email, validateEmailAgainstDb]);

  const handleSendInvitation = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await fetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: selectedTeam,
          projectRole: selectedRole,
          email: email.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to create invitation.");
      }

      setSuccessData(json.data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to send invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyAcceptLink = () => {
    if (!successData?.acceptUrl) return;
    navigator.clipboard.writeText(successData.acceptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface)]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/30 flex items-center justify-center text-[var(--bos-accent)]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--bos-text-primary)] font-mono uppercase tracking-wider">
                Add Member to Project
              </h2>
              <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                Enterprise Project Team Membership Engine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-Step Indicator */}
        {!successData && (
          <div className="px-6 py-2.5 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)] shrink-0">
            {[
              { num: 1, label: "Project" },
              { num: 2, label: "Team" },
              { num: 3, label: "Role" },
              { num: 4, label: "Employee" },
              { num: 5, label: "Preview" },
            ].map((s) => (
              <div
                key={s.num}
                className={cn(
                  "flex items-center gap-1.5",
                  currentStep === s.num
                    ? "text-[var(--bos-accent)] font-bold"
                    : currentStep > s.num
                    ? "text-emerald-400 font-semibold"
                    : "text-[var(--bos-text-tertiary)]"
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono",
                    currentStep === s.num
                      ? "bg-[var(--bos-accent)] text-white"
                      : currentStep > s.num
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]"
                  )}
                >
                  {currentStep > s.num ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 font-mono">
          {successData ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Invitation Dispatched Successfully
                </h3>
                <p className="text-xs text-[var(--bos-text-secondary)] mt-1">
                  Assigned <strong className="text-white">{successData.recipientEmail}</strong> to{" "}
                  <strong className="text-[var(--bos-accent)]">{successData.teamName}</strong> team as{" "}
                  <strong className="text-emerald-400">{successData.projectRole}</strong> on {projectName}.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-left space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)]">
                  <span>DIRECT ONBOARDING URL:</span>
                  <span className="text-emerald-400 font-bold">SINGLE-USE SECURE TOKEN</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={successData.acceptUrl}
                    className="w-full bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl px-3 py-2 text-xs text-[var(--bos-text-secondary)] outline-none font-mono select-all"
                  />
                  <button
                    onClick={copyAcceptLink}
                    className="px-3 py-2 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent)]/80 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Close & Refresh Team
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: PROJECT (LOCKED) */}
              <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                      STEP 1 — PROJECT CONTEXT (LOCKED)
                    </span>
                    <strong className="text-xs text-[var(--bos-text-primary)] font-bold">
                      {projectName} {projectCode ? `(${projectCode})` : ""}
                    </strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 shrink-0">
                  ROOT CONTEXT
                </span>
              </div>

              {/* STEP 2: SELECT PROJECT TEAM */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--bos-text-primary)] uppercase tracking-wider">
                    STEP 2 — SELECT PROJECT TEAM
                  </label>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    Only teams belonging to this project
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {(["FRONTEND", "BACKEND", "DATABASE", "QA"] as ProjectTeamName[]).map((tKey) => {
                    const cfg = TEAM_CONFIG[tKey];
                    const isSelected = selectedTeam === tKey;
                    const Icon = cfg.icon;

                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => {
                          setSelectedTeam(tKey);
                          setSelectedRole(PROJECT_TEAM_ROLES[tKey][0]);
                          if (currentStep < 3) setCurrentStep(3);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                          isSelected
                            ? "bg-[var(--bos-surface)] shadow-xs border-[var(--bos-accent)] ring-1 ring-[var(--bos-accent)]"
                            : "bg-[var(--bos-surface)]/50 border-[var(--bos-border)] hover:border-[var(--bos-border-strong)]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", cfg.color)} />
                            <span className="text-xs font-bold text-[var(--bos-text-primary)]">{cfg.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--bos-accent)]" />}
                        </div>
                        <p className="text-[10px] text-[var(--bos-text-tertiary)] leading-tight">{cfg.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: SELECT ROLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--bos-text-primary)] uppercase tracking-wider">
                    STEP 3 — SELECT ROLE FOR {selectedTeam} TEAM
                  </label>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    Configured squad roles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(PROJECT_TEAM_ROLES[selectedTeam] || []).map((r) => {
                    const isSelected = selectedRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setSelectedRole(r);
                          if (currentStep < 4) setCurrentStep(4);
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer flex items-center justify-between",
                          isSelected
                            ? "bg-[var(--bos-accent)]/15 border-[var(--bos-accent)] text-white font-bold"
                            : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-white"
                        )}
                      >
                        <span>{r}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--bos-accent)]" />}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-[var(--bos-text-tertiary)] px-1">
                  <strong>Responsibility:</strong> {TEAM_RESPONSIBILITIES[selectedTeam]}
                </p>
              </div>

              {/* STEP 4: EMPLOYEE EMAIL & DB CHECK */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--bos-text-primary)] uppercase tracking-wider">
                    STEP 4 — EMPLOYEE EMAIL
                  </label>
                  {validatingEmail && (
                    <span className="text-[10px] text-[var(--bos-accent)] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking database...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (currentStep < 4) setCurrentStep(4);
                    }}
                    placeholder="employee@email.com"
                    className={cn(
                      "w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bos-surface)] border text-xs text-[var(--bos-text-primary)] outline-none font-mono transition-colors",
                      validationError
                        ? "border-rose-500/60 focus:border-rose-500"
                        : validationResult?.canInvite
                        ? "border-emerald-500/60 focus:border-emerald-500"
                        : "border-[var(--bos-border)] focus:border-[var(--bos-accent)]"
                    )}
                  />
                  <Mail className="w-4 h-4 text-[var(--bos-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {validationError ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Duplicate Membership Prevented:</strong>
                      <span>{validationError}</span>
                    </div>
                  </div>
                ) : validationResult?.canInvite ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">
                        {validationResult.hasExistingEmployee ? "Existing Employee Verified" : "New Member Verified"}:
                      </strong>
                      <span>
                        Adding <strong>{validationResult.employeeName}</strong> as {selectedRole} on {selectedTeam} team.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* STEP 5: ASSIGNMENT PREVIEW */}
              {email && validationResult?.canInvite && !validationError && (
                <div className="space-y-2 pt-2 border-t border-[var(--bos-border)] animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                      STEP 5 — ASSIGNMENT PREVIEW
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Ready for Dispatch</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--bos-surface)] to-[var(--bos-bg)] border border-[var(--bos-border)] space-y-2.5 text-xs">
                    <div className="text-[10px] font-bold text-[var(--bos-text-tertiary)] uppercase tracking-wider">
                      YOU ARE ADDING
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Employee:</span>
                        <strong className="text-white font-bold">{validationResult.employeeName}</strong>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] block truncate">{email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Project:</span>
                        <strong className="text-blue-400 font-bold">{projectName}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--bos-border)]">
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Team:</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold text-[11px] border border-blue-500/20 inline-block">
                          {selectedTeam} TEAM
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Role:</span>
                        <strong className="text-emerald-400 font-bold">{selectedRole}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--bos-border)] text-[11px]">
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Access:</span>
                      <span className="text-[var(--bos-text-secondary)]">{selectedTeam} project workspace & communication channels</span>
                    </div>

                    <div className="text-[11px]">
                      <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Responsibility:</span>
                      <span className="text-[var(--bos-text-secondary)]">{TEAM_RESPONSIBILITIES[selectedTeam]}</span>
                    </div>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!successData && (
          <div className="px-6 py-4 border-t border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface)]/80 shrink-0 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--bos-text-secondary)] hover:text-white hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendInvitation}
              disabled={!email || !validationResult?.canInvite || !!validationError || submitting}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md cursor-pointer",
                email && validationResult?.canInvite && !validationError && !submitting
                  ? "bg-[var(--bos-accent)] hover:opacity-90 active:scale-98"
                  : "bg-slate-700/50 text-slate-400 cursor-not-allowed border border-slate-700"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Membership...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
