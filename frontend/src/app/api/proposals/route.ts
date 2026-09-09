import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceForUser } from "@/lib/clients";
import { buildProposalDocument, listProposalsForUser, nextProposalReference } from "@/lib/proposal";
import { loadAnswers, loadFeatures } from "@/lib/requirements";

export const dynamic = "force-dynamic";

/* ── GET /api/proposals — workspace proposals list ───────────── */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const data = await listProposalsForUser(session.user.id);
  return NextResponse.json({ ok: true, ...data });
}

/* ── POST /api/proposals — create new proposal ───────────────── */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  let body: {
    clientId: string;
    title: string;
    amount?: number | null;
    requirementRequestId?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const clientId = String(body.clientId ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!clientId) {
    return NextResponse.json({ ok: false, message: "Client is required." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, message: "Proposal title is required." }, { status: 400 });
  }

  const client = await db.client.findFirst({
    where: { id: clientId, workspaceId: workspace.id },
  });
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found in your workspace." }, { status: 404 });
  }

  const [contact, request] = await Promise.all([
    db.contact.findFirst({ where: { clientId: client.id, isPrimary: true } }),
    body.requirementRequestId
      ? db.requirementRequest.findFirst({ where: { id: body.requirementRequestId, clientId: client.id } })
      : null,
  ]);

  const reference = await nextProposalReference(workspace.id);
  const amount = body.amount !== undefined && Number.isFinite(Number(body.amount)) ? Number(body.amount) : null;

  const proposal = await db.clientProposal.create({
    data: {
      clientId: client.id,
      requirementRequestId: request?.id ?? null,
      reference,
      title,
      amount,
      status: "DRAFT",
    },
  });

  const answers = request ? await loadAnswers(request.id) : {};
  const features = request ? await loadFeatures(request.id) : [];

  const document = buildProposalDocument({
    proposal,
    client,
    workspace,
    contact,
    answers,
    features: features.map((f) => ({
      name: f.name,
      priority: f.priority,
      description: f.description ?? "",
      users: f.users ?? [],
    })),
  });

  await db.clientProposal.update({
    where: { id: proposal.id },
    data: { document: JSON.stringify(document) },
  });

  await db.clientAuditEvent.create({
    data: {
      clientId: client.id,
      entity: "PROPOSAL",
      action: "PROPOSAL_CREATED",
      entityId: proposal.id,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
      after: JSON.stringify({ title, reference, amount }),
    },
  });

  await db.client.update({
    where: { id: client.id },
    data: { lastActivityAt: new Date() },
  });

  return NextResponse.json(
    {
      ok: true,
      proposal: {
        id: proposal.id,
        reference: proposal.reference,
        title: proposal.title,
        status: proposal.status,
        amount: proposal.amount,
      },
    },
    { status: 201 },
  );
}
