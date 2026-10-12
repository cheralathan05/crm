"use client";

import Link from "next/link";
import { BusinessOSMark } from "@/components/business-os-mark";
import { Activity, ShieldCheck, Lock, ExternalLink } from "lucide-react";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#050407] border-t border-white/[0.08] text-white/60 text-xs py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/[0.08]">
          {/* Brand Info */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#141219] border border-white/[0.1] flex items-center justify-center">
                  <BusinessOSMark size={18} className="text-[#ff6b3d]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold tracking-tight text-white text-sm">
                    BUSINESS<span className="font-light text-white/50"> OS</span>
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-[#ff8f5a] uppercase">
                    Unified Enterprise Operating System
                  </span>
                </div>
              </div>

              <p className="text-white/50 max-w-sm leading-relaxed mb-6">
                Connecting clients, requirements, proposals, engineering teams,
                work execution, documents, payments, and delivery into one intelligent system.
              </p>
            </div>

            {/* System Status Indicator */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-emerald-400 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>KERNEL ONLINE // LATENCY 1.2ms // 99.98% SLA</span>
            </div>
          </div>

          {/* Nav Column 1: Platform */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-[11px] font-mono tracking-widest text-white/80 uppercase font-semibold">
              Platform
            </div>
            <ul className="space-y-2">
              <li>
                <a href="#engine" className="hover:text-white transition-colors">
                  Connected Engine
                </a>
              </li>
              <li>
                <a href="#film" className="hover:text-white transition-colors">
                  Cinematic Film
                </a>
              </li>
              <li>
                <a href="#chapters" className="hover:text-white transition-colors">
                  Six Chapters
                </a>
              </li>
              <li>
                <a href="#explorer" className="hover:text-white transition-colors">
                  Product Explorer
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors">
                  10-Step Workflow
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Column 2: Sovereign Portals */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-[11px] font-mono tracking-widest text-white/80 uppercase font-semibold">
              Portals
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Client Portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Employee Workroom
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Admin Command Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Column 3: Architecture & Security */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-[11px] font-mono tracking-widest text-white/80 uppercase font-semibold">
              Governance
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-white/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>SOC-2 Type II Certified</span>
              </li>
              <li className="flex items-center gap-1.5 text-white/50">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>AES-256 Vault Encryption</span>
              </li>
              <li className="flex items-center gap-1.5 text-white/50">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Immutable Audit Logging</span>
              </li>
              <li className="text-white/40 text-[11px] pt-1 leading-snug">
                Sovereign human decision-making with zero unauthorized AI override.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/40 font-mono">
          <div>
            © {currentYear} Business OS Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>TERMS OF SERVICE</span>
            <span>PRIVACY DIRECTIVE</span>
            <span className="text-[#ff8f5a]">SYSTEM v2.4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
