"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  User,
  Users,
  Briefcase,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wrench,
  Bot,
  Sparkles,
  ArrowRight,
  Loader2,
  ExternalLink,
  Lock,
  Clock,
  Send,
  HelpCircle,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmployeeOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Loading onboarding workspace…</p>
        </div>
      }
    >
      <EmployeeOnboardingContent />
    </Suspense>
  );
}

function EmployeeOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewEmployeeId = searchParams.get("previewEmployeeId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("IDENTITY");

  // Policy Modal State
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  // Tool Request Modal State
  const [selectedTool, setSelectedTool] = useState<any | null>(null);
  const [toolAccountInput, setToolAccountInput] = useState("");
  const [requestingTool, setRequestingTool] = useState(false);

  // AI Copilot State
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Welcome to Business OS. I am your verified Onboarding Copilot. I have access to your assigned role, squad, projects, policies, and tasks. How can I help you get started?",
    },
  ]);

  // Completion State
  const [completing, setCompleting] = useState(false);

  const loadOnboardingContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = previewEmployeeId
        ? `/api/employee/onboarding?previewEmployeeId=${previewEmployeeId}`
        : `/api/employee/onboarding`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        setContext(json.context);
        // If already completed and not in preview mode, redirect to workspace
        if (json.context.onboardingState?.status === "COMPLETED" && !previewEmployeeId) {
          // Allow staying or direct access
        }
      } else {
        setError(json.message || "Failed to load onboarding context.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading onboarding data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnboardingContext();
  }, [previewEmployeeId]);

  const handleAcknowledgePolicy = async (policyId: string) => {
    try {
      setAcknowledging(true);
      const res = await fetch("/api/employee/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACKNOWLEDGE_POLICY", policyId }),
      });
      const json = await res.json();
      if (json.ok) {
        setSelectedPolicy(null);
        await loadOnboardingContext();
      } else {
        alert(json.message || "Failed to acknowledge policy.");
      }
    } catch {
      alert("Error acknowledging policy.");
    } finally {
      setAcknowledging(false);
    }
  };

  const handleRequestToolAccess = async (toolId: string) => {
    try {
      setRequestingTool(true);
      const res = await fetch("/api/employee/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_TOOL_ACCESS",
          toolId,
          accountIdentifier: toolAccountInput,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSelectedTool(null);
        setToolAccountInput("");
        await loadOnboardingContext();
      } else {
        alert(json.message || "Failed to request tool access.");
      }
    } catch {
      alert("Error requesting tool access.");
    } finally {
      setRequestingTool(false);
    }
  };

  const handleAskCopilot = async (q?: string) => {
    const query = q || copilotQuestion;
    if (!query.trim()) return;

    const newMsgs = [...copilotMessages, { role: "user" as const, content: query.trim() }];
    setCopilotMessages(newMsgs);
    setCopilotQuestion("");
    setCopilotLoading(true);

    try {
      const res = await fetch("/api/employee/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setCopilotMessages([...newMsgs, { role: "assistant", content: json.answer }]);
      } else {
        setCopilotMessages([
          ...newMsgs,
          { role: "assistant", content: json.answer || "Unable to retrieve authorized context." },
        ]);
      }
    } catch {
      setCopilotMessages([
        ...newMsgs,
        { role: "assistant", content: "Network error connecting to Copilot." },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      setCompleting(true);
      const res = await fetch("/api/employee/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE_ONBOARDING" }),
      });
      const json = await res.json();
      if (json.ok) {
        router.push("/employee/work");
      } else {
        alert(json.message || "Could not complete onboarding.");
      }
    } catch {
      alert("Error completing onboarding.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent)]/30 flex items-center justify-center text-[var(--bos-accent)] animate-pulse font-mono font-bold">
          ⬡
        </div>
        <p className="text-xs font-mono text-[var(--bos-text-secondary)] tracking-wider uppercase">
          Resolving Employee Operating Context...
        </p>
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-[var(--bos-surface)] border border-rose-500/30 rounded-2xl text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-[var(--bos-text-primary)]">
            Activation Context Error
          </h2>
          <p className="text-xs font-mono text-[var(--bos-text-secondary)]">
            {error || "Unable to load employee workspace context."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { identity, organization, role, team, manager, readiness, permissions, projects, tasks, nextBestAction, policies, tools, peopleGraph } = context;

  const tabs = [
    { id: "IDENTITY", label: "01 Identity", icon: User },
    { id: "ROLE", label: "02 Role Purpose", icon: Briefcase },
    { id: "ACCESS", label: "03 Permissions", icon: Shield },
    { id: "TEAM", label: "04 Squad & Contacts", icon: Users },
    { id: "WORK", label: "05 Projects & Tasks", icon: FolderKanban },
    { id: "POLICIES", label: "06 Compliance & Policies", icon: FileText, badge: readiness.policiesReady ? null : "Action Required" },
    { id: "TOOLS", label: "07 Tool Access", icon: Wrench },
    { id: "COPILOT", label: "08 AI Copilot", icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col antialiased">
      
      {/* Preview Mode Banner if active */}
      {previewEmployeeId && (
        <div className="bg-[var(--bos-accent)] text-white px-6 py-2 text-xs font-mono font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>PREVIEW MODE — Viewing live workspace experience as {identity.fullName} ({role.name})</span>
          </div>
          <span className="opacity-80">Admin Verification View</span>
        </div>
      )}

      {/* ── TOP ARCHITECTURAL COMMAND STRIP ─────────────────────────── */}
      <header className="border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Identity & Org Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent)]/30 text-[var(--bos-accent)] flex items-center justify-center font-bold text-sm font-mono shadow-xs">
              {identity.fullName ? identity.fullName.slice(0, 2).toUpperCase() : "EM"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[var(--bos-text-primary)]">
                  {identity.fullName}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[var(--bos-line)] text-[10px] font-mono font-semibold text-[var(--bos-text-secondary)]">
                  {identity.employeeCode}
                </span>
                <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">
                  @ {organization.name}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--bos-accent)]">
                {role.name} · {team.name}
              </p>
            </div>
          </div>

          {/* Readiness Gauge & Enter Workspace Action */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
              <div className="w-16 bg-[var(--bos-line)] h-1.5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    readiness.status === "COMPLETED" || readiness.score === 100
                      ? "bg-emerald-500"
                      : readiness.status === "BLOCKED"
                        ? "bg-amber-500"
                        : "bg-[var(--bos-accent)]",
                  )}
                  style={{ width: `${readiness.score}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-[var(--bos-text-primary)]">
                {readiness.score}% READY
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[9.5px] font-mono font-bold uppercase",
                  readiness.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : readiness.status === "BLOCKED"
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20",
                )}
              >
                {readiness.status.replace("_", " ")}
              </span>
            </div>

            <button
              type="button"
              disabled={completing}
              onClick={handleCompleteOnboarding}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                readiness.policiesReady
                  ? "bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white"
                  : "bg-[var(--bos-line)] text-[var(--bos-text-tertiary)] opacity-60",
              )}
            >
              {completing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Entering Workspace...</span>
                </>
              ) : (
                <>
                  <span>Enter My Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ── REAL BLOCKERS BANNER (IF ANY) ────────────────────────────── */}
      {readiness.blockers.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {readiness.blockers[0].title}
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block sm:inline sm:ml-2">
                  {readiness.blockers[0].description}
                </span>
              </div>
            </div>
            {readiness.blockers[0].actionType === "ACKNOWLEDGE_POLICY" && (
              <button
                type="button"
                onClick={() => setActiveTab("POLICIES")}
                className="px-3 py-1 bg-amber-600 text-white rounded-md text-[11px] font-mono font-bold hover:bg-amber-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                {readiness.blockers[0].actionText} →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTAINER ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full p-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Left Navigation Matrix (3 Cols) */}
        <aside className="w-full md:w-64 shrink-0 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-text-tertiary)] px-3 mb-2 block">
            ACTIVATION PIPELINE
          </span>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all text-left cursor-pointer",
                  isActive
                    ? "bg-[var(--bos-surface)] border border-[var(--bos-border-strong)] text-[var(--bos-accent)] shadow-xs font-bold"
                    : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-surface)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-xs bg-amber-500/20 text-amber-600 text-[9px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Right Active Workspace Panel (9 Cols) */}
        <section className="flex-1 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl p-6 shadow-xs overflow-hidden">
          
          {/* TAB 01: IDENTITY */}
          {activeTab === "IDENTITY" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[var(--bos-line)] pb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  YOUR BUSINESS OS IDENTITY
                </span>
                <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                  Verified Employee Profile
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Your identity card in {organization.name}&apos;s operating graph.
                </p>
              </div>

              {/* Visual Identity Card */}
              <div className="p-6 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-4 max-w-xl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent)]/30 text-[var(--bos-accent)] flex items-center justify-center font-bold text-xl font-mono">
                    {identity.fullName ? identity.fullName.slice(0, 2).toUpperCase() : "EM"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--bos-text-primary)]">
                      {identity.fullName}
                    </h3>
                    <p className="text-xs font-mono text-[var(--bos-accent)] font-semibold">
                      {role.name}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      {organization.name} · {team.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--bos-border)]/60 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">EMPLOYEE ID</span>
                    <span className="font-semibold text-[var(--bos-text-primary)]">{identity.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">WORK EMAIL</span>
                    <span className="font-semibold text-[var(--bos-text-primary)]">{identity.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">DEPARTMENT</span>
                    <span className="font-semibold text-[var(--bos-text-primary)]">{identity.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">REPORTS TO</span>
                    <span className="font-semibold text-[var(--bos-text-primary)]">{manager.name} ({manager.role})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">LOCATION</span>
                    <span className="font-semibold text-[var(--bos-text-primary)]">{identity.location}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] block">JOIN DATE</span>
                    <span className="font-semibold text-[var(--bos-text-primary)]">
                      {new Date(identity.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("ROLE")}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue to Role & Responsibilities</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 02: ROLE PURPOSE */}
          {activeTab === "ROLE" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[var(--bos-line)] pb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  ROLE ARCHITECTURE
                </span>
                <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                  {role.name} ({role.code})
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Why this position exists in {organization.name} and expected delivery outputs.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-accent)]">
                    PURPOSE OF THIS ROLE
                  </span>
                  <p className="text-xs text-[var(--bos-text-primary)] leading-relaxed">
                    {role.purpose}
                  </p>
                </div>

                <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)]">
                    PRIMARY RESPONSIBILITY
                  </span>
                  <p className="text-xs font-semibold text-[var(--bos-text-primary)]">
                    {role.primaryResponsibility}
                  </p>
                </div>

                {role.secondaryResponsibilities.length > 0 && (
                  <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)]">
                      KEY DELIVERABLES & ACCOUNTABILITIES
                    </span>
                    <ul className="space-y-1.5 text-xs text-[var(--bos-text-secondary)]">
                      {role.secondaryResponsibilities.map((resp: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[var(--bos-accent)] font-bold">›</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("ACCESS")}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review Permissions & Access</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 03: ACCESS & PERMISSIONS */}
          {activeTab === "ACCESS" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[var(--bos-line)] pb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  SECURITY & PERMISSION MATRIX
                </span>
                <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                  Granted Capabilities vs Restrictions
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Derived from your verified role ({role.name}) in the organization.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Permitted Actions */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs font-mono">
                    <Check className="w-4 h-4" />
                    <span>AUTHORIZED CAPABILITIES</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--bos-text-primary)] font-mono">
                    {permissions.can.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Restricted Actions */}
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs font-mono">
                    <Lock className="w-4 h-4" />
                    <span>ORGANIZATION RESTRICTIONS</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--bos-text-secondary)] font-mono">
                    {permissions.cannot.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("TEAM")}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Explore Squad & People Graph</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 04: SQUAD & CONTACTS */}
          {activeTab === "TEAM" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[var(--bos-line)] pb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  SQUAD & PEOPLE GRAPH
                </span>
                <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                  {team.name} ({team.code})
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  {team.description || "Operational execution squad."}
                </p>
              </div>

              {/* Who to contact */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)] block">
                  WHO TO CONTACT FOR GUIDANCE
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {peopleGraph.map((person: any, idx: number) => (
                    <div key={idx} className="p-3.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                      <span className="text-[10px] font-mono font-bold text-[var(--bos-accent)] block">
                        {person.purpose}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--bos-text-primary)]">
                          {person.name}
                        </h4>
                        <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] block">
                          {person.roleTitle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Squad Members */}
              {team.members.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)] block">
                    SQUAD COLLEAGUES ({team.members.length})
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {team.members.map((member: any) => (
                      <div key={member.id} className="p-2.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-[var(--bos-line)] text-[var(--bos-text-secondary)] flex items-center justify-center text-[10px] font-bold font-mono">
                          {member.name ? member.name.slice(0, 2).toUpperCase() : "TM"}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-[11px] font-bold text-[var(--bos-text-primary)] truncate">
                            {member.name}
                          </div>
                          <div className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)]">
                            {member.code}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("WORK")}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Inspect Projects & Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 05: PROJECTS & TASKS */}
          {activeTab === "WORK" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[var(--bos-line)] pb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  OPERATIONAL WORK MATRIX
                </span>
                <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                  Assigned Projects & Next Best Action
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Live assignments connected to your verified workspace identity.
                </p>
              </div>

              {/* Next Best Action Spotlight */}
              {nextBestAction ? (
                <div className="p-4 bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent)]/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                      ★ YOUR HIGHEST-PRIORITY ACTION
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--bos-accent)] text-white text-[10px] font-mono font-bold">
                      {nextBestAction.priority}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[var(--bos-text-primary)]">
                      {nextBestAction.taskCode}: {nextBestAction.title}
                    </h3>
                    <p className="text-xs text-[var(--bos-text-secondary)] mt-1">
                      {nextBestAction.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)] pt-2 border-t border-[var(--bos-accent)]/20">
                    <span>Project: {nextBestAction.projectName}</span>
                    <span>Due: {nextBestAction.dueAt ? new Date(nextBestAction.dueAt).toLocaleDateString() : "Flexible"}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-center space-y-1">
                  <p className="text-xs font-mono text-[var(--bos-text-secondary)]">
                    No initial tasks have been assigned yet. Your squad lead will assign your first sprint backlog.
                  </p>
                </div>
              )}

              {/* Projects List */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-text-tertiary)] block">
                  ALLOCATED CLIENT PROJECTS ({projects.length})
                </span>
                {projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projects.map((proj: any) => (
                      <div key={proj.id} className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-[var(--bos-accent)]">
                            {proj.code}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                            {proj.stage}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--bos-text-primary)]">
                          {proj.name}
                        </h4>
                        <p className="text-[11px] text-[var(--bos-text-secondary)]">
                          Client: {proj.clientName} ({proj.clientIndustry})
                        </p>
                        <p className="text-[10px] font-mono text-[var(--bos-text-tertiary)] pt-1 border-t border-[var(--bos-border)]/60">
                          {proj.whyYouAreHere}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-[var(--bos-text-tertiary)] italic">
                    No project allocations configured yet.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("POLICIES")}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review Compliance Policies</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 06: COMPLIANCE POLICIES */}
          {activeTab === "POLICIES" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[var(--bos-line)] pb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  COMPLIANCE & LEGAL PERIMETER
                </span>
                <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                  Required Organization Policies
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Mandatory acknowledgements required before entering active production.
                </p>
              </div>

              <div className="space-y-3">
                {policies.map((policy: any) => (
                  <div
                    key={policy.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      policy.isAcknowledged
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-amber-500/5 border-amber-500/30",
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[var(--bos-accent)]">
                          {policy.policyCode} (v{policy.version})
                        </span>
                        {policy.isRequired && (
                          <span className="text-[9px] font-mono uppercase bg-rose-500/10 text-rose-600 px-1.5 py-0.2 rounded-xs">
                            Required
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-[var(--bos-text-primary)] mt-0.5">
                        {policy.title}
                      </h4>
                      <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-2 mt-1">
                        {policy.content}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {policy.isAcknowledged ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-mono font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Acknowledged</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedPolicy(policy)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer"
                        >
                          Review & Sign →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("TOOLS")}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Inspect Tool Access</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 07: TOOL ACCESS */}
          {activeTab === "TOOLS" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[var(--bos-line)] pb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  TOOL ACCESS CENTER
                </span>
                <h2 className="text-lg font-bold text-[var(--bos-text-primary)] mt-1">
                  Connected Development & Collaboration Tools
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)]">
                  Verify tool accounts and request workspace permissions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tools.map((tool: any) => (
                  <div key={tool.id} className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--bos-text-primary)]">
                        {tool.toolName}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-xs text-[9.5px] font-mono font-bold uppercase",
                          tool.status === "CONNECTED"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : tool.status === "ACCESS_REQUESTED"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-[var(--bos-line)] text-[var(--bos-text-tertiary)]",
                        )}
                      >
                        {tool.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                      {tool.accountIdentifier ? `Linked: ${tool.accountIdentifier}` : "Not linked"}
                    </p>

                    {tool.status !== "CONNECTED" && tool.status !== "ACCESS_REQUESTED" && (
                      <button
                        type="button"
                        onClick={() => setSelectedTool(tool)}
                        className="w-full py-1.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:bg-[var(--bos-line)] text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        Request Access →
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("COPILOT")}
                  className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open AI Onboarding Copilot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 08: AI ONBOARDING COPILOT */}
          {activeTab === "COPILOT" && (
            <div className="space-y-4 animate-in fade-in duration-200 flex flex-col h-[520px]">
              <div className="border-b border-[var(--bos-line)] pb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                  AUTHENTICATED ONBOARDING COPILOT
                </span>
                <h2 className="text-sm font-bold text-[var(--bos-text-primary)]">
                  Ask About Your Role, Projects, Manager, or First Tasks
                </h2>
                <p className="text-[11px] text-[var(--bos-text-secondary)] font-mono">
                  Grounded in your real verified database records with zero hallucinations.
                </p>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl">
                {copilotMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-xl text-xs font-mono max-w-[85%]",
                      msg.role === "user"
                        ? "ml-auto bg-[var(--bos-accent)] text-white"
                        : "mr-auto bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] whitespace-pre-line leading-relaxed",
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {copilotLoading && (
                  <div className="p-3 rounded-xl text-xs font-mono bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-tertiary)] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing authorized database context...</span>
                  </div>
                )}
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  "What is my next best action?",
                  "Explain my assigned projects",
                  "What are my role responsibilities?",
                  "Who is my squad lead?",
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskCopilot(prompt)}
                    className="px-2.5 py-1 rounded-full bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[10px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-accent)] whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask Copilot anything regarding your workspace..."
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskCopilot()}
                  className="flex-1 px-3.5 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs font-mono text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />
                <button
                  type="button"
                  disabled={copilotLoading || !copilotQuestion.trim()}
                  onClick={() => handleAskCopilot()}
                  className="p-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* ── POLICY ACKNOWLEDGEMENT MODAL ─────────────────────────────── */}
      {selectedPolicy && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="border-b border-[var(--bos-line)] pb-3">
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-accent)]">
                {selectedPolicy.policyCode} (v{selectedPolicy.version})
              </span>
              <h3 className="text-base font-bold text-[var(--bos-text-primary)] mt-0.5">
                {selectedPolicy.title}
              </h3>
            </div>

            <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs font-mono text-[var(--bos-text-secondary)] max-h-60 overflow-y-auto leading-relaxed">
              {selectedPolicy.content}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--bos-line)]">
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={acknowledging}
                onClick={() => handleAcknowledgePolicy(selectedPolicy.id)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {acknowledging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing & Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Acknowledge & Sign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOOL ACCESS REQUEST MODAL ────────────────────────────────── */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="border-b border-[var(--bos-line)] pb-3">
              <span className="text-[10px] font-mono font-bold uppercase text-[var(--bos-accent)]">
                REQUEST ACCESS
              </span>
              <h3 className="text-base font-bold text-[var(--bos-text-primary)] mt-0.5">
                {selectedTool.toolName}
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">
                Account Handle or Work Email:
              </label>
              <input
                type="text"
                placeholder="e.g. your-github-username"
                value={toolAccountInput}
                onChange={(e) => setToolAccountInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs font-mono text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--bos-line)]">
              <button
                type="button"
                onClick={() => setSelectedTool(null)}
                className="px-4 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={requestingTool || !toolAccountInput.trim()}
                onClick={() => handleRequestToolAccess(selectedTool.id)}
                className="px-5 py-2 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {requestingTool ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Access Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
