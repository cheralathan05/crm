import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectForUser } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/team — Add/Assign member to project ─ */
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

  const { name, role, email, allocation = 100 } = body;
  if (!name || !role) {
    return NextResponse.json({ ok: false, message: "Name and role are required." }, { status: 400 });
  }

  const member = await db.projectMember.create({
    data: {
      projectId: id,
      name,
      role,
      email: email || null,
      allocation: Number(allocation),
    },
  });

  await db.projectActivity.create({
    data: {
      projectId: id,
      type: "MEMBER_JOINED",
      title: `${name} joined as ${role}`,
      detail: `Allocation: ${allocation}%`,
      actorName: session.user.name ?? "Manager",
    },
  });

  return NextResponse.json({ ok: true, member });
}
