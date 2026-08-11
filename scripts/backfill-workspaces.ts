/**
 * One-time backfill for the Workspace Creation Engine.
 *
 * - Ensures every user has an Onboarding row.
 * - Users who already created a workspace (old single-step flow) are marked
 *   workspaceSetupComplete so they go straight to /dashboard.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

async function main() {
  const users = await db.user.findMany({
    select: { id: true },
  });

  let created = 0;
  let completed = 0;

  for (const user of users) {
    const onboarding = await db.onboarding.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    if (onboarding.workspaceSetupComplete) {
      continue;
    }

    const workspace = await db.workspace.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (workspace) {
      await db.onboarding.update({
        where: { userId: user.id },
        data: {
          workspaceSetupComplete: true,
          workspaceSetupCompletedAt: new Date(),
        },
      });
      completed++;
    } else {
      created++;
    }
  }

  console.log(
    `backfill done — ${created} users in setup, ${completed} existing workspaces marked complete (${users.length} total users)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
