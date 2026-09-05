import { db } from "@/lib/db";

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  detail: string;
  actorName: string;
  occurredAt: string;
  sourceType: string;
  sourceId: string;
  projectName?: string;
  clientName?: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
}

export interface TimelineFilter {
  clientId?: string;
  projectId?: string;
  eventType?: string;
  limit?: number;
}

/**
 * Aggregates chronological domain activity events across projects,
 * payments, requirements, and audits into a unified stream.
 */
export async function getBusinessTimeline(
  workspaceId: string,
  filters?: TimelineFilter,
): Promise<{ events: TimelineEvent[]; totalCount: number }> {
  const wherePrj: any = { project: { client: { workspaceId } } };
  if (filters?.projectId) {
    wherePrj.projectId = filters.projectId;
  }
  if (filters?.clientId) {
    wherePrj.project.clientId = filters.clientId;
  }

  const [projectActivities, financialAudits] = await Promise.all([
    db.projectActivity.findMany({
      where: wherePrj,
      include: { project: { include: { client: true } } },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
    }),
    db.financialAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 20,
    }),
  ]);

  const events: TimelineEvent[] = [];

  for (const pa of projectActivities) {
    let severity: TimelineEvent["severity"] = "INFO";
    if (pa.type.includes("APPROVED") || pa.type.includes("COMPLETED")) severity = "SUCCESS";
    if (pa.type.includes("BLOCK") || pa.type.includes("CHANGE")) severity = "WARNING";

    events.push({
      id: `ev-prj-${pa.id}`,
      type: pa.type,
      title: pa.title,
      detail: pa.detail || "",
      actorName: pa.actorName || "System",
      occurredAt: pa.createdAt.toISOString(),
      sourceType: "PROJECT_ACTIVITY",
      sourceId: pa.projectId,
      projectName: pa.project?.name,
      clientName: pa.project?.client?.companyName,
      severity,
    });
  }

  for (const fa of financialAudits) {
    events.push({
      id: `ev-fin-${fa.id}`,
      type: `FINANCIAL_${fa.action}`,
      title: `Financial Event: ${fa.action}`,
      detail: fa.reason || `Action recorded on ${fa.entityType} (${fa.entityId})`,
      actorName: fa.actorName || "Finance System",
      occurredAt: fa.createdAt.toISOString(),
      sourceType: "FINANCIAL_AUDIT",
      sourceId: fa.entityId,
      severity: fa.action === "CONFIRMED" ? "SUCCESS" : "INFO",
    });
  }

  // Sort chronological descending
  events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  let filteredEvents = events;
  if (filters?.eventType) {
    filteredEvents = filteredEvents.filter((e) => e.type.includes(filters.eventType!));
  }

  return {
    events: filteredEvents.slice(0, filters?.limit || 50),
    totalCount: filteredEvents.length,
  };
}
