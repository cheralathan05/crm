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
  Search,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Layers,
  FileText,
  UserCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProjectTeamName,
  PROJECT_TEAM_ROLES,
  TEAM_RESPONSIBILITIES,
} from "@/lib/employees/project-invitation.types";

export interface AdminInviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  projectCode?: string | null;
  allowProjectChange?: boolean;
  defaultTeam?: ProjectTeamName;
  onSuccess?: () => void;
}

type StepNumber = 1 | 2 | 3 | 4 | 5;

const TEAM_CONFIG: Record<
  ProjectTeamName,
  {
    label: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    badgeBg: string;
    desc: string;
    ownership: string;
    dependsOn: string;
  }
> = {
  FRONTEND: {
    label: "Frontend Team",
    icon: Code2,
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    badgeBg: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
    desc: "User interface, client components, and interactive UX states.",
    ownership: "Builds client components, responsive layouts, forms, and client validation for approved product areas.",
    dependsOn: "Relies on Backend REST APIs and contract endpoints.",
  },
  BACKEND: {
    label: "Backend Team",
    icon: ServerIcon,
    color: "text-indigo-500 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    badgeBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
    desc: "API endpoints, domain services, and business rules.",
    ownership: "Develops business domain services, REST APIs, authentication, and validation contracts.",
    dependsOn: "Relies on Database schemas and relational entities.",
  },
  DATABASE: {
    label: "Database Team",
    icon: Database,
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    desc: "Schema models, migrations, and query performance.",
    ownership: "Designs Prisma schema entities, migrations, relational foreign keys, and indexes.",
    dependsOn: "Provides clean persistence layer to Backend services.",
  },
  QA: {
    label: "QA Team",
    icon: CheckSquare,
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    desc: "Automated test suites, acceptance validation, and sign-offs.",
    ownership: "Executes automated test suites, acceptance criteria audits (AC-001..), and sign-offs.",
    dependsOn: "Verifies completed work submitted by Frontend and Backend teams.",
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

const STEP_LABELS: Record<StepNumber, string> = {
  1: "Project",
  2: "Squad",
  3: "Role",
  4: "Employee",
  5: "Dispatch",
};

export function AdminInviteMemberModal({
  isOpen,
  onClose,
  projectId: initialProjectId,
  projectName: initialProjectName,
  projectCode: initialProjectCode,
  allowProjectChange = false,
  defaultTeam = "FRONTEND",
  onSuccess,
}: AdminInviteMemberModalProps) {
  // Determine start step based on whether project is already provided and cannot be changed
  const isProjectPreselected = Boolean(initialProjectId && !allowProjectChange);
  const startStep: StepNumber = isProjectPreselected ? 2 : 1;

  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || "");
  const [selectedProjectName, setSelectedProjectName] = useState<string>(initialProjectName || "");
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>(initialProjectCode || "");
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  // Workflow state
  const [currentStep, setCurrentStep] = useState<StepNumber>(startStep);
  const [selectedTeam, setSelectedTeam] = useState<ProjectTeamName>(defaultTeam);
  const [selectedRole, setSelectedRole] = useState<string>(
    PROJECT_TEAM_ROLES[defaultTeam]?.[0] || "Frontend Developer"
  );

  // Employee Selection Mode: 'DIRECTORY' | 'NEW_EMAIL'
  const [employeeSourceMode, setEmployeeSourceMode] = useState<"DIRECTORY" | "NEW_EMAIL">("DIRECTORY");
  const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [email, setEmail] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");

  // Validation State
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);

  // Load Projects if needed
  useEffect(() => {
    if (isOpen && (!initialProjectId || allowProjectChange)) {
      setLoadingProjects(true);
      fetch("/api/projects")
        .then((res) => res.json())
        .then((json) => {
          const list = Array.isArray(json?.projects)
            ? json.projects
            : Array.isArray(json?.data)
            ? json.data
            : [];
          setAvailableProjects(list);
          if (!selectedProjectId && list.length > 0 && !initialProjectId) {
            const first = list[0];
            setSelectedProjectId(first.id);
            setSelectedProjectName(first.name);
            setSelectedProjectCode(first.code || "");
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProjects(false));
    }
  }, [isOpen, initialProjectId, allowProjectChange]);

  // Load Workspace Directory for fast employee picking
  useEffect(() => {
    if (isOpen) {
      setLoadingEmployees(true);
      fetch("/api/employees")
        .then((res) => res.json())
        .then((json) => {
          if (json.ok && Array.isArray(json.employees)) {
            setCompanyEmployees(json.employees);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEmployees(false));
    }
  }, [isOpen]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedProjectId(initialProjectId || "");
      setSelectedProjectName(initialProjectName || "");
      setSelectedProjectCode(initialProjectCode || "");
      setSelectedTeam(defaultTeam);
      setSelectedRole(PROJECT_TEAM_ROLES[defaultTeam]?.[0] || "Frontend Developer");
      setCurrentStep(initialProjectId && !allowProjectChange ? 2 : 1);
      setEmail("");
      setSelectedEmployeeName("");
      setValidationResult(null);
      setValidationError(null);
      setSuccessData(null);
      setSubmitError(null);
      setCopiedLink(false);
      setCopiedFormatted(false);
      setProjectSearch("");
      setEmployeeSearch("");
    }
  }, [isOpen, initialProjectId, initialProjectName, initialProjectCode, allowProjectChange, defaultTeam]);

  // Sync role when team changes
  useEffect(() => {
    const roles = PROJECT_TEAM_ROLES[selectedTeam] || [];
    if (!roles.includes(selectedRole)) {
      setSelectedRole(roles[0] || "Developer");
    }
  }, [selectedTeam, selectedRole]);

  // Validate Email
  const validateEmailAgainstDb = useCallback(
    async (emailToValidate: string) => {
      const trimmed = emailToValidate.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
        setValidationResult(null);
        setValidationError(null);
        return;
      }
      if (!selectedProjectId) return;

      try {
        setValidatingEmail(true);
        setValidationError(null);

        const qs = new URLSearchParams({
          email: trimmed,
          teamName: selectedTeam,
          projectRole: selectedRole,
        });

        const res = await fetch(`/api/projects/${selectedProjectId}/invitations/validate?${qs.toString()}`);
        const json = await res.json();

        if (json.ok) {
          setValidationResult(json.data);
          if (!json.data.canInvite && json.data.isAlreadyMember) {
            setValidationError(json.data.message);
          }
          if (json.data.employeeName) {
            setSelectedEmployeeName(json.data.employeeName);
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
    [selectedProjectId, selectedTeam, selectedRole]
  );

  useEffect(() => {
    if (!email || email.length < 4) {
      setValidationResult(null);
      setValidationError(null);
      return;
    }
    const timer = setTimeout(() => {
      validateEmailAgainstDb(email);
    }, 350);
    return () => clearTimeout(timer);
  }, [email, validateEmailAgainstDb]);

  const handleSelectProject = (project: any) => {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
    setSelectedProjectCode(project.code || "");
    setCurrentStep(2);
  };

  const handleSendInvitation = async () => {
    if (!selectedProjectId) return;
    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await fetch(`/api/projects/${selectedProjectId}/invitations`, {
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
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyFormattedInvitation = () => {
    const text = `============================================================
BUSINESS OS — PROJECT SQUAD INVITATION
============================================================
PROJECT:        ${selectedProjectName} ${selectedProjectCode ? `(${selectedProjectCode})` : ""}
CLIENT:         ${successData?.clientCompany || "Enterprise Client"}
SQUAD / TEAM:   ${selectedTeam} SQUAD
ROLE:           ${selectedRole}
RESPONSIBILITY: ${TEAM_RESPONSIBILITIES[selectedTeam]}
DEPENDENCIES:   ${TEAM_CONFIG[selectedTeam].dependsOn}
GOVERNANCE:     Strict Role Boundary Enforced (Zero Task Leakage)

DIRECT ONBOARDING LINK:
${successData?.acceptUrl || ""}

(Link expires in 7 days. Single-use cryptographic security access.)
============================================================`;
    navigator.clipboard.writeText(text);
    setCopiedFormatted(true);
    setTimeout(() => setCopiedFormatted(false), 2500);
  };

  if (!isOpen) return null;

  const filteredProjects = availableProjects.filter(
    (p) =>
      p.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(projectSearch.toLowerCase())) ||
      (p.client?.companyName && p.client.companyName.toLowerCase().includes(projectSearch.toLowerCase()))
  );

  const filteredEmployees = companyEmployees.filter(
    (e) =>
      e.fullName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.role?.name?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Determine can proceed to next step
  const canProceedFromStep = (stepNum: StepNumber): boolean => {
    switch (stepNum) {
      case 1:
        return Boolean(selectedProjectId);
      case 2:
        return Boolean(selectedTeam);
      case 3:
        return Boolean(selectedRole);
      case 4:
        return Boolean(email && validationResult?.canInvite && !validationError && !validatingEmail);
      case 5:
        return true;
      default:
        return false;
    }
  };

  const stepsList = [
    { num: 1 as StepNumber, label: "Project", icon: Building2 },
    { num: 2 as StepNumber, label: "Squad / Team", icon: Users },
    { num: 3 as StepNumber, label: "Role", icon: Shield },
    { num: 4 as StepNumber, label: "Employee", icon: UserCheck },
    { num: 5 as StepNumber, label: "Dispatch", icon: Send },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 text-[var(--bos-text-primary)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface-panel)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-[var(--bos-text-primary)] tracking-tight">
                  Invite Member to Project Squad
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] text-[10px] font-semibold border border-[var(--bos-accent)]/20">
                  Role Boundary Active
                </span>
              </div>
              <p className="text-[11.5px] text-[var(--bos-text-secondary)]">
                Assign workspace talent to dedicated engineering teams: Frontend, Backend, Database, QA.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Navigation Bar */}
        {!successData && (
          <div className="px-6 py-2.5 bg-[var(--bos-bg)] border-b border-[var(--bos-border)] flex items-center justify-between overflow-x-auto gap-2 shrink-0">
            {stepsList.map((s) => {
              const isCurrent = currentStep === s.num;
              const isDone = currentStep > s.num;
              const isNavigable = s.num < currentStep || (s.num === 1 && allowProjectChange);

              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={!isNavigable && !isCurrent}
                  onClick={() => {
                    if (isNavigable) setCurrentStep(s.num);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap",
                    isCurrent
                      ? "bg-[var(--bos-accent)] text-white font-semibold shadow-xs"
                      : isDone
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium cursor-pointer hover:bg-emerald-500/15"
                      : "text-[var(--bos-text-tertiary)] cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-mono",
                      isCurrent
                        ? "bg-white/20 text-white"
                        : isDone
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-[var(--bos-border)] text-[var(--bos-text-tertiary)]"
                    )}
                  >
                    {isDone ? "✓" : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Project Context Pill (when step > 1) */}
        {!successData && selectedProjectId && (
          <div className="px-6 py-2 bg-[var(--bos-surface-sunken)] border-b border-[var(--bos-border)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">
                Project Context:
              </span>
              <strong className="text-[var(--bos-text-primary)] font-semibold truncate text-[12px]">
                {selectedProjectName}
              </strong>
              {selectedProjectCode && (
                <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)]">
                  {selectedProjectCode}
                </span>
              )}
            </div>
            {allowProjectChange && currentStep !== 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-[11px] text-[var(--bos-accent)] hover:underline cursor-pointer font-medium ml-2 shrink-0"
              >
                Change Project
              </button>
            )}
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {successData ? (
            /* SUCCESS CONFIRMATION & EXECUTIVE DISPATCH CARD */
            <div className="space-y-5 animate-in zoom-in-95 duration-200 py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--bos-text-primary)]">
                  Squad Membership Created &amp; Dispatched
                </h3>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Verified invitation issued for <strong className="text-[var(--bos-text-primary)]">{successData.recipientEmail}</strong>.
                </p>
              </div>

              {/* EXECUTIVE SQUAD DISPATCH CARD */}
              <div className="rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--bos-accent)]" />
                    <span className="text-[10.5px] text-[var(--bos-text-secondary)] font-bold uppercase tracking-wider">
                      Project Squad Assignment Specification
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                    Active Squad Invite
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Project</span>
                    <strong className="text-[var(--bos-text-primary)] block font-semibold truncate text-[12.5px]">
                      {selectedProjectName} {selectedProjectCode ? `(${selectedProjectCode})` : ""}
                    </strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Squad / Team</span>
                    <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold border inline-block", TEAM_CONFIG[selectedTeam].badgeBg)}>
                      {selectedTeam} TEAM
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Role</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 block font-semibold text-[12.5px]">{selectedRole}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Employee</span>
                    <strong className="text-[var(--bos-text-primary)] block truncate text-[12.5px]">{successData.recipientName}</strong>
                    <span className="text-[10.5px] text-[var(--bos-text-secondary)] block truncate font-mono">{successData.recipientEmail}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1.5 text-[11.5px]">
                  <span className="text-[10px] text-[var(--bos-text-secondary)] uppercase font-bold block font-mono">
                    Product Ownership Boundary
                  </span>
                  <p className="text-[var(--bos-text-secondary)] leading-relaxed">
                    {TEAM_CONFIG[selectedTeam].ownership}
                  </p>
                  <p className="text-[var(--bos-text-tertiary)] text-[10.5px] pt-1.5 border-t border-[var(--bos-border)] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                    <span>{TEAM_CONFIG[selectedTeam].dependsOn}</span>
                  </p>
                </div>

                {/* Single Use Token Link Box */}
                <div className="space-y-2 pt-2 border-t border-[var(--bos-border)]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--bos-text-secondary)] font-mono text-[10px] uppercase font-bold">Onboarding Access URL:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10.5px]">Expires in 7 days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={successData.acceptUrl}
                      className="w-full bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-lg px-3 py-2 text-xs text-[var(--bos-text-primary)] outline-none select-all font-mono"
                    />
                    <button
                      onClick={copyAcceptLink}
                      className="px-3.5 py-2 rounded-lg bg-[var(--bos-accent)] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Actions: Copy Formatted Invite & Open URL */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={copyFormattedInvitation}
                    className="py-2 px-3 rounded-lg bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-sunken)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {copiedFormatted ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileText className="w-3.5 h-3.5 text-[var(--bos-accent)]" />}
                    <span>{copiedFormatted ? "Copied to Clipboard!" : "Copy Formatted Invite"}</span>
                  </button>

                  <a
                    href={successData.acceptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-lg bg-[var(--bos-surface)] hover:bg-[var(--bos-surface-sunken)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Open Onboarding Page</span>
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[var(--bos-accent)] text-white text-xs font-semibold transition hover:opacity-90 cursor-pointer shadow-xs"
              >
                Done &amp; Return to Workspace
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: PROJECT SELECTION */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
                      Select Target Project
                    </h4>
                    <p className="text-xs text-[var(--bos-text-secondary)]">
                      Choose which client project this squad member will be onboarded to.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search active projects by name, code, or client..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition"
                    />
                    <Search className="w-4 h-4 text-[var(--bos-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {loadingProjects ? (
                    <div className="py-10 text-center text-[var(--bos-text-secondary)] text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
                      <span>Loading active projects...</span>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="py-10 text-center text-[var(--bos-text-tertiary)] text-xs bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl">
                      No active projects found.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {filteredProjects.map((p) => {
                        const isSelected = selectedProjectId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProject(p)}
                            className={cn(
                              "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                              isSelected
                                ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] shadow-xs"
                                : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/60"
                            )}
                          >
                            <div className="truncate pr-2">
                              <div className="flex items-center gap-2">
                                <strong className="text-xs font-semibold text-[var(--bos-text-primary)] truncate block">
                                  {p.name}
                                </strong>
                                {p.code && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] border border-[var(--bos-border)]">
                                    {p.code}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[var(--bos-text-secondary)] block mt-0.5 truncate">
                                {p.client?.companyName || "Client Project"} · {p.stage || "ACTIVE"}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {isSelected ? (
                                <span className="w-6 h-6 rounded-full bg-[var(--bos-accent)] text-white flex items-center justify-center text-xs">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SQUAD / TEAM SELECTION */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
                      Select Engineering Squad
                    </h4>
                    <p className="text-xs text-[var(--bos-text-secondary)]">
                      Select the specialized technical team responsible for this area of execution.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["FRONTEND", "BACKEND", "DATABASE", "QA"] as ProjectTeamName[]).map((tKey) => {
                      const cfg = TEAM_CONFIG[tKey];
                      const isSelected = selectedTeam === tKey;
                      const Icon = cfg.icon;

                      return (
                        <div
                          key={tKey}
                          onClick={() => {
                            setSelectedTeam(tKey);
                            setSelectedRole(PROJECT_TEAM_ROLES[tKey][0]);
                          }}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                            isSelected
                              ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] ring-1 ring-[var(--bos-accent)]/40 shadow-xs"
                              : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/60"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg, cfg.color)}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-[13px] font-bold text-[var(--bos-text-primary)] block">
                                  {cfg.label}
                                </span>
                                <span className="text-[10px] text-[var(--bos-text-tertiary)] font-mono uppercase font-bold">
                                  {tKey}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-[var(--bos-accent)] text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-relaxed">
                            {cfg.desc}
                          </p>

                          <div className="pt-2 border-t border-[var(--bos-border)]/60 text-[10px] text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-[var(--bos-accent)]" />
                            <span className="truncate">{cfg.dependsOn}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: ROLE SELECTION */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
                        Select Technical Role for {TEAM_CONFIG[selectedTeam].label}
                      </h4>
                      <p className="text-xs text-[var(--bos-text-secondary)]">
                        Designate official project title and deliverable ownership scope.
                      </p>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0", TEAM_CONFIG[selectedTeam].badgeBg)}>
                      {selectedTeam} SQUAD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(PROJECT_TEAM_ROLES[selectedTeam] || []).map((r) => {
                      const isSelected = selectedRole === r;
                      return (
                        <div
                          key={r}
                          onClick={() => setSelectedRole(r)}
                          className={cn(
                            "p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between",
                            isSelected
                              ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] text-[var(--bos-text-primary)] font-semibold shadow-xs"
                              : "bg-[var(--bos-bg)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)]/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Shield className={cn("w-4 h-4", isSelected ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-tertiary)]")} />
                            <span>{r}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--bos-accent)]" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-mono text-[var(--bos-text-secondary)] uppercase font-bold">
                        Discipline Scope &amp; Responsibility
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Role Boundary Enforced
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[var(--bos-text-secondary)] leading-relaxed">
                      {TEAM_CONFIG[selectedTeam].ownership}
                    </p>
                    <div className="pt-2 border-t border-[var(--bos-border)] text-[10.5px] text-[var(--bos-text-tertiary)] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                      <span>{TEAM_CONFIG[selectedTeam].dependsOn}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: ASSIGN EMPLOYEE */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
                        Assign Member to Squad
                      </h4>
                      <p className="text-xs text-[var(--bos-text-secondary)]">
                        Pick a workspace employee or invite a new collaborator by email.
                      </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-[var(--bos-bg)] p-1 rounded-lg border border-[var(--bos-border)] text-xs">
                      <button
                        type="button"
                        onClick={() => setEmployeeSourceMode("DIRECTORY")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition cursor-pointer font-medium text-[11px]",
                          employeeSourceMode === "DIRECTORY"
                            ? "bg-[var(--bos-accent)] text-white font-semibold shadow-xs"
                            : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                        )}
                      >
                        Company Directory
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmployeeSourceMode("NEW_EMAIL")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition cursor-pointer font-medium text-[11px]",
                          employeeSourceMode === "NEW_EMAIL"
                            ? "bg-[var(--bos-accent)] text-white font-semibold shadow-xs"
                            : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                        )}
                      >
                        New Email
                      </button>
                    </div>
                  </div>

                  {employeeSourceMode === "DIRECTORY" ? (
                    <div className="space-y-2 p-3.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                      <div className="relative">
                        <input
                          type="text"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          placeholder="Search existing employee by name, email, or role..."
                          className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition"
                        />
                        <Search className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {loadingEmployees ? (
                        <div className="py-6 text-center text-xs text-[var(--bos-text-secondary)] flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--bos-accent)]" />
                          <span>Loading employee directory...</span>
                        </div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[var(--bos-text-tertiary)] italic">
                          No employees match your search.
                        </div>
                      ) : (
                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                          {filteredEmployees.map((emp) => {
                            const isSelected = email.toLowerCase() === emp.email.toLowerCase();
                            return (
                              <div
                                key={emp.id}
                                onClick={() => {
                                  setEmail(emp.email);
                                  setSelectedEmployeeName(emp.fullName);
                                }}
                                className={cn(
                                  "w-full p-2 rounded-lg border text-left transition flex items-center justify-between cursor-pointer",
                                  isSelected
                                    ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] shadow-xs"
                                    : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent)]/50"
                                )}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div className="w-7 h-7 rounded-full bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center text-[11px] font-bold shrink-0">
                                    {emp.fullName?.slice(0, 1) || "E"}
                                  </div>
                                  <div className="truncate">
                                    <span className="text-xs font-semibold text-[var(--bos-text-primary)] block truncate">
                                      {emp.fullName}
                                    </span>
                                    <span className="text-[10.5px] text-[var(--bos-text-tertiary)] block truncate font-mono">
                                      {emp.email} · {emp.role?.name || emp.department || "Staff"}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-[var(--bos-accent)] shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--bos-text-primary)] block">
                        Recipient Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. engineer@company.com"
                          className={cn(
                            "w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bos-bg)] border text-xs text-[var(--bos-text-primary)] outline-none transition font-mono",
                            validationError
                              ? "border-rose-500/60 focus:border-rose-500"
                              : validationResult?.canInvite
                              ? "border-emerald-500/60 focus:border-emerald-500"
                              : "border-[var(--bos-border)] focus:border-[var(--bos-accent)]"
                          )}
                        />
                        <Mail className="w-4 h-4 text-[var(--bos-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Validation Status Notice */}
                  {validatingEmail && (
                    <span className="text-[11px] text-[var(--bos-accent)] flex items-center gap-1.5 px-1 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Validating project membership &amp; role compatibility...
                    </span>
                  )}

                  {validationError ? (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Assignment Conflict:</strong>
                        <span>{validationError}</span>
                      </div>
                    </div>
                  ) : validationResult?.canInvite ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">
                          {validationResult.hasExistingEmployee ? "Company Staff Verified" : "New Member Ready"}:
                        </strong>
                        <span>
                          Ready to assign <strong>{validationResult.employeeName || selectedEmployeeName || email}</strong> to {selectedTeam} squad as {selectedRole}.
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* STEP 5: REVIEW & DISPATCH */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[var(--bos-text-primary)]">
                      Review &amp; Dispatch Squad Invitation
                    </h4>
                    <p className="text-xs text-[var(--bos-text-secondary)]">
                      Verify squad assignment parameters before dispatching verified cryptographic invitation.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[var(--bos-border)] pb-2.5">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[var(--bos-accent)]" />
                        <span className="text-[10.5px] text-[var(--bos-text-secondary)] font-bold uppercase tracking-wider">
                          Assignment Specification
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        Verified Role Boundary
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Target Project</span>
                        <strong className="text-[var(--bos-text-primary)] block font-semibold truncate text-[12.5px]">{selectedProjectName}</strong>
                        <span className="text-[10px] text-[var(--bos-accent)] font-mono">{selectedProjectCode || "PRJ"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Assigned Squad</span>
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold border inline-block", TEAM_CONFIG[selectedTeam].badgeBg)}>
                          {selectedTeam} TEAM
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Role Designation</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 block font-semibold text-[12.5px]">{selectedRole}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block font-mono">Recipient Member</span>
                        <strong className="text-[var(--bos-text-primary)] block font-semibold truncate text-[12.5px]">
                          {validationResult?.employeeName || selectedEmployeeName || "Direct Invitee"}
                        </strong>
                        <span className="text-[10px] text-[var(--bos-text-secondary)] block truncate font-mono">{email}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs space-y-1.5">
                      <div className="text-[10px] text-[var(--bos-text-secondary)] font-bold uppercase font-mono">
                        Squad Scope &amp; Responsibility
                      </div>
                      <p className="text-[11.5px] text-[var(--bos-text-secondary)] leading-relaxed">
                        {TEAM_CONFIG[selectedTeam].ownership}
                      </p>
                      <div className="text-[10.5px] text-[var(--bos-text-tertiary)] pt-1.5 border-t border-[var(--bos-border)] flex items-center gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                        <span>{TEAM_CONFIG[selectedTeam].dependsOn}</span>
                      </div>
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Bar */}
        {!successData && (
          <div className="px-6 py-3.5 border-t border-[var(--bos-border)] flex items-center justify-between bg-[var(--bos-surface-panel)] shrink-0">
            <div>
              {currentStep > startStep ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as StepNumber)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)] border border-[var(--bos-border)] transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-bg)] transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <div>
              {currentStep < 5 ? (
                <button
                  type="button"
                  disabled={!canProceedFromStep(currentStep)}
                  onClick={() => setCurrentStep((prev) => (prev + 1) as StepNumber)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer",
                    canProceedFromStep(currentStep)
                      ? "bg-[var(--bos-accent)] text-white hover:opacity-90 active:scale-98"
                      : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-tertiary)] border border-[var(--bos-border)] cursor-not-allowed"
                  )}
                >
                  <span>Next: {STEP_LABELS[(currentStep + 1) as StepNumber]}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendInvitation}
                  disabled={!email || !validationResult?.canInvite || !!validationError || submitting}
                  className={cn(
                    "px-5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition shadow-xs cursor-pointer",
                    email && validationResult?.canInvite && !validationError && !submitting
                      ? "bg-[var(--bos-accent)] hover:opacity-90 active:scale-98"
                      : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-tertiary)] border border-[var(--bos-border)] cursor-not-allowed"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Issuing Squad Membership...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Squad Invitation</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
