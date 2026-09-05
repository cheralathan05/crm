import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resendVerificationSchema } from "@/lib/validation";
import { generateToken, hashToken, tokenExpiry } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = await rateLimit(2, 120_000, "resend-verification");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = resendVerificationSchema.safeParse(body);

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

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "No account found with this email." },
      { status: 404 },
    );
  }

  if (user.emailVerified) {
    return NextResponse.json({
      ok: true,
      code: "ALREADY_VERIFIED",
      message: "Email already verified. You can sign in.",
    });
  }

  // Invalidate previous tokens so only the newest link works.
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

  return NextResponse.json({
    ok: true,
    code: "VERIFICATION_SENT",
    message: "Verification email sent.",
  });
}
