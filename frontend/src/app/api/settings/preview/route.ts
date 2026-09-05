import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { calculateChangePreview } from "@/lib/settings/change-preview.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key, newValue } = await req.json();
    if (!key) {
      return NextResponse.json({ ok: false, message: "Key required" }, { status: 400 });
    }

    const preview = await calculateChangePreview(ctx.workspace.id, key, newValue);
    return NextResponse.json({ ok: true, preview });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
