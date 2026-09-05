import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectForUser } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/client-requests — Create a client request ─ */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { title, reason, neededFor, priority = "HIGH", isBlocker = true } = body;
  if (!title) {
    return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  }

  // Create an activity entry representing the client request
  const activity = await db.projectActivity.create({
    data: {
      projectId: id,
      type: "CLIENT_REQUEST",
      title: `Client Request Sent: "${title}"`,
      detail: `Needed for ${neededFor || "Delivery"}. Reason: ${reason || "Information required"}. Status: WAITING_FOR_CLIENT`,
      actorName: session.user.name ?? "Project Team",
    },
  });

  // If flagged as a blocker, update project health if currently on track
  if (isBlocker && project.health === "ON_TRACK") {
    await db.clientProject.update({
      where: { id },
      data: { health: "AT_RISK" },
    });
  }

  return NextResponse.json({ ok: true, activity });
}

/* ── PATCH /api/projects/[id]/client-requests — Resolve a client request ─ */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { title, resolution = "Provided by client" } = body;

  const activity = await db.projectActivity.create({
    data: {
      projectId: id,
      type: "CLIENT_REQUEST_RESOLVED",
      title: `Client Request Resolved: "${title || "Request"}"`,
      detail: `Resolution: ${resolution}`,
      actorName: session.user.name ?? "Project Manager",
    },
  });

  return NextResponse.json({ ok: true, activity });
}
