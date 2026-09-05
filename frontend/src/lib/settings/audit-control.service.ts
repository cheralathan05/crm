import { db } from "@/lib/db";

export interface AuditFilterParams {
  workspaceId: string;
  category?: string;
  action?: string;
  actorId?: string;
  risk?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditEvents(params: AuditFilterParams) {
  const {
    workspaceId,
    category,
    action,
    actorId,
    risk,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params;

  const where: any = { workspaceId };

  if (category && category !== "ALL") {
    where.category = category;
  }
  if (action && action !== "ALL") {
    where.action = action;
  }
  if (actorId) {
    where.actorId = actorId;
  }
  if (risk && risk !== "ALL") {
    where.risk = risk;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    db.configurationAuditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.configurationAuditEvent.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function recordAuditEvent(params: {
  workspaceId: string;
  actorId?: string;
  actorName: string;
  action: string;
  category: string;
  settingKey?: string;
  before?: any;
  after?: any;
  impactSummary: string;
  risk?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ipAddress?: string;
}) {
  return db.configurationAuditEvent.create({
    data: {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      actorName: params.actorName,
      action: params.action,
      category: params.category,
      settingKey: params.settingKey,
      before: params.before ? JSON.stringify(params.before) : null,
      after: params.after ? JSON.stringify(params.after) : null,
      impactSummary: params.impactSummary,
      risk: params.risk || "LOW",
      ipAddress: params.ipAddress,
    },
  });
}
