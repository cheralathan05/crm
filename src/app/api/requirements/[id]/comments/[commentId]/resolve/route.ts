import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

/* ── POST /api/requirements/[id]/comments/[commentId]/resolve ──
   Admin closes a workspace clarification thread. Workspace-scoped —
   the comment must belong to the caller's requirement. Resolving the
   thread clears the section's "needs clarification" state. */

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id, commentId } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  const result = await db.requirementComment.updateMany({
    where: { id: commentId, requestId: request.id, author: "ADMIN", resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ ok: false, message: "Open clarification thread not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
