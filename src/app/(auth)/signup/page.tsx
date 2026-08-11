"use client";

import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthPanel, AuthHeader, AuthField, AuthBottomAction } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { PasswordStrength } from "@/components/password-strength";
import { PrimaryAction } from "@/components/primary-action";
import { AuthStatus } from "@/components/auth-status";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { SystemFlowCompact } from "@/components/system-flow";
import { scorePassword } from "@/lib/validation";

type FieldName = "name" | "companyName" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [existingUnverified, setExistingUnverified] = useState(false);

  const updateField = useCallback((field: keyof typeof formData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear the inline error for this field as the user types.
      setErrors((prev) => {
        if (!prev[field as FieldName]) return prev;
        const next = { ...prev };
        delete next[field as FieldName];
        return next;
      });
    };
  }, []);

  const validate = useCallback((data: typeof formData): FieldErrors => {
    const errs: FieldErrors = {};
    const name = data.name.trim();
    if (!name) errs.name = "Enter your full name.";
    else if (name.length < 2) errs.name = "Name must be at least 2 characters.";

    const company = data.companyName.trim();
    if (!company) errs.companyName = "Enter your company name.";
    else if (company.length < 2) errs.companyName = "Company name must be at least 2 characters.";

    const email = data.email.trim().toLowerCase();
    if (!email) errs.email = "Enter your work email.";
    else if (!EMAIL_RE.test(email)) errs.email = "Enter a valid email address.";

    const password = data.password;
    if (!password) errs.password = "Create a password.";
    else if (password.length < 8) errs.password = "Use at least 8 characters.";
    else if (!/[a-zA-Z]/.test(password)) errs.password = "Include at least one letter.";
    else if (!/[0-9]/.test(password)) errs.password = "Include at least one number.";

    if (!data.confirmPassword) errs.confirmPassword = "Confirm your password.";
    else if (data.confirmPassword !== data.password) errs.confirmPassword = "Passwords do not match.";

    return errs;
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setExistingUnverified(false);

      const errs = validate(formData);
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.name,
            companyName: formData.companyName,
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          }),
        });

        const data = await res.json();

        if (!data.ok) {
          // Case 1 — account exists and is verified.
          if (data.code === "EMAIL_EXISTS") {
            setError("An account with this email already exists. Please sign in.");
            setLoading(false);
            return;
          }
          setError(data.message ?? "Signup failed.");
          setLoading(false);
          return;
        }

        // Case 2 — account existed but was unverified; verification email re-sent.
        if (data.code === "VERIFICATION_RESENT") {
          setExistingUnverified(true);
          setLoading(false);
          setTimeout(() => {
            router.push("/verify-email?email=" + encodeURIComponent(formData.email.trim().toLowerCase()));
          }, 1400);
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          router.push("/verify-email?email=" + encodeURIComponent(formData.email.trim().toLowerCase()));
        }, 1000);
      } catch {
        setError("Connection error. Try again.");
        setLoading(false);
      }
    },
    [formData, validate, router],
  );

  return (
    <AuthPanel>
      {/* Mobile logo */}
      <div className="lg:hidden mb-8">
        <BusinessOSLogo size="sm" />
      </div>

      <AnimatePresence mode="wait">
        {success || existingUnverified ? (
          <motion.div
            key="success-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-12 h-12 rounded-full bg-[var(--bos-success)]/10 flex items-center justify-center mb-6"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[var(--bos-success)]">
                <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base font-medium text-[var(--bos-text-primary)]"
            >
              {existingUnverified ? "VERIFICATION EMAIL SENT" : "ACCOUNT CREATED"}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-[var(--bos-text-secondary)] mt-1"
            >
              {existingUnverified
                ? "Your account is not verified yet. We sent a new verification email."
                : "Check your email to verify."}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="signup-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AuthHeader
              section="WORKSPACE / 01"
              title="Create your account"
              subtitle="Set up your Business OS environment."
            />

            {error && (
              <div className="mb-5">
                <AuthStatus type="error" message={error} />
                {error.includes("already exists") && (
                  <p className="mt-3 text-center">
                    <a href="/login" className="bos-link bos-link--accent text-sm font-medium">
                      Continue to sign in
                    </a>
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <AuthField label="Full Name" error={errors.name}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={updateField("name")}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={`bos-input${errors.name ? " error" : ""}`}
                  autoFocus
                  disabled={loading}
                  aria-invalid={errors.name ? "true" : "false"}
                />
              </AuthField>

              <AuthField label="Company Name" error={errors.companyName}>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={updateField("companyName")}
                  placeholder="Your company or organization"
                  autoComplete="organization"
                  className={`bos-input${errors.companyName ? " error" : ""}`}
                  disabled={loading}
                  aria-invalid={errors.companyName ? "true" : "false"}
                />
              </AuthField>

              <AuthField label="Work Email" error={errors.email}>
                <input
                  type="email"
                  value={formData.email}
                  onChange={updateField("email")}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={`bos-input${errors.email ? " error" : ""}`}
                  disabled={loading}
                  aria-invalid={errors.email ? "true" : "false"}
                />
              </AuthField>

              <AuthField label="Password" error={errors.password}>
                <PasswordField
                  value={formData.password}
                  onChange={(v) => {
                    setFormData((prev) => ({ ...prev, password: v }));
                    setErrors((prev) => {
                      if (!prev.password) return prev;
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                  }}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  error={errors.password}
                  disabled={loading}
                />
                <PasswordStrength value={formData.password} />
              </AuthField>

              <AuthField label="Confirm Password" error={errors.confirmPassword}>
                <PasswordField
                  value={formData.confirmPassword}
                  onChange={(v) => {
                    setFormData((prev) => ({ ...prev, confirmPassword: v }));
                    setErrors((prev) => {
                      if (!prev.confirmPassword) return prev;
                      const next = { ...prev };
                      delete next.confirmPassword;
                      return next;
                    });
                  }}
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  id="confirmPassword"
                  error={errors.confirmPassword}
                  disabled={loading}
                />
              </AuthField>

              {formData.password && scorePassword(formData.password) === 0 && (
                <p className="text-xs text-[var(--bos-text-tertiary)] -mt-2 mb-2">
                  Use 8+ characters with a letter and a number.
                </p>
              )}

              <div className="mt-7">
                <PrimaryAction type="submit" loading={loading} success={success}>
                  Create Account
                </PrimaryAction>
              </div>
            </form>

            <AuthBottomAction
              label="Already have a workspace?"
              linkLabel="Sign in"
              href="/login"
            />

            {/* Mobile workflow indicator */}
            <div className="mt-10 lg:hidden">
              <SystemFlowCompact className="justify-center" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPanel>
  );
}
