import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceForUser, findDuplicateClients, recordAudit, formatCompactINR } from "@/lib/clients";
import { serializeClientListRow } from "@/lib/client-serialize";

export const dynamic = "force-dynamic";

/* ── GET /api/clients — control-room list with real counts ──── */

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "No workspace." }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const view = url.searchParams.get("view") ?? "all";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") ?? "10")));

  const statusFilter =
    view === "active" ? "ACTIVE"
    : view === "leads" ? "LEAD"
    : view === "archived" ? "ARCHIVED"
    : undefined;

  const where = {
    workspaceId: workspace.id,
    ...(statusFilter ? { status: statusFilter as never } : {}),
    ...(q
      ? {
          OR: [
            { companyName: { contains: q } },
            { email: { contains: q } },
            { industry: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, clients] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Serialize rows in parallel (each loads its own lightweight relation set).
  const rows = await Promise.all(clients.map((c) => serializeClientListRow(c)));

  // Intelligence strip — real counts from the workspace.
  const [countTotal, countActive, countLeads, countArchived] = await Promise.all([
    db.client.count({ where: { workspaceId: workspace.id } }),
    db.client.count({ where: { workspaceId: workspace.id, status: "ACTIVE" } }),
    db.client.count({ where: { workspaceId: workspace.id, status: "LEAD" } }),
    db.client.count({ where: { workspaceId: workspace.id, status: "ARCHIVED" } }),
  ]);

  // Needs attention — workspace-wide union of clients with any live issue
  // (requirement to review, proposal awaiting response, overdue money,
  // blocked task, or at-risk project). Real counts, independent of the
  // current page/filter.
  const [attentionReqs, attentionProps, attentionPayments, attentionTasks, attentionProjects] = await Promise.all([
    db.clientRequirement.findMany({
      where: { client: { workspaceId: workspace.id }, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    db.clientProposal.findMany({
      where: { client: { workspaceId: workspace.id }, status: { in: ["SENT", "VIEWED"] } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    db.clientPayment.findMany({
      where: { client: { workspaceId: workspace.id }, status: { in: ["OVERDUE", "PENDING"] } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    db.clientTask.findMany({
      where: { client: { workspaceId: workspace.id }, status: "BLOCKED" },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    db.clientProject.findMany({
      where: { client: { workspaceId: workspace.id }, health: "AT_RISK" },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
  ]);
  const attentionClientIds = new Set([
    ...attentionReqs.map((r) => r.clientId),
    ...attentionProps.map((p) => p.clientId),
    ...attentionPayments.map((p) => p.clientId),
    ...attentionTasks.map((t) => t.clientId),
    ...attentionProjects.map((p) => p.clientId),
  ]);

  const pipelineValue = await db.clientPayment.aggregate({
    where: { client: { workspaceId: workspace.id }, status: { in: ["PENDING", "OVERDUE"] } },
    _sum: { amount: true },
  });

  return NextResponse.json({
    ok: true,
    rows,
    pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
    strip: {
      total: countTotal,
      active: countActive,
      leads: countLeads,
      archived: countArchived,
      needsAttention: attentionClientIds.size,
      pipeline: pipelineValue._sum.amount ?? 0,
      pipelineLabel: formatCompactINR(pipelineValue._sum.amount ?? 0),
    },
  });
}

/* ── POST /api/clients — create with duplicate detection ────── */

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "No workspace." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const companyName = String(body.companyName ?? "").trim();
  if (!companyName) {
    return NextResponse.json({ ok: false, message: "Company name is required." }, { status: 400 });
  }

  // Duplicate detection is part of creation — never silently duplicate.
  const duplicates = await findDuplicateClients(session.user.id, {
    companyName,
    email: body.email ? String(body.email) : undefined,
    domain: body.domain ? String(body.domain) : undefined,
  });

  const createAnyway = body.createAnyway === true;

  if (duplicates.length > 0 && !createAnyway) {
    return NextResponse.json(
      {
        ok: false,
        code: "POSSIBLE_DUPLICATE",
        message: "A client with this name or email may already exist.",
        duplicates: duplicates.map((d) => ({
          id: d.id,
          companyName: d.companyName,
          status: d.status,
          createdAt: d.createdAt,
          match: d.match,
        })),
      },
      { status: 409 },
    );
  }

  const client = await db.client.create({
    data: {
      workspaceId: workspace.id,
      companyName,
      industry: body.industry ? String(body.industry) : null,
      businessType: body.businessType ? String(body.businessType) : null,
      description: body.description ? String(body.description) : null,
      website: body.website ? String(body.website) : null,
      domain: body.domain ? String(body.domain) : null,
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      status: "LEAD",
      stage: "LEAD",
      leadSource: body.leadSource ? String(body.leadSource) : null,
      ownerId: session.user.id,
      ownerName: session.user.name ?? "Owner",
    },
  });

  await recordAudit({
    clientId: client.id,
    entity: "CLIENT",
    action: "CREATED",
    entityId: client.id,
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
    after: { companyName: client.companyName },
  });

  if (body.primaryContactName) {
    const contact = await db.contact.create({
      data: {
        clientId: client.id,
        name: String(body.primaryContactName),
        role: body.primaryContactRole ? String(body.primaryContactRole) : null,
        email: body.primaryContactEmail ? String(body.primaryContactEmail) : null,
        phone: body.primaryContactPhone ? String(body.primaryContactPhone) : null,
        whatsapp: body.primaryContactWhatsapp ? String(body.primaryContactWhatsapp) : null,
        isPrimary: true,
      },
    });
    await db.client.update({ where: { id: client.id }, data: { primaryContactId: contact.id } });
    await recordAudit({
      clientId: client.id,
      entity: "CONTACT",
      action: "CONTACT_ADDED",
      entityId: contact.id,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
      after: { name: contact.name },
    });
  }

  return NextResponse.json({ ok: true, id: client.id }, { status: 201 });
}
