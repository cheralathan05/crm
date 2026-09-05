import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { simulateConfigurationChange } from "@/lib/settings/config-simulator.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key, proposedValue } = await req.json();
    if (!key) {
      return NextResponse.json({ ok: false, message: "Key required" }, { status: 400 });
    }

    const simulation = await simulateConfigurationChange(
      ctx.workspace.id,
      key,
      proposedValue
    );

    return NextResponse.json({ ok: true, simulation });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
