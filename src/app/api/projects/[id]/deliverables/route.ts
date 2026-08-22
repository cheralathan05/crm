import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectForUser } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/deliverables — Create deliverable ── */
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

  const deliverable = await db.projectDeliverable.create({
    data: {
      projectId: id,
      milestoneId: body.milestoneId || null,
      title: body.title || "New Deliverable",
      description: body.description || null,
      category: body.category || "ENGINEERING",
      proposalFeatureName: body.proposalFeatureName || null,
      acceptanceCriteria: JSON.stringify(body.acceptanceCriteria || []),
      status: "DRAFT",
    },
  });

  return NextResponse.json({ ok: true, deliverable });
}

/* ── PATCH /api/projects/[id]/deliverables — Update lifecycle & review ─ */
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

  const deliverableId = body.deliverableId;
  if (!deliverableId) {
    return NextResponse.json({ ok: false, message: "deliverableId is required." }, { status: 400 });
  }

  const updateData: any = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "DELIVERED_TO_CLIENT" || body.status === "CLIENT_REVIEW") {
      updateData.submittedAt = new Date();
    } else if (body.status === "ACCEPTED") {
      updateData.clientApprovedAt = new Date();
      updateData.clientApprovedBy = body.clientApprovedBy || project.client.companyName;
    }
  }
  if (body.clientFeedback !== undefined) updateData.clientFeedback = body.clientFeedback;
  if (body.acceptanceCriteria) updateData.acceptanceCriteria = JSON.stringify(body.acceptanceCriteria);
  if (body.title) updateData.title = body.title;
  if (body.description) updateData.description = body.description;

  const deliverable = await db.projectDeliverable.update({
    where: { id: deliverableId },
    data: updateData,
  });

  if (body.status === "ACCEPTED") {
    try {
      const { processProjectEvent } = await import("@/lib/events/project-event-engine");
      await processProjectEvent({
        eventType: "DELIVERABLE_APPROVED",
        deliverableId: deliverable.id,
        projectId: id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Manager",
        payload: { clientName: body.clientApprovedBy || project.client.companyName },
      });
    } catch (err) {
      console.error("Deliverable approval event failed:", err);
    }
  } else if (body.status === "DELIVERED_TO_CLIENT" || body.status === "CLIENT_REVIEW") {
    try {
      const { processProjectEvent } = await import("@/lib/events/project-event-engine");
      await processProjectEvent({
        eventType: "DELIVERABLE_SUBMITTED",
        deliverableId: deliverable.id,
        projectId: id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Manager",
      });
    } catch (err) {
      console.error("Deliverable submitted event failed:", err);
    }
  } else {
    // Log activity
    let actType = "DELIVERABLE_UPDATED";
    let actTitle = `Deliverable updated: "${deliverable.title}"`;
    if (body.status === "INTERNAL_REVIEW") {
      actType = "DELIVERABLE_SUBMITTED";
      actTitle = `Deliverable ready for internal review: "${deliverable.title}"`;
    }

    await db.projectActivity.create({
      data: {
        projectId: id,
        type: actType,
        title: actTitle,
        detail: body.clientFeedback || `Status changed to ${body.status}`,
        actorName: session.user.name ?? "Manager",
      },
    });
  }

  return NextResponse.json({ ok: true, deliverable });
}
