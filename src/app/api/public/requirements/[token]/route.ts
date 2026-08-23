import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken, recordEvent, serializePublicRequest } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/public/requirements/[token] ─────────────────────
   Everything the client workspace needs, resolved from the token hash.
   Never exposes ids, workspace data, internal notes or other clients. */

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json(
      { ok: false, code: resolved.error, label: resolved.errorLabel },
      { status: 403 },
    );
  }

  const request = resolved.request;

  // First open of a live request records the moment it became active.
  if (request.status === "SENT") {
    await db.requirementRequest.update({
      where: { id: request.id },
      data: { status: "IN_PROGRESS", lastOpenedAt: new Date() },
    });
    await recordEvent(request.id, "LINK_OPENED", "Requirement link opened");
    request.status = "IN_PROGRESS"; // reflect the flip in the bundle below
  } else {
    await db.requirementRequest
      .update({ where: { id: request.id }, data: { lastOpenedAt: new Date() } })
      .catch(() => undefined);
    request.lastOpenedAt = new Date();
  }

  return NextResponse.json(await serializePublicRequest(request));
}
