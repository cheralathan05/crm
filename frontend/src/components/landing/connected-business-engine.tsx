"use client";

import { useState } from "react";
import { 
  Building2, 
  FileText, 
  PenTool, 
  FolderKanban, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  GitCommit,
  Check,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { StageItem } from "./types";

const STAGES: StageItem[] = [
  {
    id: "clients",
    name: "CLIENTS",
    shortDesc: "Intake & CRM",
    headline: "Unified Client Dossier & Structured Intake",
    description: "Every relationship begins with structured visibility. Clients receive a dedicated branded portal to submit briefs, upload assets, track ongoing initiatives, and communicate directly without lost email threads.",
    problemSolved: "Eliminates fragmented WhatsApp messages, ambiguous email chains, and disconnected Google Drives.",
    inputArtifact: "Client Organization Onboarding & Discovery Brief",
    outputArtifact: "Verified Client Account & Initial Requirements Docket",
    responsibleRole: "Account Director & Client Sponsor",
    keyMetrics: [
      { label: "Intake Speed", value: "3x Faster" },
      { label: "Brief Clarity", value: "98.4%" },
    ],
    connectedNext: "requirements",
    connectedPrev: "delivery",
    color: "#ff6b3d",
    iconName: "Building2"
  },
  {
    id: "requirements",
    name: "REQUIREMENTS",
    shortDesc: "Scope & Clarification",
    headline: "AI-Assisted Scope Decomposition & Consensus",
    description: "Transform unstructured client requests into concrete, testable functional criteria. Business OS automatically drafts clarifying questions for ambiguous points before code is ever written.",
    problemSolved: "Stops scope creep before it starts; guarantees both engineering and client agree on exact definitions.",
    inputArtifact: "Raw Intake Brief & Client Artifacts",
    outputArtifact: "Approved Requirements Specification & Criteria Matrix",
    responsibleRole: "Product Strategist & Technical Lead",
    keyMetrics: [
      { label: "Disambiguation", value: "100% Resolved" },
      { label: "Scope Creep", value: "0% Unbilled" },
    ],
    connectedNext: "proposals",
    connectedPrev: "clients",
    color: "#ff8f5a",
    iconName: "FileText"
  },
  {
    id: "proposals",
    name: "PROPOSALS",
    shortDesc: "Contracts & Milestones",
    headline: "Transparent Milestone Pricing & Digital Signoff",
    description: "Generate comprehensive commercial proposals bound directly to confirmed requirements. Includes phase breakdowns, milestone payments, legal assurances, and built-in electronic client signature.",
    problemSolved: "Eliminates pricing friction, misaligned delivery dates, and delayed contracts.",
    inputArtifact: "Approved Requirements Specification",
    outputArtifact: "Signed Commercial Master Service Agreement & Escrow Deposit",
    responsibleRole: "Commercial Lead & Client Executive",
    keyMetrics: [
      { label: "Close Rate", value: "84.2%" },
      { label: "Turnaround", value: "< 24 Hours" },
    ],
    connectedNext: "projects",
    connectedPrev: "requirements",
    color: "#d46a4e",
    iconName: "PenTool"
  },
  {
    id: "projects",
    name: "PROJECTS",
    shortDesc: "Scaffolding & Workstreams",
    headline: "Instant Project Scaffolding from Signed Scope",
    description: "The moment a proposal is approved, Business OS automatically scaffolds the project architecture: workstreams, dependency graph, timeline milestones, and budget allocations with zero manual re-entry.",
    problemSolved: "No manual transfer of proposal spreadsheets into Jira or Trello; single unified data lineage.",
    inputArtifact: "Executed Commercial Contract & Milestone Schedule",
    outputArtifact: "Active Project Workspaces, Critical Path Graph & Sprints",
    responsibleRole: "Engineering Program Manager",
    keyMetrics: [
      { label: "Scaffold Time", value: "Instantaneous" },
      { label: "Dependency Health", value: "Automated Lock" },
    ],
    connectedNext: "teams",
    connectedPrev: "proposals",
    color: "#ff5f38",
    iconName: "FolderKanban"
  },
  {
    id: "teams",
    name: "TEAMS",
    shortDesc: "Execution & Review",
    headline: "Role-Gated Workrooms & Peer Review Quality Gates",
    description: "Engineers and specialists access distraction-free execution environments. Work submissions require multi-tier verification before advancing, ensuring dependencies never break.",
    problemSolved: "Stops unverified code from progressing to release; enforces sovereign human accountability.",
    inputArtifact: "Sprint Work Orders & Architectural Guidelines",
    outputArtifact: "Verified Code PRs, Asset Deliverables & Signoff Proofs",
    responsibleRole: "Lead Engineers & Quality Auditors",
    keyMetrics: [
      { label: "Review Compliance", value: "100% Gated" },
      { label: "Rework Rate", value: "-62%" },
    ],
    connectedNext: "delivery",
    connectedPrev: "projects",
    color: "#e27659",
    iconName: "Users"
  },
  {
    id: "delivery",
    name: "DELIVERY",
    shortDesc: "Verification & Release",
    headline: "Audited Deliverable Bundles & Escrow Payout",
    description: "Complete transparency at the finish line. Clients inspect live artifacts, verified test suites, and sign off on completion, triggering automatic invoice settlement and milestone payouts.",
    problemSolved: "Ends payment collection delays and disputed deliverables through indisputable proof logs.",
    inputArtifact: "Final Verified Deliverable Bundle & Automated Test Suite",
    outputArtifact: "Client Acceptance Certificate & Settled Ledger Payout",
    responsibleRole: "Delivery Principal & Client Sponsor",
    keyMetrics: [
      { label: "On-Time Ratio", value: "99.4%" },
      { label: "Client NPS", value: "94 / 100" },
    ],
    connectedNext: "clients",
    connectedPrev: "teams",
    color: "#ff9d73",
    iconName: "CheckCircle"
  }
];

export function ConnectedBusinessEngine() {
  const [activeStageId, setActiveStageId] = useState<string>("requirements");

  const activeIndex = STAGES.findIndex((s) => s.id === activeStageId);
  const activeStage = STAGES[activeIndex] || STAGES[1];

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % STAGES.length;
    setActiveStageId(STAGES[nextIdx].id);
  };

  const handlePrev = () => {
    const prevIdx = (activeIndex - 1 + STAGES.length) % STAGES.length;
    setActiveStageId(STAGES[prevIdx].id);
  };

  return (
    <section id="engine" className="relative py-28 bg-[#09080c] overflow-hidden border-t border-white/[0.08]">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#ff6b3d]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#ff8f5a] uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Signature Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            THE CONNECTED BUSINESS ENGINE
          </h2>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed">
            A single, continuous loop where every stage directly feeds the next.
            Select any phase to examine its data lineage, real interface, and operational mechanics.
          </p>
        </div>

        {/* STAGE NAVIGATOR CONDUIT (Interactive 3D Stage Ribbon) */}
        <div className="relative mb-12">
          {/* Conduit line backdrop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-white/[0.08] -translate-y-1/2 z-0">
            {/* Glowing active beam */}
            <div 
              className="h-full bg-gradient-to-r from-[#b5452a] via-[#ff6b3d] to-[#ff8f5a] transition-all duration-500 shadow-[0_0_12px_#ff6b3d]"
              style={{
                width: `${((activeIndex + 1) / STAGES.length) * 100}%`
              }}
            />
          </div>

          {/* Stage Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
            {STAGES.map((stage, idx) => {
              const isActive = stage.id === activeStageId;
              const isPast = idx < activeIndex;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  className={`group relative text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-300 focus:outline-none ${
                    isActive
                      ? "bg-[#16131c] border-[#ff6b3d] shadow-[0_0_25px_rgba(255,107,61,0.25)] scale-[1.02]"
                      : isPast
                      ? "bg-[#100f13]/80 border-white/[0.1] hover:border-white/[0.2]"
                      : "bg-[#0c0b0f]/60 border-white/[0.06] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono tracking-widest ${
                      isActive ? "text-[#ff8f5a]" : "text-white/40"
                    }`}>
                      0{idx + 1}
                    </span>
                    <div className={`w-2 h-2 rounded-full transition-all ${
                      isActive 
                        ? "bg-[#ff6b3d] shadow-[0_0_8px_#ff6b3d]" 
                        : isPast 
                        ? "bg-white/40" 
                        : "bg-white/10"
                    }`} />
                  </div>
                  <div className={`text-xs sm:text-sm font-bold tracking-tight mb-0.5 ${
                    isActive ? "text-white" : "text-white/70 group-hover:text-white"
                  }`}>
                    {stage.name}
                  </div>
                  <div className="text-[11px] text-white/40 truncate">
                    {stage.shortDesc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE STAGE DEEP DIVE PANEL (Expandable Spatial Layout) */}
        <div className="rounded-2xl bg-[#0f0e13] border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Top Stage Bar */}
          <div className="px-6 py-4 bg-[#141219] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b3d] animate-pulse" />
              <span className="text-xs font-mono tracking-wider text-white/40 uppercase">
                ACTIVE PHASE: 0{activeIndex + 1} / 06
              </span>
              <span className="text-white/20">|</span>
              <span className="text-xs font-bold text-white tracking-wide">{activeStage.name}</span>
            </div>

            {/* Prev / Next Stage Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev: {STAGES[(activeIndex - 1 + STAGES.length) % STAGES.length].name}</span>
              </button>
              <button
                onClick={handleNext}
                className="px-3 py-1.5 rounded-md bg-[#ff6b3d]/10 hover:bg-[#ff6b3d]/20 text-[#ff8f5a] hover:text-white border border-[#ff6b3d]/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <span className="hidden sm:inline">Next: {STAGES[(activeIndex + 1) % STAGES.length].name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Deep Content Grid */}
          <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Narrative Column */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug mb-4">
                  {activeStage.headline}
                </h3>
                <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-6 font-normal">
                  {activeStage.description}
                </p>

                {/* Problem Solved Callout */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] mb-6">
                  <div className="text-[11px] font-mono tracking-wider text-[#ff8f5a] uppercase mb-1.5 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Structural Friction Eliminated</span>
                  </div>
                  <div className="text-xs text-white/80 leading-relaxed">
                    {activeStage.problemSolved}
                  </div>
                </div>

                {/* Artifact Lineage */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                    <div className="w-6 h-6 rounded bg-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-mono text-white/60">IN</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-white/40 uppercase">Input Artifact</div>
                      <div className="text-xs font-medium text-white/90">{activeStage.inputArtifact}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                    <div className="w-6 h-6 rounded bg-[#ff6b3d]/20 border border-[#ff6b3d]/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-mono text-[#ff8f5a]">OUT</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#ff8f5a] uppercase">Output Sovereign Artifact</div>
                      <div className="text-xs font-semibold text-white">{activeStage.outputArtifact}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsible Role & Metric Badges */}
              <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">Sovereign Authority</div>
                  <div className="text-xs font-semibold text-white">{activeStage.responsibleRole}</div>
                </div>
                <div className="flex gap-4">
                  {activeStage.keyMetrics.map((m) => (
                    <div key={m.label} className="text-right">
                      <div className="text-base font-bold text-[#ff8f5a] font-mono">{m.value}</div>
                      <div className="text-[10px] text-white/40">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Interactive Product Demonstration Viewport */}
            <div className="lg:col-span-7 rounded-xl bg-[#08070b] border border-white/[0.1] p-5 shadow-2xl relative">
              {/* Terminal Frame Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-[10px] font-mono text-white/40">
                    BOS-PREVIEW // {activeStage.id.toUpperCase()}-MODULE.tsx
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  REAL-TIME SYNC
                </span>
              </div>

              {/* Dynamic Mock Product Interface for Active Stage */}
              {activeStage.id === "clients" && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div>
                      <div className="text-xs font-bold text-white">Acme Global Technologies</div>
                      <div className="text-[11px] text-white/40">Enterprise Tier · 3 Projects Active</div>
                    </div>
                    <span className="px-2 py-1 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/25">
                      INVITED & ACTIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                      <div className="text-white/40 text-[10px] uppercase font-mono">Client Intake Portal</div>
                      <div className="text-sm font-semibold text-white mt-1">portal.businessos.com/acme</div>
                      <div className="text-[10px] text-emerald-400 mt-1">✓ End-to-End Encrypted</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                      <div className="text-white/40 text-[10px] uppercase font-mono">Primary Sponsor</div>
                      <div className="text-sm font-semibold text-white mt-1">Sarah Jenkins (VP Eng)</div>
                      <div className="text-[10px] text-white/50 mt-1">Last active 12m ago</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#110f16] border border-white/[0.08]">
                    <div className="text-[11px] font-semibold text-white mb-2 flex items-center justify-between">
                      <span>Submitted Client Briefs</span>
                      <span className="text-[10px] text-[#ff8f5a] font-mono">1 Pending Review</span>
                    </div>
                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] text-[11px] text-white/70 flex items-center justify-between">
                      <span>Brief #204: Global Billing & Multi-Currency Engine</span>
                      <span className="text-[10px] font-mono text-emerald-400">READY FOR SCOPING</span>
                    </div>
                  </div>
                </div>
              )}

              {activeStage.id === "requirements" && (
                <div className="space-y-3 font-sans">
                  <div className="p-3 rounded-lg bg-[#14121a] border border-[#ff6b3d]/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#ff8f5a]" />
                        <span>AI Scope Decomposition & Questions</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">3/3 APPROVED</span>
                    </div>
                    <div className="text-[11px] text-white/70 leading-relaxed">
                      Extracted from Acme Brief #204: 12 functional user stories, 4 performance thresholds, and 2 integration constraints.
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { code: "REQ-01", text: "Sub-second multi-currency exchange rates with fallback provider", status: "Client Confirmed" },
                      { code: "REQ-02", text: "Automated VAT / GST compliance tax calculation by region", status: "Client Confirmed" },
                      { code: "REQ-03", text: "PCI-DSS Level 1 tokenized vault storage for payment methods", status: "Client Confirmed" },
                    ].map((item) => (
                      <div key={item.code} className="p-2.5 rounded-lg bg-black/40 border border-white/[0.05] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#ff8f5a] bg-[#ff6b3d]/10 px-1.5 py-0.5 rounded">
                            {item.code}
                          </span>
                          <span className="text-white/80 text-[11px]">{item.text}</span>
                        </div>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] text-white/50">
                    <span>Audit Status: Requirements frozen & signed into Proposal baseline</span>
                    <span className="font-mono text-white/80">HASH: 48f9...</span>
                  </div>
                </div>
              )}

              {activeStage.id === "proposals" && (
                <div className="space-y-3 font-sans">
                  <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Commercial Proposal #PR-809</div>
                      <div className="text-[10px] text-white/40">Acme Global // Billing Architecture</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-white font-mono">$124,000</div>
                      <div className="text-[10px] text-emerald-400 font-mono">Margin: 42.6%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded bg-black/40 border border-white/[0.05]">
                      <div className="text-[9px] font-mono text-white/40">M1: ARCHITECTURE</div>
                      <div className="text-xs font-bold text-white mt-0.5">$31,000</div>
                      <div className="text-[9px] text-emerald-400">Escrow Funded</div>
                    </div>
                    <div className="p-2.5 rounded bg-black/40 border border-white/[0.05]">
                      <div className="text-[9px] font-mono text-white/40">M2: TAX CORE</div>
                      <div className="text-xs font-bold text-white mt-0.5">$48,000</div>
                      <div className="text-[9px] text-white/50">Scheduled</div>
                    </div>
                    <div className="p-2.5 rounded bg-black/40 border border-white/[0.05]">
                      <div className="text-[9px] font-mono text-white/40">M3: PRODUCTION</div>
                      <div className="text-xs font-bold text-white mt-0.5">$45,000</div>
                      <div className="text-[9px] text-white/50">Final Handoff</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#14121a] border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Digitally Executed by Client</div>
                        <div className="text-[10px] text-white/50">Timestamp: 2026-10-12 11:42 UTC</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      AUTO-SCAFFOLD READY
                    </span>
                  </div>
                </div>
              )}

              {activeStage.id === "projects" && (
                <div className="space-y-3 font-sans">
                  <div className="p-3 rounded-lg bg-[#131118] border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Project Orion // Scaffolding Active</div>
                      <div className="text-[10px] text-white/40">6 Workstreams · Critical Path Lock Active</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      HEALTH: 99.8%
                    </span>
                  </div>

                  {/* Gantt sprint chart mock */}
                  <div className="space-y-2 p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                    <div className="text-[10px] font-mono text-white/40 uppercase mb-2">Workstream Timeline</div>
                    {[
                      { name: "Core Ledger Architecture", width: "w-full", color: "from-[#b5452a] to-[#ff6b3d]", label: "Complete" },
                      { name: "Currency Engine & API", width: "w-[75%]", color: "from-[#ff6b3d] to-[#ff8f5a]", label: "In Flight (75%)" },
                      { name: "Client Acceptance Suite", width: "w-[40%]", color: "from-white/20 to-white/40", label: "Queued" },
                    ].map((g) => (
                      <div key={g.name} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/80">
                          <span>{g.name}</span>
                          <span className="font-mono text-white/50">{g.label}</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${g.color} ${g.width} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] text-white/60">
                    <span>Dependency Graph: Zero blocked stages detected</span>
                    <span className="font-mono text-emerald-400 text-[10px]">ALL CLEAR</span>
                  </div>
                </div>
              )}

              {activeStage.id === "teams" && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#14121a] border border-white/[0.08]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#ff6b3d]/20 border border-[#ff6b3d]/40 flex items-center justify-center text-xs font-bold text-[#ff8f5a]">
                        AK
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Alex Kim · Principal Architect</div>
                        <div className="text-[10px] text-white/40">Assigned: High-Throughput Stream Gateway</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      GATE IN REVIEW
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/80 font-medium">Submission Artifact: Commit 88d3e9</span>
                      <span className="text-[10px] font-mono text-emerald-400">14 Tests Passed</span>
                    </div>
                    <div className="text-[11px] text-white/50 leading-snug">
                      Review Checklist: Unit Coverage &gt; 90%, Load tested at 10,000 req/sec, Zero SQL injection vectors.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                      <span className="text-white/60 text-[11px]">Peer Approval:</span>
                      <span className="text-emerald-400 font-mono text-[11px]">Approved (2/2)</span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                      <span className="text-white/60 text-[11px]">Milestone Impact:</span>
                      <span className="text-[#ff8f5a] font-mono text-[11px]">Unblocks M2</span>
                    </div>
                  </div>
                </div>
              )}

              {activeStage.id === "delivery" && (
                <div className="space-y-3 font-sans">
                  <div className="p-3 rounded-lg bg-[#110f18] border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Verified Deliverable Package #DEL-401</div>
                        <div className="text-[10px] text-white/40">Ready for Client Verification Sign-Off</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      100% READY
                    </span>
                  </div>

                  <div className="space-y-2 p-3 rounded-lg bg-black/40 border border-white/[0.05] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Production Release Docker Digest:</span>
                      <span className="font-mono text-[10px] text-white/90">sha256:7b2c...a90</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">End-to-End Test Suite:</span>
                      <span className="font-mono text-[10px] text-emerald-400">128/128 Green</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Escrow Release Allocation:</span>
                      <span className="font-mono text-[10px] text-[#ff8f5a] font-bold">$45,000.00</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/25 flex items-center justify-between">
                    <div className="text-[11px] text-emerald-300 font-medium">
                      One-Click Client Acceptance Certificate & Settlement
                    </div>
                    <button className="px-3 py-1 rounded bg-emerald-500 text-black font-bold text-[10px] hover:bg-emerald-400 transition-colors">
                      VERIFY & RELEASE
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
