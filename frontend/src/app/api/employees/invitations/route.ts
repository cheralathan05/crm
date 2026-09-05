import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmployeeInvitation } from "@/lib/employees/invitation.service";

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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const invitations = await db.employeeInvitation.findMany({
      where: {
        workspaceId: workspace.id,
        ...(status && status !== "ALL" ? { status } : {}),
      },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, avatar: true },
        },
        role: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, invitations });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch invitations." },
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
    const { action, invitationId } = body; // action: "RESEND" | "REVOKE"

    if (!invitationId) {
      return NextResponse.json({ ok: false, message: "Invitation ID is required." }, { status: 400 });
    }

    const invitation = await db.employeeInvitation.findUnique({
      where: { id: invitationId },
      include: { employee: true },
    });

    if (!invitation) {
      return NextResponse.json({ ok: false, message: "Invitation not found." }, { status: 404 });
    }

    if (action === "REVOKE") {
      const revoked = await db.employeeInvitation.update({
        where: { id: invitationId },
        data: { status: "REVOKED", revokedAt: new Date() },
      });

      await db.employeeAuditEvent.create({
        data: {
          workspaceId: workspace.id,
          employeeId: invitation.employeeId,
          action: "INVITATION_REVOKED",
          actorName: user?.name || "Admin",
          detail: `Invitation for ${invitation.recipientEmail} was revoked.`,
        },
      });

      return NextResponse.json({ ok: true, invitation: revoked });
    }

    if (action === "RESEND") {
      const baseUrl = req.headers.get("origin") || undefined;
      const result = await sendEmployeeInvitation({
        workspaceId: workspace.id,
        employeeId: invitation.employeeId,
        actorName: user?.name || "Admin",
        actorId: user?.id,
        baseUrl,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process invitation action." },
      { status: 500 },
    );
  }
}
