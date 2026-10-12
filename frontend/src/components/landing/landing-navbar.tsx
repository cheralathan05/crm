"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BusinessOSMark } from "@/components/business-os-mark";
import { 
  ArrowRight, 
  Menu, 
  X, 
  Terminal, 
  Compass, 
  Layers, 
  Play, 
  Sparkles,
  ChevronRight
} from "lucide-react";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Platform", href: "#engine", icon: Compass },
    { label: "Film", href: "#film", icon: Play },
    { label: "Experience", href: "#chapters", icon: Layers },
    { label: "Explorer", href: "#explorer", icon: Terminal },
    { label: "Workflow", href: "#workflow", icon: Sparkles },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#08080a]/90 backdrop-blur-md border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a1714] to-[#12100e] border border-white/[0.12] group-hover:border-[#ff6b3d]/50 transition-all shadow-[0_0_15px_rgba(255,107,61,0.12)]">
              <BusinessOSMark size={22} className="text-[#ff6b3d] group-hover:scale-105 transition-transform" />
              <div className="absolute -inset-0.5 rounded-lg bg-[#ff6b3d]/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-wider text-sm sm:text-base text-white">
                  BUSINESS<span className="font-light text-white/60"> OS</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wide bg-[#ff6b3d]/10 text-[#ff8f5a] border border-[#ff6b3d]/25">
                  v2.4
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase hidden sm:block">
                Unified Enterprise System
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-[#121115]/80 px-3 py-1.5 rounded-full border border-white/[0.08] shadow-inner backdrop-blur-md">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleScrollTo(e, item.href)}
                className="px-3.5 py-1.5 text-xs font-medium text-white/70 hover:text-white rounded-full transition-colors hover:bg-white/[0.06] flex items-center gap-1.5"
              >
                <item.icon className="w-3.5 h-3.5 text-white/40" />
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-medium text-white/80 hover:text-white transition-colors rounded-md hover:bg-white/[0.05] border border-transparent hover:border-white/[0.1]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold text-white bg-gradient-to-r from-[#b5452a] to-[#d46a4e] hover:from-[#c84e31] hover:to-[#e27659] transition-all shadow-[0_0_20px_rgba(212,106,78,0.3)] hover:shadow-[0_0_25px_rgba(212,106,78,0.5)] active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-medium text-white/80 bg-white/[0.05] border border-white/[0.1] rounded"
            >
              Sign In
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-white/80 hover:text-white rounded-md bg-white/[0.05] border border-white/[0.1] focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#070709]/95 backdrop-blur-xl sm:hidden flex flex-col pt-24 px-6 pb-8 border-b border-white/[0.1]">
          <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-mono text-white/60">KERNEL ACTIVE // ONLINE</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 py-6">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleScrollTo(e, item.href)}
                className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-[#ff8f5a]" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </a>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-white/[0.08]">
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="w-full py-3 text-center text-sm font-semibold text-white bg-gradient-to-r from-[#b5452a] to-[#d46a4e] rounded-lg shadow-lg flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="w-full py-3 text-center text-sm font-medium text-white/80 bg-white/[0.05] border border-white/[0.1] rounded-lg hover:text-white"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
