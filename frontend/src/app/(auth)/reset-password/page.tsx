"use client";

import { useState, useCallback, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthPanel, AuthHeader, AuthField } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { PasswordStrength } from "@/components/password-strength";
import { PrimaryAction } from "@/components/primary-action";
import { AuthStatus } from "@/components/auth-status";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemFlowCompact } from "@/components/system-flow";

type ResetError = "invalid" | "expired" | "used" | "general" | null;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetError, setResetError] = useState<ResetError>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setResetError(null);

      if (!token) {
        setError("Invalid reset link.");
        setResetError("invalid");
        return;
      }

      if (!password) {
        setError("Create a new password.");
        return;
      }
      if (password.length < 8) {
        setError("Use at least 8 characters.");
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError("Include at least one letter and one number.");
        return;
      }
      if (!confirmPassword) {
        setError("Confirm your new password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password, confirmPassword }),
        });

        const data = await res.json();

        if (!data.ok) {
          if (data.code === "INVALID_TOKEN") {
            setResetError("invalid");
            setError("This reset link is invalid.");
          } else if (data.code === "EXPIRED_TOKEN") {
            setResetError("expired");
            setError("This reset link has expired.");
          } else if (data.code === "TOKEN_USED") {
            setResetError("used");
            setError("This reset link has already been used.");
          } else {
            setError(data.message ?? "Reset failed.");
          }
          setLoading(false);
          return;
        }

        setSuccess(true);
        setLoading(false);
      } catch {
        setError("Connection error. Try again.");
        setLoading(false);
      }
    },
    [token, password, confirmPassword],
  );

  // Missing token — show invalid link state immediately.
  if (!token) {
    return (
      <AuthPanel>
        <div className="lg:hidden mb-8">
          <BusinessOSLogo size="sm" />
        </div>
        <AuthHeader
          section="SECURE ACCESS / 03"
          title="Invalid link"
          subtitle="This password reset link is invalid."
        />
        <a href="/forgot-password" className="bos-link bos-link--accent text-sm font-medium">
          ← Request a new reset link
        </a>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel>
      <div className="lg:hidden mb-8">
        <BusinessOSLogo size="sm" />
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
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
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mb-2"
            >
              Password updated successfully
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-[var(--bos-text-secondary)] mb-8"
            >
              Your password has been changed successfully. You can now sign in with your new password.
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
        ) : resetError === "invalid" || resetError === "expired" || resetError === "used" ? (
          <motion.div
            key="reset-error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AuthHeader
              section="SECURE ACCESS / 03"
              title={resetError === "used" ? "Link already used" : resetError === "expired" ? "Link expired" : "Invalid link"}
              subtitle={error}
            />
            <div className="mt-5">
              <a href="/forgot-password" className="bos-link bos-link--accent text-sm font-medium">
                Request a new reset link
              </a>
            </div>
            <p className="mt-4">
              <a href="/login" className="bos-link text-xs">
                ← Back to sign in
              </a>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reset-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <AuthHeader
              section="SECURE ACCESS / 03"
              title="Create a new password"
              subtitle="Choose a strong password for your workspace."
            />

            {error && (
              <div className="mb-5">
                <AuthStatus type="error" message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <AuthField label="New Password" error={password && password.length > 0 && password.length < 8 ? "Use at least 8 characters." : undefined}>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  placeholder="New Password"
                  autoComplete="new-password"
                  id="new-password"
                  disabled={loading}
                />
                <PasswordStrength value={password} />
              </AuthField>

              <AuthField label="Confirm New Password">
                <PasswordField
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm New Password"
                  autoComplete="new-password"
                  id="confirm-new-password"
                  disabled={loading}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-[var(--bos-error)] mt-1.5" role="alert">
                    Passwords do not match.
                  </p>
                )}
              </AuthField>

              <div className="mt-7">
                <PrimaryAction type="submit" loading={loading} success={success}>
                  Update Password
                </PrimaryAction>
              </div>
            </form>

            <p className="mt-6">
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
