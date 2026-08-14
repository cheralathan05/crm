import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, requirementLink, transitionRequest } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/requirements/[id]/regenerate — new secure link ──
   Issues a fresh token (old one is retired by hash replacement), so a
   leaked or lost link can be retired instantly. */

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }
  if (request.status === "APPROVED") {
    return NextResponse.json({ ok: false, message: "Approved requests keep their link." }, { status: 400 });
  }

  const regenerated = await transitionRequest({
    request,
    action: "regenerate",
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
  });
  if (!("request" in regenerated) || !("token" in regenerated)) {
    return NextResponse.json({ ok: false, message: "Unable to issue a link." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token: regenerated.token,
    link: requirementLink(regenerated.token),
    status: regenerated.request.status,
  });
}
