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
  UserCheck,
  Briefcase,
  Layers,
  FileText,
  RotateCcw,
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
    desc: string;
    ownership: string;
    dependsOn: string;
  }
> = {
  FRONTEND: {
    label: "Frontend Team",
    icon: Code2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    desc: "User interface, client components, and interactive UX states.",
    ownership: "Builds client components, responsive layouts, forms, and client validation for approved product areas.",
    dependsOn: "Relies on Backend REST APIs and contract endpoints.",
  },
  BACKEND: {
    label: "Backend Team",
    icon: ServerIcon,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    desc: "API endpoints, domain services, and business rules.",
    ownership: "Develops business domain services, REST APIs, authentication, and validation contracts.",
    dependsOn: "Relies on Database schemas and relational entities.",
  },
  DATABASE: {
    label: "Database Team",
    icon: Database,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    desc: "Schema models, migrations, and query performance.",
    ownership: "Designs Prisma schema entities, migrations, relational foreign keys, and indexes.",
    dependsOn: "Provides clean persistence layer to Backend services.",
  },
  QA: {
    label: "QA Team",
    icon: CheckSquare,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
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
  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || "");
  const [selectedProjectName, setSelectedProjectName] = useState<string>(initialProjectName || "");
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>(initialProjectCode || "");
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [isChangingProject, setIsChangingProject] = useState(!initialProjectId);

  // Workflow state
  const [currentStep, setCurrentStep] = useState<StepNumber>(initialProjectId ? 2 : 1);
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
          if (json.ok && Array.isArray(json.data)) {
            setAvailableProjects(json.data);
            if (!selectedProjectId && json.data.length > 0) {
              const first = json.data[0];
              setSelectedProjectId(first.id);
              setSelectedProjectName(first.name);
              setSelectedProjectCode(first.code || "");
            }
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
      setIsChangingProject(!initialProjectId);
      setSelectedTeam(defaultTeam);
      setSelectedRole(PROJECT_TEAM_ROLES[defaultTeam]?.[0] || "Frontend Developer");
      setCurrentStep(initialProjectId ? 2 : 1);
      setEmail("");
      setValidationResult(null);
      setValidationError(null);
      setSuccessData(null);
      setSubmitError(null);
      setCopiedLink(false);
      setCopiedFormatted(false);
    }
  }, [isOpen, initialProjectId, initialProjectName, initialProjectCode, defaultTeam]);

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
    setIsChangingProject(false);
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
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(projectSearch.toLowerCase())) ||
      (p.client?.companyName && p.client.companyName.toLowerCase().includes(projectSearch.toLowerCase()))
  );

  const filteredEmployees = companyEmployees.filter(
    (e) =>
      e.fullName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.role?.name?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-[#080a10] border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 font-mono">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Invite Member to Project Squad
                </h2>
                <span className="px-2 py-0.2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold">
                  ROLE BOUNDARY ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Assign real employees to authentic project teams: Frontend, Backend, Database, QA.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-Step Process Indicator */}
        {!successData && (
          <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
            {[
              { num: 1, label: "Project" },
              { num: 2, label: "Squad / Team" },
              { num: 3, label: "Role" },
              { num: 4, label: "Employee" },
              { num: 5, label: "Dispatch" },
            ].map((s) => (
              <div
                key={s.num}
                className={cn(
                  "flex items-center gap-1.5",
                  currentStep === s.num
                    ? "text-blue-400 font-bold"
                    : currentStep > s.num
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-500"
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[9px]",
                    currentStep === s.num
                      ? "bg-blue-500 text-white shadow-xs"
                      : currentStep > s.num
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-900 border border-slate-800"
                  )}
                >
                  {currentStep > s.num ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {successData ? (
            /* SUCCESS CONFIRMATION & EXECUTIVE DISPATCH CARD */
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Squad Membership Created &amp; Dispatched
                </h3>
                <p className="text-xs text-slate-400">
                  Secure invitation token issued for <strong className="text-white">{successData.recipientEmail}</strong>.
                </p>
              </div>

              {/* EXECUTIVE SQUAD DISPATCH CARD */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      PROJECT SQUAD ASSIGNMENT SPECIFICATION
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    ACTIVE SQUAD INVITE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Project</span>
                    <strong className="text-white block font-bold truncate">
                      {selectedProjectName} {selectedProjectCode ? `(${selectedProjectCode})` : ""}
                    </strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Squad / Team</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20 inline-block text-[11px]">
                      {selectedTeam} TEAM
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Role</span>
                    <strong className="text-emerald-400 block font-bold">{selectedRole}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Employee</span>
                    <strong className="text-white block truncate">{successData.recipientName}</strong>
                    <span className="text-[10px] text-slate-400 block truncate">{successData.recipientEmail}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-[11px]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Product Ownership Boundary
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {TEAM_CONFIG[selectedTeam].ownership}
                  </p>
                  <p className="text-slate-400 text-[10px] pt-1 border-t border-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-blue-400" />
                    <span>{TEAM_CONFIG[selectedTeam].dependsOn}</span>
                  </p>
                </div>

                {/* Single Use Token Link Box */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>ONBOARDING ACCESS URL:</span>
                    <span className="text-emerald-400 font-bold">EXPIRES IN 7 DAYS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={successData.acceptUrl}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none select-all font-mono"
                    />
                    <button
                      onClick={copyAcceptLink}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Actions: Copy Formatted Invite & Open URL */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={copyFormattedInvitation}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {copiedFormatted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{copiedFormatted ? "Invite Formatted!" : "Copy Formatted Invite"}</span>
                  </button>

                  <a
                    href={successData.acceptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open Onboarding Page</span>
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-bold uppercase transition cursor-pointer"
              >
                Close &amp; Return to Workspace
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: PROJECT CONTEXT / SELECTOR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>STEP 1 — INVOLVED PROJECT</span>
                  </label>
                  {allowProjectChange && (
                    <button
                      type="button"
                      onClick={() => setIsChangingProject(!isChangingProject)}
                      className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {isChangingProject ? "Cancel" : "Switch Project"}
                    </button>
                  )}
                </div>

                {!isChangingProject && selectedProjectId ? (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                          TARGET PROJECT
                        </span>
                        <strong className="text-xs text-white font-bold">
                          {selectedProjectName} {selectedProjectCode ? `(${selectedProjectCode})` : ""}
                        </strong>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 shrink-0">
                      ROOT CONTEXT
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Search active projects by name or code..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {loadingProjects ? (
                      <div className="py-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        <span>Loading projects...</span>
                      </div>
                    ) : filteredProjects.length === 0 ? (
                      <div className="py-4 text-center text-slate-500 text-xs">
                        No projects found.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {filteredProjects.map((p) => {
                          const isSelected = selectedProjectId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectProject(p)}
                              className={cn(
                                "w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer",
                                isSelected
                                  ? "bg-blue-600/15 border-blue-500 text-white font-bold"
                                  : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                              )}
                            >
                              <div className="truncate">
                                <strong className="text-xs text-white block truncate">{p.name}</strong>
                                <span className="text-[10px] text-slate-400">
                                  {p.code || "PRJ"} · {p.client?.companyName || "Client"}
                                </span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 2: SELECT PROJECT TEAM / SQUAD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    STEP 2 — SELECT SQUAD / TEAM
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Dedicated engineering discipline
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
                          "p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5",
                          isSelected
                            ? "bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                            : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", cfg.color)} />
                            <span className="text-xs font-bold text-white">{cfg.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">{cfg.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: SELECT ROLE FOR SQUAD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    STEP 3 — SELECT ROLE FOR {selectedTeam} TEAM
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Official technical title
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                          "px-3 py-2 rounded-xl border text-xs font-medium text-left transition cursor-pointer flex items-center justify-between",
                          isSelected
                            ? "bg-blue-600/15 border-blue-500 text-white font-bold"
                            : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                        )}
                      >
                        <span>{r}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
                  <strong className="text-slate-300">Technical Scope:</strong> {TEAM_CONFIG[selectedTeam].ownership}
                </p>
              </div>

              {/* STEP 4: EMPLOYEE SELECTION (DIRECTORY VS NEW EMAIL) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    STEP 4 — ASSIGN EMPLOYEE
                  </label>
                  
                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setEmployeeSourceMode("DIRECTORY")}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition cursor-pointer",
                        employeeSourceMode === "DIRECTORY"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Company Directory
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeeSourceMode("NEW_EMAIL")}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition cursor-pointer",
                        employeeSourceMode === "NEW_EMAIL"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      New Email
                    </button>
                  </div>
                </div>

                {employeeSourceMode === "DIRECTORY" ? (
                  <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="relative">
                      <input
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Search existing employee by name, email, or role..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {filteredEmployees.map((emp) => {
                        const isSelected = email.toLowerCase() === emp.email.toLowerCase();
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setEmail(emp.email);
                              setCurrentStep(5);
                            }}
                            className={cn(
                              "w-full p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer",
                              isSelected
                                ? "bg-blue-600/15 border-blue-500 text-white font-bold"
                                : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {emp.fullName?.slice(0, 1) || "E"}
                              </div>
                              <div className="truncate">
                                <span className="text-xs text-white font-bold block truncate">
                                  {emp.fullName}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {emp.email} · {emp.role?.name || emp.department || "Staff"}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (currentStep < 5) setCurrentStep(5);
                      }}
                      placeholder="e.g. employee@company.com"
                      className={cn(
                        "w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border text-xs text-white outline-none font-mono transition",
                        validationError
                          ? "border-rose-500/60 focus:border-rose-500"
                          : validationResult?.canInvite
                          ? "border-emerald-500/60 focus:border-emerald-500"
                          : "border-slate-800 focus:border-blue-500"
                      )}
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}

                {/* Validation Status Notice */}
                {validatingEmail && (
                  <span className="text-[10px] text-blue-400 flex items-center gap-1 px-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Validating project membership &amp; role compatibility...
                  </span>
                )}

                {validationError ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Assignment Conflict:</strong>
                      <span>{validationError}</span>
                    </div>
                  </div>
                ) : validationResult?.canInvite ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">
                        {validationResult.hasExistingEmployee ? "Company Staff Verified" : "New Member Ready"}:
                      </strong>
                      <span>
                        Assigning <strong>{validationResult.employeeName}</strong> to {selectedTeam} squad as {selectedRole}.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* STEP 5: THE EXECUTIVE PREVIEW CARD ("BEST EVER SEEN") */}
              {email && validationResult?.canInvite && !validationError && (
                <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>STEP 5 — EXECUTIVE INVITATION SPECIFICATION</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Ready for Dispatch</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/30 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          BUSINESS OS • SQUAD INVITATION
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        VERIFIED ROLE BOUNDARY
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">PROJECT</span>
                        <strong className="text-white block truncate">{selectedProjectName}</strong>
                        <span className="text-[10px] text-blue-400 block">{selectedProjectCode || "PRJ"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">ASSIGNED SQUAD</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20 inline-block text-[11px]">
                          {selectedTeam} TEAM
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">ROLE</span>
                        <strong className="text-emerald-400 block">{selectedRole}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">RECIPIENT</span>
                        <strong className="text-white block truncate">{validationResult.employeeName}</strong>
                        <span className="text-[10px] text-slate-400 block truncate">{email}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Squad Scope &amp; Responsibility</div>
                      <p className="text-slate-300 leading-relaxed">
                        {TEAM_CONFIG[selectedTeam].ownership}
                      </p>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 flex items-center gap-1">
                        <span className="text-emerald-400">✓</span>
                        <span>{TEAM_CONFIG[selectedTeam].dependsOn}</span>
                      </div>
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
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendInvitation}
              disabled={!email || !validationResult?.canInvite || !!validationError || submitting}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-md cursor-pointer",
                email && validationResult?.canInvite && !validationError && !submitting
                  ? "bg-blue-600 hover:bg-blue-500 active:scale-98"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
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
          </div>
        )}

      </div>
    </div>
  );
}
