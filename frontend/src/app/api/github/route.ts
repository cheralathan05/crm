import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getGithubOverview,
  syncGithub,
  linkEmployeeToGithub,
  linkTaskToGithub,
  createGithubIssue,
} from "@/lib/github/github.service";

async function resolveWorkspace(req: NextRequest) {
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
    const workspace = await resolveWorkspace(req);
    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const overview = await getGithubOverview(workspace.id);
    return NextResponse.json({ ok: true, ...overview });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load GitHub intelligence." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await resolveWorkspace(req);
    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "SYNC") {
      const result = await syncGithub(workspace.id);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "LINK_EMPLOYEE") {
      const { employeeId, githubHandle } = body;
      if (!employeeId || !githubHandle) {
        return NextResponse.json({ ok: false, message: "Employee and GitHub handle required." }, { status: 400 });
      }
      const result = await linkEmployeeToGithub(workspace.id, employeeId, githubHandle);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "LINK_TASK") {
      const { taskId, targetType, targetNumber } = body;
      if (!taskId || !targetType || !targetNumber) {
        return NextResponse.json({ ok: false, message: "Task ID, type and number required." }, { status: 400 });
      }
      const result = await linkTaskToGithub(workspace.id, taskId, targetType, Number(targetNumber));
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "CREATE_ISSUE") {
      const { title, body: issueBody, labels, assigneeEmployeeId, taskId } = body;
      if (!title) {
        return NextResponse.json({ ok: false, message: "Issue title required." }, { status: 400 });
      }
      const result = await createGithubIssue(workspace.id, {
        title,
        body: issueBody,
        labels,
        assigneeEmployeeId,
        taskId,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "GitHub action failed." },
      { status: 500 },
    );
  }
}
