import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { getAllSettings } from "@/lib/settings/settings-control.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const allSettings = await getAllSettings(ctx.workspace.id);

  if (!q) {
    return NextResponse.json({
      ok: true,
      results: allSettings.slice(0, 10).map((s) => ({
        key: s.key,
        name: s.definition.name,
        description: s.definition.description,
        category: s.definition.category,
        scope: s.scope,
        currentValue: s.currentValue,
        requiredPermission: s.definition.editableBy.join(", "),
        sensitivity: s.definition.sensitivity,
      })),
    });
  }

  const matched = allSettings.filter((s) => {
    return (
      s.key.toLowerCase().includes(q) ||
      s.definition.name.toLowerCase().includes(q) ||
      s.definition.description.toLowerCase().includes(q) ||
      s.definition.category.toLowerCase().includes(q) ||
      s.definition.affectedModules.some((m) => m.toLowerCase().includes(q))
    );
  });

  return NextResponse.json({
    ok: true,
    results: matched.map((s) => ({
      key: s.key,
      name: s.definition.name,
      description: s.definition.description,
      category: s.definition.category,
      scope: s.scope,
      currentValue: s.currentValue,
      requiredPermission: s.definition.editableBy.join(", "),
      sensitivity: s.definition.sensitivity,
    })),
  });
}
