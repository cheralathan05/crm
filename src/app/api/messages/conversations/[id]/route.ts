import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConversationDetails } from "@/lib/messages/work-messages.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const session = await auth();
    const user = session?.user;

    let employee = null;
    if (user?.id) {
      employee = await db.employee.findFirst({
        where: {
          OR: [{ userId: user.id }, { email: user.email?.toLowerCase() }],
        },
      });
    }

    const conversation = await getConversationDetails(
      conversationId,
      employee?.id || null,
      user?.id || null,
    );

    if (!conversation) {
      return NextResponse.json({ ok: false, message: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      conversation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch conversation." },
      { status: 500 },
    );
  }
}
