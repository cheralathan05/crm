import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailConfigStatus, sendTestEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

/* ── GET /api/settings/email ───────────────────────────────────
   Non-secret summary of the workspace's email delivery setup. Used by
   the Settings page — never exposes credentials or tokens. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const workspace = await db.workspace.findUnique({ where: { ownerId: session.user.id } });
  const config = emailConfigStatus();

  let from: string | null = null;
  if (config.channel === "smtp") from = config.from;
  if (config.channel === "resend") from = process.env.RESEND_FROM ?? "Business OS <onboarding@resend.dev>";

  return NextResponse.json({
    ok: true,
    configured: config.channel !== "none",
    channel: config.channel,
    from,
    host: config.channel === "smtp" ? config.host : null,
    port: config.channel === "smtp" ? config.port : null,
    companyName: workspace?.companyName ?? null,
  });
}

/* ── POST /api/settings/email/test ─────────────────────────────
   Sends a real test email to diagnose the configured provider. The
   result is honest: success only when the provider confirms. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  let to: string | undefined;
  try {
    const body = await req.json();
    to = typeof body?.to === "string" ? body.to.trim() : undefined;
  } catch {
    return NextResponse.json({ ok: false, message: "Send a JSON body with a `to` address." }, { status: 400 });
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ ok: false, message: "Enter a valid recipient email." }, { status: 400 });
  }

  const result = await sendTestEmail(to);
  if (!result.sent) {
    return NextResponse.json(
      {
        ok: false,
        message: result.error
          ? `Test email delivery failed: ${result.error}`
          : "Test email failed — the email provider did not confirm delivery. Check your configuration.",
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, message: "Test email sent successfully." });
}
