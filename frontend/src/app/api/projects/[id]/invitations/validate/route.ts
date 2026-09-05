import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateEmployeeForProjectInvitation, ProjectTeamName } from "@/lib/employees/project-invitation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const teamName = searchParams.get("teamName") as ProjectTeamName | null;
    const projectRole = searchParams.get("projectRole") || undefined;

    if (!email) {
      return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
    }

    const validation = await validateEmployeeForProjectInvitation({
      projectId,
      email,
      teamName: teamName || undefined,
      projectRole,
    });

    return NextResponse.json({
      ok: true,
      data: validation,
    });
  } catch (error: any) {
    console.error("[api/projects/[id]/invitations/validate] error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to validate employee email." },
      { status: 500 }
    );
  }
}