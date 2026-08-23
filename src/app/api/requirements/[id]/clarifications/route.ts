import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser } from "@/lib/requirements";
import { getSection } from "@/lib/requirement-config";
import {
  createClarificationQuestion,
  serializeAdminQuestion,
  proposalBlockForRequirement,
} from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/requirements/[id]/clarifications ───────────────
   Ask the Client, structured: creates a clarification question from
   the admin's internal note, classifies it into a scope category,
   generates a professional client-facing version with an answer type,
   options, priority and impact — and NEVER sends it automatically.
   The admin reviews and approves the draft before anything is emailed. */
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
  const note = String(body.note ?? body.question ?? "").trim();
  if (!note) {
    return NextResponse.json({ ok: false, message: "Describe what needs clarification." }, { status: 400 });
  }
  const contactId = body.contactId ? String(body.contactId) : undefined;

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
      question: note,
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

  return NextResponse.json({
    ok: true,
    sent: false,
    status: created.created.status,
    question: serializeAdminQuestion(created.created),
    quality: created.created.qualityScore,
  });
}

/* ── GET /api/requirements/[id]/clarifications ────────────────
   Clarification center: grouped questions, proposal-blocker state and
   open conflicts for the requirement. Everything workspace-scoped. */
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

  const [questions, conflicts, proposalBlock] = await Promise.all([
    db.requirementQuestion.findMany({
      where: { requirementId: request.id },
      orderBy: { createdAt: "desc" },
    }),
    db.requirementConflict.findMany({
      where: { requirementId: request.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    }),
    proposalBlockForRequirement(request.id),
  ]);

  return NextResponse.json({
    ok: true,
    questions: questions.map(serializeAdminQuestion),
    conflicts: conflicts.map((c) => ({
      id: c.id,
      description: c.description,
      detail: c.detail,
      createdAt: c.createdAt,
    })),
    proposalBlock,
  });
}
