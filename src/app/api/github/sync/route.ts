import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { syncGithub } from "@/lib/github/github.service";

export async function POST(req: NextRequest) {
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

    const result = await syncGithub(workspace.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Sync failed." }, { status: 500 });
  }
}
