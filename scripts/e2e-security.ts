/**
 * Security E2E for the requirement workspace:
 *   - invalid token → null
 *   - revoked token → REVOKED
 *   - expired token → EXPIRED
 *   - valid token resolves
 *   - cross-workspace admin access is blocked
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveRequestByToken, getRequirementForUser, issueToken } from "../src/lib/requirements";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const req = await db.requirementRequest.findFirst({
    where: { title: "E-Commerce Platform" },
  });
  if (!req) {
    console.log("No request found.");
    return;
  }

  // 1. Garbage token
  const garbage = await resolveRequestByToken("definitely-not-a-real-token");
  check("garbage token → null", garbage === null);

  // 2. Valid token (regenerate a fresh one so we control it)
  const fresh = issueToken();
  await db.requirementRequest.update({
    where: { id: req.id },
    data: {
      tokenHash: fresh.tokenHash,
      tokenExpiresAt: fresh.expiresAt,
      tokenRevokedAt: null,
      tokenRevokedReason: null,
    },
  });
  const valid = await resolveRequestByToken(fresh.token);
  check("valid token resolves", valid !== null && valid.error === null, valid?.error ?? "null");

  // 3. Revoked token
  await db.requirementRequest.update({
    where: { id: req.id },
    data: { tokenRevokedAt: new Date(), tokenRevokedReason: "Test revocation" },
  });
  const revoked = await resolveRequestByToken(fresh.token);
  check("revoked token → REVOKED", revoked?.error === "REVOKED", revoked?.error ?? "null");
  check("revoked reason surfaced", revoked?.errorLabel === "Test revocation", revoked?.errorLabel ?? "null");

  // 4. Expired token
  await db.requirementRequest.update({
    where: { id: req.id },
    data: {
      tokenRevokedAt: null,
      tokenRevokedReason: null,
      tokenExpiresAt: new Date(Date.now() - 1000),
    },
  });
  const expired = await resolveRequestByToken(fresh.token);
  check("expired token → EXPIRED", expired?.error === "EXPIRED", expired?.error ?? "null");

  // 5. Restore a valid token for the request
  const restored = issueToken();
  await db.requirementRequest.update({
    where: { id: req.id },
    data: { tokenHash: restored.tokenHash, tokenExpiresAt: restored.expiresAt, tokenRevokedAt: null, tokenRevokedReason: null },
  });
  check("restored token valid", (await resolveRequestByToken(restored.token))?.error === null);

  // 6. Workspace isolation — a user without this workspace must not see the request
  const owner = await db.user.findUnique({ where: { email: "sidebar.test@example.com" } });
  const otherUser = await db.user.create({
    data: {
      name: "Isolation Tester",
      companyName: "Other Corp",
      email: `iso-${Date.now()}@example.com`,
      passwordHash: "$2b$10$abcdefghijklmnopqrstuv", // never used
      emailVerified: new Date(),
    },
  });
  await db.workspace.create({ data: { ownerId: otherUser.id, companyName: "Other Corp" } });
  const leak = await getRequirementForUser(otherUser.id, req.id);
  check("cross-workspace access blocked", leak === null);
  const own = await getRequirementForUser(owner!.id, req.id);
  check("own-workspace access allowed", own !== null);

  // cleanup the isolation user
  await db.workspace.deleteMany({ where: { ownerId: otherUser.id } });
  await db.user.delete({ where: { id: otherUser.id } });

  console.log(failures === 0 ? "\nALL SECURITY CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
