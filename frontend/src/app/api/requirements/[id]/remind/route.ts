import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, requirementLink, transitionRequest } from "@/lib/requirements";
import { hashToken } from "@/lib/tokens";
import { sendRequirementRequestEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

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
  if (["APPROVED", "REVOKED", "DRAFT"].includes(request.status)) {
    return NextResponse.json({ ok: false, message: "This request cannot be reminded." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  const to = String(body.to ?? request.sentTo ?? "").trim();
  if (!to) {
    return NextResponse.json({ ok: false, message: "No recipient on record." }, { status: 400 });
  }

  const providedLink = body.link ? String(body.link) : "";
  const tokenFromLink = providedLink.match(/\/client-requirement\/([A-Za-z0-9_-]+)$/)?.[1];
  let link = providedLink;

  if (!tokenFromLink || hashToken(tokenFromLink) !== request.tokenHash) {
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

  const result = await sendRequirementRequestEmail({
    to,
    subject: `Reminder — ${request.title} project discovery`,
    message: "This is a gentle reminder to complete your project discovery workspace. You can save progress and continue later.",
    link,
    projectTitle: request.title,
    companyName: "our team",
  });

  if (result.sent) {
    await transitionRequest({
      request,
      action: "remind",
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
    return NextResponse.json({ ok: true, sent: true, to });
  }
  if (result.devUrl) {
    await transitionRequest({
      request,
      action: "remind",
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
    return NextResponse.json({ ok: true, sent: false, dev: true, to, link });
  }
  return NextResponse.json({
    ok: false,
    sent: false,
    message: "The reminder could not be delivered. The link is below — copy and send it manually.",
    link,
  }, { status: 502 });
}
