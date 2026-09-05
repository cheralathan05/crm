import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { simulateAccess } from "@/lib/settings/access-simulator.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { employeeId, userId, module, action, projectId } = await req.json();
    if (!module || !action) {
      return NextResponse.json(
        { ok: false, message: "Module and action are required" },
        { status: 400 }
      );
    }

    const result = await simulateAccess({
      workspaceId: ctx.workspace.id,
      employeeId,
      userId,
      module,
      action,
      projectId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
