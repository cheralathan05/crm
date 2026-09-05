import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { summarizeConversationWithAI } from "@/lib/messages/work-messages.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ ok: false, message: "conversationId is required." }, { status: 400 });
    }

    const result = await summarizeConversationWithAI(conversationId);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[api/employee/conversations/summarize] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to summarize conversation." },
      { status: 500 },
    );
  }
}
