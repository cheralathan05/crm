import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDocumentTraceability } from "@/lib/documents/document-traceability.service";
import { logDocumentAuditEvent } from "@/lib/documents/document-audit.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const trace = await getDocumentTraceability(id);

  if (!trace) {
    return NextResponse.json({ ok: false, message: "Document not found" }, { status: 404 });
  }

  // Fetch audit events
  const auditEvents = await db.documentAuditEvent.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Log viewed event
  await logDocumentAuditEvent({
    documentId: id,
    action: "VIEWED",
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
  });

  return NextResponse.json({
    ok: true,
    data: {
      ...trace,
      auditEvents: auditEvents.map((a) => ({
        id: a.id,
        action: a.action,
        actorName: a.actorName,
        createdAt: a.createdAt.toISOString(),
      })),
    },
  });
}
