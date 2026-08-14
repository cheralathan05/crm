/**
 * Seeds one E-commerce requirement request for the demo client
 * (ABC Technologies) and prints the secure client link.
 *
 * Usage: npx tsx scripts/seed-requirement-demo.ts
 *        (optionally: EMAIL=sidebar.test@example.com to pick the owner)
 *
 * The token is generated here exactly like the API does: random bytes,
 * stored as a SHA-256 hash, raw value only printed for the link.
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const link = (token: string) => `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/client-requirement/${token}`;

async function main() {
  const email = process.env.EMAIL ?? "sidebar.test@example.com";
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found for ${email}. Create one first (npm run dev + signup).`);
    process.exit(1);
  }
  const workspace = await db.workspace.findUnique({ where: { ownerId: user.id } });
  if (!workspace) {
    console.error("No workspace found for this user.");
    process.exit(1);
  }

  let client = await db.client.findFirst({
    where: { workspaceId: workspace.id, companyName: "ABC Technologies" },
  });
  if (!client) {
    client = await db.client.create({
      data: {
        workspaceId: workspace.id,
        companyName: "ABC Technologies",
        industry: "Technology",
        email: "accounts@abctech.example.com",
        status: "ACTIVE",
        ownerId: user.id,
        ownerName: user.name ?? "Owner",
      },
    });
    console.log("Created demo client ABC Technologies.");
  }

  const count = await db.requirementRequest.count({ where: { workspaceId: workspace.id } });
  const reference = `REQ-${String(count + 1).padStart(6, "0")}`;

  const existing = await db.requirementRequest.findFirst({
    where: { workspaceId: workspace.id, title: "E-Commerce Platform" },
  });
  if (existing) {
    console.log(`A request already exists: ${existing.reference}`);
    console.log(`Open the client workspace in the app: /clients/${client.id}`);
    console.log("(To test the client flow, revoke/regenerate its link, or create a new request.)");
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const request = await db.requirementRequest.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      reference,
      title: "E-Commerce Platform",
      projectType: "ECOMMERCE",
      status: "DRAFT",
      tokenHash: hashToken(token),
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdById: user.id,
      createdByName: user.name ?? "Owner",
    },
  });

  await db.requirementEvent.create({
    data: {
      requestId: request.id,
      type: "REQUEST_CREATED",
      label: "Requirement request created",
      detail: "E-Commerce Platform",
    },
  });

  console.log(`\nCreated requirement request ${reference} for ${client.companyName}.`);
  console.log(`Client workspace (admin): /clients/${client.id}`);
  console.log(`\nSECURE CLIENT LINK:\n${link(token)}\n`);
  console.log("Walk the client flow in an incognito window, then review it in the");
  console.log("Requirement Command Center on the client's page (or /requirements).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
