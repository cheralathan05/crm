import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser } from "@/lib/requirements";
import { getSection } from "@/lib/requirement-config";
import {
  createClarificationQuestion,
  sendClarificationEmail,
  serializeAdminQuestion,
} from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/requirements/[id]/questions ────────────────────
   Ask the Client: create a clarification question bound to the
   requirement + section, then (by default) email it immediately.
   The recipient is resolved from the database — never trusted from
   the frontend. One open question per section; a duplicate returns
   the existing question instead of creating a second one. */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }
  if (["REVOKED", "APPROVED"].includes(request.status)) {
    return NextResponse.json({ ok: false, message: "This request can no longer accept clarifications." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const section = String(body.section ?? "").trim();
  if (!getSection(section)) {
    return NextResponse.json({ ok: false, message: "Choose a valid target section." }, { status: 400 });
  }
  const question = String(body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ ok: false, message: "Write the question for the client." }, { status: 400 });
  }
  const internalNote = body.internalNote ? String(body.internalNote).trim() : "";
  const contactId = body.contactId ? String(body.contactId) : undefined;
  const shouldSend = body.send !== false;

  const client = await db.client.findUnique({ where: { id: request.clientId } });
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  let created;
  try {
    created = await createClarificationQuestion({
      request,
      client,
      section,
      question,
      internalNote,
      contactId,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to create the question." },
      { status: 400 },
    );
  }

  if (created.existing) {
    return NextResponse.json(
      {
        ok: false,
        code: "OPEN_QUESTION_EXISTS",
        message: "A clarification is already awaiting a response for this section.",
        question: serializeAdminQuestion(created.existing),
      },
      { status: 409 },
    );
  }
  if (!created.created) {
    return NextResponse.json({ ok: false, message: "Unable to create the question." }, { status: 500 });
  }

  const serialized = serializeAdminQuestion(created.created);

  if (!shouldSend) {
    return NextResponse.json({
      ok: true,
      sent: false,
      question: serialized,
      link: created.token ? `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/client-question/${created.token}` : null,
    });
  }

  const result = await sendClarificationEmail({
    question: created.created,
    kind: "INITIAL",
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
  });

  if (!result.sent && !result.dev) {
    return NextResponse.json(
      {
        ok: false,
        sent: false,
        questionId: created.created.id,
        question: serialized,
        message: result.message,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    dev: result.dev,
    questionId: created.created.id,
    question: serialized,
    link: result.link,
    message: result.dev ? result.message : undefined,
  });
}

/* ── GET /api/requirements/[id]/questions — clarification history ── */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  const questions = await db.requirementQuestion.findMany({
    where: { requirementId: request.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    questions: questions.map(serializeAdminQuestion),
  });
}
