import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeTaskStaffing } from "@/lib/ai/orchestrator/staffing.orchestrator";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const workspace = await db.workspace.findFirst({
      where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
    }) || await db.workspace.findFirst();

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ ok: false, message: "Task ID is required." }, { status: 400 });
    }

    const analysis = await analyzeTaskStaffing({
      workspaceId: workspace.id,
      taskId,
    });

    return NextResponse.json({ ok: true, ...analysis });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to analyze staffing." },
      { status: 500 },
    );
  }
}
