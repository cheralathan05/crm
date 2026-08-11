import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateToken, hashToken, tokenExpiry } from "@/lib/tokens";
import { sendResetEmail, sendVerificationEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(3, 60_000, "forgot-password");
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, message: "Too many attempts. Try again shortly." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email.",
        },
        { status: 400 },
      );
    }

    const { email } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });

    // Always return the same generic response to prevent account/email enumeration.
    const genericResponse = NextResponse.json({
      ok: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });

    if (!user) {
      return genericResponse;
    }

    // Account exists but is NOT verified — do not issue a password reset.
    // Direct the user toward email verification instead (send a verification email).
    if (!user.emailVerified) {
      await db.verificationToken.deleteMany({
        where: { userId: user.id, type: "EMAIL_VERIFICATION" },
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
      return genericResponse;
    }

    // Verified account — send a password reset email. Invalidate previous tokens.
    await db.verificationToken.deleteMany({
      where: { userId: user.id, type: "PASSWORD_RESET" },
    });

    const token = generateToken();
    await db.verificationToken.create({
      data: {
        tokenHash: hashToken(token),
        type: "PASSWORD_RESET",
        userId: user.id,
        expiresAt: tokenExpiry(1),
      },
    });
    await sendResetEmail(email, user.name, token);

    return genericResponse;
  } catch (error) {
    console.error("[forgot-password] error:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
