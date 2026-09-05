import { NextResponse } from "next/server";
import { resolveRequestByToken, submitRequirementRequest } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/public/requirements/[token]/submit ──────────────
   Endpoint with backend validation + idempotency: re-submitting
   identical data is a no-op; a revision is created on every real change.
   A confirmation checkbox is required and enforced here. */

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error }, { status: 403 });
  }
  const request = resolved.request;
  if (request.status === "APPROVED" || request.status === "REVOKED") {
    return NextResponse.json({ ok: false, code: "LOCKED" }, { status: 409 });
  }

  let body: { confirmed?: unknown; responderName?: unknown; responderRole?: unknown; responderEmail?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  if (body.confirmed !== true) {
    return NextResponse.json({ ok: false, message: "Confirmation is required before submitting." }, { status: 400 });
  }

  const resubmit = request.status === "CHANGES_REQUESTED";

  try {
    const result = await submitRequirementRequest({
      request,
      resubmit,
      responderName: body.responderName ? String(body.responderName).trim().slice(0, 120) : undefined,
      responderRole: body.responderRole ? String(body.responderRole).trim().slice(0, 120) : undefined,
      responderEmail: body.responderEmail ? String(body.responderEmail).trim().slice(0, 200) : undefined,
    });

    if (!result.submitted) {
      return NextResponse.json({
        ok: true,
        submitted: false,
        reason: result.reason,
        status: result.request.status,
      });
    }

    return NextResponse.json({
      ok: true,
      submitted: true,
      reference: result.request.reference,
      revision: result.request.revision,
      status: result.request.status,
      submittedAt: result.request.submittedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Unable to submit. Please try again.",
      },
      { status: 400 },
    );
  }
}
