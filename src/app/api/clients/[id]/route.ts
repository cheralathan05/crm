import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientForUser, recordAudit } from "@/lib/clients";
import { serializeClientDetail } from "@/lib/client-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/clients/[id] — the complete Command Center ────── */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const client = await getClientForUser(session.user.id, id);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  const detail = await serializeClientDetail(client, session.user.name ?? "Owner");
  return NextResponse.json({ ok: true, ...detail });
}

/* ── PATCH /api/clients/[id] — update, status transitions ──── */

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const client = await getClientForUser(session.user.id, id);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const actorName = session.user.name ?? "Owner";

  // Status transitions are recorded in audit history.
  const newStatus = body.status ? String(body.status) : undefined;
  if (newStatus && newStatus !== client.status) {
    await recordAudit({
      clientId: client.id,
      entity: "CLIENT",
      action: newStatus === "ARCHIVED" ? "CLIENT_ARCHIVED" : newStatus === "LEAD" ? "STATUS_CHANGED" : "STATUS_CHANGED",
      entityId: client.id,
      actorId: session.user.id,
      actorName,
      before: { status: client.status },
      after: { status: newStatus },
    });
  }

  const data: Record<string, unknown> = {};
  const fields: (keyof typeof client)[] = [
    "companyName", "industry", "businessType", "description", "website",
    "domain", "email", "phone", "leadSource", "leadScore", "ownerName", "tags",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f] === "" ? null : body[f];
  }
  if (newStatus) data.status = newStatus;
  if (body.customFields !== undefined) data.customFields = JSON.stringify(body.customFields);

  const updated = await db.client.update({
    where: { id: client.id },
    data: { ...data, lastActivityAt: new Date() },
  });

  // A status transition already wrote its own audit event — only record a
  // generic UPDATED event when other fields actually changed.
  if (Object.keys(data).some((k) => k !== "status")) {
    await recordAudit({
      clientId: client.id,
      entity: "CLIENT",
      action: "UPDATED",
      entityId: client.id,
      actorId: session.user.id,
      actorName,
      before: { fields: Object.keys(data) },
      after: { status: updated.status, stage: updated.stage },
    });
  }

  const detail = await serializeClientDetail(updated, actorName);
  return NextResponse.json({ ok: true, ...detail });
}
