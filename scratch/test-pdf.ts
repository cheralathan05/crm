import { db } from "../frontend/src/lib/db";
import { getProposalForUser, serializeProposalForStudio, generateProposalPdf } from "../frontend/src/lib/proposal";
import { getWorkspaceForUser } from "../frontend/src/lib/clients";

async function main() {
  const proposals = await db.clientProposal.findMany();
  console.log("Proposals count:", proposals.length);
  for (const p of proposals) {
    console.log("Testing proposal:", p.id, p.title);
    const bundle = await serializeProposalForStudio(p);
    console.log("Serialized ok. Attempting PDF generation...");
    try {
      const pdf = await generateProposalPdf(bundle.document);
      console.log(`PDF generated ok! Pages: ${pdf.pages}, bytes: ${pdf.buffer.length}`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
