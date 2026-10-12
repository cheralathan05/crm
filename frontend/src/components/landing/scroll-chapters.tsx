"use client";

import { useState } from "react";
import { 
  Layers, 
  Unlink, 
  Cpu, 
  GitFork, 
  Users2, 
  Network, 
  Globe2, 
  ArrowRight, 
  Check, 
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  GitMerge,
  Sparkles,
  Terminal,
  FileCheck
} from "lucide-react";
import { Chapter } from "./types";

const CHAPTERS: Chapter[] = [
  {
    id: "fragmented",
    number: "01",
    title: "Fragmented Business",
    subtitle: "The cost of disjointed tools, lost context, and unbilled scope",
    quote: "Every tool change is a fracture in business context.",
    narrative: "When sales promises features in Slack, scope lives in PDFs, code lives in GitHub, and billing lives in QuickBooks, things fall apart. Context evaporates, rework cascades, and margin vanishes.",
    visualTheme: "dissonance",
    tags: ["Siloed Apps", "Silent Scope Creep", "Manual Sync"],
    stat: { value: "32%", label: "Billable Revenue Lost in Tool Friction" }
  },
  {
    id: "intelligence",
    number: "02",
    title: "One Intelligence",
    subtitle: "A unified operating model replacing tool sprawl with architectural certainty",
    quote: "A single continuous data spine for your entire company.",
    narrative: "Business OS replaces disconnected SaaS fragments with an engineered core. Clients, proposals, repositories, code commits, reviews, and ledgers speak the exact same data schema in real-time.",
    visualTheme: "monolith",
    tags: ["Unified Schema", "Zero Latency", "Audit Grade"],
    stat: { value: "100%", label: "End-to-End Context Retention" }
  },
  {
    id: "lineage",
    number: "03",
    title: "From Requirement to Project",
    subtitle: "Sovereign lineage from the client's initial brief to live sprint architecture",
    quote: "Requirements become contracts; contracts become running code.",
    narrative: "Raw client desires are parsed into testable requirements. Upon agreement, they freeze into commercial milestone contracts, then automatically scaffold into sprint workstreams with pre-locked dependencies.",
    visualTheme: "conduit",
    tags: ["Deterministic Scope", "Contract Binding", "Auto-Scaffolding"],
    stat: { value: "6x", label: "Faster Scope-to-Execution Velocity" }
  },
  {
    id: "execution",
    number: "04",
    title: "Teams in Motion",
    subtitle: "Distraction-free engineering with automated multi-tier review gates",
    quote: "Engineers build with crystal clarity; reviewers approve with confidence.",
    narrative: "Engineers see only what they need to execute. Each task connects to parent acceptance criteria. Work submissions trigger automated verification and peer audits before passing the gate.",
    visualTheme: "workroom",
    tags: ["Role Isolation", "Gated Quality", "Dependency Awareness"],
    stat: { value: "-62%", label: "Post-Release Bug Remediation" }
  },
  {
    id: "ecosystem",
    number: "05",
    title: "The Connected Ecosystem",
    subtitle: "Document vault, automated client updates, telemetry and escrow release",
    quote: "All stakeholders share one source of truth without manual meetings.",
    narrative: "Clients don't have to ask 'where is my project?'. Live transparent telemetry updates the client portal. Verified milestones automatically release escrow funds straight to your balance sheet.",
    visualTheme: "mesh",
    tags: ["Client Transparency", "Automated Escrow", "Real-time Telemetry"],
    stat: { value: "0", label: "Status Update Meetings Needed" }
  },
  {
    id: "convergence",
    number: "06",
    title: "Everything Works as One",
    subtitle: "Macro executive clarity from first inquiry to verified enterprise delivery",
    quote: "Your business runs like a precision machine.",
    narrative: "Pull back the lens to see every operational stream converging into one commanding view: real-time gross margins, team utilization, delivery dates, and satisfied enterprise clients.",
    visualTheme: "orbit",
    tags: ["Enterprise Command", "Margin Velocity", "Predictive Horizon"],
    stat: { value: "99.8%", label: "On-Time Milestone Completion" }
  }
];

export function ScrollChapters() {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const activeChapter = CHAPTERS[activeChapterIndex];

  return (
    <section id="chapters" className="relative py-32 bg-[#08070b] overflow-hidden border-t border-white/[0.08]">
      {/* Dynamic ambient background based on active chapter */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[150px] transition-all duration-700 opacity-20"
          style={{
            backgroundColor: 
              activeChapterIndex === 0 ? "#ef4444" :
              activeChapterIndex === 1 ? "#ff6b3d" :
              activeChapterIndex === 2 ? "#ff8f5a" :
              activeChapterIndex === 3 ? "#3b82f6" :
              activeChapterIndex === 4 ? "#10b981" : "#d46a4e"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#ff8f5a] uppercase tracking-widest mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>The Six Visual Chapters</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            THE ARCHITECTURAL JOURNEY
          </h2>

          <p className="text-base sm:text-lg text-white/60 leading-relaxed font-normal">
            Step through the six transformations that turn business chaos into a unified operating powerhouse.
          </p>
        </div>

        {/* Chapter Tab Scrubber */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-12 scrollbar-none">
          {CHAPTERS.map((ch, idx) => {
            const isActive = idx === activeChapterIndex;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapterIndex(idx)}
                className={`px-4 py-2.5 rounded-xl border text-left shrink-0 transition-all duration-300 focus:outline-none ${
                  isActive
                    ? "bg-[#181520] border-[#ff6b3d] shadow-[0_0_20px_rgba(255,107,61,0.25)] text-white"
                    : "bg-[#0f0e13]/80 border-white/[0.06] text-white/50 hover:text-white/80 hover:border-white/[0.15]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono ${isActive ? "text-[#ff8f5a]" : "text-white/30"}`}>
                    {ch.number}
                  </span>
                  <span className="text-xs font-bold tracking-tight">{ch.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ACTIVE CHAPTER IMMERSIVE STAGE */}
        <div className="rounded-3xl bg-[#0c0b10] border border-white/[0.12] shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Top metadata ticker */}
          <div className="px-6 py-3.5 bg-[#121017] border-b border-white/[0.08] flex items-center justify-between text-xs font-mono text-white/40">
            <div className="flex items-center gap-3">
              <span className="text-[#ff8f5a] font-bold">CHAPTER {activeChapter.number} // 06</span>
              <span>—</span>
              <span className="text-white/80 uppercase">{activeChapter.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">PERSPECTIVE:</span>
              <span className="text-[#ff8f5a] uppercase font-bold">{activeChapter.visualTheme}</span>
            </div>
          </div>

          <div className="p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-[#ff8f5a] tracking-widest uppercase mb-2">
                  Transformation Phase {activeChapter.number}
                </div>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
                  {activeChapter.subtitle}
                </h3>

                <blockquote className="border-l-2 border-[#ff6b3d] pl-4 py-1 text-sm italic text-[#ff8f5a]/90 mb-6 bg-[#ff6b3d]/5 rounded-r">
                  &ldquo;{activeChapter.quote}&rdquo;
                </blockquote>

                <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-8">
                  {activeChapter.narrative}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {activeChapter.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-white/[0.04] text-white/70 border border-white/[0.08]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Big Metric */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">{activeChapter.stat.value}</div>
                  <div className="text-[11px] text-white/50">{activeChapter.stat.label}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#ff6b3d]/10 border border-[#ff6b3d]/30 flex items-center justify-center text-[#ff8f5a]">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Right Distinctive Composition Viewport */}
            <div className="lg:col-span-7">
              {/* CHAPTER 1 COMPOSITION: Fragmented Business (Chaotic floating disconnected cards with alerts) */}
              {activeChapterIndex === 0 && (
                <div className="relative h-[420px] rounded-2xl bg-gradient-to-b from-[#151012] to-[#0c0809] border border-red-500/20 p-6 overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      <span>DISCONNECTED TOOL STATE: CRITICAL</span>
                    </span>
                    <span className="text-[10px] font-mono text-white/40">7 ISOLATED APPS</span>
                  </div>

                  {/* Scattered cards with red friction markers */}
                  <div className="relative flex-1 flex items-center justify-center">
                    {/* Card A: Stray Slack brief */}
                    <div className="absolute top-4 left-2 w-52 p-3 rounded-lg bg-[#1a1418] border border-red-500/30 shadow-xl rotate-[-4deg] opacity-85">
                      <div className="text-[10px] font-bold text-red-400 mb-1">Slack Channel #leads</div>
                      <div className="text-[11px] text-white/70">&ldquo;Can we also add billing support before Friday?&rdquo;</div>
                      <div className="text-[9px] text-red-400 mt-1.5 flex items-center gap-1">
                        <Unlink className="w-2.5 h-2.5" /> Never added to contract
                      </div>
                    </div>

                    {/* Card B: Stray Spreadsheet */}
                    <div className="absolute top-12 right-2 w-56 p-3 rounded-lg bg-[#1a1418] border border-amber-500/30 shadow-xl rotate-[3deg] opacity-85">
                      <div className="text-[10px] font-bold text-amber-400 mb-1">Google Sheet v4_FINAL.xlsx</div>
                      <div className="text-[11px] text-white/70">Milestone 2 Budget: $42,000 (Out of sync)</div>
                      <div className="text-[9px] text-amber-400 mt-1.5 flex items-center gap-1">
                        <Unlink className="w-2.5 h-2.5" /> Manual copy-paste required
                      </div>
                    </div>

                    {/* Card C: Disconnected Jira/Trello */}
                    <div className="absolute bottom-6 left-10 w-60 p-3 rounded-lg bg-[#1a1418] border border-red-500/30 shadow-xl rotate-[2deg] opacity-90">
                      <div className="text-[10px] font-bold text-red-400 mb-1">Detached Task #408</div>
                      <div className="text-[11px] text-white/70">Engineer building feature client rejected last week</div>
                      <div className="text-[9px] text-red-400 mt-1.5">Zero requirement linkage</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/25 text-[11px] text-red-300 flex items-center justify-between">
                    <span>Result: 42 billable engineering hours wasted on unconfirmed scope</span>
                    <span className="font-mono font-bold">$6,300 LOSS</span>
                  </div>
                </div>
              )}

              {/* CHAPTER 2 COMPOSITION: One Intelligence (The Monolithic Converged Spine) */}
              {activeChapterIndex === 1 && (
                <div className="relative h-[420px] rounded-2xl bg-gradient-to-b from-[#131018] to-[#0a080d] border border-[#ff6b3d]/30 p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#ff8f5a] bg-[#ff6b3d]/10 px-2 py-0.5 rounded border border-[#ff6b3d]/25 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>UNIFIED CORE ENGINE</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">SCHEMA CONVERGENCE: 100%</span>
                  </div>

                  {/* Converged central core */}
                  <div className="flex flex-col items-center justify-center gap-4 my-auto">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#b5452a] to-[#ff6b3d] shadow-[0_0_50px_rgba(255,107,61,0.5)] border border-white/20 flex items-center justify-center text-white">
                      <Layers className="w-12 h-12 animate-pulse" />
                    </div>

                    <div className="text-center">
                      <div className="text-sm font-bold text-white">Business OS Sovereign Kernel</div>
                      <div className="text-xs font-mono text-white/50">Single Database Spine · Real-Time Reactive State</div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                      <div className="p-2 rounded bg-black/40 border border-white/[0.08] text-center">
                        <div className="text-[9px] font-mono text-white/40">LATENCY</div>
                        <div className="text-xs font-bold text-emerald-400 font-mono">1.2ms</div>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-white/[0.08] text-center">
                        <div className="text-[9px] font-mono text-white/40">AUDIT LOG</div>
                        <div className="text-xs font-bold text-white font-mono">Immutable</div>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-white/[0.08] text-center">
                        <div className="text-[9px] font-mono text-white/40">SYNC</div>
                        <div className="text-xs font-bold text-[#ff8f5a] font-mono">Bi-Directional</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/25 text-[11px] text-emerald-300 flex items-center justify-between">
                    <span>Single source of truth across all 10 business lifecycle phases</span>
                    <span className="font-mono font-bold">100% TRACEABLE</span>
                  </div>
                </div>
              )}

              {/* CHAPTER 3 COMPOSITION: From Requirement to Project (Pipeline Progression) */}
              {activeChapterIndex === 2 && (
                <div className="relative h-[420px] rounded-2xl bg-gradient-to-b from-[#121118] to-[#09080c] border border-white/[0.1] p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#ff8f5a] bg-[#ff6b3d]/10 px-2 py-0.5 rounded border border-[#ff6b3d]/25">
                      TRACEABLE TRANSFORMATION
                    </span>
                    <span className="text-[10px] font-mono text-white/40">ZERO AMBIGUITY GAP</span>
                  </div>

                  {/* 3 Step pipeline */}
                  <div className="space-y-3 my-auto">
                    <div className="p-3 rounded-lg bg-[#181520] border border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[10px]">1</div>
                        <div>
                          <div className="text-xs font-bold text-white">Client Brief Ingested</div>
                          <div className="text-[10px] text-white/40">&ldquo;Need automatic tax calculation in checkout&rdquo;</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-blue-400">PARSED</span>
                    </div>

                    <div className="flex justify-center -my-1">
                      <div className="w-0.5 h-4 bg-[#ff6b3d]" />
                    </div>

                    <div className="p-3 rounded-lg bg-[#181520] border border-[#ff6b3d]/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-[#ff6b3d]/20 text-[#ff8f5a] flex items-center justify-center font-mono text-[10px]">2</div>
                        <div>
                          <div className="text-xs font-bold text-white">Commercial Proposal Executed</div>
                          <div className="text-[10px] text-white/40">Milestone 2 · $18,500 · 14-day SLA · Client Signed</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">CONTRACT SIGNED</span>
                    </div>

                    <div className="flex justify-center -my-1">
                      <div className="w-0.5 h-4 bg-[#ff6b3d]" />
                    </div>

                    <div className="p-3 rounded-lg bg-[#181520] border border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-[10px]">3</div>
                        <div>
                          <div className="text-xs font-bold text-white">Scaffolded Sprint Tasks</div>
                          <div className="text-[10px] text-white/40">3 PR work orders assigned with locked acceptance tests</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-purple-400">ACTIVE IN SPRINT</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] text-white/70 flex items-center justify-between">
                    <span>Deterministic transformation: No requirements lost in translation</span>
                    <span className="font-mono text-[#ff8f5a]">AUTO-LINKED</span>
                  </div>
                </div>
              )}

              {/* CHAPTER 4 COMPOSITION: Teams in Motion (Role Gated Workroom) */}
              {activeChapterIndex === 3 && (
                <div className="relative h-[420px] rounded-2xl bg-gradient-to-b from-[#10141a] to-[#080a0e] border border-blue-500/20 p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/25">
                      SOVEREIGN EXECUTION GATES
                    </span>
                    <span className="text-[10px] font-mono text-white/40">MULTI-TIER REVIEW</span>
                  </div>

                  <div className="space-y-3 my-auto">
                    <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.08]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-white">Feature PR #182: OAuth & Session Renewal</div>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          AWAITING REVIEW
                        </span>
                      </div>
                      <div className="text-[11px] text-white/60 mb-3">
                        Submitted by Lead Engineer. Tested against Acceptance Criteria AC-04.
                      </div>

                      {/* Review Checklist */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between p-2 rounded bg-black/40">
                          <span className="text-white/80 text-[11px]">Static Security Analysis (SonarQube)</span>
                          <span className="text-emerald-400 font-mono text-[10px]">PASSED (0 VULN)</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-black/40">
                          <span className="text-white/80 text-[11px]">Peer Code Approval</span>
                          <span className="text-emerald-400 font-mono text-[10px]">APPROVED (2/2)</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-black/40">
                          <span className="text-white/80 text-[11px]">Commercial Milestone Link</span>
                          <span className="text-[#ff8f5a] font-mono text-[10px]">VERIFIED (M3)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/25 text-[11px] text-blue-300 flex items-center justify-between">
                    <span>Quality gates guarantee broken work never reaches client staging</span>
                    <span className="font-mono font-bold">100% COMPLIANT</span>
                  </div>
                </div>
              )}

              {/* CHAPTER 5 COMPOSITION: The Connected Ecosystem */}
              {activeChapterIndex === 4 && (
                <div className="relative h-[420px] rounded-2xl bg-gradient-to-b from-[#101914] to-[#080d0a] border border-emerald-500/20 p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                      CONNECTED ECOSYSTEM
                    </span>
                    <span className="text-[10px] font-mono text-white/40">REAL-TIME TELEMETRY</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-auto">
                    <div className="p-3.5 rounded-xl bg-[#142018] border border-white/[0.08]">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Live Client Portal</div>
                      <div className="text-xs font-bold text-white mb-2">Automated Digests</div>
                      <div className="text-[11px] text-white/60">
                        Zero status calls needed. Clients monitor sprint health, inspect proofs, and sign off in one click.
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#142018] border border-white/[0.08]">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Financial Escrow</div>
                      <div className="text-xs font-bold text-white mb-2">Automated Payouts</div>
                      <div className="text-[11px] text-white/60">
                        Funds held safely in milestone escrow. When review passes, funds land in your corporate account.
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#142018] border border-white/[0.08]">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Document Vault</div>
                      <div className="text-xs font-bold text-white mb-2">Cryptographic Proofs</div>
                      <div className="text-[11px] text-white/60">
                        Every proposal, invoice, and requirement change is cryptographically fingerprinted and archived.
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#142018] border border-white/[0.08]">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Notification Spine</div>
                      <div className="text-xs font-bold text-white mb-2">Context-Aware Alerts</div>
                      <div className="text-[11px] text-white/60">
                        Team members receive alerts only when their sovereign action or approval is genuinely blocked.
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/25 text-[11px] text-emerald-300 flex items-center justify-between">
                    <span>Unified telemetry creates complete stakeholder trust</span>
                    <span className="font-mono font-bold">ALL GREEN</span>
                  </div>
                </div>
              )}

              {/* CHAPTER 6 COMPOSITION: Everything Works as One */}
              {activeChapterIndex === 5 && (
                <div className="relative h-[420px] rounded-2xl bg-gradient-to-b from-[#181315] to-[#0d090a] border border-[#ff6b3d]/40 p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#ff8f5a] bg-[#ff6b3d]/15 px-2 py-0.5 rounded border border-[#ff6b3d]/30">
                      MACRO OPERATING HORIZON
                    </span>
                    <span className="text-[10px] font-mono text-white/40">ENTERPRISE TELEMETRY</span>
                  </div>

                  {/* Macro Dashboard Display */}
                  <div className="p-4 rounded-xl bg-black/60 border border-white/[0.1] my-auto space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">Global Enterprise Command</div>
                        <div className="text-[10px] text-white/40">12 Active Client Accounts · 34 Sprints In Flight</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-white font-mono">$1,420,000</div>
                        <div className="text-[10px] text-emerald-400 font-mono">Gross Margin: 44.8%</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[9px] font-mono text-white/40">ON-TIME VELOCITY</div>
                        <div className="text-sm font-bold text-emerald-400 font-mono">99.8%</div>
                      </div>
                      <div className="p-2.5 rounded bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[9px] font-mono text-white/40">ENGINEER UTILIZATION</div>
                        <div className="text-sm font-bold text-white font-mono">91.4%</div>
                      </div>
                      <div className="p-2.5 rounded bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[9px] font-mono text-white/40">CLIENT SATISFACTION</div>
                        <div className="text-sm font-bold text-[#ff8f5a] font-mono">9.8 / 10</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-white/60">
                      Predictive Delivery Forecast: Next 4 major customer releases projected ahead of scheduled date by 2.4 days.
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#ff6b3d]/10 border border-[#ff6b3d]/30 text-[11px] text-[#ff8f5a] flex items-center justify-between">
                    <span>The complete business lifecycle running in complete harmony</span>
                    <span className="font-mono font-bold">READY TO SCALE</span>
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
