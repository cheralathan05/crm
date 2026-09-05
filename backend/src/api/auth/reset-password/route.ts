import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation";
import { hashToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = await rateLimit(5, 60_000, "reset-password");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  }

  const body = await request.json();
  // Accept both `newPassword` (documented API payload) and `password` (existing schema).
  const parsed = resetPasswordSchema.safeParse({
    ...body,
    password: body.newPassword ?? body.password,
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

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  // Opportunistic cleanup of expired/used tokens to bound table growth.
  await db.verificationToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const stored = await db.verificationToken.findUnique({
    where: { tokenHash },
  });

  if (!stored || stored.type !== "PASSWORD_RESET") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TOKEN",
        message: "This reset link is invalid.",
      },
      { status: 400 },
    );
  }

  if (stored.usedAt) {
    return NextResponse.json(
      {
        ok: false,
        code: "TOKEN_USED",
        message: "This reset link has already been used. Request a new one.",
      },
      { status: 400 },
    );
  }

  if (stored.expiresAt < new Date()) {
    return NextResponse.json(
      {
        ok: false,
        code: "EXPIRED_TOKEN",
        message: "This reset link has expired. Request a new one.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await hash(password, 12);
  await db.user.update({
    where: { id: stored.userId },
    data: {
      passwordHash,
      // Bump the session version so every previously issued JWT session is
      // invalidated immediately (enforced in the session callback).
      sessionVersion: { increment: 1 },
    },
  });

  // Invalidate the token immediately so it cannot be reused.
  await db.verificationToken.update({
    where: { id: stored.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    code: "PASSWORD_UPDATED",
    message: "Password updated successfully. You can now sign in.",
  });
}
