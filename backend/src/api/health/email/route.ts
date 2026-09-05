import { NextRequest, NextResponse } from "next/server";
import { emailConfigStatus, sendTestEmail, verifyEmailConnection } from "@/lib/mail";
import { isDev } from "@/lib/utils";

/**
 * Dev-only diagnostic for the email pipeline.
 *
 * GET /api/health/email
 *  - channel:  resend | smtp | none
 *  - host/port: shown for SMTP (non-secret)
 *  - verified:  SMTP handshake + auth result
 *  - test:      POST { to } sends a real test message (dev only)
 *
 * Returns 404 in production so the diagnostic surface is never exposed.
 */
export async function GET() {
  if (!isDev()) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const config = emailConfigStatus();
  const verified = config.channel === "smtp" ? await verifyEmailConnection() : null;

  return NextResponse.json({
    ok: true,
    channel: config.channel,
    smtp: config.channel === "smtp" ? {
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: config.from,
      verified: verified?.ok ?? false,
      reason: verified && !verified.ok ? verified.reason : undefined,
      error: verified && !verified.ok ? verified.error : undefined,
    } : undefined,
  });
}

export async function POST(request: NextRequest) {
  if (!isDev()) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  let to: string | undefined;
  try {
    const body = await request.json();
    to = typeof body?.to === "string" ? body.to : undefined;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Send a JSON body with a `to` address." },
      { status: 400 },
    );
  }

  if (!to) {
    return NextResponse.json(
      { ok: false, message: "Send a JSON body with a `to` address." },
      { status: 400 },
    );
  }

  const result = await sendTestEmail(to);
  if (!result.sent) {
    return NextResponse.json(
      { ok: false, message: result.error ? `Delivery failed: ${result.error}` : "Delivery failed. Check the server log for a safe diagnostic." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, message: "Test email sent." });
}
