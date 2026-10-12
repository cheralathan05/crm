import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getGithubIssues, createGithubIssue } from "@/lib/github/github.service";

async function resolveWorkspace() {
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
  return workspace;
}

export async function GET(req: NextRequest) {
  try {
    const workspace = await resolveWorkspace();
    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const taskId = searchParams.get("taskId") || undefined;
    const search = searchParams.get("search") || undefined;

    const issues = await getGithubIssues(workspace.id, { state, employeeId, taskId, search });
    return NextResponse.json({ ok: true, issues });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to fetch issues." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await resolveWorkspace();
    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const body = await req.json();
    const result = await createGithubIssue(workspace.id, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to create issue." }, { status: 500 });
  }
}
