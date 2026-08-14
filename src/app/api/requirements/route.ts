import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkspaceForUser, getClientForUser } from "@/lib/clients";
import { createRequirementRequest, requirementLink, listRequirementRequests } from "@/lib/requirements";
import { PROJECT_TYPE_OPTIONS } from "@/lib/requirement-config";

export const dynamic = "force-dynamic";

/* ── GET /api/requirements — workspace requirement dashboard ── */

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
  const view = url.searchParams.get("view") ?? "all";
  const q = url.searchParams.get("q")?.trim() ?? "";

  const data = await listRequirementRequests(workspace.id, view, q);
  return NextResponse.json({ ok: true, ...data });
}

/* ── POST /api/requirements — configure + create a request ────
   The client is resolved server-side from the session, so a caller can
   never create a request for someone else's client. The one-time token
   is returned immediately so the workspace owner can copy the link. */

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

  const clientId = String(body.clientId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const projectType = String(body.projectType ?? "OTHER").trim();

  if (!clientId) {
    return NextResponse.json({ ok: false, message: "A client is required." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, message: "Project title is required." }, { status: 400 });
  }
  if (!PROJECT_TYPE_OPTIONS.some((o) => o.value === projectType)) {
    return NextResponse.json({ ok: false, message: "Choose a valid project type." }, { status: 400 });
  }

  // The client must belong to this workspace — never trust a raw id.
  const client = await getClientForUser(session.user.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  const actorName = session.user.name ?? "Owner";
  const { request, token } = await createRequirementRequest({
    workspaceId: workspace.id,
    clientId: client.id,
    title,
    projectType: projectType as never,
    actorId: session.user.id,
    actorName,
  });

  return NextResponse.json(
    {
      ok: true,
      id: request.id,
      reference: request.reference,
      token,
      link: requirementLink(token),
    },
    { status: 201 },
  );
}
