"use client";

import { useState, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthPanel, AuthHeader, AuthField, AuthBottomAction } from "@/components/auth-shell";
import { PrimaryAction } from "@/components/primary-action";
import { AuthStatus } from "@/components/auth-status";
import { BusinessOSLogo } from "@/components/business-os-mark";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");

      if (!email) {
        setError("Enter your email address.");
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!data.ok) {
          setError(data.message ?? "Something went wrong.");
          setLoading(false);
          return;
        }

        setSent(true);
        setLoading(false);
      } catch {
        setError("Connection error. Try again.");
        setLoading(false);
      }
    },
    [email],
  );

  return (
    <AuthPanel>
      <div className="lg:hidden mb-8">
        <BusinessOSLogo size="sm" />
      </div>

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AuthHeader
              section="ACCESS RECOVERY / 02"
              title="Check your inbox"
              subtitle="If an account exists with this email, a password reset link has been sent."
            />
            <AuthStatus
              type="success"
              message="Reset link sent. Check your email and spam folder."
            />
            <div className="mt-6">
              <a href="/login" className="bos-link bos-link--accent text-sm font-medium">
                ← Back to sign in
              </a>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="forgot-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <AuthHeader
              section="ACCESS RECOVERY / 02"
              title="Forgot your password?"
              subtitle="Enter your work email and we'll send you a secure link to reset your password."
            />

            {error && (
              <div className="mb-5">
                <AuthStatus type="error" message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <AuthField label="Work Email">
                <input
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

              <div className="mt-7">
                <PrimaryAction type="submit" loading={loading}>
                  Send Reset Link
                </PrimaryAction>
              </div>
            </form>

            <AuthBottomAction
              label=""
              linkLabel="← Back to sign in"
              href="/login"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPanel>
  );
}