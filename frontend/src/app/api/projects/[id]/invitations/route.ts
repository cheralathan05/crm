import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectInvitation } from "@/lib/employees/project-invitation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ ok: false, message: "Project ID is required." }, { status: 400 });
    }

    const invitations = await db.employeeInvitation.findMany({
      where: { projectId },
      select: {
        id: true,
        recipientEmail: true,
        recipientName: true,
        teamName: true,
        projectRole: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        invitedByName: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      data: invitations,
    });
  } catch (error: any) {
    console.error("[api/projects/[id]/invitations] GET error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to fetch invitations." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId } = await params;
    const body = await req.json();

    const { teamName, projectRole, email } = body;

    if (!teamName || !projectRole || !email) {
      return NextResponse.json(
        { ok: false, message: "Team, role, and recipient email are all required." },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;

    const result = await createProjectInvitation({
      projectId,
      teamName,
      projectRole,
      recipientEmail: email,
      actorUserId: session?.user?.id || null,
      actorName: session?.user?.name || "Project Admin",
      baseUrl: origin,
    });

    return NextResponse.json({
      ok: true,
      message: `Invitation successfully created and sent to ${email}`,
      data: result,
    });
  } catch (error: any) {
    console.error("[api/projects/[id]/invitations] POST error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to send invitation." },
      { status: 400 }
    );
  }
}
