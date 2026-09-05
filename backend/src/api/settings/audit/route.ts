import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { listAuditEvents } from "@/lib/settings/audit-control.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const action = searchParams.get("action") || undefined;
  const risk = searchParams.get("risk") || undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

  const result = await listAuditEvents({
    workspaceId: ctx.workspace.id,
    category,
    action,
    risk,
    limit,
    offset,
  });

  return NextResponse.json({ ok: true, ...result });
}
