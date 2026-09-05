import { NextResponse } from "next/server";
import { requestProposalChanges, type ClientChangeItem } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/proposals/[token]/request-changes ───────
   A structured change request: reasons, affected sections, per-item
   current → requested values, priority and a freeform message. Stored
   against the exact proposal version — the original stays untouched. */

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  let body: {
    reasons?: string[];
    sections?: string[];
    changes?: ClientChangeItem[];
    message?: string;
    priority?: string;
    clientName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  try {
    const result = await requestProposalChanges(token, {
      reasons: Array.isArray(body.reasons) ? body.reasons : [],
      sections: Array.isArray(body.sections) ? body.sections : [],
      changes: Array.isArray(body.changes) ? body.changes : [],
      message: String(body.message ?? ""),
      priority: String(body.priority ?? "MEDIUM"),
      clientName: body.clientName,
    });
    return NextResponse.json({
      ok: true,
      changeRequest: {
        id: result.changeRequest.id,
        reference: result.changeRequest.reference,
        status: result.changeRequest.status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The change request could not be submitted.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
