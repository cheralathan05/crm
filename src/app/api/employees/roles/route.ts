import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultRoles } from "@/lib/employees/employee.service";

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

    await ensureDefaultRoles(workspace.id);

    const roles = await db.organizationRole.findMany({
      where: { workspaceId: workspace.id },
      include: {
        employees: {
          select: { id: true, fullName: true, employeeCode: true, status: true, avatar: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, roles });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch roles." },
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
    const {
      name,
      code,
      department = "ENGINEERING",
      purpose,
      responsibilities = [],
      requiredCapabilities = [],
      permissionTemplate = {},
    } = body;

    if (!name || !purpose) {
      return NextResponse.json(
        { ok: false, message: "Role name and purpose are required." },
        { status: 400 },
      );
    }

    const roleCode = code || `ROLE-${name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 10)}`;

    const role = await db.organizationRole.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        code: roleCode,
        department,
        purpose: purpose.trim(),
        responsibilities: JSON.stringify(responsibilities),
        requiredCapabilities: JSON.stringify(requiredCapabilities),
        permissionTemplate: JSON.stringify(permissionTemplate),
      },
    });

    return NextResponse.json({ ok: true, role });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to create role." },
      { status: 500 },
    );
  }
}
