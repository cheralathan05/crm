import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectForUser } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

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

  const cr = await db.projectChangeRequest.create({
    data: {
      projectId: id,
      deliverableId: body.deliverableId || null,
      title: body.title || "Scope Change Request",
      description: body.description || "",
      reason: body.reason || null,
      impactScope: body.impactScope || null,
      impactTimelineDays: body.impactTimelineDays ? Number(body.impactTimelineDays) : 0,
      impactBudgetAmount: body.impactBudgetAmount ? Number(body.impactBudgetAmount) : 0,
      submittedByName: body.submittedByName || project.client.companyName,
      status: "SUBMITTED",
    },
  });

  await db.projectActivity.create({
    data: {
      projectId: id,
      type: "CHANGE_REQUEST_SUBMITTED",
      title: `Change Request Submitted: "${cr.title}"`,
      detail: `Impact: +${cr.impactTimelineDays} days, +${project.currency} ${cr.impactBudgetAmount.toLocaleString()}`,
      actorName: cr.submittedByName || "Client",
    },
  });

  return NextResponse.json({ ok: true, changeRequest: cr });
}

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

  const changeRequestId = body.changeRequestId;
  if (!changeRequestId) {
    return NextResponse.json({ ok: false, message: "changeRequestId is required." }, { status: 400 });
  }

  const updateData: any = {};
  if (body.status) {
    updateData.status = body.status;
    updateData.decidedAt = new Date();
  }
  if (body.adminResponse !== undefined) updateData.adminResponse = body.adminResponse;

  const cr = await db.projectChangeRequest.update({
    where: { id: changeRequestId },
    data: updateData,
  });

  await db.projectActivity.create({
    data: {
      projectId: id,
      type: `CHANGE_REQUEST_${body.status}`,
      title: `Change Request ${body.status}: "${cr.title}"`,
      detail: body.adminResponse || `Decision logged by ${session.user.name ?? "Manager"}`,
      actorName: session.user.name ?? "Manager",
    },
  });

  return NextResponse.json({ ok: true, changeRequest: cr });
}
