import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";
import { startBuildSession, endBuildSession } from "@/lib/employees/employee-os.service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const previewEmployeeId = searchParams.get("previewEmployeeId");

    let employeeId: string | null = null;
    if (previewEmployeeId) {
      employeeId = previewEmployeeId;
    } else if (session?.user?.id) {
      const context = await resolveEmployeeContext(session.user.id);
      if (context.isEmployee && context.employee) {
        employeeId = context.employee.id;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const activeSession = await db.employeeBuildSession.findFirst({
      where: { employeeId, status: "ACTIVE" },
      include: {
        task: { select: { id: true, code: true, title: true, status: true, priority: true } },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    const recentSessions = await db.employeeBuildSession.findMany({
      where: { employeeId, status: "COMPLETED" },
      include: {
        task: { select: { id: true, code: true, title: true } },
      },
      orderBy: { endedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      ok: true,
      activeSession,
      recentSessions,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to load session." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { projectId, taskId, capabilityName, previewEmployeeId } = body;

    let employeeId = previewEmployeeId;
    if (!employeeId && session?.user?.id) {
      const context = await resolveEmployeeContext(session.user.id);
      if (context.isEmployee && context.employee) {
        employeeId = context.employee.id;
      }
    }

    if (!employeeId || !projectId) {
      return NextResponse.json({ ok: false, message: "Employee ID and Project ID are required." }, { status: 400 });
    }

    const newSession = await startBuildSession({
      employeeId,
      projectId,
      taskId,
      capabilityName,
    });

    return NextResponse.json({ ok: true, session: newSession });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to start session." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, whatChanged, whatCompleted, whatRemains, blockers, evidenceUrl, evidenceNote, markTaskCompleted } = body;

    if (!sessionId) {
      return NextResponse.json({ ok: false, message: "Session ID is required." }, { status: 400 });
    }

    const completedSession = await endBuildSession({
      sessionId,
      whatChanged,
      whatCompleted,
      whatRemains,
      blockers,
      evidenceUrl,
      evidenceNote,
      markTaskCompleted,
    });

    return NextResponse.json({ ok: true, session: completedSession });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to end session." }, { status: 500 });
  }
}
