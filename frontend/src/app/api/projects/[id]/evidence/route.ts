import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { attachEvidenceRecord } from "@/lib/engineering/blueprint.service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/evidence ───────────────────────── */
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

  if (!body.title || !body.type) {
    return NextResponse.json({ ok: false, message: "Title and type are required." }, { status: 400 });
  }

  try {
    const evidence = await attachEvidenceRecord({
      taskId: body.taskId,
      deliverableId: body.deliverableId,
      requirementId: body.requirementId,
      type: body.type,
      title: body.title,
      url: body.url,
      description: body.description,
      metadata: body.metadata,
      verifiedBy: session.user.name ?? "Engineer",
    });

    // If task was specified, also update task activity
    if (body.taskId) {
      await db.taskActivity.create({
        data: {
          taskId: body.taskId,
          type: "EVIDENCE_ATTACHED",
          title: `Evidence Attached: ${body.title}`,
          detail: `${body.type} proof attached by ${session.user.name ?? "Engineer"}`,
          actorName: session.user.name ?? "Engineer",
        },
      });
    }

    return NextResponse.json({ ok: true, evidence });
  } catch (err: any) {
    console.error("[api:evidence] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to attach evidence." }, { status: 500 });
  }
}
