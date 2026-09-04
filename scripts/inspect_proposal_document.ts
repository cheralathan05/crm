import { db } from "../src/lib/db";

async function main() {
  const proposal = await db.clientProposal.findFirst({
    where: { reference: "PROP-2026-001" },
    select: {
      id: true,
      title: true,
      reference: true,
      amount: true,
      document: true,
    },
  });

  if (!proposal) {
    console.log("Proposal not found.");
    return;
  }

  console.log("Proposal Title:", proposal.title);
  try {
    const doc = JSON.parse(proposal.document || "{}");
    console.log("Proposal Meta:", doc.meta);
    console.log("Sections count:", doc.sections?.length);
    (doc.sections || []).forEach((s: any, idx: number) => {
      console.log(`\n--- Section ${idx + 1}: ${s.title} ---`);
      (s.blocks || []).forEach((b: any, bIdx: number) => {
        console.log(`  Block ${bIdx + 1} [${b.type}]:`, b.title || b.name || b.heading || b.type);
        if (b.type === "feature_card") {
          console.log(`    Feature: ${b.title}, Scope: ${b.scope || b.purpose}`);
        }
      });
    });
  } catch (e) {
    console.error("Error parsing document:", e);
  }
}

main().finally(() => db.$disconnect());
