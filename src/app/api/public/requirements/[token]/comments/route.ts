import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken, recordEvent } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/public/requirements/[token]/comments ────────────
   The client's side of a clarification thread. Never asks for keys or
   secrets — this is just a reply that resolves the open thread. */

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

  let body: { message?: unknown; commentId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim().slice(0, 2000);
  if (!message) {
    return NextResponse.json({ ok: false, message: "A reply is required." }, { status: 400 });
  }
  const replyTo = body.commentId ? String(body.commentId) : null;

  const comment = await db.requirementComment.create({
    data: {
      requestId: request.id,
      author: "CLIENT",
      authorName: request.responderName ?? "Client",
      message,
      resolvedAt: replyTo ? new Date() : null,
    },
  });

  // Resolve the specific open admin thread, if one was named.
  if (replyTo) {
    await db.requirementComment
      .updateMany({ where: { id: replyTo, requestId: request.id, author: "ADMIN" }, data: { resolvedAt: new Date() } })
      .catch(() => undefined);
  }

  await recordEvent(request.id, "CLIENT_COMMENTED", "Client replied to clarification", message.slice(0, 80));

  return NextResponse.json(
    {
      ok: true,
      comment: {
        id: comment.id,
        author: comment.author,
        authorName: comment.authorName,
        message: comment.message,
        createdAt: comment.createdAt,
      },
    },
    { status: 201 },
  );
}
