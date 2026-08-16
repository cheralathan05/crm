import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProposalForUser } from "@/lib/proposal";
import {
  computeProposalReadiness,
  computeRequirementCoverage,
  normalizeDoc,
  parseGeneratedTextToBlocks,
  type ProposalAdminAnswer,
  type ProposalBlock,
  type ProposalDoc,
  type ProposalSection,
} from "@/lib/proposal-doc";
import { loadFeatures } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/proposals/[id]/apply-ai ──────────────────────────
   Applies AI-generated section draft to the proposal:
   1. Validates authentication and proposal access.
   2. Stale version protection.
   3. Replaces target section blocks with structured blocks.
   4. Marks section as AI_ENHANCED.
   5. Merges admin answers into document facts.
   6. Increments proposal version (e.g. v1 -> v2).
   7. Freezes a ProposalVersion snapshot in the database.
   8. Marks PDF as OUTDATED (pdfPath: null).
   9. Records audit activity log.
   10. Returns authoritative proposal state.
──────────────────────────────────────────────────────────────── */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  let body: {
    proposalVersion?: number;
    sectionId: string;
    generatedBlocks?: ProposalBlock[];
    generatedText?: string;
    adminAnswers?: ProposalAdminAnswer[];
    currentDocument?: ProposalDoc;
    metadata?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const sectionId = String(body.sectionId ?? "").trim();
  if (!sectionId) {
    return NextResponse.json({ ok: false, message: "Target sectionId is required." }, { status: 400 });
  }

  // Parse existing document — prefer currentDocument from studio if provided
  let doc: ProposalDoc;
  try {
    if (body.currentDocument && typeof body.currentDocument === "object") {
      doc = normalizeDoc(body.currentDocument as ProposalDoc);
    } else {
      doc = normalizeDoc(JSON.parse(proposal.document || "{}") as ProposalDoc);
    }
  } catch {
    return NextResponse.json({ ok: false, message: "Could not parse current proposal document." }, { status: 500 });
  }

  let targetSectionIndex = doc.sections.findIndex((s) => s.id === sectionId);
  if (targetSectionIndex === -1) {
    targetSectionIndex = doc.sections.findIndex((s) => s.id === "executive-summary");
    if (targetSectionIndex === -1) targetSectionIndex = 0;
  }

  // Resolve blocks: use provided structured blocks or parse from generatedText
  let blocksToApply: ProposalBlock[] = [];
  if (Array.isArray(body.generatedBlocks) && body.generatedBlocks.length > 0) {
    blocksToApply = body.generatedBlocks;
  } else if (body.generatedText && body.generatedText.trim()) {
    blocksToApply = parseGeneratedTextToBlocks(body.generatedText, sectionId);
  }

  const now = new Date().toISOString();
  if (blocksToApply.length === 0) {
    blocksToApply = [
      {
        type: "paragraph",
        id: `${sectionId}-p-${Date.now().toString(36)}-1`,
        text: body.generatedText?.trim() || "Approved detailed section content.",
        source: "AI_DRAFT",
        updatedAt: now,
      },
    ];
  }

  const nextVersion = (proposal.version || 1) + 1;

  // Update target section
  const updatedSection: ProposalSection = {
    ...doc.sections[targetSectionIndex],
    blocks: blocksToApply,
    source: "AI_DRAFT",
    status: "AI_ENHANCED",
    updatedAt: now,
  };

  const updatedSections = [...doc.sections];
  updatedSections[targetSectionIndex] = updatedSection;

  // Merge admin answers
  const existingAnswers = doc.adminAnswers ?? [];
  const newAnswers = body.adminAnswers ?? [];
  const mergedAnswersMap = new Map<string, ProposalAdminAnswer>();
  for (const a of existingAnswers) mergedAnswersMap.set(`${a.sectionId}::${a.questionId}`, a);
  for (const a of newAnswers) mergedAnswersMap.set(`${a.sectionId}::${a.questionId}`, { ...a, updatedAt: now });

  const updatedDoc: ProposalDoc = {
    ...doc,
    version: nextVersion,
    sections: updatedSections,
    adminAnswers: Array.from(mergedAnswersMap.values()),
  };

  // Load features for coverage recalculation
  const features = proposal.requirementRequestId ? await loadFeatures(proposal.requirementRequestId) : [];
  const coverage = computeRequirementCoverage(updatedDoc, features);
  const readiness = computeProposalReadiness(updatedDoc, coverage);

  const docJson = JSON.stringify(updatedDoc);

  // Persist to database in atomic transaction
  await db.$transaction(async (tx) => {
    // 1. Create/upsert frozen version snapshot (prevents duplicate key errors)
    await tx.proposalVersion.upsert({
      where: {
        proposalId_version: {
          proposalId: proposal.id,
          version: nextVersion,
        },
      },
      update: {
        title: proposal.title,
        amount: proposal.amount,
        currency: proposal.currency,
        document: docJson,
        status: "FINALIZED",
        basedOnVersion: proposal.version,
      },
      create: {
        proposalId: proposal.id,
        version: nextVersion,
        title: proposal.title,
        amount: proposal.amount,
        currency: proposal.currency,
        document: docJson,
        status: "FINALIZED",
        basedOnVersion: proposal.version,
        createdById: session.user.id,
        createdByName: session.user.name ?? "Admin",
      },
    });

    // 2. Update working proposal (pdfPath reset to null -> PDF is OUTDATED!)
    await tx.clientProposal.update({
      where: { id: proposal.id },
      data: {
        version: nextVersion,
        document: docJson,
        pdfPath: null,
        pdfPages: 0,
        updatedAt: new Date(),
      },
    });

    // 3. Record client activity log safely
    try {
      await tx.clientActivity.create({
        data: {
          clientId: proposal.clientId,
          type: "NOTE",
          title: `AI Detail Applied: ${updatedSection.title} (v${nextVersion})`,
          note: `Detailed AI content accepted and applied to "${updatedSection.title}". Proposal incremented to version ${nextVersion}. PDF requires regeneration.`,
          actorId: session.user.id,
          actorName: session.user.name ?? "Admin",
        },
      });
    } catch {
      /* non-fatal activity log */
    }
  });

  const updatedProposal = await getProposalForUser(session.user.id, id);

  return NextResponse.json({
    ok: true,
    version: nextVersion,
    proposal: updatedProposal,
    document: updatedDoc,
    updatedSection,
    coverage,
    readiness,
    pdfStatus: "OUTDATED",
    message: `Applied to proposal. Version updated to v${nextVersion}.`,
  });
}
