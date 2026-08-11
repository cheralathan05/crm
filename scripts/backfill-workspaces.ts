import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

// One-time backfill: existing users get a Workspace (from User.companyName)
// and an Onboarding row so the new post-auth flow works for everyone.
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

async function main() {
  const users = await db.user.findMany({
    select: { id: true, companyName: true },
  });

  let workspaces = 0;
  let onboarding = 0;

  for (const user of users) {
    const ws = await db.workspace.findUnique({ where: { ownerId: user.id } });
    if (!ws) {
      await db.workspace.create({
        data: { ownerId: user.id, companyName: user.companyName },
      });
      workspaces++;
    }
    const ob = await db.onboarding.findUnique({ where: { userId: user.id } });
    if (!ob) {
      await db.onboarding.create({ data: { userId: user.id } });
      onboarding++;
    }
  }

  console.log(`BACKFILL: users=${users.length} workspaces_created=${workspaces} onboarding_created=${onboarding}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
