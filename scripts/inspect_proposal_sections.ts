import { db } from "../src/lib/db";

async function main() {
  const proposal = await db.clientProposal.findFirst({
    where: { reference: "PROP-2026-001" },
  });
  let doc = proposal?.document as any;
  if (typeof doc === "string") doc = JSON.parse(doc);

  for (const s of doc.sections || []) {
    if (["05", "07", "08", "09", "10", "14", "15"].includes(s.number)) {
      console.log(`\n============================================================`);
      console.log(`SECTION ${s.number}: ${s.title}`);
      console.log(`============================================================`);
      for (const b of s.blocks || []) {
        console.log(`--- Block type: ${b.type} (id: ${b.id}) ---`);
        console.log(JSON.stringify(b, null, 2));
      }
    }
  }
}
main().catch(console.error);
