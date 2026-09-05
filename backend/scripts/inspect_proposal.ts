import { db } from "../src/lib/db";

async function main() {
  const proposal = await db.clientProposal.findFirst({
    where: { reference: "PROP-2026-001" },
  });
  console.log("Proposal:", proposal?.title, "Reference:", proposal?.reference);
  console.log("Document JSON:", JSON.stringify(proposal?.document, null, 2));
}
main().catch(console.error);
