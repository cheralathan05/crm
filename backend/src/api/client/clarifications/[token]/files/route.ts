import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveClarificationBundleByToken, answerClarification } from "@/lib/questions";
import { storeUpload, validateUpload, ACCEPT_LABEL } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/clarifications/[token]/files ─────────────
   File answer for FILE_UPLOAD questions. Validated server-side,
   stored outside the database under a random name, served only via
   the token route. */

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const bundle = await resolveClarificationBundleByToken(token);
  if (!bundle) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (bundle.error) {
    return NextResponse.json({ ok: false, code: bundle.error, label: bundle.errorLabel }, { status: 403 });
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

  const questionId = String(form.get("questionId") ?? "");
  const question = bundle.questions.find((q) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Question not part of this clarification set." }, { status: 400 });
  }
  if (question.answerType !== "FILE_UPLOAD") {
    return NextResponse.json({ ok: false, message: "This question does not accept file answers." }, { status: 400 });
  }

  const name = (file.name ?? "file").slice(0, 160);
  const type = file.type || "application/octet-stream";
  const size = file.size;
  const validationError = validateUpload({ name, type, size });
  if (validationError) {
    return NextResponse.json({ ok: false, message: `${validationError} Supported: ${ACCEPT_LABEL}` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storedPath } = await storeUpload(`${question.requirementId}/q-${question.id}`, { name, type, size, buffer });

  try {
    await answerClarification({
      question,
      response: name,
      answerData: { file: storedPath, name, size, mime: type },
      respondedByName: form.get("name") ? String(form.get("name")).slice(0, 120) : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to save the file answer." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "File received.", name, size });
}
