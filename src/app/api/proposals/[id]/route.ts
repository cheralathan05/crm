import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProposalForUser, serializeProposalForStudio } from "@/lib/proposal";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolve(req: Request, params: Ctx["params"]) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 }) };
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) return { error: NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 }) };
  return { session, proposal };
}

/* ── GET /api/proposals/[id] — the Proposal Studio bundle ────── */

export async function GET(_req: Request, { params }: Ctx) {
  const ctx = await resolve(_req, params);
  if ("error" in ctx) return ctx.error;
  const bundle = await serializeProposalForStudio(ctx.proposal);
  return NextResponse.json(bundle);
}

/* ── PUT /api/proposals/[id] — save the editable document ────── */

export async function PUT(req: Request, { params }: Ctx) {
  const ctx = await resolve(req, params);
  if ("error" in ctx) return ctx.error;

  let body: { document?: unknown; title?: string; amount?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const update: { document?: string; title?: string; amount?: number | null } = {};
  if (body.document !== undefined) {
    if (typeof body.document !== "object" || body.document === null) {
      return NextResponse.json({ ok: false, message: "Invalid document." }, { status: 400 });
    }
    update.document = JSON.stringify(body.document);
  }
  if (typeof body.title === "string" && body.title.trim()) {
    update.title = body.title.trim();
  }
  if (body.amount !== undefined) {
    update.amount = typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, message: "Nothing to save." }, { status: 400 });
  }

  const saved = await db.clientProposal.update({ where: { id: ctx.proposal.id }, data: update });
  return NextResponse.json({ ok: true, proposal: { id: saved.id, title: saved.title, amount: saved.amount } });
}
