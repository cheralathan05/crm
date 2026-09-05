import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { getConfigurationHistory } from "@/lib/settings/settings-control.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ ok: false, message: "Setting key required" }, { status: 400 });
  }

  const history = await getConfigurationHistory(ctx.workspace.id, key);
  return NextResponse.json({ ok: true, key, history });
}
