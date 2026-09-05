/** Seed a fresh LEAD client (status LEAD, no records) for the E2E. */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

async function main() {
  const u = await db.user.findUnique({ where: { email: "sidebar.test@example.com" } });
  if (!u) return console.log("no user");
  const w = await db.workspace.findUnique({ where: { ownerId: u.id } });
  if (!w) return console.log("no workspace");

  const existing = await db.client.findFirst({
    where: { workspaceId: w.id, companyName: "Meridian Retail" },
  });
  if (existing) {
    console.log(`Lead exists: /clients/${existing.id}`);
    return;
  }

  const client = await db.client.create({
    data: {
      workspaceId: w.id,
      companyName: "Meridian Retail",
      industry: "Retail",
      businessType: "B2C",
      description: "Omnichannel retail chain planning a web storefront and loyalty programme.",
      website: "https://meridian.example.com",
      email: "hello@meridian.example.com",
      status: "LEAD",
      stage: "LEAD",
      ownerId: u.id,
      ownerName: u.name ?? "Owner",
    },
  });
  await db.contact.create({
    data: {
      clientId: client.id,
      name: "Priya Menon",
      role: "Head of Digital",
      email: "priya@meridian.example.com",
      isPrimary: true,
    },
  });
  await db.clientActivity.create({
    data: {
      clientId: client.id,
      type: "NOTE",
      title: "Intro call with Meridian — exploring a storefront build",
      actorId: u.id,
      actorName: u.name ?? "Owner",
    },
  });
  console.log(`Created LEAD: /clients/${client.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
