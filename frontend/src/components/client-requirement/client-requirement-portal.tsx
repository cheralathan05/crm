"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck2,
  FileEdit,
  History,
  Info,
  Layers,
  Lock,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessOSMark } from "@/components/business-os-mark";

/* ────────────────────────────────────────────────────────────────
   CLIENT COLLABORATION PORTAL — EXECUTIVE EXPERIENCE
   Dedicated, focused, client-facing environment:
   Action Required → Focused Decisions → Change Tracking & Reason → Project Understanding Sign-Off
   ZERO internal metrics, ZERO AI confidence numbers, ZERO dashboard bloat.
──────────────────────────────────────────────────────────────── */

export type ClientQuestionItem = {
  id: string;
  section: string;
  category: string;
  question: string;
  whyWeAsk: string;
  answerType: "MULTI_SELECT" | "SINGLE_SELECT" | "LONG_TEXT" | "SHORT_TEXT" | "NUMBER" | "DATE";
  options: string[];
  helpText?: string | null;
  currentAnswer?: string | null;
};

export type ClientUnderstandingBrief = {
  businessObjective: string;
  users: string;
  coreScope: string;
  keyCapabilities: string;
  designDirection: string;
  integrations: string;
  timeline: string;
  commercialUnderstanding: string;
  successCriteria: string;
};

export type ClientPortalInitial = {
  token: string;
  request: {
    reference: string;
    title: string;
    projectType: string;
    status: string;
    companyName: string;
    responderName?: string | null;
    submittedAt?: string | null;
    approvedAt?: string | null;
  };
  questions: ClientQuestionItem[];
  understanding: {
    status: "DRAFT" | "READY_FOR_CLIENT" | "CLIENT_REVIEW" | "CHANGE_REQUESTED" | "APPROVED";
    approvedAt: string | null;
    approvedBy: string | null;
    brief: ClientUnderstandingBrief;
    changeRequests: {
      id: string;
      section: string;
      requestedChange: string;
      reason: string;
      status: string;
      createdAt: string;
    }[];
  };
  recentEvents: { id: string; label: string; detail: string | null; createdAt: string }[];
};

export function ClientRequirementPortal({
  initial,
  isPreviewMode = false,
  onClosePreview,
}: {
  initial: ClientPortalInitial;
  isPreviewMode?: boolean;
  onClosePreview?: () => void;
}) {
  const [data, setData] = useState<ClientPortalInitial>(initial);
  const [activeView, setActiveView] = useState<"home" | "questions" | "understanding">("home");
  const [currentStep, setCurrentStep] = useState(0);

  // Client's working responses: { [section]: { value, previousValue, reason, isChange } }
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        questionId: string;
        section: string;
        value: string | string[];
        previousValue?: string;
        reason?: string;
        isChange?: boolean;
      }
    >
  >(() => {
    const initMap: Record<string, any> = {};
    for (const q of initial.questions) {
      initMap[q.section] = {
        questionId: q.id,
        section: q.section,
        value: q.currentAnswer ? (q.answerType === "MULTI_SELECT" ? q.currentAnswer.split(", ") : q.currentAnswer) : "",
        previousValue: q.currentAnswer ?? "",
        reason: "",
        isChange: false,
      };
    }
    return initMap;
  });

  const [changingSections, setChangingSections] = useState<Record<string, boolean>>({});
  const [responderName, setResponderName] = useState(initial.request.responderName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Understanding view states
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [approvingUnderstanding, setApprovingUnderstanding] = useState(false);
  const [changeDrawerOpen, setChangeDrawerOpen] = useState(false);
  const [changeSection, setChangeSection] = useState("Core scope");
  const [changeText, setChangeText] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [submittingChange, setSubmittingChange] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const questionsList = data.questions.length > 0
    ? data.questions
    : [
        {
          id: "q-default-users",
          section: "users",
          category: "Users & Roles",
          question: "Who will use the platform?",
          whyWeAsk: "Helps us define access levels, permissions matrices, and role design.",
          answerType: "MULTI_SELECT" as const,
          options: ["Administrators", "Employees", "Managers", "Clients / Customers", "Vendors / Partners"],
          currentAnswer: null,
        },
        {
          id: "q-default-scope",
          section: "scope",
          category: "Scope & Boundaries",
          question: "What should be included in Version 1?",
          whyWeAsk: "Ensures we budget and sequence only what is strictly needed for the initial launch.",
          answerType: "LONG_TEXT" as const,
          options: [],
          currentAnswer: null,
        },
        {
          id: "q-default-features",
          section: "features",
          category: "Features & Capabilities",
          question: "Which capabilities are essential for initial release?",
          whyWeAsk: "Defines engineering milestones, sprint capacities, and deliverables.",
          answerType: "MULTI_SELECT" as const,
          options: ["Lead & Client Management", "Project Workspaces", "Task & Work Breakdown", "Invoicing & Payments", "Automations & Alerts"],
          currentAnswer: null,
        },
      ];

  const currentQ = questionsList[currentStep];

  // Answer handler
  const handleAnswerChange = (section: string, val: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        questionId: currentQ.id,
        section,
        value: val,
      },
    }));
  };

  const handleReasonChange = (section: string, reason: string) => {
    setAnswers((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        reason,
        isChange: true,
      },
    }));
  };

  // Submit client answers
  const handleSubmitAnswers = async () => {
    setSubmitting(true);
    try {
      if (!isPreviewMode) {
        const res = await fetch(`/api/public/requirements/${encodeURIComponent(data.token)}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responderName: responderName.trim() || "Client",
            answers,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message ?? "Submission failed.");
        }
      }
      notify("✓ Confirmations submitted to your project team!");
      setActiveView("home");
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Error submitting response.");
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Project Understanding
  const handleApproveUnderstanding = async () => {
    if (!confirmCheckbox) return;
    setApprovingUnderstanding(true);
    try {
      if (!isPreviewMode) {
        const res = await fetch(`/api/public/requirements/${encodeURIComponent(data.token)}/understanding`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "APPROVE",
            responderName: responderName.trim() || "Client Stakeholder",
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Approval failed.");
      }

      setData((prev) => ({
        ...prev,
        understanding: {
          ...prev.understanding,
          status: "APPROVED",
          approvedAt: new Date().toISOString(),
          approvedBy: responderName.trim() || "Client Stakeholder",
        },
      }));
      notify("✓ Project understanding approved! Proposal generation is now unlocked.");
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Error approving project understanding.");
    } finally {
      setApprovingUnderstanding(false);
    }
  };

  // Submit change request on understanding
  const handleSubmitUnderstandingChange = async () => {
    if (!changeText.trim() || !changeReason.trim()) {
      notify("Please specify both what should change and why.");
      return;
    }
    setSubmittingChange(true);
    try {
      if (!isPreviewMode) {
        const res = await fetch(`/api/public/requirements/${encodeURIComponent(data.token)}/understanding`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "REQUEST_CHANGE",
            section: changeSection,
            currentUnderstanding: (data.understanding.brief as any)[changeSection] ?? "",
            requestedChange: changeText.trim(),
            reason: changeReason.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Change request failed.");
      }

      setChangeDrawerOpen(false);
      setChangeText("");
      setChangeReason("");
      notify("✓ Change request sent to your project team for review.");
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Error submitting change request.");
    } finally {
      setSubmittingChange(false);
    }
  };

  const isUnderstandingApproved = data.understanding.status === "APPROVED";

  return (
    <div className="min-h-screen bg-[#0d0f12] text-[#e1e4ea] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-[#161a22] px-4 py-3 text-[13px] font-medium text-emerald-400 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-amber-500/20 bg-amber-950/40 backdrop-blur-md px-6 py-2.5 text-[12px] text-amber-300 font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>ADMIN CLIENT PREVIEW MODE — You are viewing the exact experience the client sees</span>
          </div>
          {onClosePreview && (
            <button
              type="button"
              onClick={onClosePreview}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Close preview
            </button>
          )}
        </div>
      )}

      {/* Navigation Bar */}
      <header className="border-b border-white/[0.08] bg-[#12151c]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <BusinessOSMark size="sm" />
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-tight text-white flex items-center gap-2">
                {data.request.title}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-400">
                  {data.request.companyName}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Private Discovery Workspace · {data.request.reference}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeView !== "home" && (
              <button
                type="button"
                onClick={() => setActiveView("home")}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to workspace
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/[0.08]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-zinc-400 font-mono">End-to-end encrypted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* VIEW 1: CLIENT HOME */}
        {activeView === "home" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Greeting Hero */}
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-400 mb-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" /> Requirement Collaboration
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                Project Discovery & Confirmation
              </h1>
              <p className="mt-2 text-[14px] text-zinc-400 max-w-2xl leading-relaxed">
                Your dedicated workspace for shaping the exact requirements and architecture for{" "}
                <span className="text-zinc-200 font-medium">{data.request.title}</span>. Answer focused questions and
                review the project understanding before your proposal is generated.
              </p>
            </div>

            {/* Primary Action Card: Pending Decisions */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-[#131a22] to-[#10141a] p-6 sm:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-medium">
                    ACTION REQUIRED
                  </div>
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    {questionsList.length} confirmations needed from you
                  </h2>
                  <p className="text-[13px] text-zinc-400 leading-relaxed max-w-lg">
                    Your project team needs a few focused confirmations to finalize the project scope and deliver an accurate
                    commercial proposal.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-[12px] text-zinc-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Approx. 2–3 minutes
                    </span>
                    <span>·</span>
                    <span>{questionsList.length} focused decisions</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(0);
                      setActiveView("questions");
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] font-semibold text-[13px] tracking-wide shadow-lg shadow-emerald-500/20 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Review & respond</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Second Action Card: Project Understanding Brief */}
            <div className="rounded-xl border border-white/[0.08] bg-[#12151c]/70 backdrop-blur-sm p-6 sm:p-8 transition-all hover:border-white/[0.14]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Project Brief</span>
                    {isUnderstandingApproved ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-medium">
                        <Check className="w-3 h-3" /> Approved & Authoritative
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-medium">
                        Awaiting your review
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white tracking-tight">Here's what we understand</h3>
                  <p className="text-[13px] text-zinc-400 leading-relaxed max-w-lg">
                    We've structured your strategic goals, core scope, user roles, integrations, and milestones into an
                    executive project brief.
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveView("understanding")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.08] text-white text-[13px] font-medium transition-colors"
                  >
                    <span>View understanding</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="rounded-xl border border-white/[0.08] bg-[#12151c]/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-zinc-400" />
                  <h4 className="text-[13px] font-semibold text-white">Recent Activity</h4>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">Live Workspace Log</span>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {data.recentEvents.length > 0 ? (
                  data.recentEvents.map((ev) => (
                    <div key={ev.id} className="py-3 flex items-start justify-between gap-4 text-[12px]">
                      <div>
                        <p className="font-medium text-zinc-300">{ev.label}</p>
                        {ev.detail && <p className="text-[11px] text-zinc-400 mt-0.5">{ev.detail}</p>}
                      </div>
                      <span className="shrink-0 text-[10px] font-mono text-zinc-500">
                        {new Date(ev.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-[12px] text-zinc-500">No previous activity recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: GUIDED QUESTION DECISION EXPERIENCE */}
        {activeView === "questions" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Progress Rail */}
            <div className="flex items-center justify-between text-[12px] text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                  Decision {currentStep + 1} of {questionsList.length}
                </span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-300 font-medium">{currentQ.category}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveView("home")}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Exit to summary
              </button>
            </div>

            {/* Stepper bar */}
            <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${((currentStep + 1) / questionsList.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="rounded-xl border border-white/[0.1] bg-[#12151c] p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  Decision 0{currentStep + 1}
                </span>
                <h2 className="text-2xl font-semibold text-white tracking-tight mt-1">{currentQ.question}</h2>
                {currentQ.helpText && <p className="text-[13px] text-zinc-400 mt-2">{currentQ.helpText}</p>}
              </div>

              {/* Previously submitted answer notice (if changing an existing answer) */}
              {currentQ.currentAnswer && (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Current agreed answer</span>
                    <p className="text-[14px] font-medium text-zinc-200 mt-0.5">{currentQ.currentAnswer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setChangingSections((prev) => ({ ...prev, [currentQ.section]: !prev[currentQ.section] }))
                    }
                    className="shrink-0 text-[11px] font-mono text-emerald-400 hover:underline px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
                  >
                    {changingSections[currentQ.section] ? "Cancel edit" : "Change answer"}
                  </button>
                </div>
              )}

              {/* Interactive Input Form */}
              {(!currentQ.currentAnswer || changingSections[currentQ.section]) && (
                <div className="space-y-4 pt-2">
                  {/* MULTI_SELECT / SINGLE_SELECT Option Chips */}
                  {(currentQ.answerType === "MULTI_SELECT" || currentQ.answerType === "SINGLE_SELECT") && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                        {currentQ.answerType === "MULTI_SELECT" ? "Select all that apply" : "Select one option"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentQ.options.map((opt) => {
                          const currentVal = answers[currentQ.section]?.value ?? [];
                          const isSelected = Array.isArray(currentVal)
                            ? currentVal.includes(opt)
                            : currentVal === opt;

                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                if (currentQ.answerType === "MULTI_SELECT") {
                                  const arr = Array.isArray(currentVal) ? [...currentVal] : [];
                                  const next = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
                                  handleAnswerChange(currentQ.section, next);
                                } else {
                                  handleAnswerChange(currentQ.section, opt);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-3 p-3.5 rounded-lg border text-left text-[13px] transition-all duration-150",
                                isSelected
                                  ? "border-emerald-500 bg-emerald-500/10 text-white font-medium shadow-sm shadow-emerald-500/10"
                                  : "border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/[0.16] hover:bg-white/[0.04]",
                              )}
                            >
                              <div
                                className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                                  isSelected
                                    ? "bg-emerald-500 border-emerald-500 text-[#0d0f12]"
                                    : "border-zinc-500 bg-transparent",
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* LONG_TEXT or custom inputs */}
                  {(currentQ.answerType === "LONG_TEXT" || currentQ.answerType === "SHORT_TEXT") && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                        Your confirmation
                      </label>
                      <textarea
                        rows={currentQ.answerType === "LONG_TEXT" ? 4 : 2}
                        value={(answers[currentQ.section]?.value as string) ?? ""}
                        onChange={(e) => handleAnswerChange(currentQ.section, e.target.value)}
                        placeholder="Type your response here..."
                        className="w-full rounded-lg border border-white/[0.1] bg-[#0d0f12] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors resize-y"
                      />
                    </div>
                  )}

                  {/* If client is modifying an existing answer: REQUIRE EXPLANATION */}
                  {changingSections[currentQ.section] && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 animate-in fade-in">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <FileEdit className="w-3.5 h-3.5" />
                        Why are you changing this answer? (Mandatory for review)
                      </label>
                      <input
                        type="text"
                        value={answers[currentQ.section]?.reason ?? ""}
                        onChange={(e) => handleReasonChange(currentQ.section, e.target.value)}
                        placeholder="e.g. Additional internal department approval required; scope expanded."
                        className="w-full h-10 px-3 rounded-md border border-amber-500/30 bg-[#0d0f12] text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-amber-400 transition-colors"
                      />
                      <p className="text-[11px] text-amber-200/70">
                        This reason is presented to your project team with a visual comparison of previous vs new values.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Context Callout: Why We Need This */}
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12px] leading-relaxed">
                  <span className="font-semibold text-white">Why we are asking: </span>
                  <span className="text-zinc-400">{currentQ.whyWeAsk}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>

                {currentStep < questionsList.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s + 1)}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[13px] font-semibold transition-all hover:scale-[1.02]"
                  >
                    <span>Next confirmation</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitAnswers}
                    className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[13px] font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? "Submitting..." : "Submit response"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: PROJECT UNDERSTANDING BRIEF */}
        {activeView === "understanding" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 mb-1">
                  Executive Project Specification
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Here's what we understand</h1>
                <p className="text-[13px] text-zinc-400 mt-1">
                  Review this architectural brief carefully. This represents the authoritative foundation for your proposal.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setChangeDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.08] text-[12px] font-medium text-zinc-200 transition-colors"
                >
                  <FileEdit className="w-3.5 h-3.5 text-amber-400" />
                  Request a change
                </button>
              </div>
            </div>

            {/* Structured Brief Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Objective */}
              <div className="md:col-span-2 rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">01 · Strategic Goal</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Business Objective</h3>
                <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.understanding.brief.businessObjective}
                </p>
              </div>

              {/* Users & Roles */}
              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">02 · Stakeholders</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Users & Access Model</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{data.understanding.brief.users}</p>
              </div>

              {/* Core Scope */}
              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">03 · Boundaries</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Core Scope (Version 1)</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{data.understanding.brief.coreScope}</p>
              </div>

              {/* Key Capabilities */}
              <div className="md:col-span-2 rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">04 · Deliverables</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Key Capabilities & Modules</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line font-mono text-[12px]">
                  {data.understanding.brief.keyCapabilities}
                </p>
              </div>

              {/* Design Direction */}
              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">05 · Interface</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Design & Experience</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{data.understanding.brief.designDirection}</p>
              </div>

              {/* Integrations */}
              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">06 · Ecosystem</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">External Integrations</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{data.understanding.brief.integrations}</p>
              </div>

              {/* Timeline */}
              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">07 · Schedule</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Target Timeline</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{data.understanding.brief.timeline}</p>
              </div>

              {/* Commercial Understanding */}
              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">08 · Model</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Commercial Structure</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed">
                  {data.understanding.brief.commercialUnderstanding}
                </p>
              </div>

              {/* Success Criteria */}
              <div className="md:col-span-2 rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">09 · Verification</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Success Criteria</h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{data.understanding.brief.successCriteria}</p>
              </div>
            </div>

            {/* Approval Callout & Action Bar */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 sm:p-8 space-y-4">
              {isUnderstandingApproved ? (
                <div className="flex items-center gap-3 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                  <div>
                    <h4 className="text-[15px] font-semibold text-white">Project understanding formally approved</h4>
                    <p className="text-[12px] text-emerald-300/80 font-mono mt-0.5">
                      Confirmed by {data.understanding.approvedBy ?? "Client"} on{" "}
                      {new Date(data.understanding.approvedAt ?? Date.now()).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      . This version is locked as authoritative for proposal creation.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h4 className="text-[16px] font-semibold text-white">Formal Business Approval</h4>
                    <p className="text-[13px] text-zinc-400 leading-relaxed">
                      Please confirm that this summary accurately captures the scope, deliverables, and vision for your
                      organization. Once confirmed, your project team will finalize the proposal.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmCheckbox}
                        onChange={(e) => setConfirmCheckbox(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-500 text-emerald-500 focus:ring-emerald-500 bg-[#0d0f12]"
                      />
                      <span className="text-[13px] text-zinc-200">
                        I confirm this accurately represents our discussed requirements.
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={!confirmCheckbox || approvingUnderstanding}
                      onClick={handleApproveUnderstanding}
                      className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[13px] font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      <span>{approvingUnderstanding ? "Approving..." : "Approve project understanding"}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Slide-Over Drawer for Requesting a Change on Understanding */}
      {changeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#12151c] border-l border-white/[0.1] h-full p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Request a Change</h3>
                  <p className="text-[12px] text-zinc-400">Structured change request for your project team</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChangeDrawerOpen(false)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-zinc-400">What section should change?</label>
                  <select
                    value={changeSection}
                    onChange={(e) => setChangeSection(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-white/[0.1] bg-[#0d0f12] text-[13px] text-white outline-none focus:border-emerald-500"
                  >
                    <option value="businessObjective">Business Objective</option>
                    <option value="users">Users & Roles</option>
                    <option value="coreScope">Core Scope (V1)</option>
                    <option value="keyCapabilities">Key Capabilities</option>
                    <option value="designDirection">Design & Experience</option>
                    <option value="integrations">Integrations</option>
                    <option value="timeline">Target Timeline</option>
                    <option value="commercialUnderstanding">Commercial Structure</option>
                    <option value="successCriteria">Success Criteria</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-zinc-400">What should change?</label>
                  <textarea
                    rows={4}
                    value={changeText}
                    onChange={(e) => setChangeText(e.target.value)}
                    placeholder="Describe the exact change you would like to make..."
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0d0f12] p-3 text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-zinc-400">
                    Why is this change needed? (Mandatory)
                  </label>
                  <textarea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Explain the business rationale for this adjustment..."
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0d0f12] p-3 text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 resize-y"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setChangeDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingChange || !changeText.trim() || !changeReason.trim()}
                onClick={handleSubmitUnderstandingChange}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[13px] font-semibold transition-all disabled:opacity-40"
              >
                {submittingChange ? "Submitting..." : "Submit change request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
