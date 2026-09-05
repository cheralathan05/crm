import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { generateToken, hashToken, tokenExpiry } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = await rateLimit(5, 60_000, "signup");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  // Accept both `fullName` (public API) and `name` (existing schema) for the full name field.
  const parsed = signupSchema.safeParse({
    ...body,
    name: body.fullName ?? body.name,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        ok: false,
        message: Object.values(fieldErrors).flat()[0] ?? "Invalid input.",
        errors: fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, companyName, email, password } = parsed.data;

  try {
    const existing = await db.user.findUnique({ where: { email } });

    // Case 1 — account already exists and is verified: do not create a duplicate.
    if (existing && existing.emailVerified) {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_EXISTS",
          message: "An account with this email already exists. Please sign in.",
        },
        { status: 409 },
      );
    }

    // Case 2 — account exists but is NOT verified: resend the verification email
    // instead of creating a second account.
    if (existing && !existing.emailVerified) {
      // Invalidate any previous verification tokens.
      await db.verificationToken.deleteMany({
        where: { userId: existing.id, type: "EMAIL_VERIFICATION" },
      });

      const token = generateToken();
      await db.verificationToken.create({
        data: {
          tokenHash: hashToken(token),
          type: "EMAIL_VERIFICATION",
          userId: existing.id,
          expiresAt: tokenExpiry(24),
        },
      });
      await sendVerificationEmail(email, existing.name, token);

      return NextResponse.json(
        {
          ok: true,
          code: "VERIFICATION_RESENT",
          message: "Your account is not verified yet. We have sent a new verification email.",
        },
        { status: 200 },
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: { name, companyName, email, passwordHash },
    });

    const token = generateToken();
    await db.verificationToken.create({
      data: {
        tokenHash: hashToken(token),
        type: "EMAIL_VERIFICATION",
        userId: user.id,
        expiresAt: tokenExpiry(24),
      },
    });
    await sendVerificationEmail(email, user.name, token);

    return NextResponse.json(
      {
        ok: true,
        code: "ACCOUNT_CREATED",
        message: "Account created. Check your email to verify.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[signup] error:", error);
    return NextResponse.json(
      { ok: false, message: "Signup failed. Please try again." },
      { status: 500 },
    );
  }
}
