"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  FileCheck, 
  Workflow, 
  Lock,
  GitBranch,
  Check,
  ChevronRight
} from "lucide-react";
import { WorkflowStep } from "./types";

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: "Client Submits Requirements",
    phase: "Intake",
    actor: "Client Stakeholder",
    summary: "The client accesses their dedicated secure portal to submit initial project briefs, functional goals, and reference documentation.",
    inputData: "Raw project brief, target deadlines, uploaded wireframes or architectural notes",
    systemAction: "Business OS registers the client organization, encrypts uploaded artifacts, and assigns an account partner",
    outputArtifact: "Client Intake Docket #REQ-INTAKE-01",
    verificationRule: "Portal access authenticated via two-factor magic link; audit timestamp recorded"
  },
  {
    step: 2,
    title: "Business Reviews & Confirms Scope",
    phase: "Scope Confirmation",
    actor: "Product Strategist & Client Partner",
    summary: "The business team reviews submitted criteria. AI drafts clarifying questions for ambiguous points, but sovereign human confirmation is required.",
    inputData: "Intake Docket & automated scope ambiguity extraction report",
    systemAction: "Drafts clarifying question threads to resolve ambiguities before any pricing or commitments are made",
    outputArtifact: "Approved Requirements Specification Matrix",
    verificationRule: "Both client sponsor and technical lead must explicitly confirm all clarified criteria"
  },
  {
    step: 3,
    title: "Commercial Proposal Prepared",
    phase: "Contracting",
    actor: "Commercial Director",
    summary: "A binding commercial proposal is generated directly from approved scope items, calculating phase budgets, margins, and milestone schedules.",
    inputData: "Confirmed Requirements Matrix & company margin parameters",
    systemAction: "Computes delivery estimates, risk contingencies, and constructs milestone payment escrow tranches",
    outputArtifact: "Digital Proposal & Master Services Agreement (MSA)",
    verificationRule: "Zero pricing drift: proposal items directly map 1:1 to confirmed requirement IDs"
  },
  {
    step: 4,
    title: "Client Approves or Requests Changes",
    phase: "Agreement Execution",
    actor: "Client Executive Signer",
    summary: "The client reviews the proposal in their portal, approves milestone terms, or requests adjustments, followed by legal electronic execution.",
    inputData: "Digital Proposal & Milestone Schedule",
    systemAction: "Captures cryptographic signature, secures initial escrow deposit, and updates ledger",
    outputArtifact: "Executed Commercial Contract & Funded Escrow Deposit",
    verificationRule: "Legally binding electronic signature with immutable SHA-256 audit fingerprint"
  },
  {
    step: 5,
    title: "Approved Scope Scaffolds Project",
    phase: "Initialization",
    actor: "Business OS Core Engine",
    summary: "The instant the proposal is signed, the system automatically creates the project workspace, sprints, and critical path graph without manual data entry.",
    inputData: "Executed Contract, Milestone Scope, and Escrow Confirmation",
    systemAction: "Automatically generates project workspace, architecture channels, and team permissions",
    outputArtifact: "Live Project Environment & Critical Path Graph",
    verificationRule: "Requirement baseline permanently frozen; any future additions require formal change order"
  },
  {
    step: 6,
    title: "Work Organized into Workstreams",
    phase: "Sprint Planning",
    actor: "Engineering Program Manager",
    summary: "Milestone scope is partitioned into structured workstreams and tasks with pre-locked dependency gates to prevent out-of-order execution.",
    inputData: "Project Environment & Functional Criteria Matrix",
    systemAction: "Maps task dependencies and assigns specialized engineering roles (Frontend, Backend, QA)",
    outputArtifact: "Sprint Backlog & Dependency Work Order Graph",
    verificationRule: "Prerequisite dependencies must be verified before downstream tasks can unlock"
  },
  {
    step: 7,
    title: "Employees Execute Assigned Work",
    phase: "Execution",
    actor: "Engineers & Specialists",
    summary: "Specialists execute assigned tasks within an isolated, distraction-free build mode with clear acceptance criteria and zero context loss.",
    inputData: "Assigned Work Order, repository branch links, and test requirements",
    systemAction: "Provides focused build terminal, commits tracking, and progress checkpoints",
    outputArtifact: "Pull Request & Code/Design Artifact Submission",
    verificationRule: "Automated test suites and linting must pass before submission drawer can be locked"
  },
  {
    step: 8,
    title: "Authorized Reviewers Approve Submissions",
    phase: "Quality Gate",
    actor: "Technical Lead & QA Auditor",
    summary: "Submitted deliverables undergo rigorous multi-role peer inspection against original client requirements before being merged into the milestone.",
    inputData: "Submitted Artifact, diff inspector, and automated test reports",
    systemAction: "Enforces approval checklist; unblocks dependent tasks upon sovereign approval",
    outputArtifact: "Verified Workstream Deliverable & Sign-Off Record",
    verificationRule: "Requires 2 authorized human approvals; AI cannot override gate criteria"
  },
  {
    step: 9,
    title: "Communication & Activity Remain Connected",
    phase: "Continuous Coordination",
    actor: "All Project Stakeholders",
    summary: "Every discussion, update, and revision remains linked directly to its parent requirement and task, maintaining an unbroken audit trail.",
    inputData: "Task discussion feeds, automated status digests, and client feedback",
    systemAction: "Aggregates context-aware activity timeline and dispatches priority notifications",
    outputArtifact: "Unified Project Ledger & Event Timeline",
    verificationRule: "All messages cryptographically tied to project IDs; zero external data leakage"
  },
  {
    step: 10,
    title: "Deliverables Tracked to Final Delivery",
    phase: "Handoff & Settlement",
    actor: "Client Sponsor & Delivery Principal",
    summary: "The completed milestone bundle is delivered to the client for final inspection, automated escrow disbursement, and warranty release.",
    inputData: "Final Verified Milestone Package & Automated Verification Proofs",
    systemAction: "Generates Client Acceptance Certificate and settles ledger escrow payment",
    outputArtifact: "Client Acceptance Certificate & Settled Ledger Payout",
    verificationRule: "Client marks milestone as fully accepted; escrow automatically routed to corporate treasury"
  }
];

export function WorkflowStory() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = WORKFLOW_STEPS[activeStepIndex];

  const handleNext = () => {
    setActiveStepIndex((prev) => (prev + 1) % WORKFLOW_STEPS.length);
  };

  const handlePrev = () => {
    setActiveStepIndex((prev) => (prev - 1 + WORKFLOW_STEPS.length) % WORKFLOW_STEPS.length);
  };

  return (
    <section id="workflow" className="relative py-32 bg-[#09080d] overflow-hidden border-t border-white/[0.08]">
      {/* Background ambient beam */}
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[500px] bg-[#ff6b3d]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#ff8f5a] uppercase tracking-widest mb-4">
            <Workflow className="w-3.5 h-3.5" />
            <span>End-to-End Traceable Lifecycle</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            THE 10-STEP CONNECTED WORKFLOW
          </h2>

          <p className="text-base sm:text-lg text-white/60 leading-relaxed font-normal">
            Every step is sovereign, traceable, and deterministic.
            AI assists with analysis and organization, but authorized humans maintain total sovereign decision-making.
          </p>
        </div>

        {/* 10-STEP PROGRESS SCRUBBER BAR */}
        <div className="mb-12">
          {/* Step dots & labels */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-3">
            {WORKFLOW_STEPS.map((s, idx) => {
              const isActive = idx === activeStepIndex;
              const isPast = idx < activeStepIndex;

              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`p-2 rounded-xl text-center border transition-all duration-200 focus:outline-none flex flex-col items-center gap-1 ${
                    isActive
                      ? "bg-[#181522] border-[#ff6b3d] shadow-[0_0_15px_rgba(255,107,61,0.3)] text-white scale-105"
                      : isPast
                      ? "bg-[#100e16] border-white/[0.1] text-white/70 hover:border-white/[0.2]"
                      : "bg-[#0b0a0e] border-white/[0.05] text-white/30 hover:border-white/[0.1]"
                  }`}
                >
                  <span className={`text-[10px] font-mono ${isActive ? "text-[#ff8f5a]" : "text-inherit"}`}>
                    {s.step < 10 ? `0${s.step}` : s.step}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? "bg-[#ff6b3d]" : isPast ? "bg-emerald-400" : "bg-white/20"
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Progress bar line */}
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#b5452a] via-[#ff6b3d] to-[#ff8f5a] transition-all duration-300"
              style={{ width: `${((activeStepIndex + 1) / WORKFLOW_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* ACTIVE STEP SPOTLIGHT CARD (Progressive Disclosure) */}
        <div className="rounded-3xl bg-[#0e0d14] border border-white/[0.12] shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Top Bar with Step Counters & Navigation */}
          <div className="px-6 sm:px-8 py-4 bg-[#14121a] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b3d] animate-pulse" />
              <span className="text-xs font-mono text-white/50 tracking-wider uppercase">
                STEP {activeStep.step} OF 10 // PHASE: {activeStep.phase.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.08] transition-colors"
                aria-label="Previous step"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-lg bg-[#ff6b3d]/10 hover:bg-[#ff6b3d]/20 text-[#ff8f5a] hover:text-white border border-[#ff6b3d]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Card Content Grid */}
          <div className="p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Narrative Column */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white/70 mb-4">
                  <UserCheck className="w-3.5 h-3.5 text-[#ff8f5a]" />
                  <span>Sovereign Actor: <strong className="text-white">{activeStep.actor}</strong></span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug mb-4">
                  {activeStep.title}
                </h3>

                <p className="text-sm sm:text-base text-white/75 leading-relaxed mb-8 font-normal">
                  {activeStep.summary}
                </p>

                {/* Audit & Sovereignty Rule */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 mb-6">
                  <div className="text-[11px] font-mono tracking-wider text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sovereignty & Governance Verification</span>
                  </div>
                  <div className="text-xs text-white/80 leading-relaxed">
                    {activeStep.verificationRule}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Data Transformation Inspector */}
            <div className="lg:col-span-6 space-y-3 font-sans">
              <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">
                Data Pipeline Transformation State
              </div>

              {/* Input Data Box */}
              <div className="p-4 rounded-xl bg-black/50 border border-white/[0.06]">
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Input Data Stream</span>
                </div>
                <div className="text-xs sm:text-sm text-white/90 font-medium">
                  {activeStep.inputData}
                </div>
              </div>

              {/* System Action Box */}
              <div className="p-4 rounded-xl bg-[#14121a] border border-[#ff6b3d]/30">
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#ff8f5a] uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff8f5a]" />
                  <span>System Engine Action (AI & Automation)</span>
                </div>
                <div className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                  {activeStep.systemAction}
                </div>
              </div>

              {/* Output Sovereign Artifact Box */}
              <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/25">
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase mb-1">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resulting Sovereign Artifact</span>
                </div>
                <div className="text-xs sm:text-sm text-white font-bold">
                  {activeStep.outputArtifact}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
