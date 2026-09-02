import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWorkMessage } from "@/lib/messages/work-messages.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const session = await auth();
    const user = session?.user;

    const body = await req.json();
    const { content, messageType = "TEXT", metadata = {} } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ ok: false, message: "Content cannot be empty." }, { status: 400 });
    }

    let employee = null;
    if (user?.id) {
      employee = await db.employee.findFirst({
        where: {
          OR: [{ userId: user.id }, { email: user.email?.toLowerCase() }],
        },
        include: { role: true },
      });
    }

    const senderName = employee?.fullName || user?.name || "Admin";
    const senderRole = employee?.role?.name || (user?.role === "OWNER" ? "Workspace Admin" : "Team Member");

    const message = await sendWorkMessage({
      conversationId,
      senderEmployeeId: employee?.id || null,
      senderUserId: user?.id || null,
      senderName,
      senderRole,
      content: content.trim(),
      messageType,
      metadata,
    });

    return NextResponse.json({
      ok: true,
      message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to post message." },
      { status: 500 },
    );
  }
}
