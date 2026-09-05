import { db } from "../src/lib/db";

async function main() {
  const proposal = await db.clientProposal.findFirst({
    where: { reference: "PROP-2026-001" },
  });
  const doc = proposal?.document as any;
  for (const s of doc.sections || []) {
    if (["07", "08", "09", "10", "11", "12", "13", "14", "15"].includes(s.number)) {
      console.log(`=== SECTION ${s.number}: ${s.title} (${s.kicker}) ===`);
      for (const b of s.blocks || []) {
        if (b.type === "paragraph" || b.type === "callout") {
          console.log(`[${b.type}] ${b.title || ""} - ${b.text || ""}`);
        } else if (b.type === "scope_matrix" || b.type === "scope_item") {
          console.log(`[SCOPE]`, b);
        } else if (b.type === "architecture_layer") {
          console.log(`[ARCH] ${b.name}: ${b.technologies?.join(", ")} - ${b.responsibilities?.join("; ")}`);
        } else if (b.type === "deliverable_card") {
          console.log(`[DELIVERABLE] ${b.title}: ${b.description}`);
        } else {
          console.log(`[${b.type}]`, JSON.stringify(b).slice(0, 150));
        }
      }
    }
  }
}
main().catch(console.error);
