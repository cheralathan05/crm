import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, transitionRequest } from "@/lib/requirements";
import { getSection } from "@/lib/requirement-config";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/requirements/[id]/request-changes ──────────────
   Opens a clarification thread targeting a specific section. The client
   sees it as a banner and jumps straight to that section. The request
   moves to CHANGES_REQUESTED — never destroys submitted data. */

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
  if (!["SUBMITTED", "REVISION_SUBMITTED", "CHANGES_REQUESTED", "IN_PROGRESS", "SENT"].includes(request.status)) {
    return NextResponse.json({ ok: false, message: "This request cannot accept changes." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const section = body.section ? String(body.section) : null;
  if (section && !getSection(section)) {
    return NextResponse.json({ ok: false, message: "Unknown section." }, { status: 400 });
  }
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ ok: false, message: "A clarification message is required." }, { status: 400 });
  }

  const result = await transitionRequest({
    request,
    action: "request-changes",
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
    data: { section, message },
  });
  const updated = "request" in result ? result.request : result;

  return NextResponse.json({
    ok: true,
    status: updated.status,
    section: section ?? null,
    sectionLabel: section ? getSection(section)?.label ?? section : null,
  });
}
