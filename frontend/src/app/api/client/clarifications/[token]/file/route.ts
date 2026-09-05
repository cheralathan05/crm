import { NextResponse } from "next/server";
import { resolveClarificationBundleByToken } from "@/lib/questions";
import { readStored } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/client/clarifications/[token]/file?questionId= ───
   Stream a file the client uploaded as an answer. Only reachable
   through the question's own secure token. */

export async function GET(req: Request, { params }: Ctx) {
  const { token } = await params;
  const bundle = await resolveClarificationBundleByToken(token);
  if (!bundle) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (bundle.error) {
    return NextResponse.json({ ok: false, code: bundle.error, label: bundle.errorLabel }, { status: 403 });
  }

  const url = new URL(req.url);
  const questionId = url.searchParams.get("questionId") ?? "";
  const question = bundle.questions.find((q) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  let answerData: { file?: string; name?: string; mime?: string } = {};
  try {
    answerData = question.answerData ? JSON.parse(question.answerData) : {};
  } catch {
    /* ignore */
  }
  const storedPath = answerData.file;
  if (!storedPath) {
    return NextResponse.json({ ok: false, message: "No file stored for this answer." }, { status: 404 });
  }

  const stored = await readStored(storedPath);
  if (!stored) {
    return NextResponse.json({ ok: false, message: "File is no longer available." }, { status: 404 });
  }

  return new Response(new Uint8Array(stored.buffer), {
    headers: {
      "Content-Type": answerData.mime ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(answerData.name ?? "file")}"`,
      "Content-Length": String(stored.size),
      "Cache-Control": "private, max-age=60",
    },
  });
}
