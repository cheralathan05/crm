import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ changeRequestId: string }> };

/* ── GET /api/proposals/change-requests/[id] ─────────────────
   The change request is authorized through its proposal → client →
   workspace. A caller can never read another workspace's request. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { changeRequestId } = await params;
  const workspace = await db.workspace.findUnique({ where: { ownerId: session.user.id } });
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const changeRequest = await db.proposalChangeRequest.findFirst({
    where: { id: changeRequestId, workspaceId: workspace.id },
    include: { items: true },
  });
  if (!changeRequest) {
    return NextResponse.json({ ok: false, message: "Change request not found." }, { status: 404 });
  }

  const [proposal, client] = await Promise.all([
    db.clientProposal.findUnique({ where: { id: changeRequest.proposalId }, select: { id: true, reference: true, title: true, version: true, status: true } }),
    db.client.findUnique({ where: { id: changeRequest.clientId }, select: { id: true, companyName: true } }),
  ]);

  return NextResponse.json({
    ok: true,
    changeRequest: {
      id: changeRequest.id,
      reference: changeRequest.reference,
      proposalVersion: changeRequest.proposalVersion,
      reasons: safeJsonArray(changeRequest.reasons),
      sections: safeJsonArray(changeRequest.sections),
      message: changeRequest.message,
      priority: changeRequest.priority,
      status: changeRequest.status,
      adminResponse: changeRequest.adminResponse,
      submittedByName: changeRequest.submittedByName,
      submittedAt: changeRequest.submittedAt,
      decidedAt: changeRequest.decidedAt,
      items: changeRequest.items.map((i) => ({
        id: i.id,
        section: i.section,
        field: i.field,
        currentValue: i.currentValue,
        requestedValue: i.requestedValue,
        reason: i.reason,
        status: i.status,
        adminResponse: i.adminResponse,
      })),
    },
    proposal,
    client,
  });
}

function safeJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
