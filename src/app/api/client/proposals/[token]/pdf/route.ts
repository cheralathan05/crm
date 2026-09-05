import { NextResponse } from "next/server";
import { resolveProposalByToken } from "@/lib/proposal-delivery";
import { readStored } from "@/lib/uploads";
import { db } from "@/lib/db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateProposalPdf, buildProposalDocument } from "@/lib/proposal";
import { normalizeDoc, type ProposalDoc } from "@/lib/proposal-doc";
import { loadAnswers, loadFeatures } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/client/proposals/[token]/pdf — secure PDF access ──
   Only reachable with a valid, unrevoked, unexpired token.
   If the PDF file is missing or not yet generated, it dynamically
   generates from the authoritative database document and caches it. */

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveProposalByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, message: "This proposal link is no longer active." }, { status: 410 });
  }
  const { proposal } = resolved;

  const url = new URL(_req.url);
  const isDownload = url.searchParams.has("download") || url.searchParams.get("dl") === "1";
  const forceRefresh = url.searchParams.has("refresh") || isDownload;

  let pdfBytes: Buffer | null = null;

  // Try reading existing file if not explicitly refreshing or downloading
  if (proposal.pdfPath && !forceRefresh) {
    const stored = await readStored(proposal.pdfPath);
    if (stored) {
      pdfBytes = stored.buffer;
    }
  }

  // If file doesn't exist on disk, or refresh/download was requested, generate from database document
  if (!pdfBytes) {
    try {
      const [workspace, client, contact, request, requirementFeatures] = await Promise.all([
        db.workspace.findUnique({ where: { id: proposal.client.workspaceId }, include: { profile: true } }),
        db.client.findUnique({ where: { id: proposal.clientId } }),
        db.contact.findFirst({ where: { clientId: proposal.clientId, isPrimary: true } }),
        proposal.requirementRequestId ? db.requirementRequest.findUnique({ where: { id: proposal.requirementRequestId } }) : null,
        proposal.requirementRequestId ? loadFeatures(proposal.requirementRequestId) : Promise.resolve([]),
      ]);

      if (!client || !workspace) {
        return NextResponse.json({ ok: false, message: "Client or workspace context missing." }, { status: 404 });
      }

      let document: ProposalDoc;
      try {
        document = JSON.parse(proposal.document || "{}") as ProposalDoc;
      } catch {
        document = {
          version: proposal.version,
          meta: {
            reference: proposal.reference ?? "PROP",
            title: proposal.title,
            clientName: client.companyName,
            preparedBy: workspace.companyName,
            preparedFor: client.email ?? null,
            amount: proposal.amount,
            currency: proposal.currency,
            amountLabel: "To be confirmed",
            timelineLabel: "",
            date: proposal.createdAt.toISOString(),
          },
          sections: [],
        };
      }

      if (!document.sections || document.sections.length === 0) {
        const answers = request ? await loadAnswers(request.id) : {};
        document = buildProposalDocument({
          proposal,
          client,
          workspace,
          contact,
          answers,
          features: requirementFeatures,
        });
      }

      document = normalizeDoc(document);
      const result = await generateProposalPdf(document);
      pdfBytes = result.buffer;

      // Save to disk and update proposal
      const dir = path.join(process.cwd(), "uploads", "proposals");
      await mkdir(dir, { recursive: true });
      const fileName = `${proposal.id}-v${proposal.version}.pdf`;
      await writeFile(path.join(dir, fileName), pdfBytes);
      const pdfPath = `proposals/${fileName}`;

      await db.clientProposal.update({
        where: { id: proposal.id },
        data: { pdfPath, pdfPages: result.pages },
      });
    } catch (err) {
      console.error("[client:pdf] auto-generation failed", err);
      return NextResponse.json({ ok: false, message: "Could not generate proposal PDF." }, { status: 500 });
    }
  }

  const safeName = (proposal.reference ?? "proposal").replace(/[^A-Za-z0-9-]/g, "_");
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${safeName}-v${proposal.version}.pdf"`,
      "Content-Length": String(pdfBytes.length),
      "Cache-Control": isDownload || forceRefresh ? "no-cache, no-store, must-revalidate" : "private, max-age=300",
    },
  });
}
