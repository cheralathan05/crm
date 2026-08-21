"use client";

import { useState, useRef, useEffect, useCallback, FormEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { SystemGrid } from "@/components/system-grid";
import { AmbientBackground } from "@/components/ambient-background";

type RecoveryStep = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export default function EmployeeForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<RecoveryStep>("EMAIL");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // New password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);

  // Refs for 6-digit OTP input boxes
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP resend
  useEffect(() => {
    if (step !== "OTP" || resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCountdown]);

  // Password Requirement Validator
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[^A-Za-z0-9]/.test(password);
  const allReqsSatisfied = reqLength && reqUpper && reqLower && reqNumber && reqSpecial;

  // Step 1: Submit Work Email
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid work email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/employee/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Failed to request recovery code.");
        setLoading(false);
        return;
      }

      setMaskedEmail(data.maskedEmail || email);
      setResendCountdown(60);
      setStep("OTP");
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch {
      setError("Business OS couldn't reach the workspace. Check your network.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input changes
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;

    const digits = pasted.split("");
    setOtp(digits);
    otpInputRefs.current[5]?.focus();
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/employee/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: code,
        }),
      });
      const data = await res.json();

      if (!data.ok || !data.resetToken) {
        setError(data.message || "That verification code is incorrect.");
        setLoading(false);
        return;
      }

      setResetToken(data.resetToken);
      setStep("NEW_PASSWORD");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Password Reset
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!allReqsSatisfied) {
      setError("Please fulfill all password security requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/employee/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          password,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Failed to update password.");
        setLoading(false);
        return;
      }

      setStep("SUCCESS");
    } catch {
      setError("Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/employee/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.ok) {
        setResendCountdown(60);
        setOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      } else {
        setError(data.message || "Failed to resend code.");
      }
    } catch {
      setError("Connection error resending code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] flex flex-col justify-between p-6 sm:p-12 overflow-hidden font-sans selection:bg-[var(--bos-accent-subtle)] selection:text-[var(--bos-accent)]">
      <SystemGrid />
      <AmbientBackground />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-xs">
            ⬡
          </div>
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--bos-text-primary)] uppercase">
              BUSINESS OS
            </span>
            <span className="block text-[9.5px] font-mono text-[var(--bos-text-tertiary)] tracking-wider">
              ACCOUNT RECOVERY
            </span>
          </div>
        </div>

        <a
          href="/auth/employee/login"
          className="flex items-center gap-1 text-xs font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </a>
      </div>

      {/* Center Container */}
      <div className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Work Email ── */}
          {step === "EMAIL" && (
            <motion.div
              key="step-email"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1">
                  PASSWORD RECOVERY
                </span>
                <h1 className="text-2xl font-light text-[var(--bos-text-primary)] tracking-tight">
                  Employee Account Recovery
                </h1>
                <p className="text-xs text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed">
                  Enter your work email address. We'll send a 6-digit verification code to verify your identity.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-mono font-medium tracking-wide uppercase text-[var(--bos-text-secondary)]"
                  >
                    WORK EMAIL
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="employee@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING CODE...</span>
                    </>
                  ) : (
                    <>
                      <span>SEND VERIFICATION CODE</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === "OTP" && (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1">
                  VERIFY YOUR IDENTITY
                </span>
                <h1 className="text-2xl font-light text-[var(--bos-text-primary)] tracking-tight">
                  Enter Verification Code
                </h1>
                <p className="text-xs text-[var(--bos-text-secondary)] mt-1.5 leading-relaxed font-mono">
                  Code sent to: <span className="text-[var(--bos-text-primary)] font-semibold">{maskedEmail}</span>
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6-box OTP input */}
                <div className="flex items-center justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold bg-[var(--bos-surface)] border border-[var(--bos-border-strong)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] focus:ring-1 focus:ring-[var(--bos-accent)]"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[var(--bos-text-tertiary)] pt-1">
                  <span>Code expires in 10 minutes</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0 || loading}
                    className="text-[var(--bos-accent)] hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join("").length < 6}
                  className="w-full py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>VERIFYING CODE...</span>
                    </>
                  ) : (
                    <>
                      <span>VERIFY & PROCEED</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 3: Reset Password ── */}
          {step === "NEW_PASSWORD" && (
            <motion.div
              key="step-password"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[var(--bos-accent)] block mb-1">
                  AUTHENTICATION CREDENTIALS
                </span>
                <h1 className="text-2xl font-light text-[var(--bos-text-primary)] tracking-tight">
                  Secure Your Account Again
                </h1>
                <p className="text-xs text-[var(--bos-text-secondary)] mt-1 leading-relaxed">
                  Create a new strong password for your employee workspace access.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-medium tracking-wide uppercase text-[var(--bos-text-secondary)]">
                    NEW PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoFocus
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
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

                {/* Password Requirement System */}
                <div className="p-3.5 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)] space-y-2">
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
                      <span>Uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${reqLower ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                      <span>{reqLower ? "✓" : "○"}</span>
                      <span>Lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${reqNumber ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                      <span>{reqNumber ? "✓" : "○"}</span>
                      <span>Numeric character (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${reqSpecial ? "text-emerald-600 font-medium" : "text-[var(--bos-text-tertiary)]"}`}>
                      <span>{reqSpecial ? "✓" : "○"}</span>
                      <span>Special symbol (!@#$%^&*)</span>
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
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-sm text-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)] font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !allReqsSatisfied || password !== confirmPassword}
                  className="w-full py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>UPDATING PASSWORD...</span>
                    </>
                  ) : (
                    <>
                      <span>UPDATE PASSWORD</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === "SUCCESS" && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-5 p-6 rounded-sm bg-[var(--bos-surface)] border border-[var(--bos-line)]"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 block mb-1">
                  SECURITY CONFIRMED
                </span>
                <h2 className="text-xl font-normal text-[var(--bos-text-primary)]">
                  PASSWORD UPDATED
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)] mt-1 leading-relaxed">
                  Your account is secure again. You can now sign in with your updated credentials.
                </p>
              </div>

              <a
                href="/auth/employee/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold tracking-wider uppercase rounded-sm transition-all shadow-xs"
              >
                <span>RETURN TO EMPLOYEE ACCESS</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)] border-t border-[var(--bos-line)] pt-4 max-w-xl mx-auto w-full">
        <span>BUSINESS OS · IDENTITY PLATFORM</span>
        <span>ZERO-KNOWLEDGE AUTHENTICATION</span>
      </div>
    </div>
  );
}
