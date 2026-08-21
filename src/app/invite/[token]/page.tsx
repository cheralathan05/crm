"use client";

import { useEffect, useState, use, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Building2,
  Users,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";

type InvitationStage = "VERIFYING" | "WELCOME" | "ACTIVATE" | "ACTIVATED";

export default function InviteActivationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = use(params);

  const [stage, setStage] = useState<InvitationStage>("VERIFYING");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  // Progressive verification state checks
  const [step1Passed, setStep1Passed] = useState(false);
  const [step2Passed, setStep2Passed] = useState(false);
  const [step3Passed, setStep3Passed] = useState(false);

  // Form State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Password Requirement Validator
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[^A-Za-z0-9]/.test(password);
  const allReqsSatisfied = reqLength && reqUpper && reqLower && reqNumber && reqSpecial;

  // Step 1: Progressive Token Validation
  useEffect(() => {
    let isMounted = true;

    const validate = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/public/invite/${token}`);
        const json = await res.json();

        if (json.valid && json.invitation) {
          if (!isMounted) return;
          setData(json.invitation);

          // Progressive visual verification sequence
          setTimeout(() => {
            if (!isMounted) return;
            setStep1Passed(true);
            setTimeout(() => {
              if (!isMounted) return;
              setStep2Passed(true);
              setTimeout(() => {
                if (!isMounted) return;
                setStep3Passed(true);
                setTimeout(() => {
                  if (!isMounted) return;
                  setStage("WELCOME");
                }, 400);
              }, 400);
            }, 400);
          }, 350);
        } else {
          setError(json.message || "This invitation is no longer available.");
          setErrorReason(json.reason || "INVALID_TOKEN");
        }
      } catch {
        setError("Business OS couldn't reach the workspace. Check your connection.");
        setErrorReason("NETWORK_ERROR");
      }
    };

    if (token) validate();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle Account Activation
  const handleActivate = async (e: FormEvent) => {
    e.preventDefault();
    if (!allReqsSatisfied) {
      setError("Please satisfy all password security requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setError("Please accept the organization security policies to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();

      if (json.ok) {
        setStage("ACTIVATED");
      } else {
        setError(json.message || "Failed to activate account.");
      }
    } catch {
      setError("Business OS couldn't complete activation. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToWorkspace = () => {
    // Automatically redirect to employee onboarding or login
    router.push(`/employee/onboarding?email=${encodeURIComponent(data.recipientEmail)}&org=${encodeURIComponent(data.workspaceName)}`);
  };

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col justify-between p-6 sm:p-12 overflow-hidden font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-xs">
            ⬡
          </div>
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
              BUSINESS OS
            </span>
            <span className="block text-[9.5px] font-mono text-[var(--bos-text-tertiary)] tracking-wider">
              EMPLOYEE INVITATION ACCESS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--bos-text-tertiary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>SECURE INVITATION</span>
        </div>
      </div>

      {/* Main Experience Card */}
      <div className="relative z-10 max-w-xl w-full mx-auto my-auto py-6">
        {/* Error State */}
        {error && !data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] text-center space-y-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-rose-600 block mb-1">
                {errorReason === "EXPIRED"
                  ? "INVITATION EXPIRED"
                  : errorReason === "REVOKED"
                  ? "INVITATION REVOKED"
                  : errorReason === "ALREADY_ACCEPTED"
                  ? "INVITATION ALREADY USED"
                  : "INVITATION UNAVAILABLE"}
              </span>
              <h2 className="text-xl font-normal text-[var(--bos-text-primary)]">
                Access Not Available
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed max-w-md mx-auto">
                {error}
              </p>
            </div>
            <div className="pt-2">
              <a
                href="/auth/employee/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[var(--bos-accent)] text-white text-xs font-mono font-semibold tracking-wider uppercase"
              >
                <span>RETURN TO EMPLOYEE ACCESS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        )}

        {/* ── STAGE 1: Verifying Invitation ── */}
        {stage === "VERIFYING" && !error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-6 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--bos-accent)]" />
              <div>
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block">
                  SYSTEM INITIALIZATION
                </span>
                <h3 className="text-lg font-medium text-[var(--bos-text-primary)]">
                  Verifying Invitation
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 font-mono text-xs border-t border-[var(--bos-line)]">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[var(--bos-text-secondary)]">Checking invitation signature</span>
                <span className={step1Passed ? "text-emerald-600 font-semibold" : "text-[var(--bos-text-tertiary)]"}>
                  {step1Passed ? "✓ Invitation recognized" : "Validating..."}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[var(--bos-text-secondary)]">Checking organization context</span>
                <span className={step2Passed ? "text-emerald-600 font-semibold" : "text-[var(--bos-text-tertiary)]"}>
                  {step2Passed ? "✓ Organization verified" : "Checking..."}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[var(--bos-text-secondary)]">Preparing role authorizations</span>
                <span className={step3Passed ? "text-emerald-600 font-semibold" : "text-[var(--bos-text-tertiary)]"}>
                  {step3Passed ? "✓ Access prepared" : "Pending..."}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STAGE 2: Welcome to Organization ── */}
        {stage === "WELCOME" && data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-6 shadow-xs"
          >
            <div>
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1">
                YOU'RE INVITED
              </span>
              <h1 className="text-2xl sm:text-3xl font-light text-[var(--bos-text-primary)] tracking-tight">
                Welcome to {data.workspaceName}
              </h1>
              <p className="text-xs text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed">
                You have been invited to join the organization operational workspace.
              </p>
            </div>

            {/* Real Organization Context Card */}
            <div className="p-4 rounded-sm bg-[var(--bos-bg)] border border-[var(--bos-line)] space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                    YOU ARE JOINING AS
                  </span>
                  <strong className="text-[var(--bos-text-primary)] font-semibold block text-sm mt-0.5">
                    {data.role?.name || "Team Member"}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                    TEAM
                  </span>
                  <strong className="text-[var(--bos-text-primary)] font-semibold block text-sm mt-0.5">
                    {data.team?.name || "General Delivery"}
                  </strong>
                </div>
              </div>

              <div className="border-t border-[var(--bos-line)] pt-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                    REPORTS TO / INVITED BY
                  </span>
                  <span className="text-[var(--bos-text-secondary)] font-medium">
                    {data.managerName || data.invitedByName || "Workspace Administrator"}
                  </span>
                </div>
                {data.department && (
                  <span className="px-2 py-0.5 rounded-xs bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-tertiary)]">
                    {data.department}
                  </span>
                )}
              </div>

              {data.primaryResponsibility && (
                <div className="border-t border-[var(--bos-line)] pt-2.5">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                    PRIMARY RESPONSIBILITY
                  </span>
                  <p className="text-[var(--bos-text-secondary)] font-sans text-xs mt-0.5">
                    {data.primaryResponsibility}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStage("ACTIVATE")}
              className="w-full py-3 px-4 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ACCEPT INVITATION & ACTIVATE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── STAGE 3: Account Activation & Password Setup ── */}
        {stage === "ACTIVATE" && data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-6 shadow-xs"
          >
            <div>
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1">
                ACCOUNT ACTIVATION
              </span>
              <h2 className="text-2xl font-light text-[var(--bos-text-primary)] tracking-tight">
                Your organization has prepared your workspace.
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)] mt-1 leading-relaxed">
                Create a secure password to activate your employee credentials and enter.
              </p>
            </div>

            {/* Read-only Profile Information */}
            <div className="p-3.5 rounded-sm bg-[var(--bos-bg)] border border-[var(--bos-line)] grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Name</span>
                <span className="text-[var(--bos-text-primary)] font-medium">{data.recipientName}</span>
              </div>
              <div>
                <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Work Email</span>
                <span className="text-[var(--bos-text-primary)] font-medium truncate block">{data.recipientEmail}</span>
              </div>
              <div className="mt-1">
                <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Role</span>
                <span className="text-[var(--bos-accent)] font-medium">{data.role?.name || "Specialist"}</span>
              </div>
              <div className="mt-1">
                <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">Team</span>
                <span className="text-[var(--bos-text-primary)] font-medium">{data.team?.name || "General"}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-medium tracking-wide uppercase text-[var(--bos-text-secondary)]">
                  CREATE PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirement Feedback */}
              <div className="p-3.5 rounded-sm bg-[var(--bos-bg)] border border-[var(--bos-line)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                    PASSWORD SECURITY
                  </span>
                  {allReqsSatisfied && (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 tracking-wide uppercase">
                      PASSWORD READY
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                  <div className={`flex items-center gap-2 ${reqLength ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                    <span>{reqLength ? "✓" : "○"}</span>
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${reqUpper ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                    <span>{reqUpper ? "✓" : "○"}</span>
                    <span>Uppercase character (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${reqLower ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                    <span>{reqLower ? "✓" : "○"}</span>
                    <span>Lowercase character (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${reqNumber ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                    <span>{reqNumber ? "✓" : "○"}</span>
                    <span>Numeric digit (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${reqSpecial ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                    <span>{reqSpecial ? "✓" : "○"}</span>
                    <span>Special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-medium tracking-wide uppercase text-[var(--bos-text-secondary)]">
                  CONFIRM PASSWORD
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] font-mono"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 w-3.5 h-3.5 rounded-xs border-[var(--bos-border-strong)] accent-[var(--bos-accent)]"
                />
                <label htmlFor="terms" className="text-xs text-[var(--bos-text-secondary)] cursor-pointer">
                  I accept the organization security policies and acknowledge workspace authorization.
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !allReqsSatisfied || password !== confirmPassword || !agreeTerms}
                className="w-full py-3 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ACTIVATING CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <span>ACTIVATE ACCOUNT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── STAGE 4: Activation Success ── */}
        {stage === "ACTIVATED" && data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-6 shadow-xs text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 block">
                  WORKSPACE READY
                </span>
                <h2 className="text-xl font-normal text-[var(--bos-text-primary)]">
                  Account Activated
                </h2>
              </div>
            </div>

            <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
              Your access has been configured. You are authorized to collaborate within your organization operating environment.
            </p>

            {/* Granted Access Summary */}
            <div className="p-4 rounded-sm bg-[var(--bos-bg)] border border-[var(--bos-line)] space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">ORGANIZATION</span>
                  <strong className="text-[var(--bos-text-primary)] font-medium">{data.workspaceName}</strong>
                </div>
                <div>
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">ROLE</span>
                  <strong className="text-[var(--bos-accent)] font-medium">{data.role?.name || "Team Member"}</strong>
                </div>
                <div className="mt-1">
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">TEAM</span>
                  <strong className="text-[var(--bos-text-primary)] font-medium">{data.team?.name || "General Delivery"}</strong>
                </div>
                <div className="mt-1">
                  <span className="text-[9.5px] text-[var(--bos-text-tertiary)] uppercase block">SECURITY STATUS</span>
                  <span className="text-emerald-600 font-semibold">ACTIVE & ENCRYPTED</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinueToWorkspace}
              className="w-full py-3 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>CONTINUE TO WORKSPACE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)] border-t border-[var(--bos-line)] pt-4 max-w-2xl mx-auto w-full">
        <span>BUSINESS OS · SECURE WORKSPACE ACCESS</span>
        <span>ORGANIZATION-CONTROLLED IDENTITY</span>
      </div>
    </div>
  );
}
