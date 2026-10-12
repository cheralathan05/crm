"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Lock, Terminal } from "lucide-react";
import { BusinessOSMark, BusinessOSLogo } from "@/components/business-os-mark";

export function FinalConversion() {
  return (
    <section id="conversion" className="relative py-36 bg-[#060508] overflow-hidden border-t border-white/[0.08]">
      {/* Converging 3D Background Visualization */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Converging radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-gradient-to-b from-[#ff6b3d]/20 via-[#b5452a]/10 to-transparent rounded-full blur-[160px]" />

        {/* Converging perspective grid lines */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(255, 107, 61, 0.2) 0%, transparent 70%),
              linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 80px 80px, 80px 80px"
          }}
        />

        {/* Ambient converging laser beams */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          fill="none"
        >
          <line x1="0" y1="0" x2="500" y2="300" stroke="#ff6b3d" strokeWidth="1" strokeDasharray="6 6" />
          <line x1="1000" y1="0" x2="500" y2="300" stroke="#ff6b3d" strokeWidth="1" strokeDasharray="6 6" />
          <line x1="0" y1="600" x2="500" y2="300" stroke="#ff8f5a" strokeWidth="1" strokeDasharray="6 6" />
          <line x1="1000" y1="600" x2="500" y2="300" stroke="#ff8f5a" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="500" cy="300" r="40" stroke="#ff6b3d" strokeWidth="1.5" className="animate-pulse" />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
        {/* Top Mark */}
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-br from-[#1c1822] to-[#110f17] border border-white/[0.12] shadow-[0_0_35px_rgba(255,107,61,0.25)] flex items-center justify-center">
          <BusinessOSMark size={38} className="text-[#ff6b3d] animate-pulse" />
        </div>

        {/* Monumental Headline */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
          STOP MANAGING DISCONNECTED TOOLS.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b3d] via-[#ff8f5a] to-[#d46a4e]">
            START CONNECTING YOUR BUSINESS.
          </span>
        </h2>

        {/* Supporting Copy */}
        <p className="text-base sm:text-xl text-white/65 max-w-2xl leading-relaxed mb-12 font-normal">
          Bring clients, requirements, projects, teams, and delivery into one connected operating experience.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-9 py-4 rounded-lg text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-[#b5452a] via-[#c84e31] to-[#e07a5e] hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_35px_rgba(212,106,78,0.45)] flex items-center justify-center gap-2.5 group"
          >
            <span>Get Started with Business OS</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-lg text-sm sm:text-base font-medium text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-white/[0.25] transition-all backdrop-blur-md flex items-center justify-center"
          >
            Sign In to Existing Account
          </Link>
        </div>

        {/* Security & Architecture Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/40 mb-16">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SOC-2 Type II Certified Architecture</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>AES-256 Cryptographic Vault</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>99.98% High-Availability SLA</span>
          </span>
        </div>

        {/* Final Brand Reveal Signature */}
        <div className="pt-10 border-t border-white/[0.08] flex flex-col items-center">
          <div className="text-sm font-mono tracking-[0.3em] text-white/90 uppercase font-black mb-1">
            BUSINESS OS
          </div>
          <div className="text-xs font-mono tracking-[0.25em] text-[#ff8f5a] uppercase">
            ONE SYSTEM. YOUR ENTIRE BUSINESS.
          </div>
        </div>
      </div>
    </section>
  );
}
