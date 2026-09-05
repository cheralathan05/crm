import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { detectDuplicateTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/* ── POST /api/tasks/check-duplicates ────────────────────────── */
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

  const { title, projectId } = body;
  if (!title) {
    return NextResponse.json({ ok: true, duplicates: [] });
  }

  const duplicates = await detectDuplicateTasks(workspace.id, title, projectId);
  return NextResponse.json({ ok: true, duplicates });
}
