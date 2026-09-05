import { db } from "@/lib/db";
import { syncRealDocuments } from "./document-indexer.service";

export interface DocumentOperatingData {
  view: string;
  counts: {
    all: number;
    clients: number;
    requirements: number;
    proposals: number;
    projects: number;
    receipts: number;
  };
  documents: any[];
  proposalGroups: any[];
}

export async function getDocumentOperatingData(
  view = "all",
  search = ""
): Promise<DocumentOperatingData> {
  // Idempotently ensure all proposals, versions, and files are indexed
  await syncRealDocuments();

  // Query real counts across categories directly from BusinessDocument layer
  const [allCount, proposalCount, reqCount, clientDocsCount, projectDocsCount, receiptsCount] = await Promise.all([
    db.businessDocument.count(),
    db.businessDocument.count({ where: { category: "PROPOSAL" } }),
    db.businessDocument.count({ where: { category: "REQUIREMENT" } }),
    db.businessDocument.count({ where: { OR: [{ category: "CLIENT" }, { clientId: { not: null } }] } }),
    db.businessDocument.count({ where: { OR: [{ category: "PROJECT_DELIVERABLE" }, { projectId: { not: null } }] } }),
    db.businessDocument.count({ where: { category: "PAYMENT_RECEIPT" } }),
  ]);

  // Build filter condition
  const where: any = {};
  if (view === "proposals") {
    where.category = "PROPOSAL";
  } else if (view === "clients") {
    where.OR = [{ category: "CLIENT" }, { clientId: { not: null } }];
  } else if (view === "requirements") {
    where.category = "REQUIREMENT";
  } else if (view === "projects") {
    where.OR = [{ category: "PROJECT_DELIVERABLE" }, { projectId: { not: null } }];
  } else if (view === "receipts") {
    where.category = "PAYMENT_RECEIPT";
  }

  // Fetch documents
  const docs = await db.businessDocument.findMany({
    where,
    include: {
      client: { select: { id: true, companyName: true, email: true } },
      proposal: { select: { id: true, reference: true, title: true, status: true, version: true } },
      project: { select: { id: true, name: true, code: true, stage: true, health: true } },
      versions: { orderBy: { version: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const searchNormalized = search.trim().toLowerCase();
  const filtered = searchNormalized
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(searchNormalized) ||
          (d.reference && d.reference.toLowerCase().includes(searchNormalized)) ||
          d.fileName.toLowerCase().includes(searchNormalized) ||
          (d.client?.companyName && d.client.companyName.toLowerCase().includes(searchNormalized)) ||
          (d.proposal?.reference && d.proposal.reference.toLowerCase().includes(searchNormalized)) ||
          (d.project?.name && d.project.name.toLowerCase().includes(searchNormalized))
      )
    : docs;

  // Build proposal groups for Proposals view
  const proposalGroupsMap = new Map<string, any>();
  for (const doc of filtered.filter((d) => d.category === "PROPOSAL" && d.proposal)) {
    const propId = doc.proposal!.id;
    if (!proposalGroupsMap.has(propId)) {
      proposalGroupsMap.set(propId, {
        proposalId: propId,
        reference: doc.proposal!.reference ?? `PROP-${propId.slice(0, 6)}`,
        title: doc.proposal!.title,
        client: doc.client ? { id: doc.client.id, companyName: doc.client.companyName } : null,
        project: doc.project ? { id: doc.project.id, name: doc.project.name, code: doc.project.code } : null,
        currentVersion: doc.proposal!.version,
        status: doc.proposal!.status,
        latestDocument: {
          id: doc.id,
          fileName: doc.fileName,
          reference: doc.reference,
          fileSize: doc.fileSize,
          pageCount: doc.pageCount,
          healthState: doc.healthState,
          storagePath: doc.storagePath,
          updatedAt: doc.updatedAt.toISOString(),
        },
        versions: doc.versions.map((v) => ({
          version: v.version,
          status: v.status,
          fileName: v.fileName,
          fileSize: v.fileSize,
          createdAt: v.createdAt.toISOString(),
          isCurrent: v.isCurrent,
        })),
      });
    }
  }

  return {
    view,
    counts: {
      all: allCount,
      clients: clientDocsCount,
      requirements: reqCount,
      proposals: proposalCount,
      projects: projectDocsCount,
      receipts: receiptsCount,
    },
    documents: filtered.map((d) => ({
      id: d.id,
      title: d.title,
      reference: d.reference,
      fileName: d.fileName,
      category: d.category,
      status: d.status,
      healthState: d.healthState,
      fileSize: d.fileSize,
      pageCount: d.pageCount,
      version: d.version,
      isCurrentVersion: d.isCurrentVersion,
      client: d.client ? { id: d.client.id, companyName: d.client.companyName } : null,
      proposal: d.proposal ? { id: d.proposal.id, reference: d.proposal.reference, status: d.proposal.status } : null,
      project: d.project ? { id: d.project.id, name: d.project.name, code: d.project.code } : null,
      versionsCount: d.versions.length,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    proposalGroups: Array.from(proposalGroupsMap.values()),
  };
}
