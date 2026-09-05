import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recommendAssignee } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/* ── POST /api/tasks/recommend-assignee ───────────────────────── */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const workspace = await db.workspace.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { taskId } = body;
  if (!taskId) {
    return NextResponse.json({ ok: false, message: "taskId is required." }, { status: 400 });
  }

  const recommendation = await recommendAssignee(taskId, workspace.id);
  return NextResponse.json({ ok: true, recommendation });
}
