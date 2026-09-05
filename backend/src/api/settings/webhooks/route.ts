import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import {
  createWebhookSubscription,
  listWebhooks,
  triggerWebhookTestPing,
} from "@/lib/settings/api-key-webhook.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const webhooks = await listWebhooks(ctx.workspace.id);
  return NextResponse.json({ ok: true, webhooks });
}

export async function POST(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, url, events } = await req.json();
    if (!name || !url) {
      return NextResponse.json({ ok: false, message: "Name and URL are required" }, { status: 400 });
    }

    const webhook = await createWebhookSubscription({
      workspaceId: ctx.workspace.id,
      name,
      url,
      events: Array.isArray(events) && events.length > 0 ? events : ["payment.confirmed", "task.completed"],
      actor: { id: ctx.userId, name: ctx.userName },
    });

    return NextResponse.json({ ok: true, webhook });
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
    const { webhookId } = await req.json();
    if (!webhookId) {
      return NextResponse.json({ ok: false, message: "webhookId required" }, { status: 400 });
    }

    const delivery = await triggerWebhookTestPing(webhookId);
    return NextResponse.json({ ok: true, delivery });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
