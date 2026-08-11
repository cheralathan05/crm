import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyEmailSchema } from "@/lib/validation";
import { hashToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(5, 60_000, "verify-email");
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, message: "Too many attempts. Try again shortly." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_TOKEN",
          message: "This verification link is invalid.",
        },
        { status: 400 },
      );
    }

    const { token } = parsed.data;
    const tokenHash = hashToken(token);

    const stored = await db.verificationToken.findUnique({
      where: { tokenHash },
    });

    // Unknown token — never expose internals.
    if (!stored || stored.type !== "EMAIL_VERIFICATION") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_TOKEN",
          message: "This verification link is invalid.",
        },
        { status: 400 },
      );
    }

    // Already used — check the account state to give an accurate message.
    if (stored.usedAt) {
      const user = await db.user.findUnique({ where: { id: stored.userId } });
      if (user?.emailVerified) {
        return NextResponse.json({
          ok: true,
          code: "ALREADY_VERIFIED",
          message: "Your email is already verified.",
        });
      }
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_TOKEN",
          message: "This verification link is invalid.",
        },
        { status: 400 },
      );
    }

    // Expired token.
    if (stored.expiresAt < new Date()) {
      return NextResponse.json(
        {
          ok: false,
          code: "EXPIRED_TOKEN",
          message: "This verification link has expired.",
        },
        { status: 400 },
      );
    }

    // Verify the user.
    await db.user.update({
      where: { id: stored.userId },
      data: { emailVerified: new Date() },
    });

    // Invalidate the token so it cannot be reused.
    await db.verificationToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      code: "VERIFIED",
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("[verify-email] error:", error);
    return NextResponse.json(
      { ok: false, message: "Verification failed. Try again." },
      { status: 500 },
    );
  }
}
