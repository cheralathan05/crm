import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceForUser, getClientForUser } from "@/lib/clients";
import {
  createRequirementRequest,
  requirementLink,
  listRequirementRequests,
  transitionRequest,
} from "@/lib/requirements";
import { sendRequirementRequestEmail } from "@/lib/mail";
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
   never create a request for someone else's client. The secure link is
   emailed to the client automatically (client record, primary contact,
   then any contact). When no email is on file — or the provider rejects
   the send — the request stays DRAFT and the link is returned so the
   owner can copy or send it manually. */

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

  // One requirement request per client — the secure workspace is a single
  // relationship. Manage the existing request (remind / regenerate) instead.
  const existingRequest = await db.requirementRequest.findFirst({ where: { clientId: client.id } });
  if (existingRequest) {
    return NextResponse.json(
      {
        ok: false,
        message: `${client.companyName} already has a requirement request (${existingRequest.reference}). One request per client — manage or regenerate its link instead.`,
      },
      { status: 409 },
    );
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
  const link = requirementLink(token);

  // Resolve the recipient: the client's own email, the primary contact,
  // then the first contact that has one.
  const contacts = await db.contact.findMany({
    where: { clientId: client.id },
    select: { id: true, email: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  const primaryContact = contacts.find((c) => c.id === client.primaryContactId);
  const recipient =
    client.email?.trim() ||
    primaryContact?.email?.trim() ||
    contacts.find((c) => c.email?.trim())?.email?.trim() ||
    "";

  let sent = false;
  let dev = false;
  let message: string | null = null;

  if (recipient) {
    const result = await sendRequirementRequestEmail({
      to: recipient,
      subject: `Project discovery — ${request.title}`,
      message: "",
      link,
      projectTitle: request.title,
      companyName: client.companyName,
    });

    if (result.sent) {
      await transitionRequest({
        request,
        action: "send",
        actorId: session.user.id,
        actorName,
        data: { sentTo: recipient },
      });
      sent = true;
      message = `Secure link sent to ${recipient}.`;
    } else if (result.devUrl) {
      // Dev mode without an email provider: the link is logged to the server
      // console so the flow stays usable — mark SENT but surface it honestly.
      await transitionRequest({
        request,
        action: "send",
        actorId: session.user.id,
        actorName,
        data: { sentTo: recipient },
      });
      sent = true;
      dev = true;
      message = "Email provider not configured — the link was printed to the server console. Copy it from below.";
    } else {
      message = "The email could not be delivered — the link is below, copy and send it manually.";
    }
  } else {
    message = "No email on file for this client — the link is below, copy and send it manually.";
  }

  return NextResponse.json(
    {
      ok: true,
      id: request.id,
      reference: request.reference,
      token,
      link,
      sent,
      sentTo: sent ? recipient : null,
      dev,
      message,
    },
    { status: 201 },
  );
}
