import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken, recordEvent, saveSectionAnswer } from "@/lib/requirements";
import { storeUpload, validateUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/public/requirements/[token]/files ───────────────
   Multipart upload, validated server-side (MIME allowlist + size cap),
   stored outside the database under a random name. The friendly name
   lives in the DB. Files are only downloadable through the token route. */

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

  if (!["DRAFT", "SENT", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(request.status)) {
    return NextResponse.json({ ok: false, code: "LOCKED" }, { status: 409 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "No file provided." }, { status: 400 });
  }

  const section = String(form.get("section") ?? "files").slice(0, 40);
  const uploader = String(form.get("uploader") ?? "").slice(0, 120);

  const name = (file.name ?? "file").slice(0, 160);
  const type = file.type || "application/octet-stream";
  const size = file.size;
  const validationError = validateUpload({ name, type, size });
  if (validationError) {
    return NextResponse.json({ ok: false, message: validationError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { storedPath } = await storeUpload(request.id, { name, type, size, buffer });
  const attachment = await db.requirementAttachment.create({
    data: {
      requestId: request.id,
      section,
      name,
      mime: type,
      size,
      path: storedPath,
      uploadedByName: uploader || "Client",
    },
  });

  await recordEvent(request.id, "FILE_UPLOADED", `File uploaded — ${name}`, section);

  const count = await db.requirementAttachment.count({ where: { requestId: request.id } });
  const updated = await saveSectionAnswer({
    request,
    section: "files",
    data: { fileCount: count },
    recordEvent: false,
  });

  return NextResponse.json(
    {
      ok: true,
      file: {
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        mime: attachment.mime,
        section: attachment.section,
        createdAt: attachment.createdAt,
      },
      completeness: updated.completeness,
      readiness: updated.readiness,
    },
    { status: 201 },
  );
}
