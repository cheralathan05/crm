import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decideChangeRequest } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ changeRequestId: string; action: string }> };

const ACTIONS = ["accept", "decline", "clarification"] as const;

/* ── POST /api/proposals/change-requests/[id]/[action] ───────
   Admin decides on a client change request. Every decision is
   recorded; accepted changes move the proposal into revision. */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { changeRequestId, action } = await params;
  if (!(ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ ok: false, message: "Unknown decision." }, { status: 400 });
  }

  const workspace = await db.workspace.findUnique({ where: { ownerId: session.user.id } });
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }
  const changeRequest = await db.proposalChangeRequest.findFirst({
    where: { id: changeRequestId, workspaceId: workspace.id },
  });
  if (!changeRequest) {
    return NextResponse.json({ ok: false, message: "Change request not found." }, { status: 404 });
  }

  let body: { response?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const updated = await decideChangeRequest({
      changeRequestId,
      decision: action as (typeof ACTIONS)[number],
      response: body.response,
      actorName: session.user.name ?? "Owner",
    });
    return NextResponse.json({ ok: true, changeRequest: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The decision could not be saved.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
