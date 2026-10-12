import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getGithubPullRequests } from "@/lib/github/github.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    let workspace = null;
    if (user?.id) {
      workspace = await db.workspace.findFirst({
        where: user.role === "OWNER" ? { ownerId: user.id } : undefined,
      });
    }
    if (!workspace) {
      workspace = await db.workspace.findFirst();
    }
    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const taskId = searchParams.get("taskId") || undefined;

    const pullRequests = await getGithubPullRequests(workspace.id, { state, employeeId, taskId });
    return NextResponse.json({ ok: true, pullRequests });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to fetch PRs." }, { status: 500 });
  }
}
