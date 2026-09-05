import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import {
  createAutomationRule,
  listAutomationRules,
  toggleAutomationRule,
  executeAutomationRule,
} from "@/lib/settings/automation-engine.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const rules = await listAutomationRules(ctx.workspace.id);
  return NextResponse.json({ ok: true, rules });
}

export async function POST(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description, triggerEvent, conditions, actions } = await req.json();
    if (!name || !triggerEvent) {
      return NextResponse.json(
        { ok: false, message: "Rule name and triggerEvent are required" },
        { status: 400 }
      );
    }

    const rule = await createAutomationRule({
      workspaceId: ctx.workspace.id,
      name,
      description,
      triggerEvent,
      conditions: Array.isArray(conditions) ? conditions : [],
      actions: Array.isArray(actions) && actions.length > 0 ? actions : [{ type: "NOTIFY_OWNER" }],
      actor: { id: ctx.userId, name: ctx.userName },
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ruleId } = await req.json();
    if (!ruleId) {
      return NextResponse.json({ ok: false, message: "ruleId required" }, { status: 400 });
    }

    const updated = await toggleAutomationRule(ruleId, ctx.workspace.id, {
      id: ctx.userId,
      name: ctx.userName,
    });

    return NextResponse.json({ ok: true, rule: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ruleId, payload } = await req.json();
    if (!ruleId) {
      return NextResponse.json({ ok: false, message: "ruleId required" }, { status: 400 });
    }

    const run = await executeAutomationRule(ruleId, payload || {});
    return NextResponse.json({ ok: true, run });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
