import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decideUpdateProposal } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/proposal ────────────────────
   Decide a Requirement Update Proposal created from a resolved
   clarification: accept or reject. The requirement is never silently
   changed. */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  const decision = String(body.decision ?? "");
  if (!["accept", "reject"].includes(decision)) {
    return NextResponse.json({ ok: false, message: "Decision must be accept or reject." }, { status: 400 });
  }

  let updated;
  try {
    updated = await decideUpdateProposal({
      proposalId: id,
      decision: decision as "accept" | "reject",
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to decide this proposal." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, status: updated.status });
}
