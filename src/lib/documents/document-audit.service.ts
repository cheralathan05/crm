import { db } from "@/lib/db";

export type DocumentAction =
  | "CREATED"
  | "VIEWED"
  | "DOWNLOADED"
  | "APPROVED"
  | "VERSION_CREATED"
  | "SENT"
  | "ARCHIVED";

export async function logDocumentAuditEvent(params: {
  documentId: string;
  action: DocumentAction;
  actorId?: string | null;
  actorName?: string | null;
  context?: Record<string, any>;
}) {
  try {
    return await db.documentAuditEvent.create({
      data: {
        documentId: params.documentId,
        action: params.action,
        actorId: params.actorId ?? null,
        actorName: params.actorName ?? "Admin",
        context: JSON.stringify(params.context ?? {}),
      },
    });
  } catch (err) {
    console.error("[document-audit] Failed to log event:", err);
    return null;
  }
}
