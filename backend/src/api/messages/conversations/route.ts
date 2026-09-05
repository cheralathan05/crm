import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkMessagesHubData } from "@/lib/messages/work-messages.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    const workspace =
      (await db.workspace.findFirst({
        where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
      })) || (await db.workspace.findFirst());

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    // Determine actor employee record if logged in as employee or matching user
    let employee = null;
    if (user?.id || user?.email) {
      employee = await db.employee.findFirst({
        where: {
          OR: [
            ...(user?.id ? [{ userId: user.id }] : []),
            ...(user?.email ? [{ email: user.email.toLowerCase() }] : []),
          ],
        },
        include: { role: true, team: true },
      });
    }

    const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN" || !employee;

    const data = await getWorkMessagesHubData({
      workspaceId: workspace.id,
      actorEmployeeId: employee?.id || null,
      actorUserId: user?.id || null,
      isAdmin,
    });

    return NextResponse.json({
      ok: true,
      workspace: { id: workspace.id, companyName: workspace.companyName },
      currentActor: {
        userId: user?.id || "admin",
        userName: user?.name || "Workspace Admin",
        employeeId: employee?.id || null,
        employeeCode: employee?.employeeCode || "ADM",
        fullName: employee?.fullName || user?.name || "Workspace Admin",
        department: employee?.department || (isAdmin ? "EXECUTIVE" : "ENGINEERING"),
        role: employee?.role?.name || (isAdmin ? "Executive / Workspace Owner" : "Specialist"),
        isAdmin,
      },
      ...data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load messages hub." },
      { status: 500 },
    );
  }
}
