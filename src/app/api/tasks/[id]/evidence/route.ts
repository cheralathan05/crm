import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/tasks/[id]/evidence ─────────────────────────────── */
export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const records = await db.evidenceRecord.findMany({
    where: { taskId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, records });
}

/* ── POST /api/tasks/[id]/evidence ────────────────────────────── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { type = "GIT_COMMIT", title, url, description, metadata } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ ok: false, message: "Evidence title is required." }, { status: 400 });
  }

  const task = await db.clientTask.findUnique({
    where: { id },
    select: { id: true, deliverableId: true, projectId: true, title: true },
  });

  if (!task) {
    return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
  }

  const actorName = session.user.name ?? "Team Member";

  const evidence = await db.evidenceRecord.create({
    data: {
      taskId: id,
      deliverableId: task.deliverableId || null,
      type,
      title: title.trim(),
      url: url ? url.trim() : null,
      description: description ? description.trim() : null,
      metadata: typeof metadata === "object" ? JSON.stringify(metadata) : metadata || "{}",
      verifiedBy: actorName,
      verifiedAt: new Date(),
    },
  });

  // Log to task activity
  await db.taskActivity.create({
    data: {
      taskId: id,
      type: "EVIDENCE_SUBMITTED",
      title: `Evidence Submitted: ${evidence.title}`,
      detail: `Type: ${type}${url ? ` · URL: ${url}` : ""}`,
      actorName,
    },
  });

  return NextResponse.json({ ok: true, evidence });
}
