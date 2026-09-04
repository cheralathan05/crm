import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markMessageAsDecision } from "@/lib/messages/work-messages.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, decisionText, reason } = body;

    if (!messageId) {
      return NextResponse.json({ ok: false, message: "messageId is required." }, { status: 400 });
    }

    const result = await markMessageAsDecision({
      messageId,
      decisionText,
      reason,
      authorName: user.name || "Team Member",
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[api/employee/work/decision] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to record decision." },
      { status: 500 },
    );
  }
}
