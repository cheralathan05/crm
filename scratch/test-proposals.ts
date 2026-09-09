import { db } from "../frontend/src/lib/db";
import { getProposalForUser, serializeProposalForStudio } from "../frontend/src/lib/proposal";

async function main() {
  const users = await db.user.findMany();
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email })));
  
  const proposals = await db.clientProposal.findMany();
  console.log("Proposals count:", proposals.length);

  for (const user of users) {
    for (const prop of proposals) {
      const p = await getProposalForUser(user.id, prop.id);
      console.log(`User ${user.email} -> Proposal ${prop.id}: ${p ? "FOUND" : "NOT FOUND (NULL)"}`);
    }
  }

  if (proposals.length > 0) {
    try {
      const serialized = await serializeProposalForStudio(proposals[0]);
      console.log("Serialized proposal 0 ok! Sections:", serialized.document.sections.length);
    } catch (e: any) {
      console.error("Failed to serialize proposal 0:", e);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
