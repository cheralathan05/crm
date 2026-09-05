import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailConfigStatus } from "@/lib/mail";
import { getSettingsAuthContext } from "@/lib/settings/settings-auth";
import {
  ensureWorkspaceSettings,
  getAllSettings,
} from "@/lib/settings/settings-control.service";
import { evaluateControlPlaneHealth } from "@/lib/settings/control-plane-health.service";
import { SettingsControlPlane } from "@/components/settings/settings-control-plane";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const ctx = await getSettingsAuthContext();
  if (!ctx) {
    redirect("/login");
  }

  const workspaceId = ctx.workspace.id;

  // Initialize defaults if missing
  await ensureWorkspaceSettings(workspaceId);

  // Parallel fetch of real database entities
  const [
    settings,
    health,
    recentAuditEvents,
    counts,
    employeesList,
  ] = await Promise.all([
    getAllSettings(workspaceId),
    evaluateControlPlaneHealth(workspaceId),
    db.configurationAuditEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    Promise.all([
      db.employee.count({ where: { workspaceId } }),
      db.organizationRole.count({ where: { workspaceId } }),
      db.organizationTeam.count({ where: { workspaceId } }),
      db.clientProject.count({ where: { client: { workspaceId } } }),
      db.clientTask.count({ where: { project: { client: { workspaceId } } } }),
      db.apiKey.count({ where: { workspaceId, status: "ACTIVE" } }),
      db.webhookSubscription.count({ where: { workspaceId, status: "ACTIVE" } }),
      db.automationRuleRecord.count({ where: { workspaceId, status: "ACTIVE" } }),
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
    db.employee.findMany({
      where: { workspaceId },
      include: { role: true },
      take: 50,
      orderBy: { fullName: "asc" },
    }),
  ]);

  const config = emailConfigStatus();
  const emailConfig = {
    ok: true,
    configured: config.channel !== "none",
    channel: config.channel,
    from:
      config.channel === "smtp"
        ? config.from
        : config.channel === "resend"
        ? process.env.RESEND_FROM ?? "Business OS <onboarding@resend.dev>"
        : null,
    host: config.channel === "smtp" ? config.host : null,
    port: config.channel === "smtp" ? config.port : null,
    companyName: ctx.workspace.companyName,
  };

  const initialData = {
    workspace: {
      id: ctx.workspace.id,
      companyName: ctx.workspace.companyName,
      ownerId: ctx.workspace.ownerId,
      environment: process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT",
      plan: "ENTERPRISE",
      createdAt: ctx.workspace.createdAt.toISOString(),
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
    recentAuditEvents: recentAuditEvents.map((evt) => ({
      ...evt,
      createdAt: evt.createdAt.toISOString(),
    })),
    emailConfig,
    employeesList,
  };

  return <SettingsControlPlane initialData={initialData} />;
}
