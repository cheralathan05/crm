"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, 
  Play, 
  Activity, 
  CheckCircle2, 
  FileText, 
  FolderKanban, 
  Users, 
  Layers, 
  ShieldCheck,
  Zap,
  Cpu,
  Lock,
  GitBranch,
  Sparkles
} from "lucide-react";

interface HeroExperienceProps {
  onWatchFilm?: () => void;
}

export function HeroExperience({ onWatchFilm }: HeroExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Smooth mouse tilt handler
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = ((y - centerY) / centerY) * -10; // max -10 to +10 deg
    const tiltY = ((x - centerX) / centerX) * 12;  // max -12 to +12 deg

    setRotateX(tiltX);
    setRotateY(tiltY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <section className="relative min-h-[100dvh] pt-28 pb-20 flex flex-col justify-center overflow-hidden bg-[#070709] select-none">
      {/* Background Architectural Ambient Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle generated ambient background texture */}
        <div className="absolute inset-0 opacity-25 mix-blend-screen bg-cover bg-center" style={{ backgroundImage: "url('/business_os_hero_ambient.jpg')" }} />

        {/* Dynamic orange radial atmospheric gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#ff6b3d]/15 via-[#b5452a]/8 to-transparent rounded-full blur-[130px]" />
        
        {/* Architectural light beams */}
        <div className="absolute -top-32 left-1/4 w-[1px] h-[600px] bg-gradient-to-b from-transparent via-[#ff6b3d]/30 to-transparent rotate-[25deg] opacity-40 blur-[0.5px]" />
        <div className="absolute -top-32 right-1/4 w-[1px] h-[600px] bg-gradient-to-b from-transparent via-[#ff8f5a]/25 to-transparent -rotate-[25deg] opacity-30 blur-[0.5px]" />

        {/* Precision fine grid pattern */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 80%)"
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full flex flex-col items-center">
        {/* Top telemetry badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md mb-8 animate-fade-in shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b3d] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6b3d]" />
          </span>
          <span className="text-[11px] font-mono tracking-[0.2em] text-white/70 uppercase">
            ARCHITECTURAL BUSINESS OPERATING SYSTEM
          </span>
          <span className="text-white/20">|</span>
          <span className="text-[11px] font-mono text-[#ff8f5a]">v2.4 KERNEL</span>
        </div>

        {/* Main headline */}
        <div className="text-center max-w-4xl mx-auto mb-6">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.04]">
            YOUR ENTIRE BUSINESS.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60">
              ONE INTELLIGENT
            </span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b3d] via-[#ff8f5a] to-[#d46a4e]">
              SYSTEM.
            </span>
          </h1>
        </div>

        {/* Supporting text */}
        <p className="text-base sm:text-lg md:text-xl text-white/65 max-w-2xl text-center leading-relaxed mb-10 font-normal">
          From the first client requirement to the final delivery, connect your people,
          projects, workflows, and business operations in one intelligent workspace.
        </p>

        {/* Primary CTA button group */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#b5452a] via-[#c84e31] to-[#e07a5e] hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(212,106,78,0.4)] flex items-center justify-center gap-2.5 group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            onClick={() => {
              if (onWatchFilm) {
                onWatchFilm();
              } else {
                const el = document.querySelector("#film");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="w-full sm:w-auto px-7 py-4 rounded-lg text-sm font-medium text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-white/[0.25] transition-all backdrop-blur-md flex items-center justify-center gap-3 group"
          >
            <div className="w-6 h-6 rounded-full bg-[#ff6b3d]/20 border border-[#ff6b3d]/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-3 h-3 text-[#ff8f5a] fill-[#ff8f5a] ml-0.5" />
            </div>
            <span>Watch the Film</span>
            <span className="text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/[0.06]">
              01:00
            </span>
          </button>
        </div>

        {/* 3D CENTRAL VISUAL COMPOSITION */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          className="relative w-full max-w-5xl mx-auto perspective-[1200px] cursor-default"
          style={{ perspective: "1200px" }}
        >
          {/* Animated 3D spatial wrapper */}
          <div
            className="relative w-full transition-transform duration-200 ease-out preserve-3d"
            style={{
              transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Ambient base shadow / glow */}
            <div className="absolute inset-4 -bottom-10 bg-gradient-to-t from-[#ff6b3d]/20 to-transparent blur-3xl rounded-3xl -z-10" />

            {/* Central Master Cockpit (The Actual Business OS System Interface) */}
            <div className="relative rounded-2xl bg-[#0e0d11]/90 border border-white/[0.14] shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl">
              {/* Window Titlebar */}
              <div className="h-11 px-4 border-b border-white/[0.08] bg-[#141217]/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]/80" />
                  <span className="ml-3 text-[11px] font-mono text-white/40 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b3d]" />
                    business-os.cloud // unified-command-plane
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-emerald-400">
                    <Activity className="w-3 h-3" />
                    <span>LIFECYCLE SYNC ACTIVE</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/30">UTC 13:28:04</span>
                </div>
              </div>

              {/* Central Viewport Content */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 bg-gradient-to-b from-[#110f15]/70 to-[#0a090c]/90">
                {/* Left Module: Live Workflow Health */}
                <div className="md:col-span-4 flex flex-col gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono tracking-wider text-white/50 uppercase">
                        Operating Health
                      </span>
                      <span className="text-[10px] font-mono text-[#ff8f5a] bg-[#ff6b3d]/10 px-1.5 py-0.5 rounded">
                        99.98%
                      </span>
                    </div>
                    <div className="text-xl font-bold text-white mb-1">
                      $482,500 <span className="text-xs text-emerald-400 font-normal">+18.4%</span>
                    </div>
                    <div className="text-[11px] text-white/40">Active Project Portfolio Value</div>
                    
                    {/* Progress bar */}
                    <div className="mt-3 w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#b5452a] to-[#ff8f5a] w-[74%] rounded-full" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 font-medium">Verified Deliveries</span>
                      <span className="font-mono text-emerald-400 text-xs">14 / 14</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 font-medium">Review Gates Clear</span>
                      <span className="font-mono text-white/90 text-xs">100%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 font-medium">Avg Cycle Velocity</span>
                      <span className="font-mono text-[#ff8f5a] text-xs">4.2 days</span>
                    </div>
                  </div>
                </div>

                {/* Center / Right Module: Live Connected Timeline */}
                <div className="md:col-span-8 flex flex-col gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ff6b3d]" />
                        <span className="text-xs font-semibold text-white">Active Stage Flow</span>
                      </div>
                      <span className="text-[11px] font-mono text-white/40">Real-Time Traceability</span>
                    </div>

                    {/* Flow steps inline */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { step: "01", name: "CLIENTS", status: "Active" },
                        { step: "02", name: "SCOPES", status: "Active" },
                        { step: "03", name: "PROPOSALS", status: "Signed" },
                        { step: "04", name: "PROJECTS", status: "Running" },
                        { step: "05", name: "TEAMS", status: "Building" },
                        { step: "06", name: "DELIVERY", status: "Ready" },
                      ].map((item, idx) => (
                        <div
                          key={item.name}
                          className="p-2 rounded-lg bg-black/40 border border-white/[0.06] flex flex-col gap-1 items-start relative group hover:border-[#ff6b3d]/40 transition-colors"
                        >
                          <span className="text-[9px] font-mono text-[#ff8f5a]">{item.step}</span>
                          <span className="text-[11px] font-bold text-white tracking-tight">{item.name}</span>
                          <span className="text-[9px] text-emerald-400/90 font-mono">{item.status}</span>
                        </div>
                      ))}
                    </div>

                    {/* Live active project row */}
                    <div className="mt-3 p-3 rounded-lg bg-[#141218] border border-white/[0.05] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-[#ff6b3d]/15 border border-[#ff6b3d]/30 flex items-center justify-center text-[#ff8f5a] text-xs font-mono font-bold">
                          Ω
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white">Project Orion // Enterprise Cloud Engine</div>
                          <div className="text-[10px] text-white/40">Sprint 4 of 6 · 18 tasks active · Milestone 3 Signoff</div>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ON TRACK
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SATELLITE TRANSLUCENT 3D ARCHITECTURAL CARDS AROUND CENTRAL VISUAL */}
            {/* Card 1: Client Requirements (Top-Left floating layer) */}
            <div
              className="hidden lg:block absolute -top-8 -left-12 w-64 p-3.5 rounded-xl bg-[#121016]/90 border border-white/[0.14] shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-none transition-transform duration-300"
              style={{
                transform: `translateZ(45px) translateX(${rotateY * 0.8}px) translateY(${rotateX * 0.8}px)`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                    <FileText className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-white">Client Requirements</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>
              <p className="text-[10px] text-white/60 mb-2 leading-relaxed">
                Scope decomposed into 14 functional deliverables with zero ambiguity.
              </p>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#ff8f5a]">
                <Sparkles className="w-2.5 h-2.5" />
                <span>AI Scope Verification Clear</span>
              </div>
            </div>

            {/* Card 2: Proposal Approval (Top-Right floating layer) */}
            <div
              className="hidden lg:block absolute -top-10 -right-10 w-64 p-3.5 rounded-xl bg-[#121016]/90 border border-white/[0.14] shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-none transition-transform duration-300"
              style={{
                transform: `translateZ(60px) translateX(${rotateY * -0.9}px) translateY(${rotateX * -0.9}px)`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-white">Commercial Proposal</span>
                </div>
                <span className="text-[9px] font-mono text-[#ff8f5a] bg-[#ff6b3d]/10 px-1.5 py-0.5 rounded">
                  SIGNED
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-bold text-white">$124,000</span>
                <span className="text-[9px] font-mono text-white/40">4 Milestones Escrow</span>
              </div>
              <div className="w-full bg-white/[0.06] h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-full" />
              </div>
            </div>

            {/* Card 3: Team Execution (Bottom-Left floating layer) */}
            <div
              className="hidden lg:block absolute -bottom-8 -left-8 w-64 p-3.5 rounded-xl bg-[#121016]/90 border border-white/[0.14] shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-none transition-transform duration-300"
              style={{
                transform: `translateZ(50px) translateX(${rotateY * 0.6}px) translateY(${rotateX * 0.6}px)`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Users className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-white">Team Execution</span>
                </div>
                <span className="text-[9px] font-mono text-white/50">4 Active Devs</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#ff6b3d] animate-pulse" />
                <span className="text-[10px] text-white/80 font-mono">PR #142: In Review</span>
              </div>
              <div className="text-[9px] text-white/40">Dependency: Auth Pipeline unblocked</div>
            </div>

            {/* Card 4: Verified Delivery (Bottom-Right floating layer) */}
            <div
              className="hidden lg:block absolute -bottom-10 -right-8 w-64 p-3.5 rounded-xl bg-[#121016]/90 border border-white/[0.14] shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-none transition-transform duration-300"
              style={{
                transform: `translateZ(55px) translateX(${rotateY * -0.7}px) translateY(${rotateX * -0.7}px)`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-white">Verified Delivery</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  PASS
                </span>
              </div>
              <p className="text-[10px] text-white/60 mb-1 leading-snug">
                Client acceptance certificate issued. Funds auto-routed to treasury.
              </p>
              <span className="text-[9px] font-mono text-[#ff8f5a]">Audit Hash: 0x9f4a...e12</span>
            </div>

            {/* Animated SVG Glowing Orange Pathways Connecting Cards */}
            <svg
              className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none -z-5"
              viewBox="0 0 1024 480"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b3d" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#ff8f5a" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#d46a4e" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Top left connection */}
              <path
                d="M 120 40 Q 250 100 320 160"
                stroke="url(#laserGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
              {/* Top right connection */}
              <path
                d="M 900 40 Q 750 90 700 160"
                stroke="url(#laserGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
              {/* Bottom left connection */}
              <path
                d="M 140 430 Q 260 380 340 320"
                stroke="url(#laserGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Bottom right connection */}
              <path
                d="M 880 430 Q 760 380 680 320"
                stroke="url(#laserGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12 text-center max-w-4xl border-t border-white/[0.08] pt-8">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">100%</div>
            <div className="text-[11px] text-white/50 tracking-wider uppercase mt-1">Lifecycle Traceability</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#ff8f5a] font-mono">0</div>
            <div className="text-[11px] text-white/50 tracking-wider uppercase mt-1">Siloed Spreadsheets</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">6x</div>
            <div className="text-[11px] text-white/50 tracking-wider uppercase mt-1">Faster Scope-to-Code</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">SOC-2</div>
            <div className="text-[11px] text-white/50 tracking-wider uppercase mt-1">Audited Architecture</div>
          </div>
        </div>
      </div>
    </section>
  );
}
