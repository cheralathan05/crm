import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reportBlocker } from "@/lib/employees/employee-product-workspace.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildId, blockedReason, blockedDependency, blockedOwnerRole } = body;

    const build = await reportBlocker({
      buildId,
      blockedReason,
      blockedDependency,
      blockedOwnerRole,
    });

    return NextResponse.json({ ok: true, build });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to report blocker." }, { status: 500 });
  }
}
