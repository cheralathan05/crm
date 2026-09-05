import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { rollbackSetting } from "@/lib/settings/settings-control.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key, targetVersion } = await req.json();
    if (!key || typeof targetVersion !== "number") {
      return NextResponse.json(
        { ok: false, message: "Key and numeric targetVersion are required" },
        { status: 400 }
      );
    }

    const result = await rollbackSetting(
      ctx.workspace.id,
      key,
      targetVersion,
      { id: ctx.userId, name: ctx.userName }
    );

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.error || "Rollback failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      key,
      newVersion: result.newVersion,
      message: `Successfully rolled back ${key} to version ${targetVersion}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
