import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken, recordEvent, saveSectionAnswer } from "@/lib/requirements";
import { deleteStored } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string; fileId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { token, fileId } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error }, { status: 403 });
  }
  const request = resolved.request;

  if (!["DRAFT", "SENT", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(request.status)) {
    return NextResponse.json({ ok: false, code: "LOCKED" }, { status: 409 });
  }

  const attachment = await db.requirementAttachment.findFirst({
    where: { id: fileId, requestId: request.id },
  });
  if (!attachment) {
    return NextResponse.json({ ok: false, message: "File not found." }, { status: 404 });
  }

  await deleteStored(attachment.path);
  await db.requirementAttachment.delete({ where: { id: attachment.id } });
  await recordEvent(request.id, "SECTION_SAVED", `File removed — ${attachment.name}`, "files");

  const count = await db.requirementAttachment.count({ where: { requestId: request.id } });
  const updated = await saveSectionAnswer({
    request,
    section: "files",
    data: { fileCount: count },
    recordEvent: false,
  });

  return NextResponse.json({ ok: true, completeness: updated.completeness, readiness: updated.readiness });
}
