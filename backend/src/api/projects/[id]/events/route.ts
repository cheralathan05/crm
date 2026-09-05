import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processProjectEvent, ProjectEventType } from "@/lib/events/project-event-engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/events — Process Autonomous Project Event ─ */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const eventType: ProjectEventType = body.eventType;
  if (!eventType) {
    return NextResponse.json({ ok: false, message: "eventType is required." }, { status: 400 });
  }

  const result = await processProjectEvent({
    eventType,
    projectId: id,
    taskId: body.taskId,
    deliverableId: body.deliverableId,
    changeRequestId: body.changeRequestId,
    actorId: session.user.id,
    actorName: session.user.name || "Manager",
    payload: body.payload,
  });

  return NextResponse.json(result);
}
