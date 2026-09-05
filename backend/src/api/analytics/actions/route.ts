import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeCommandCenterAction } from "@/lib/analytics/action-completion.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { actionType, payload } = body;

    if (!actionType) {
      return NextResponse.json(
        { ok: false, message: "actionType is required." },
        { status: 400 },
      );
    }

    const result = await executeCommandCenterAction({
      actionType,
      payload,
      actorId: session.user.id,
      actorName: session.user.name || "Admin",
    });

    return NextResponse.json({ ok: result.ok, data: result });
  } catch (error: any) {
    console.error("Action execution error:", error);
    return NextResponse.json(
      { ok: false, message: "Action could not be completed.", error: error.message },
      { status: 500 },
    );
  }
}
