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

    const teams = await db.organizationTeam.findMany({
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
      orderBy: { name: "asc" },
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
    const { name, code, department = "ENGINEERING", description, teamLeadId } = body;

    if (!name) {
      return NextResponse.json({ ok: false, message: "Team name is required." }, { status: 400 });
    }

    const teamCode = code || `TEAM-${name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 10)}`;

    const team = await db.organizationTeam.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        code: teamCode,
        department,
        description: description?.trim() || null,
        teamLeadId: teamLeadId || null,
      },
      include: {
        teamLead: true,
      },
    });

    return NextResponse.json({ ok: true, team });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to create team." },
      { status: 500 },
    );
  }
}
