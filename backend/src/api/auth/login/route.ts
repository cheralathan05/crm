import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn, EmailNotVerifiedError } from "@/lib/auth";
import { rateLimit, rateLimitByKey, clearRateLimit, clientIp } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const rl = await rateLimit(10, 60_000, "login");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const { email, password } = body ?? {};
  const parsedEmail = emailSchema.safeParse(email ?? "");

  if (!email || !password || !parsedEmail.success) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required." },
      { status: 400 },
    );
  }

  const normalizedEmail = parsedEmail.data;

  try {
    // Server-side signIn with `redirect: false` runs in "raw" mode:
    //   - On success it returns the redirect URL string (no error params).
    //   - On failure it THROWS an AuthError (CredentialsSignin subclass).
    // Note: `remember` is intentionally not passed — the JWT session strategy
    // does not use it, and it would arrive as the string "false" in the
    // form-encoded body (loginSchema strips unknown keys).
    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });

    // Successful sign-in — reset any accumulated failed-attempt lockout.
    clearRateLimit(`failed-login:${await clientIp()}:${normalizedEmail}`);

    const url = new URL(typeof result === "string" ? result : "/", request.url);
    if (url.searchParams.get("error")) {
      // Defensive: in case a URL with error params is ever returned.
      return NextResponse.json(
        { ok: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true, message: "Authenticated." });
  } catch (error) {
    if (error instanceof EmailNotVerifiedError) {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email before signing in.",
        },
        { status: 403 },
      );
    }
    if (error instanceof AuthError) {
      // Per-account brute-force protection: 5 failed attempts → 15 min lockout.
      // Keyed by IP+email so a distributed attacker cannot remotely lock out a
      // victim's account from many different IPs.
      const locked = rateLimitByKey(
        `failed-login:${await clientIp()}:${normalizedEmail}`,
        5,
        15 * 60_000,
      );
      if (!locked.ok) {
        return NextResponse.json(
          { ok: false, message: "Too many failed attempts. Try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(locked.retryAfterSeconds) },
          },
        );
      }
      // Invalid credentials — generic message to avoid enumeration.
      return NextResponse.json(
        { ok: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }
    console.error("[login] error:", error);
    return NextResponse.json(
      { ok: false, message: "Authentication failed." },
      { status: 500 },
    );
  }
}
