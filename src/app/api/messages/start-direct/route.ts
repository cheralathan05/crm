import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOrGetWorkThread } from "@/lib/messages/work-messages.service";

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
    const { targetEmployeeId, projectId, taskId, dependencyWorkstream, dependencyLabel } = body;

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

    const actorName = employee?.fullName || user?.name || "Admin";
    const actorRole = employee?.role?.name || (user?.role === "OWNER" ? "Workspace Admin" : "Team Member");

    const thread = await startOrGetWorkThread({
      workspaceId: workspace.id,
      actorEmployeeId: employee?.id || null,
      actorUserId: user?.id || null,
      actorName,
      actorRole,
      targetEmployeeId: targetEmployeeId || null,
      projectId: projectId || null,
      taskId: taskId || null,
      dependencyWorkstream: dependencyWorkstream || null,
      dependencyLabel: dependencyLabel || null,
    });

    return NextResponse.json({
      ok: true,
      threadId: thread.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to initiate thread." },
      { status: 500 },
    );
  }
}
