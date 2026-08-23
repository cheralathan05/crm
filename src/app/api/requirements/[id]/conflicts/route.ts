import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/requirements/[id]/conflicts ──────────────────────
   Open conflicts flagged for a requirement (e.g. dependency
   violations between clarification answers). */

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

  const conflicts = await db.requirementConflict.findMany({
    where: { requirementId: request.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    ok: true,
    conflicts: conflicts.map((c) => ({
      id: c.id,
      description: c.description,
      detail: c.detail,
      status: c.status,
      createdAt: c.createdAt,
    })),
  });
}
