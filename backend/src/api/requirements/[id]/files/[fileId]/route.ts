import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser } from "@/lib/requirements";
import { readStored } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

/* ── GET /api/requirements/[id]/files/[fileId] ─────────────────
   Admin download of a client-uploaded file — workspace-scoped, so a
   caller can never fetch another workspace's attachment. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id, fileId } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  const attachment = await db.requirementAttachment.findFirst({
    where: { id: fileId, requestId: request.id },
  });
  if (!attachment) {
    return NextResponse.json({ ok: false, message: "File not found." }, { status: 404 });
  }

  const stored = await readStored(attachment.path);
  if (!stored) {
    return NextResponse.json({ ok: false, message: "File is missing on disk." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(stored.buffer), {
    status: 200,
    headers: {
      "Content-Type": attachment.mime || "application/octet-stream",
      "Content-Length": String(stored.size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.name)}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
