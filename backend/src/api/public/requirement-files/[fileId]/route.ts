import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken } from "@/lib/requirements";
import { readStored } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ fileId: string }> };

/* ── GET /api/public/requirement-files/[fileId]?token=… ────────
   Downloads a file only when the caller holds the request's secure
   token. Attachment must belong to that request. Never guessed ids. */

export async function GET(req: Request, { params }: Ctx) {
  const { fileId } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 401 });
  }

  const resolved = await resolveRequestByToken(token);
  if (!resolved || resolved.error) {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }
  const request = resolved.request;

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

  const isImage = attachment.mime.startsWith("image/");
  return new NextResponse(new Uint8Array(stored.buffer), {
    status: 200,
    headers: {
      "Content-Type": attachment.mime || "application/octet-stream",
      "Content-Length": String(stored.size),
      "Content-Disposition": `${isImage ? "inline" : "attachment"}; filename="${encodeURIComponent(attachment.name)}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
