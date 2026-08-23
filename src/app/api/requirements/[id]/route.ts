import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, serializeAdminRequest } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/requirements/[id] — the Requirement Command Center ──
   Full admin bundle: answers, features, attachments, comments,
   revisions, events, readiness. Workspace-scoped — a caller can never
   read another workspace's request. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  return NextResponse.json(await serializeAdminRequest(request));
}
