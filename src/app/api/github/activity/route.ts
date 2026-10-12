import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getGithubCommits, getGithubEvents } from "@/lib/github/github.service";

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
    const limit = Number(searchParams.get("limit")) || 30;

    const [commits, events] = await Promise.all([
      getGithubCommits(workspace.id, limit),
      getGithubEvents(workspace.id, limit),
    ]);

    return NextResponse.json({ ok: true, commits, events });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to fetch activity." }, { status: 500 });
  }
}
