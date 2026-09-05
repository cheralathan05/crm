import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/tasks/[id]/comments — Add task comment ─────────── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { content, isClientVisible } = body;
  if (!content || !content.trim()) {
    return NextResponse.json({ ok: false, message: "Comment content is required." }, { status: 400 });
  }

  const comment = await db.taskComment.create({
    data: {
      taskId: id,
      authorId: session.user.id,
      authorName: session.user.name ?? "Team Member",
      authorRole: "Engineer",
      content: content.trim(),
      isClientVisible: !!isClientVisible,
    },
  });

  await db.taskActivity.create({
    data: {
      taskId: id,
      type: "COMMENT_ADDED",
      title: `${comment.authorName} posted a comment`,
      detail: content.trim().slice(0, 120),
      actorName: comment.authorName,
    },
  });

  return NextResponse.json({ ok: true, comment });
}
