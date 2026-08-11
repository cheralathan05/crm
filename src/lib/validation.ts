import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your work email.")
  .email("Enter a valid email address.")
  .max(254, "Email is too long.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Password is too long.")
  .refine((v) => /[a-zA-Z]/.test(v), "Include at least one letter.")
  .refine((v) => /[0-9]/.test(v), "Include at least one number.");

// Note: `remember` is intentionally NOT part of the schema. The NextAuth client
// passes it through the form-encoded body as the string "false", which would
// fail a z.boolean() field. Zod strips unknown keys by default, so it is simply
// ignored here (the JWT session strategy does not use it).
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name is too long."),
  companyName: z
    .string()
    .trim()
    .min(2, "Enter your company name.")
    .max(80, "Company name is too long."),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your company name.")
  .max(80, "Company name is too long.");

export type PasswordStrength = 0 | 1 | 2 | 3;

export function scorePassword(value: string): PasswordStrength {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) && value.length >= 10) score += 1;
  return Math.min(score, 3) as PasswordStrength;
}
