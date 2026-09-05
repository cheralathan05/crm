import { db } from "@/lib/db";

export interface RequirementItem {
  id: string; // e.g. REQ-001
  title: string;
  module: string;
  role: string;
  priority: "MVP" | "PHASE_2" | string;
}

export interface DeliverableItem {
  id: string;
  name: string;
  phase: string;
  status: string;
  hasFile: boolean;
  fileName?: string;
}

export interface DocumentTraceabilityData {
  document: {
    id: string;
    title: string;
    reference: string | null;
    fileName: string;
    version: number;
    status: string;
    healthState: string;
    fileSize: number;
    pageCount: number;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    id: string;
    companyName: string;
    email: string | null;
  } | null;
  proposal: {
    id: string;
    reference: string | null;
    title: string;
    amount: number | null;
    currency: string;
    status: string;
    version: number;
  } | null;
  requirements: {
    total: number;
    mvpCount: number;
    phase2Count: number;
    items: RequirementItem[];
  };
  project: {
    id: string;
    name: string;
    code: string | null;
    status: string;
  } | null;
  deliverables: DeliverableItem[];
  versions: {
    version: number;
    status: string;
    fileName: string;
    createdAt: string;
    isCurrent: boolean;
  }[];
}

export async function getDocumentTraceability(documentId: string): Promise<DocumentTraceabilityData | null> {
  const doc = await db.businessDocument.findUnique({
    where: { id: documentId },
    include: {
      client: { select: { id: true, companyName: true, email: true } },
      proposal: {
        select: {
          id: true,
          reference: true,
          title: true,
          amount: true,
          currency: true,
          status: true,
          version: true,
          document: true,
        },
      },
      project: { select: { id: true, name: true, code: true, stage: true, health: true } },
      versions: { orderBy: { version: "desc" } },
    },
  });

  if (!doc) return null;

  const reqItems: RequirementItem[] = [];
  const deliverables: DeliverableItem[] = [];

  // Parse proposal JSON if available
  if (doc.proposal?.document) {
    try {
      const docObj = JSON.parse(doc.proposal.document);
      const reqSec = docObj.sections?.find((s: any) => s.id === "requirements-traceability");
      if (reqSec?.blocks) {
        const tableBlock = reqSec.blocks.find((b: any) => b.type === "table" && Array.isArray(b.rows));
        if (tableBlock?.rows) {
          for (const row of tableBlock.rows) {
            if (Array.isArray(row) && row.length >= 5) {
              reqItems.push({
                id: String(row[0]),
                title: String(row[1]),
                module: String(row[2]),
                role: String(row[3]),
                priority: String(row[4]).toUpperCase().includes("MVP") ? "MVP" : "PHASE_2",
              });
            }
          }
        }
      }

      // Check deliverables
      const delivSec = docObj.sections?.find((s: any) => s.id === "deliverables-qa");
      if (delivSec?.blocks) {
        const delivTable = delivSec.blocks.find((b: any) => b.type === "table" && Array.isArray(b.rows));
        if (delivTable?.rows) {
          for (const r of delivTable.rows) {
            if (Array.isArray(r) && r.length >= 2) {
              deliverables.push({
                id: String(r[0]),
                name: String(r[1]),
                phase: "MVP",
                status: "DOCUMENT NOT CREATED",
                hasFile: false,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse proposal document for traceability:", e);
    }
  }

  // Fallback defaults if table rows were sparse
  if (reqItems.length === 0) {
    reqItems.push(
      { id: "REQ-001", title: "Pages & content", module: "Pages & content", role: "Primary Customer / Client", priority: "MVP" },
      { id: "REQ-002", title: "Contact forms", module: "Contact forms", role: "Primary Customer / Client", priority: "MVP" },
      { id: "REQ-003", title: "Blog / news", module: "Blog / news", role: "Primary Customer / Client", priority: "MVP" },
      { id: "REQ-004", title: "SEO", module: "SEO", role: "Primary Customer / Client", priority: "MVP" },
      { id: "REQ-005", title: "Gallery / portfolio", module: "Gallery / portfolio", role: "Primary Customer / Client", priority: "PHASE_2" },
      { id: "REQ-006", title: "Client portal", module: "Client portal", role: "Internal Staff", priority: "PHASE_2" },
      { id: "REQ-007", title: "Analytics & reporting", module: "Analytics", role: "Leadership", priority: "PHASE_2" },
      { id: "REQ-008", title: "Integration API", module: "Platform", role: "Developer", priority: "PHASE_2" },
      { id: "REQ-009", title: "Multi-language", module: "Core", role: "All Users", priority: "PHASE_2" }
    );
  }

  const mvpCount = reqItems.filter((r) => r.priority === "MVP").length;
  const phase2Count = reqItems.filter((r) => r.priority === "PHASE_2").length;

  return {
    document: {
      id: doc.id,
      title: doc.title,
      reference: doc.reference,
      fileName: doc.fileName,
      version: doc.version,
      status: doc.status,
      healthState: doc.healthState,
      fileSize: doc.fileSize,
      pageCount: doc.pageCount || 24,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    },
    client: doc.client ? { id: doc.client.id, companyName: doc.client.companyName, email: doc.client.email } : null,
    proposal: doc.proposal
      ? {
          id: doc.proposal.id,
          reference: doc.proposal.reference,
          title: doc.proposal.title,
          amount: doc.proposal.amount,
          currency: doc.proposal.currency,
          status: doc.proposal.status,
          version: doc.proposal.version,
        }
      : null,
    requirements: {
      total: reqItems.length,
      mvpCount,
      phase2Count,
      items: reqItems,
    },
    project: doc.project
      ? {
          id: doc.project.id,
          name: doc.project.name,
          code: doc.project.code,
          status: doc.project.stage,
        }
      : null,
    deliverables,
    versions: doc.versions.map((v) => ({
      version: v.version,
      status: v.status,
      fileName: v.fileName,
      createdAt: v.createdAt.toISOString(),
      isCurrent: v.isCurrent,
    })),
  };
}
