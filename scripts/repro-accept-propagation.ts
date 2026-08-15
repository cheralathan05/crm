/**
 * Reproduction of the ACCEPT propagation bug: admin accepts a clarification
 * answer, the question becomes RESOLVED, but the requirement item stays
 * ACTION_REQUIRED and the next action is stale ("Gather missing information").
 *
 * Trace: question (Users) → client answers → admin accepts → check DB and the
 * derived intel state. Usage: npx tsx scripts/repro-accept-propagation.ts
 *
 * Also asserts the multi-question rule (spec 28): accepting one question in a
 * section must NOT confirm other unresolved questions in that same section.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  createRequirementRequest,
  saveSectionAnswer,
  serializeAdminRequest,
} from "../src/lib/requirements";
import {
  createClarificationQuestion,
  approveClarification,
  answerClarification,
  reviewClarificationAnswer,
} from "../src/lib/questions";
import type { RequirementRequest } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

async function main() {
  const owner = await db.user.findFirst();
  if (!owner) return console.log("No user found.");
  const workspace = await db.workspace.findUnique({ where: { ownerId: owner.id } });
  if (!workspace) return console.log("No workspace found.");

  const client = await db.client.create({
    data: {
      workspaceId: workspace.id,
      companyName: "Repro Client",
      industry: "Technology",
      email: "repro@example.com",
      status: "ACTIVE",
      ownerId: owner.id,
      ownerName: owner.name ?? "Owner",
    },
  });

  try {
    const created = await createRequirementRequest({
      workspaceId: workspace.id,
      clientId: client.id,
      title: "Repro Requirement",
      projectType: "ECOMMERCE",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    const request = created.request as RequirementRequest;

    // Partially complete: business/scope/timeline/commercial/design done.
    await saveSectionAnswer({ request, section: "business", data: { description: "Sells plants." }, recordEvent: false });
    await saveSectionAnswer({ request, section: "scope", data: { included: ["Storefront"] }, recordEvent: false });
    await saveSectionAnswer({ request, section: "timeline", data: { launchWindow: "1–3 months" }, recordEvent: false });
    await saveSectionAnswer({ request, section: "commercial", data: { budgetModel: "Fixed price" }, recordEvent: false });
    await saveSectionAnswer({ request, section: "design", data: { hasBranding: "Yes" }, recordEvent: false });

    // ── Admin asks about Users (question 1 of 2 in the section) ──
    const { created: q1, token } = await createClarificationQuestion({
      request,
      client,
      section: "users",
      question: "Could you confirm what you expect for customer — specifically what should be included and how it should work?",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    if (!q1 || !token) return console.log("question not created (duplicate?)");

    // Question 2 in the same section — must remain open after q1 is accepted.
    // Created directly (not via the engine) because the engine blocks a second
    // open question on the same section; the model requires token fields.
    const q2 = await db.requirementQuestion.create({
      data: {
        workspaceId: workspace.id,
        clientId: client.id,
        requirementId: request.id,
        section: "users",
        question: "Which user roles are needed?",
        clientQuestion: "Which user roles are needed?",
        category: "USERS",
        answerType: "LONG_TEXT",
        priority: "HIGH",
        isBlocking: true,
        status: "SENT",
        sentAt: new Date(),
        recipientName: client.companyName ?? "Repro Client",
        recipientEmail: client.email ?? "repro@example.com",
        createdById: owner.id,
        createdByName: owner.name ?? "Owner",
        tokenHash: `repro-q2-${q1.id}`,
      },
    });

    await db.requirementQuestion.update({ where: { id: q1.id }, data: { answerType: "LONG_TEXT" } });
    await approveClarification({ question: q1, actorId: owner.id, actorName: owner.name ?? "Owner" });
    await db.requirementQuestion.update({ where: { id: q1.id }, data: { status: "SENT" } });

    // ── Client answers q1 ──
    await answerClarification({
      question: await db.requirementQuestion.findUniqueOrThrow({ where: { id: q1.id } }),
      response: "We expect a customer portal where users can track orders and raise tickets.",
      respondedByName: "Repro Client",
    });

    // ── Admin accepts the answer ──
    const answered = await db.requirementQuestion.findUnique({ where: { id: q1.id } });
    const result = await reviewClarificationAnswer({
      question: answered!,
      decision: "accept",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    console.log("after accept: question status =", result.question.status, "| proposal status =", result.proposal.status);

    // ── Check the DB: did the section answer / request state change? ──
    const sectionAnswer = await db.requirementAnswer.findUnique({
      where: { requestId_section: { requestId: request.id, section: "users" } },
    });
    console.log("users RequirementAnswer row exists:", Boolean(sectionAnswer), "| data:", sectionAnswer?.data ?? "NONE");

    const fresh = await db.requirementRequest.findUnique({ where: { id: request.id } });
    console.log("request readiness:", fresh?.readiness, "| completeness:", fresh?.completeness);

    // ── The admin bundle / intel the UI actually renders ──
    const bundle = await serializeAdminRequest(fresh!);
    console.log("states.users:", bundle.states.users);
    const usersItem = bundle.intel.required.find((i) => i.section === "users");
    console.log("intel users item:", JSON.stringify(usersItem));

    // ── Assertions ──
    const q1State = await db.requirementQuestion.findUnique({ where: { id: q1.id } });
    const q2State = await db.requirementQuestion.findUnique({ where: { id: q2.id } });

    let failures = 0;
    const check = (label: string, cond: boolean) => {
      console.log(`${cond ? "✓" : "✗"} ${label}`);
      if (!cond) failures++;
    };

    check("q1 is RESOLVED", q1State?.status === "RESOLVED");
    check("accepted answer stored on the requirement", Boolean(sectionAnswer?.data?.includes("customer portal")));
    check("stored readiness recomputed (users now counted)", (fresh?.readiness ?? 0) > 0 && fresh?.readiness !== 0);
    check("users item is WAITING (not ACTION_REQUIRED) while q2 open", usersItem?.status === "WAITING");
    check("users not in blockers", !bundle.intel.blockers.some((b) => b.section === "users"));
    check("next action is not 'Gather missing information: Users'", !bundle.intel.nextAction.text.includes("Gather missing information: Users"));
    check("q2 in same section stays open (spec 28)", q2State?.status === "SENT");
    check("section not fully confirmed while q2 open (spec 29)", bundle.states.users === false);
    check("users shows in waiting-for-client via q2, not as incomplete blocker",
      bundle.intel.waitingOnClient.some((w) => w.section === "Users"));

    // ── Accept q2 too → the section must now fully confirm ──
    await answerClarification({
      question: q2,
      response: "Admin and customer service roles, plus read-only reporting.",
      respondedByName: "Repro Client",
    });
    const q2answered = await db.requirementQuestion.findUnique({ where: { id: q2.id } });
    await reviewClarificationAnswer({
      question: q2answered!,
      decision: "accept",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });

    const fresh2 = await db.requirementRequest.findUniqueOrThrow({ where: { id: request.id } });
    console.log("final request readiness:", fresh2.readiness, "| completeness:", fresh2.completeness);
    const bundle2 = await serializeAdminRequest(fresh2);
    const usersItem2 = bundle2.intel.required.find((i) => i.section === "users");
    check("after accepting q2: users item CONFIRMED", usersItem2?.status === "CONFIRMED");
    check("after accepting q2: users section confirmed (states.users)", bundle2.states.users === true);
    check("after accepting q2: users not in blockers", !bundle2.intel.blockers.some((b) => b.section === "users"));
    check("after accepting q2: nothing waiting on users", !bundle2.intel.waitingOnClient.some((w) => w.section === "Users"));

    console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  } finally {
    await db.client.delete({ where: { id: client.id } }).catch(() => undefined);
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
