"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Loader2,
  FolderGit2,
  ListTodo,
  FileCheck2,
  Users,
  Building2,
  AlertCircle,
} from "lucide-react";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";

export default function EmployeeOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <EmployeeOnboardingContent />
    </Suspense>
  );
}

function EmployeeOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Preparation sequence states
  const [preparing, setPreparing] = useState(false);
  const [prepStep1, setPrepStep1] = useState(false);
  const [prepStep2, setPrepStep2] = useState(false);
  const [prepStep3, setPrepStep3] = useState(false);
  const [prepStep4, setPrepStep4] = useState(false);
  const [prepReady, setPrepReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchContext = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/employee/context");
        const json = await res.json();

        if (json.ok && json.employee) {
          if (!isMounted) return;
          setContext(json);
        } else {
          setError(json.message || "Unable to load employee context. Please sign in again.");
        }
      } catch {
        setError("Business OS couldn't reach the workspace. Check your connection.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContext();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnterWorkspace = () => {
    setPreparing(true);

    setTimeout(() => {
      setPrepStep1(true);
      setTimeout(() => {
        setPrepStep2(true);
        setTimeout(() => {
          setPrepStep3(true);
          setTimeout(() => {
            setPrepStep4(true);
            setTimeout(() => {
              setPrepReady(true);
              setTimeout(() => {
                router.push("/employee/work");
              }, 400);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    }, 200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
        <p className="text-xs font-mono text-[var(--bos-text-secondary)] tracking-wider uppercase">
          RESTORING WORKSPACE CONTEXT...
        </p>
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-lg font-medium text-[var(--bos-text-primary)]">Workspace Access Restricted</h2>
          <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">{error}</p>
          <div className="pt-2">
            <a
              href="/auth/employee/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold uppercase rounded-sm"
            >
              <span>RETURN TO LOGIN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { employee, organization, role, team, inviter, capabilities } = context;

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col justify-between p-6 sm:p-12 overflow-hidden font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-xs">
            ⬡
          </div>
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
              BUSINESS OS
            </span>
            <span className="block text-[9.5px] font-mono text-[var(--bos-text-tertiary)] tracking-wider">
              EMPLOYEE ONBOARDING
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[10px] font-mono text-[var(--bos-text-secondary)]">
          <Building2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
          <span>{organization.name}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl w-full mx-auto my-auto py-8">
        <AnimatePresence mode="wait">
          {!preparing ? (
            <motion.div
              key="onboarding-main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Introduction Title */}
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1.5">
                  YOUR WORKSPACE IS READY
                </span>
                <h1 className="text-3xl sm:text-4xl font-light text-[var(--bos-text-primary)] tracking-tight">
                  Welcome, {employee.fullName.split(" ")[0]}
                </h1>
                <p className="text-sm text-[var(--bos-text-secondary)] mt-1.5">
                  You are joining <strong className="text-[var(--bos-text-primary)]">{organization.name}</strong> as a{" "}
                  <strong className="text-[var(--bos-accent)]">{role.name}</strong> in{" "}
                  <strong className="text-[var(--bos-text-primary)]">{team.name}</strong>.
                </p>
              </div>

              {/* Grid: Primary Work Areas & Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primary Modules */}
                <div className="p-5 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                    YOUR WORK WILL PRIMARILY CONNECT TO
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {capabilities.primaryModules.map((mod: string) => (
                      <span
                        key={mod}
                        className="px-2.5 py-1 rounded-sm bg-[var(--bos-bg)] border border-[var(--bos-line)] text-xs font-mono text-[var(--bos-text-primary)]"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                  {employee.primaryResponsibility && (
                    <div className="pt-2 border-t border-[var(--bos-line)]">
                      <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)] uppercase block">
                        FOCUS
                      </span>
                      <p className="text-xs text-[var(--bos-text-secondary)] mt-0.5 font-sans">
                        {employee.primaryResponsibility}
                      </p>
                    </div>
                  )}
                </div>

                {/* What Can I Do? Access Summary */}
                <div className="p-5 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                    YOUR BUSINESS OS PERMISSIONS
                  </span>
                  <div className="space-y-1.5 text-xs font-mono">
                    <span className="text-[10px] uppercase text-emerald-600 font-semibold block">YOU CAN:</span>
                    {capabilities.permissions.can.map((item: string) => (
                      <div key={item} className="flex items-start gap-2 text-[var(--bos-text-primary)]">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight text-[11.5px]">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[var(--bos-line)] space-y-1 text-xs font-mono">
                    <span className="text-[10px] uppercase text-[var(--bos-text-tertiary)] font-semibold block">
                      ORGANIZATION RESTRICTIONS:
                    </span>
                    <p className="text-[11px] text-[var(--bos-text-tertiary)] leading-snug">
                      Organization settings, billing, and membership management are reserved for workspace administrators.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEnterWorkspace}
                  className="w-full py-3.5 px-6 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <span>PREPARE & ENTER WORKSPACE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* Preparing Workspace Screen */
            <motion.div
              key="onboarding-preparing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-6 shadow-xs max-w-lg mx-auto text-left"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--bos-accent)]" />
                <div>
                  <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block">
                    SESSION SYNCHRONIZATION
                  </span>
                  <h3 className="text-lg font-medium text-[var(--bos-text-primary)]">
                    Preparing Your Workspace
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 font-mono text-xs border-t border-[var(--bos-line)]">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[var(--bos-text-secondary)]">Loading your task assignments</span>
                  <span className={prepStep1 ? "text-emerald-600 font-semibold" : "text-[var(--bos-text-tertiary)]"}>
                    {prepStep1 ? "✓ Ready" : "Loading..."}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[var(--bos-text-secondary)]">Connecting assigned projects</span>
                  <span className={prepStep2 ? "text-emerald-600 font-semibold" : "text-[var(--bos-text-tertiary)]"}>
                    {prepStep2 ? "✓ Connected" : "Connecting..."}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[var(--bos-text-secondary)]">Syncing team pulse</span>
                  <span className={prepStep3 ? "text-emerald-600 font-semibold" : "text-[var(--bos-text-tertiary)]"}>
                    {prepStep3 ? "✓ Synced" : "Syncing..."}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[var(--bos-text-secondary)]">Initializing notifications</span>
                  <span className={prepStep4 ? "text-emerald-600 font-semibold" : "text-[var(--bos-text-tertiary)]"}>
                    {prepStep4 ? "✓ Initialized" : "Pending..."}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)] border-t border-[var(--bos-line)] pt-4 max-w-4xl mx-auto w-full">
        <span>BUSINESS OS · ROLE-AWARE ONBOARDING</span>
        <span>WORKSPACE READY</span>
      </div>
    </div>
  );
}
