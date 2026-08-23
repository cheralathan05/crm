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

  const count = await db.projectMilestone.count({ where: { projectId: id } });

  const milestone = await db.projectMilestone.create({
    data: {
      projectId: id,
      title: body.title || "New Milestone",
      phase: body.phase || `PHASE_${count + 1}`,
      description: body.description || null,
      order: count + 1,
      status: "PLANNED",
      paymentPercentage: body.paymentPercentage ? Number(body.paymentPercentage) : null,
      paymentAmount: body.paymentAmount ? Number(body.paymentAmount) : null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
    },
  });

  return NextResponse.json({ ok: true, milestone });
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

  const milestoneId = body.milestoneId;
  if (!milestoneId) {
    return NextResponse.json({ ok: false, message: "milestoneId is required." }, { status: 400 });
  }

  const updateData: any = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
  }
  if (body.invoiceStatus) {
    updateData.invoiceStatus = body.invoiceStatus;
  }
  if (body.title) updateData.title = body.title;
  if (body.description) updateData.description = body.description;

  const milestone = await db.projectMilestone.update({
    where: { id: milestoneId },
    data: updateData,
  });

  if (body.status === "COMPLETED") {
    await db.projectActivity.create({
      data: {
        projectId: id,
        type: "MILESTONE_COMPLETED",
        title: `Milestone Completed: "${milestone.title}"`,
        detail: `All phase gate deliverables accepted.`,
        actorName: session.user.name ?? "Manager",
      },
    });
  }

  return NextResponse.json({ ok: true, milestone });
}
