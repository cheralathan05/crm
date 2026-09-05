import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/settings/api-key-webhook.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const keys = await listApiKeys(ctx.workspace.id);
  return NextResponse.json({ ok: true, keys });
}

export async function POST(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, scopes, expiresInDays } = await req.json();
    if (!name) {
      return NextResponse.json({ ok: false, message: "Key name required" }, { status: 400 });
    }

    const result = await createApiKey({
      workspaceId: ctx.workspace.id,
      name,
      scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : ["read:tasks", "read:projects"],
      expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      actor: { id: ctx.userId, name: ctx.userName },
    });

    return NextResponse.json({
      ok: true,
      apiKey: result.apiKey,
      rawSecretKey: result.rawSecretKey, // Shown once
      message: "API Key created. Copy and store this secret safely; it will not be displayed again.",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID required" }, { status: 400 });
    }

    const updated = await revokeApiKey(ctx.workspace.id, id, {
      id: ctx.userId,
      name: ctx.userName,
    });

    return NextResponse.json({ ok: true, apiKey: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
