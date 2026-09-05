"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthPanel, AuthHeader, AuthField } from "@/components/auth-shell";
import { PrimaryAction } from "@/components/primary-action";
import { AuthStatus } from "@/components/auth-status";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemFlowCompact } from "@/components/system-flow";

type VerificationState =
  | "pending"
  | "verifying"
  | "verified"
  | "already-verified"
  | "invalid"
  | "expired"
  | "paused";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email") ?? "";
  const [state, setState] = useState<VerificationState>(token ? "verifying" : "paused");
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Verify token on mount
  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (data.ok && data.code === "VERIFIED") {
          setState("verified");
          return;
        }
        if (data.code === "ALREADY_VERIFIED") {
          setState("already-verified");
          return;
        }
        if (data.code === "EXPIRED_TOKEN") {
          setState("expired");
          return;
        }
        if (data.code === "INVALID_TOKEN") {
          setState("invalid");
          return;
        }
        setError(data.message ?? "Verification failed.");
        setState("invalid");
      } catch {
        setError("Connection error. Try again.");
        setState("invalid");
      }
    };

    verify();
  }, [token]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleResend = useCallback(async () => {
    if (!email || resendCountdown > 0 || resending) return;
    setResending(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.ok) {
        setResendMessage({ type: "error", text: data.message ?? "Could not resend the email." });
        return;
      }
      setResendMessage({ type: "success", text: "Verification email sent. Check your inbox." });
      setResendCountdown(42);
    } catch {
      setResendMessage({ type: "error", text: "Connection error. Try again." });
    } finally {
      setResending(false);
    }
  }, [email, resendCountdown, resending]);

  const successCheck = (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="w-14 h-14 rounded-full bg-[var(--bos-success)]/10 flex items-center justify-center mb-6"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[var(--bos-success)]">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );

  return (
    <AuthPanel>
      <div className="lg:hidden mb-8">
        <BusinessOSLogo size="sm" />
      </div>

      <AnimatePresence mode="wait">
        {/* Success state — account verified */}
        {state === "verified" && (
          <motion.div
            key="verified"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            {successCheck}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mb-2"
            >
              Email verified successfully
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-[var(--bos-text-secondary)] mb-8"
            >
              Your account has been verified. You can now sign in.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <PrimaryAction onClick={() => router.push("/login")} showArrow={false}>
                Continue to Sign In
              </PrimaryAction>
            </motion.div>
          </motion.div>
        )}

        {/* Already verified */}
        {state === "already-verified" && (
          <motion.div
            key="already-verified"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            {successCheck}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mb-2"
            >
              Your email is already verified
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-[var(--bos-text-secondary)] mb-8"
            >
              You can sign in with your email and password.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <PrimaryAction onClick={() => router.push("/login")} showArrow={false}>
                Sign In
              </PrimaryAction>
            </motion.div>
          </motion.div>
        )}

        {/* Invalid token */}
        {state === "invalid" && (
          <motion.div
            key="invalid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AuthHeader
              section="VERIFICATION / 04"
              title="Verification failed"
              subtitle="This verification link is invalid."
            />
            {error && error !== "This verification link is invalid." && (
              <AuthStatus type="error" message={error} />
            )}
            {email && (
              <div className="mt-5">
                <PrimaryAction onClick={handleResend} variant="secondary" loading={resending} disabled={resendCountdown > 0}>
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Verification Email"}
                </PrimaryAction>
                {resendMessage && (
                  <div className="mt-3">
                    <AuthStatus type={resendMessage.type} message={resendMessage.text} />
                  </div>
                )}
              </div>
            )}
            <p className="mt-5">
              <a href="/login" className="bos-link bos-link--accent text-sm">
                ← Back to sign in
              </a>
            </p>
          </motion.div>
        )}

        {/* Expired token */}
        {state === "expired" && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AuthHeader
              section="VERIFICATION / 04"
              title="Link expired"
              subtitle="This verification link has expired."
            />
            {email ? (
              <>
                <div className="mt-5">
                  <PrimaryAction onClick={handleResend} variant="secondary" loading={resending} disabled={resendCountdown > 0}>
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Verification Email"}
                  </PrimaryAction>
                  {resendMessage && (
                    <div className="mt-3">
                      <AuthStatus type={resendMessage.type} message={resendMessage.text} />
                    </div>
                  )}
                </div>
                <p className="mt-4">
                  <a href="/signup" className="bos-link text-xs">
                    Use a different email address
                  </a>
                </p>
              </>
            ) : (
              <p className="mt-5">
                <a href="/forgot-password" className="bos-link bos-link--accent text-sm">
                  Request a new link
                </a>
              </p>
            )}
            <p className="mt-4">
              <a href="/login" className="bos-link text-xs">
                ← Back to sign in
              </a>
            </p>
          </motion.div>
        )}

        {/* Verifying state */}
        {state === "verifying" && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 mb-6"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <circle cx="12" cy="12" r="10" stroke="var(--bos-line-strong)" strokeWidth="2" />
                <path
                  d="M12 2a10 10 0 019.95 9"
                  stroke="var(--bos-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
            <p className="text-sm text-[var(--bos-text-secondary)]">
              Verifying your email...
            </p>
          </motion.div>
        )}

        {/* Paused — waiting for user to click link in email */}
        {state === "paused" && (
          <motion.div
            key="paused"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AuthHeader
              section="VERIFICATION / 04"
              title="Verify your email"
              subtitle="We've sent a verification link to your email address."
            />

            {/* Verification flow animation */}
            <div className="flex items-center gap-3 mb-8 py-4 px-4 rounded-sm bg-[var(--bos-overlay)]">
              <div className="flex flex-col items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
                <span>REQUEST</span>
                <div className="w-px h-4 mx-auto bg-[var(--bos-line)]" />
              </div>
              <div className="flex-1 h-px bg-[var(--bos-line)] relative">
                <motion.div
                  className="absolute left-0 top-0 h-px bg-[var(--bos-accent)]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
              </div>
              <div className="flex flex-col items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
                <span>DELIVERY</span>
                <div className="w-px h-4 mx-auto bg-[var(--bos-line)]" />
              </div>
              <div className="flex-1 h-px bg-[var(--bos-line)]" />
              <div className="flex flex-col items-center gap-1.5 text-[10px]">
                <span className="text-[var(--bos-text-secondary)] font-medium">VERIFIED</span>
                <div className="w-2 h-2 rounded-full bg-[var(--bos-accent)]/30" />
              </div>
            </div>

            {email && (
              <>
                <AuthField label="Email">
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="bos-input opacity-60"
                  />
                </AuthField>

                <div className="mt-4">
                  <PrimaryAction
                    onClick={handleResend}
                    variant="secondary"
                    loading={resending}
                    disabled={resendCountdown > 0}
                  >
                    {resendCountdown > 0
                      ? `Resend in ${resendCountdown}s`
                      : "Resend Email"}
                  </PrimaryAction>
                  {resendMessage && (
                    <div className="mt-3">
                      <AuthStatus type={resendMessage.type} message={resendMessage.text} />
                    </div>
                  )}
                </div>

                <p className="mt-3 text-center">
                  <a
                    href="/signup"
                    className="bos-link text-[11px]"
                  >
                    Change email / return to signup
                  </a>
                </p>
              </>
            )}

            <p className="mt-8 text-center">
              <a href="/login" className="bos-link text-xs">
                ← Back to sign in
              </a>
            </p>

            <div className="mt-10 lg:hidden">
              <SystemFlowCompact className="justify-center" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPanel>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
