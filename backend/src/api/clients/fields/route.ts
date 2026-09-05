import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceForUser } from "@/lib/clients";

export const dynamic = "force-dynamic";

/* ── GET /api/clients/fields — workspace custom field defs ──── */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "No workspace." }, { status: 403 });
  }

  const defs = await db.clientCustomFieldDef.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    fields: defs.map((d) => ({
      id: d.id,
      label: d.label,
      type: d.type,
      options: JSON.parse(d.options ?? "[]"),
    })),
  });
}

/* ── POST /api/clients/fields — define a new custom field ───── */

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

  const label = String(body.label ?? "").trim();
  if (!label) {
    return NextResponse.json({ ok: false, message: "Field label is required." }, { status: 400 });
  }

  const type = String(body.type ?? "text");
  const options = Array.isArray(body.options) ? body.options.map(String) : [];

  const existing = await db.clientCustomFieldDef.findUnique({
    where: { workspaceId_label: { workspaceId: workspace.id, label } },
  });
  if (existing) {
    return NextResponse.json({ ok: false, message: "A field with this label already exists." }, { status: 409 });
  }

  const def = await db.clientCustomFieldDef.create({
    data: {
      workspaceId: workspace.id,
      label,
      type,
      options: JSON.stringify(options),
    },
  });

  return NextResponse.json(
    { ok: true, field: { id: def.id, label: def.label, type: def.type, options } },
    { status: 201 },
  );
}
