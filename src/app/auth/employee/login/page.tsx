"use client";

import { useState, useCallback, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ArrowRight, Shield, Check, Lock, AlertCircle, Loader2 } from "lucide-react";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={null}>
      <EmployeeLoginContent />
    </Suspense>
  );
}

const SYSTEM_STAGES = [
  { id: "CLIENTS", label: "CLIENTS", desc: "Accounts & relationships" },
  { id: "REQUIREMENTS", label: "REQUIREMENTS", desc: "Structured specifications" },
  { id: "PROPOSALS", label: "PROPOSALS", desc: "Priced scope & agreements" },
  { id: "PROJECTS", label: "PROJECTS", desc: "Engineering blueprints & stages" },
  { id: "TASKS", label: "TASKS", desc: "Operational execution graph" },
  { id: "DELIVERY", label: "DELIVERY", desc: "Verified milestone signoffs" },
];

function EmployeeLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/employee/work";
  const presetEmail = searchParams.get("email") || "";
  const orgParam = searchParams.get("org") || "";
  const roleParam = searchParams.get("role") || "";

  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Active step in the system map animation
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % SYSTEM_STAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email.trim() || !password) {
        setError("Please provide your work email and password.");
        return;
      }

      setLoading(true);
      setStatusMessage("AUTHENTICATING");

      try {
        const result = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid work email or password. Verify your credentials.");
          setLoading(false);
          setStatusMessage(null);
          return;
        }

        setStatusMessage("VERIFYING ACCESS");
        setSuccess(true);

        setTimeout(() => {
          setStatusMessage("PREPARING WORKSPACE");
          setTimeout(() => {
            router.push(from);
          }, 400);
        }, 500);
      } catch {
        setError("Business OS couldn't reach the workspace. Check your connection.");
        setLoading(false);
        setStatusMessage(null);
      }
    },
    [email, password, from, router],
  );

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* ── LEFT PANEL (58%): Business OS Operating Environment ── */}
      <div className="hidden lg:flex lg:w-[58%] flex-col justify-between p-12 xl:p-16 border-r border-[var(--bos-line)] relative z-10">
        {/* Top Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ⬡
            </div>
            <div>
              <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
                BUSINESS OS
              </span>
              <span className="block text-[10px] font-mono text-[var(--bos-text-tertiary)] tracking-wider">
                SECURE ORGANIZATION ENVIRONMENT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[10px] font-mono text-[var(--bos-text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>OPERATING ENVIRONMENT READY</span>
          </div>
        </div>

        {/* Center: System Architecture / Operating Map */}
        <div className="my-auto max-w-xl">
          {orgParam ? (
            <div className="mb-8 p-4 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)]">
              <span className="text-[9.5px] font-mono uppercase tracking-widest text-[var(--bos-accent)] font-semibold block mb-1">
                ORGANIZATION CONTEXT DETECTED
              </span>
              <h3 className="text-xl font-semibold text-[var(--bos-text-primary)]">
                {orgParam}
              </h3>
              {roleParam && (
                <p className="text-xs font-mono text-[var(--bos-text-secondary)] mt-0.5">
                  Assigned Role: <span className="text-[var(--bos-text-primary)] font-medium">{roleParam}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="mb-8">
              <span className="text-[11px] font-mono font-semibold tracking-widest text-[var(--bos-accent)] uppercase block mb-2">
                — ENTER YOUR WORKSPACE
              </span>
              <h1 className="text-4xl xl:text-5xl font-light tracking-tight text-[var(--bos-text-primary)] leading-[1.1]">
                One connected environment for the work your organization is building.
              </h1>
            </div>
          )}

          {/* System Capability Pipeline */}
          <div className="space-y-2 mt-10">
            <span className="text-[10px] font-mono tracking-widest text-[var(--bos-text-tertiary)] uppercase block mb-3">
              SYSTEM CAPABILITY PIPELINE
            </span>

            <div className="grid grid-cols-1 gap-2">
              {SYSTEM_STAGES.map((stage, idx) => {
                const isActive = idx === activeStageIndex;
                return (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-sm border transition-all duration-300 ${
                      isActive
                        ? "bg-[var(--bos-surface)] border-[var(--bos-accent)] shadow-xs translate-x-1"
                        : "bg-transparent border-[var(--bos-line)] opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-sm flex items-center justify-center font-mono text-[10px] font-bold ${
                          isActive
                            ? "bg-[var(--bos-accent)] text-white"
                            : "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)]"
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span
                        className={`text-xs font-mono font-semibold tracking-wider ${
                          isActive ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-text-secondary)]"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--bos-text-tertiary)] font-sans">
                      {stage.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Left Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--bos-text-tertiary)] border-t border-[var(--bos-line)] pt-6">
          <span>IDENTITY & ACCESS PLATFORM</span>
          <span>ESTABLISHED 2026</span>
        </div>
      </div>

      {/* ── RIGHT PANEL (42%): Pure Employee Authentication Workspace ── */}
      <div className="w-full lg:w-[42%] flex flex-col justify-between p-8 sm:p-12 xl:p-16 relative z-10 bg-[var(--bos-bg)]">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-[var(--bos-line)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-xs">
              ⬡
            </div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)]">
              BUSINESS OS
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)] uppercase">
            EMPLOYEE ACCESS
          </span>
        </div>

        <div className="my-auto max-w-md w-full mx-auto">
          {/* Section Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--bos-accent)]">
                EMPLOYEE ACCESS
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-normal text-[var(--bos-text-primary)] tracking-tight">
              Your workspace is ready.
            </h2>
            <p className="text-xs text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed">
              Enter your work email and credentials to resume your operational context.
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-6 p-3 rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="work-email"
                className="block text-[11px] font-mono font-medium tracking-wide uppercase text-[var(--bos-text-secondary)]"
              >
                WORK EMAIL
              </label>
              <input
                id="work-email"
                type="email"
                required
                autoComplete="username email"
                placeholder="employee@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                className="w-full px-3.5 py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)] focus:ring-1 focus:ring-[var(--bos-accent-ring)] transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-mono font-medium tracking-wide uppercase text-[var(--bos-text-secondary)]"
                >
                  PASSWORD
                </label>
                <a
                  href="/auth/employee/forgot-password"
                  tabIndex={3}
                  className="text-[11px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors font-mono"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  className="w-full px-3.5 py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)] focus:ring-1 focus:ring-[var(--bos-accent-ring)] transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading || success}
                  className="w-3.5 h-3.5 rounded-xs border-[var(--bos-border-strong)] accent-[var(--bos-accent)] cursor-pointer"
                />
                <span className="text-xs text-[var(--bos-text-secondary)] font-mono">
                  Keep me signed in
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading || success ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMessage || "AUTHENTICATING..."}</span>
                </>
              ) : (
                <>
                  <span>ENTER WORKSPACE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure Access Information Callout */}
          <div className="mt-8 pt-6 border-t border-[var(--bos-line)]">
            <div className="flex items-start gap-2.5 text-xs text-[var(--bos-text-secondary)]">
              <Shield className="w-4 h-4 text-[var(--bos-text-tertiary)] shrink-0 mt-0.5" />
              <div>
                <strong className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--bos-text-primary)] block">
                  SECURE ORGANIZATION ACCESS
                </strong>
                <p className="text-[11.5px] leading-relaxed text-[var(--bos-text-secondary)] mt-0.5">
                  Employee access is provided by your organization invitation. Public registration is disabled.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Small Quiet Enterprise Footer */}
        <div className="mt-8 pt-4 border-t border-[var(--bos-line)] flex flex-wrap items-center justify-between text-[10.5px] font-mono text-[var(--bos-text-tertiary)] gap-2">
          <span>BUSINESS OS · SECURE WORKSPACE</span>
          <span>SESSION PROTECTED</span>
        </div>
      </div>
    </div>
  );
}
