"use client";

import { useState, useCallback, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { AuthPanel, AuthHeader, AuthField, AuthDivider, AuthBottomAction } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { PrimaryAction } from "@/components/primary-action";
import { SocialButton } from "@/components/social-button";
import { AuthStatus } from "@/components/auth-status";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemFlowCompact } from "@/components/system-flow";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default destination is "/" so the server resolves the correct post-auth
  // path (onboarding or dashboard) from the user's onboarding state.
  const from = searchParams.get("from") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Resend countdown timer.
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setUnverified(false);
      setResendMessage(null);

      if (!email || !password) {
        setError("Enter your email and password.");
        return;
      }

      setLoading(true);

      try {
        const result = await signIn("credentials", {
          email,
          password,
          remember,
          redirect: false,
        });

        // Account exists but email verification is pending.
        if (result?.code === "EMAIL_NOT_VERIFIED") {
          setUnverified(true);
          setLoading(false);
          return;
        }

        if (result?.code === "RateLimit") {
          setError("Too many attempts. Try again shortly.");
          setLoading(false);
          return;
        }

        if (result?.error) {
          setError("Invalid email or password.");
          setLoading(false);
          return;
        }

        // Success — show animated transition
        setSuccess(true);
        setTimeout(() => {
          router.push(from);
        }, 700);
      } catch {
        setError("Connection error. Try again.");
        setLoading(false);
      }
    },
    [email, password, remember, router, from],
  );

  const handleResend = useCallback(async () => {
    if (!email || resendCountdown > 0 || resending) return;
    setResending(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setResendMessage({ type: "error", text: data.message ?? "Could not resend the email." });
        return;
      }
      setResendMessage({
        type: "success",
        text: "Verification email sent. Check your inbox.",
      });
      setResendCountdown(42);
    } catch {
      setResendMessage({ type: "error", text: "Connection error. Try again." });
    } finally {
      setResending(false);
    }
  }, [email, resendCountdown, resending]);

  const handleGoogle = useCallback(async () => {
    setGoogleLoading(true);
    await signIn("google", { redirectTo: from });
  }, [from]);

  return (
    <AuthPanel>
      {/* Mobile logo */}
      <div className="lg:hidden mb-8">
        <BusinessOSLogo size="sm" />
      </div>

      {/* Success transition state */}
      {success ? (
        <motion.div
          key="success-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-12 h-12 rounded-full bg-[var(--bos-success)]/10 flex items-center justify-center mb-6"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-[var(--bos-success)]"
            >
              <path
                d="M4 10.5L8 14.5L16 5.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-base font-medium text-[var(--bos-text-primary)]"
          >
            AUTHENTICATED
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="text-sm text-[var(--bos-text-secondary)] mt-1"
          >
            Redirecting to your workspace...
          </motion.p>
        </motion.div>
      ) : (
        <motion.div
          key="login-form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <AuthHeader
            section="ACCESS / 01"
            title="Welcome back"
            subtitle="Your workspace is waiting."
          />

          {error && (
            <div className="mb-5">
              <AuthStatus type="error" message={error} />
            </div>
          )}

          {unverified && (
            <div className="mb-5">
              <AuthStatus type="info" message="Please verify your email before signing in." />
              <div className="mt-4">
                <PrimaryAction
                  onClick={handleResend}
                  variant="secondary"
                  loading={resending}
                  showArrow={false}
                  disabled={resendCountdown > 0}
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Verification Email"}
                </PrimaryAction>
                {resendMessage && (
                  <div className="mt-3">
                    <AuthStatus type={resendMessage.type} message={resendMessage.text} />
                  </div>
                )}
                <p className="mt-3 text-center">
                  <a
                    href={"/verify-email?email=" + encodeURIComponent(email.trim())}
                    className="bos-link bos-link--accent text-sm font-medium"
                  >
                    Open verification page
                  </a>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <AuthField label="Work Email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="bos-input"
                autoFocus
                disabled={loading}
              />
            </AuthField>

            <AuthField label="Password">
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />
            </AuthField>

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-sm border-[var(--bos-border-strong)] accent-[var(--bos-accent)]"
                  disabled={loading}
                />
                <span className="text-[11px] text-[var(--bos-text-secondary)]">
                  Remember me
                </span>
              </label>
              <a
                href="/forgot-password"
                className="bos-link text-[11px]"
              >
                Forgot password?
              </a>
            </div>

            <PrimaryAction type="submit" loading={loading} success={success}>
              Sign In
            </PrimaryAction>
          </form>

          <AuthDivider />

          <SocialButton
            provider="google"
            onClick={handleGoogle}
            disabled={loading}
            loading={googleLoading}
          />

          <AuthBottomAction
            label="New to Business OS?"
            linkLabel="Create your workspace"
            href="/signup"
          />

          <div className="mt-4 pt-4 border-t border-[var(--bos-line)] text-center">
            <a
              href="/auth/employee/login"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--bos-accent)] hover:underline"
            >
              <span>Entering as an employee? Employee Access</span>
              <span>→</span>
            </a>
          </div>

          {/* Mobile workflow indicator */}
          <div className="mt-8 lg:hidden">
            <SystemFlowCompact className="justify-center" />
          </div>
        </motion.div>
      )}
    </AuthPanel>
  );
}
