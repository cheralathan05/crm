import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWorkHandoffToQA } from "@/lib/messages/work-messages.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    const workspace =
      (await db.workspace.findFirst({
        where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
      })) || (await db.workspace.findFirst());

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const body = await req.json();
    const { projectId, taskId, proofSummary } = body;

    if (!projectId || !taskId) {
      return NextResponse.json({ ok: false, message: "Project and Task are required." }, { status: 400 });
    }

    let employee = null;
    if (user?.id) {
      employee = await db.employee.findFirst({
        where: {
          workspaceId: workspace.id,
          OR: [{ userId: user.id }, { email: user.email?.toLowerCase() }],
        },
        include: { role: true },
      });
    }

    const actorEmployeeId = employee?.id || "";
    const actorName = employee?.fullName || user?.name || "Frontend Engineer";
    const actorRole = employee?.role?.name || "Frontend Engineer";

    const result = await sendWorkHandoffToQA({
      workspaceId: workspace.id,
      actorEmployeeId,
      actorName,
      actorRole,
      projectId,
      taskId,
      proofSummary,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to dispatch handoff." },
      { status: 500 },
    );
  }
}
