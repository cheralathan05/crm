import { NextResponse } from "next/server";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import { getAllSettings, setSetting } from "@/lib/settings/settings-control.service";
import { evaluateControlPlaneHealth } from "@/lib/settings/control-plane-health.service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;

  const [
    settings,
    health,
    recentAuditEvents,
    counts,
  ] = await Promise.all([
    getAllSettings(ctx.workspace.id, category),
    evaluateControlPlaneHealth(ctx.workspace.id),
    db.configurationAuditEvent.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    Promise.all([
      db.employee.count({ where: { workspaceId: ctx.workspace.id } }),
      db.organizationRole.count({ where: { workspaceId: ctx.workspace.id } }),
      db.organizationTeam.count({ where: { workspaceId: ctx.workspace.id } }),
      db.clientProject.count({ where: { client: { workspaceId: ctx.workspace.id } } }),
      db.clientTask.count({ where: { project: { client: { workspaceId: ctx.workspace.id } } } }),
      db.apiKey.count({ where: { workspaceId: ctx.workspace.id, status: "ACTIVE" } }),
      db.webhookSubscription.count({ where: { workspaceId: ctx.workspace.id, status: "ACTIVE" } }),
      db.automationRuleRecord.count({ where: { workspaceId: ctx.workspace.id, status: "ACTIVE" } }),
    ]).then(([employees, roles, teams, projects, tasks, apiKeys, webhooks, automations]) => ({
      employees,
      roles,
      teams,
      projects,
      tasks,
      apiKeys,
      webhooks,
      automations,
    })),
  ]);

  return NextResponse.json({
    ok: true,
    workspace: {
      id: ctx.workspace.id,
      companyName: ctx.workspace.companyName,
      ownerId: ctx.workspace.ownerId,
      environment: process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT",
      plan: "ENTERPRISE",
      createdAt: ctx.workspace.createdAt,
    },
    currentUser: {
      id: ctx.userId,
      name: ctx.userName,
      email: ctx.userEmail,
      role: ctx.role,
    },
    counts,
    health,
    settings,
    recentAuditEvents,
  });
}

export async function PATCH(req: Request) {
  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, value, reason } = body;

    if (!key) {
      return NextResponse.json({ ok: false, message: "Missing setting key" }, { status: 400 });
    }

    const result = await setSetting(
      ctx.workspace.id,
      key,
      value,
      {
        id: ctx.userId,
        name: ctx.userName,
        role: ctx.role,
      },
      reason
    );

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.error || "Failed to update setting" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      key,
      version: result.version,
      message: "Configuration persisted and version snapshot recorded.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
