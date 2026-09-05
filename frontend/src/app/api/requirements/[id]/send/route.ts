import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, requirementLink, transitionRequest } from "@/lib/requirements";
import { hashToken } from "@/lib/tokens";
import { sendRequirementRequestEmail, type MailResult } from "@/lib/mail";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/requirements/[id]/send — deliver the secure link ──
   The raw token is stored only as a hash, so the link travels from the
   admin UI (returned at creation, or regenerated here). Delivery state
   is honest: the request only becomes SENT when the mail provider
   accepted it (or, in dev without a provider, when the link is logged
   to the server console for copying). Failures keep the request DRAFT. */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }
  if (request.status === "REVOKED" || request.status === "APPROVED") {
    return NextResponse.json({ ok: false, message: "This request can no longer be sent." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const to = String(body.to ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ ok: false, message: "Enter a valid recipient email." }, { status: 400 });
  }
  const subject = String(body.subject ?? "").trim() || `Project discovery — ${request.title}`;
  const message = String(body.message ?? "").trim();

  // Resolve the link: either the one the UI holds from creation (validated
  // against the stored hash) or a fresh one issued here.
  const providedLink = body.link ? String(body.link) : "";
  const tokenFromLink = providedLink.match(/\/client-requirement\/([A-Za-z0-9_-]+)$/)?.[1];
  let link = "";

  if (tokenFromLink && hashToken(tokenFromLink) === request.tokenHash) {
    link = providedLink;
  } else {
    const regenerated = await transitionRequest({
      request,
      action: "regenerate",
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
    if (!("request" in regenerated) || !("token" in regenerated)) {
      return NextResponse.json({ ok: false, message: "Unable to issue a link." }, { status: 500 });
    }
    link = requirementLink(regenerated.token);
  }

  const result: MailResult = await sendRequirementRequestEmail({
    to,
    subject,
    message,
    link,
    projectTitle: request.title,
    companyName: (request as unknown as { client?: { companyName?: string } }).client?.companyName ?? "our team",
  });

  if (result.sent) {
    await transitionRequest({
      request,
      action: "send",
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
      data: { sentTo: to },
    });
    return NextResponse.json({ ok: true, sent: true, link, to });
  }

  // Delivery not confirmed. In dev the link is logged to the server console
  // so the flow stays usable — surface that honestly.
  if (result.devUrl) {
    await transitionRequest({
      request,
      action: "send",
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
      data: { sentTo: to },
    });
    return NextResponse.json({
      ok: true,
      sent: false,
      dev: true,
      link,
      to,
      message: "Email provider not configured — the link was printed to the server console. Copy it from below.",
    });
  }

  return NextResponse.json({
    ok: false,
    sent: false,
    link,
    message: "The email could not be delivered. The link is below — copy and send it manually.",
  }, { status: 502 });
}
