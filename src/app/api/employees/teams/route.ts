import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const workspace = await db.workspace.findFirst({
      where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
    }) || await db.workspace.findFirst();

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const rawTeams = await db.organizationTeam.findMany({
      where: { workspaceId: workspace.id },
      include: {
        teamLead: { select: { id: true, fullName: true, employeeCode: true, avatar: true } },
        members: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            status: true,
            avatar: true,
            role: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const teams = rawTeams.map((t) => {
      let project: { id: string; name: string; code: string | null } | null = null;
      let displayDescription = t.description;

      if (t.description && t.description.startsWith("{")) {
        try {
          const parsed = JSON.parse(t.description);
          if (parsed.projectId) {
            project = {
              id: parsed.projectId,
              name: parsed.projectName || "Project",
              code: parsed.projectCode || null,
            };
          }
          displayDescription = parsed.text || null;
        } catch {}
      }

      return {
        ...t,
        description: displayDescription,
        project,
        memberCount: t.members.length,
      };
    });

    return NextResponse.json({ ok: true, teams });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch teams." },
      { status: 500 },
    );
  }
}

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
    const { name, code, department = "ENGINEERING", description, teamLeadId, projectId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, message: "Team name is required." }, { status: 400 });
    }

    // Lookup project if provided
    let project: any = null;
    if (projectId) {
      project = await db.clientProject.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, code: true },
      });
    }

    // Generate unique team code
    const baseCode = (code || `TEAM-${name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 10)}`).replace(/-+$/, "");
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const existingCode = await db.organizationTeam.findFirst({
      where: { workspaceId: workspace.id, code: baseCode },
    });
    const finalCode = existingCode ? `${baseCode}-${randomSuffix}` : baseCode;

    // Pack metadata if projectId is present
    let metaDescription: string | null = null;
    if (projectId || description) {
      metaDescription = JSON.stringify({
        text: description?.trim() || null,
        projectId: project ? project.id : null,
        projectName: project ? project.name : null,
        projectCode: project ? project.code : null,
      });
    }

    const team = await db.organizationTeam.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        code: finalCode,
        department,
        description: metaDescription,
        teamLeadId: teamLeadId || null,
      },
      include: {
        teamLead: true,
        members: true,
      },
    });

    return NextResponse.json({
      ok: true,
      team: {
        ...team,
        description: description?.trim() || null,
        project: project
          ? {
              id: project.id,
              name: project.name,
              code: project.code,
            }
          : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to create team." },
      { status: 500 },
    );
  }
}
