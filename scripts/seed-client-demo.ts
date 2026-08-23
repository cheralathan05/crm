/**
 * Seeds one realistic demo client — ABC Technologies — with a full
 * relationship graph (contacts, requirements, proposal, project, tasks,
 * payments, documents, messages, notes, audit). All rows are real Prisma
 * records in the authenticated workspace, exactly like UI-created data.
 *
 * Usage: npx tsx scripts/seed-client-demo.ts
 *        (optionally: EMAIL=sidebar.test@example.com to pick the owner)
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

async function main() {
  const email = process.env.EMAIL ?? "sidebar.test@example.com";
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found for ${email}. Create one first (npm run dev + signup).`);
    process.exit(1);
  }

  let workspace = await db.workspace.findUnique({ where: { ownerId: user.id } });
  if (!workspace) {
    workspace = await db.workspace.create({ data: { ownerId: user.id, companyName: "ABC Technologies" } });
  }

  const existing = await db.client.findFirst({ where: { workspaceId: workspace.id, companyName: "ABC Technologies" } });
  if (existing) {
    console.log("Demo client already exists — skipping.");
    return;
  }

  const client = await db.client.create({
    data: {
      workspaceId: workspace.id,
      companyName: "ABC Technologies",
      industry: "Technology",
      businessType: "B2B",
      description: "E-commerce platform company — online retail and marketplace software.",
      website: "https://abctech.example.com",
      domain: "abctech.example.com",
      email: "accounts@abctech.example.com",
      phone: "+91 98200 11223",
      status: "ACTIVE",
      stage: "PROJECT",
      leadSource: "Website",
      leadScore: 78,
      ownerId: user.id,
      ownerName: user.name ?? "Owner",
      tags: JSON.stringify(["Enterprise", "E-commerce", "Retainer"]),
      customFields: JSON.stringify({
        "Customer Tier": "Enterprise",
        "Industry Segment": "Retail Tech",
        "Contract Type": "Project + Retainer",
        "Technology Stack": "React / Node.js",
        "Referral Source": "Referral",
      }),
      relationshipScore: 78,
      createdAt: daysAgo(30),
      lastActivityAt: daysAgo(2),
    },
  });

  const arun = await db.contact.create({
    data: {
      clientId: client.id,
      name: "Arun Kumar",
      role: "Founder",
      email: "arun@abctech.example.com",
      phone: "+91 98200 11223",
      whatsapp: "+91 98200 11223",
      preferredChannel: "WHATSAPP",
      isPrimary: true,
      createdAt: daysAgo(30),
    },
  });
  await db.contact.create({
    data: {
      clientId: client.id,
      name: "Priya Sharma",
      role: "Product Manager",
      email: "priya@abctech.example.com",
      phone: "+91 98110 33445",
      preferredChannel: "EMAIL",
      createdAt: daysAgo(28),
    },
  });
  await db.client.update({ where: { id: client.id }, data: { primaryContactId: arun.id } });

  await db.clientRequirement.create({
    data: {
      clientId: client.id,
      title: "E-Commerce Platform — Phase 1",
      description: "Online storefront with catalog, cart and payments.",
      status: "APPROVED",
      priority: "HIGH",
      questionCount: 12,
      answeredCount: 12,
      submittedAt: daysAgo(20),
      approvedAt: daysAgo(17),
    },
  });
  await db.clientRequirement.create({
    data: {
      clientId: client.id,
      title: "Payment Gateway Integration",
      description: "Razorpay + UPI integration with refund flows.",
      status: "UNDER_REVIEW",
      priority: "URGENT",
      questionCount: 8,
      answeredCount: 6,
      submittedAt: daysAgo(1),
    },
  });

  await db.clientProposal.create({
    data: {
      clientId: client.id,
      title: "E-Commerce Platform Proposal",
      amount: 250000,
      status: "APPROVED",
      sentAt: daysAgo(16),
      viewedAt: daysAgo(16),
      validUntil: daysAgo(9),
      createdAt: daysAgo(17),
    },
  });

  const project = await db.clientProject.create({
    data: {
      clientId: client.id,
      name: "E-Commerce Platform",
      stage: "DEVELOPMENT",
      health: "ON_TRACK",
      progress: 62,
      deadline: daysAgo(-12),
      startedAt: daysAgo(14),
      createdAt: daysAgo(14),
    },
  });

  const tasks = [
    { title: "Set up storefront scaffolding", status: "DONE", priority: "HIGH", teamRole: "Frontend", dueAt: daysAgo(-10), completedAt: daysAgo(-9), assigneeName: "Rahul" },
    { title: "Catalog data model", status: "DONE", priority: "HIGH", teamRole: "Backend", dueAt: daysAgo(-9), completedAt: daysAgo(-8), assigneeName: "Sneha" },
    { title: "Cart and checkout UI", status: "DONE", priority: "HIGH", teamRole: "Frontend", dueAt: daysAgo(-7), completedAt: daysAgo(-6), assigneeName: "Rahul" },
    { title: "Admin dashboard", status: "IN_PROGRESS", priority: "MEDIUM", teamRole: "Frontend", dueAt: daysAgo(-3), assigneeName: "Rahul" },
    { title: "Order management API", status: "IN_PROGRESS", priority: "HIGH", teamRole: "Backend", dueAt: daysAgo(-2), assigneeName: "Sneha" },
    { title: "Payment gateway integration", status: "BLOCKED", priority: "URGENT", teamRole: "Backend", dueAt: daysAgo(-1), assigneeName: "Sneha" },
    { title: "Design review — checkout flow", status: "DONE", priority: "MEDIUM", teamRole: "Designer", dueAt: daysAgo(-5), completedAt: daysAgo(-4), assigneeName: "Meera" },
    { title: "Mobile responsive pass", status: "TODO", priority: "MEDIUM", teamRole: "Frontend", dueAt: daysAgo(3), assigneeName: "Rahul" },
    { title: "Performance audit", status: "TODO", priority: "LOW", teamRole: "QA", dueAt: daysAgo(6), assigneeName: "Vikram" },
  ];
  for (const t of tasks) {
    await db.clientTask.create({
      data: {
        clientId: client.id,
        projectId: project.id,
        title: t.title,
        status: t.status as never,
        priority: t.priority as never,
        teamRole: t.teamRole,
        dueAt: t.dueAt,
        completedAt: t.completedAt,
        assigneeName: t.assigneeName,
        createdAt: daysAgo(12),
      },
    });
  }

  await db.clientPayment.create({
    data: { clientId: client.id, type: "CONTRACT", label: "Contract value", amount: 250000, status: "PAID", dueAt: daysAgo(14), paidAt: daysAgo(12), createdAt: daysAgo(14) },
  });
  await db.clientPayment.create({
    data: { clientId: client.id, type: "INVOICE", label: "Milestone 2 — Development", amount: 100000, status: "PENDING", invoiceNumber: "INV-0024", dueAt: daysAgo(-12), createdAt: daysAgo(6) },
  });
  await db.clientPayment.create({
    data: { clientId: client.id, type: "MILESTONE", label: "Milestone 3 — Testing", amount: 50000, status: "PENDING", dueAt: daysAgo(-6), createdAt: daysAgo(5) },
  });

  const docs = [
    { category: "REQUIREMENT", name: "E-Commerce Requirements.pdf" },
    { category: "PROPOSAL", name: "E-Commerce Proposal v2.pdf" },
    { category: "CONTRACT", name: "Master Services Agreement.pdf" },
    { category: "INVOICE", name: "INV-0024 Development.pdf" },
    { category: "PROJECT_FILE", name: "Checkout Flow — Design Spec.pdf" },
    { category: "CLIENT_UPLOAD", name: "Brand Assets.zip" },
  ];
  for (const d of docs) {
    await db.clientDocument.create({
      data: {
        clientId: client.id,
        category: d.category as never,
        name: d.name,
        size: 500_000 + Math.floor(Math.random() * 4_000_000),
        uploadedByName: user.name ?? "Owner",
        createdAt: daysAgo(14),
      },
    });
  }

  const messages = [
    { channel: "EMAIL", subject: "Project timeline discussion", body: "We reviewed the timeline — development looks good.", direction: "OUT", at: daysAgo(4) },
    { channel: "WHATSAPP", subject: "Deadline check", body: "Can we move the deadline for the payment gateway?", direction: "IN", at: daysAgo(2) },
    { channel: "MEETING", subject: "Project kickoff", body: "Kickoff with Arun and Priya.", direction: "OUT", at: daysAgo(13) },
    { channel: "INTERNAL_NOTE", subject: "Client prefers weekly meetings", body: "Arun prefers a weekly Friday sync.", direction: "IN", at: daysAgo(12) },
  ];
  for (const m of messages) {
    await db.clientMessage.create({
      data: {
        clientId: client.id,
        channel: m.channel as never,
        subject: m.subject,
        body: m.body,
        direction: m.direction,
        at: m.at,
        fromName: m.direction === "IN" ? "Arun Kumar" : user.name ?? "Owner",
      },
    });
  }

  const notes = [
    { content: "Client requires weekly progress reports on Fridays.", createdAt: daysAgo(12) },
    { content: "Decision maker is Arun (Founder). Priya handles day-to-day.", createdAt: daysAgo(10) },
    { content: "Budget range ₹2L–₹3L per engagement. Prefers WhatsApp for quick questions.", createdAt: daysAgo(8) },
  ];
  for (const n of notes) {
    await db.clientNote.create({ data: { clientId: client.id, ...n, authorId: user.id, authorName: user.name ?? "Owner" } });
  }

  const activities = [
    { type: "NOTE", title: "Requirement review started — E-Commerce Platform", createdAt: daysAgo(17), note: "All 12 questions answered." },
    { type: "FOLLOW_UP", title: "Proposal discussion", createdAt: daysAgo(16), dueAt: daysAgo(-1), note: "Confirm budget and timeline." },
    { type: "MEETING", title: "Project kickoff", createdAt: daysAgo(14), note: "Team introduced, sprint plan shared." },
    { type: "CALL", title: "Payment gateway requirement call", createdAt: daysAgo(1), note: "Razorpay vs UPI — clarify refund flow." },
  ];
  for (const a of activities) {
    await db.clientActivity.create({
      data: {
        clientId: client.id,
        type: a.type as never,
        title: a.title,
        note: a.note,
        dueAt: a.dueAt,
        createdAt: a.createdAt,
        actorId: user.id,
        actorName: user.name ?? "Owner",
      },
    });
  }

  const audit = [
    { entity: "CLIENT", action: "CREATED", after: { companyName: "ABC Technologies" }, createdAt: daysAgo(30) },
    { entity: "CONTACT", action: "CONTACT_ADDED", after: { name: "Arun Kumar" }, createdAt: daysAgo(30) },
    { entity: "REQUIREMENT", action: "REQUIREMENT_CREATED", after: { title: "E-Commerce Platform - Phase 1" }, createdAt: daysAgo(20) },
    { entity: "REQUIREMENT", action: "STATUS_CHANGED", before: { status: "UNDER_REVIEW" }, after: { status: "APPROVED" }, createdAt: daysAgo(17) },
    { entity: "PROPOSAL", action: "PROPOSAL_SENT", after: { title: "E-Commerce Platform Proposal" }, createdAt: daysAgo(16) },
    { entity: "PROPOSAL", action: "PROPOSAL_APPROVED", after: { title: "E-Commerce Platform Proposal" }, createdAt: daysAgo(16) },
    { entity: "PROJECT", action: "PROJECT_CREATED", after: { name: "E-Commerce Platform" }, createdAt: daysAgo(14) },
    { entity: "TASK", action: "TASK_ASSIGNED", after: { title: "Payment gateway integration" }, createdAt: daysAgo(12) },
    { entity: "CLIENT", action: "STATUS_CHANGED", before: { status: "LEAD" }, after: { status: "ACTIVE" }, createdAt: daysAgo(14) },
    { entity: "PAYMENT", action: "PAYMENT_UPDATED", after: { amount: 250000, status: "PAID" }, createdAt: daysAgo(12) },
  ];
  for (const a of audit) {
    await db.clientAuditEvent.create({
      data: {
        clientId: client.id,
        entity: a.entity as never,
        action: a.action as never,
        before: JSON.stringify(a.before ?? {}),
        after: JSON.stringify(a.after ?? {}),
        createdAt: a.createdAt,
        actorId: user.id,
        actorName: user.name ?? "Owner",
      },
    });
  }

  console.log("Seeded demo client: ABC Technologies");
  console.log("  contacts: 2, requirements: 2, proposal: 1, project: 1, tasks: 9, payments: 3");
  console.log("  documents: 6, messages: 4, notes: 3, activities: 4, audit: 10");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
