import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientForUser, recordAudit } from "@/lib/clients";

export const dynamic = "force-dynamic";

const RESOURCES = [
  "contacts", "activities", "requirements", "proposals", "projects",
  "tasks", "payments", "documents", "messages", "notes",
] as const;

type Resource = (typeof RESOURCES)[number];

type Ctx = { params: Promise<{ id: string; resource: string }> };

function isResource(r: string): r is Resource {
  return (RESOURCES as readonly string[]).includes(r);
}

/* ── POST /api/clients/[id]/[resource] — context-preserving create ──
   The client is resolved server-side from the session — the user never
   picks "which client?" and can never create for someone else's client. */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id, resource } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ ok: false, message: "Unknown resource." }, { status: 400 });
  }

  const client = await getClientForUser(session.user.id, id);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const actorName = session.user.name ?? "Owner";
  const actorId = session.user.id;

  const touch = () =>
    db.client.update({ where: { id: client.id }, data: { lastActivityAt: new Date() } });

  switch (resource) {
    case "contacts": {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ ok: false, message: "Contact name is required." }, { status: 400 });
      const contact = await db.contact.create({
        data: {
          clientId: client.id,
          name,
          role: body.role ? String(body.role) : null,
          email: body.email ? String(body.email) : null,
          phone: body.phone ? String(body.phone) : null,
          whatsapp: body.whatsapp ? String(body.whatsapp) : null,
          preferredChannel: body.preferredChannel ? String(body.preferredChannel) as never : "EMAIL",
          isPrimary: body.isPrimary === true,
        },
      });
      if (body.isPrimary === true) {
        await db.client.update({ where: { id: client.id }, data: { primaryContactId: contact.id } });
      }
      await recordAudit({ clientId: client.id, entity: "CONTACT", action: "CONTACT_ADDED", entityId: contact.id, actorId, actorName, after: { name } });
      await touch();
      return NextResponse.json({ ok: true, id: contact.id }, { status: 201 });
    }

    case "activities": {
      const title = String(body.title ?? "").trim();
      if (!title) return NextResponse.json({ ok: false, message: "Activity title is required." }, { status: 400 });
      const activity = await db.clientActivity.create({
        data: {
          clientId: client.id,
          type: String(body.type ?? "NOTE") as never,
          title,
          note: body.note ? String(body.note) : null,
          actorId,
          actorName,
          dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
        },
      });
      await recordAudit({ clientId: client.id, entity: "ACTIVITY", action: "ACTIVITY_ADDED", entityId: activity.id, actorId, actorName, after: { title, type: activity.type } });
      await touch();
      return NextResponse.json({ ok: true, id: activity.id }, { status: 201 });
    }

    case "requirements": {
      const title = String(body.title ?? "").trim();
      if (!title) return NextResponse.json({ ok: false, message: "Requirement title is required." }, { status: 400 });
      const req = await db.clientRequirement.create({
        data: {
          clientId: client.id,
          title,
          description: body.description ? String(body.description) : null,
          status: "SUBMITTED",
          priority: String(body.priority ?? "MEDIUM") as never,
          questionCount: Number(body.questionCount ?? 0),
          answeredCount: Number(body.answeredCount ?? 0),
          reviewerId: actorId,
          reviewerName: actorName,
        },
      });
      await recordAudit({ clientId: client.id, entity: "REQUIREMENT", action: "REQUIREMENT_CREATED", entityId: req.id, actorId, actorName, after: { title } });
      await touch();
      return NextResponse.json({ ok: true, id: req.id }, { status: 201 });
    }

    case "proposals": {
      const title = String(body.title ?? "").trim();
      if (!title) return NextResponse.json({ ok: false, message: "Proposal title is required." }, { status: 400 });
      const proposal = await db.clientProposal.create({
        data: {
          clientId: client.id,
          title,
          amount: body.amount !== undefined ? Number(body.amount) : null,
          status: String(body.status ?? "DRAFT") as never,
          validUntil: body.validUntil ? new Date(String(body.validUntil)) : null,
        },
      });
      const action = proposal.status === "SENT" ? "PROPOSAL_SENT" : "PROPOSAL_CREATED";
      await recordAudit({ clientId: client.id, entity: "PROPOSAL", action: action as never, entityId: proposal.id, actorId, actorName, after: { title, status: proposal.status } });
      await touch();
      return NextResponse.json({ ok: true, id: proposal.id }, { status: 201 });
    }

    case "projects": {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ ok: false, message: "Project name is required." }, { status: 400 });
      const project = await db.clientProject.create({
        data: {
          clientId: client.id,
          name,
          stage: String(body.stage ?? "PLANNING") as never,
          progress: Number(body.progress ?? 0),
          deadline: body.deadline ? new Date(String(body.deadline)) : null,
          startedAt: body.startedAt ? new Date(String(body.startedAt)) : new Date(),
        },
      });
      await recordAudit({ clientId: client.id, entity: "PROJECT", action: "PROJECT_CREATED", entityId: project.id, actorId, actorName, after: { name } });
      await touch();
      return NextResponse.json({ ok: true, id: project.id }, { status: 201 });
    }

    case "tasks": {
      const title = String(body.title ?? "").trim();
      if (!title) return NextResponse.json({ ok: false, message: "Task title is required." }, { status: 400 });
      const task = await db.clientTask.create({
        data: {
          clientId: client.id,
          projectId: body.projectId ? String(body.projectId) : null,
          title,
          status: String(body.status ?? "TODO") as never,
          priority: String(body.priority ?? "MEDIUM") as never,
          teamRole: body.teamRole ? String(body.teamRole) : null,
          assigneeName: body.assigneeName ? String(body.assigneeName) : null,
          dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
        },
      });
      await recordAudit({ clientId: client.id, entity: "TASK", action: "TASK_ASSIGNED", entityId: task.id, actorId, actorName, after: { title, status: task.status } });
      await touch();
      return NextResponse.json({ ok: true, id: task.id }, { status: 201 });
    }

    case "payments": {
      const amount = Number(body.amount ?? 0);
      if (!(amount > 0)) return NextResponse.json({ ok: false, message: "Amount is required." }, { status: 400 });
      const payment = await db.clientPayment.create({
        data: {
          clientId: client.id,
          type: String(body.type ?? "INVOICE") as never,
          label: body.label ? String(body.label) : null,
          amount,
          status: String(body.status ?? "PENDING") as never,
          invoiceNumber: body.invoiceNumber ? String(body.invoiceNumber) : null,
          dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
          paidAt: body.paidAt ? new Date(String(body.paidAt)) : null,
        },
      });
      await recordAudit({ clientId: client.id, entity: "PAYMENT", action: "PAYMENT_UPDATED", entityId: payment.id, actorId, actorName, after: { amount, status: payment.status } });
      await touch();
      return NextResponse.json({ ok: true, id: payment.id }, { status: 201 });
    }

    case "documents": {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ ok: false, message: "Document name is required." }, { status: 400 });
      const doc = await db.clientDocument.create({
        data: {
          clientId: client.id,
          category: String(body.category ?? "PROJECT_FILE") as never,
          name,
          url: body.url ? String(body.url) : null,
          size: body.size !== undefined ? Number(body.size) : 0,
          uploadedByName: actorName,
        },
      });
      await recordAudit({ clientId: client.id, entity: "DOCUMENT", action: "DOCUMENT_UPLOADED", entityId: doc.id, actorId, actorName, after: { name } });
      await touch();
      return NextResponse.json({ ok: true, id: doc.id }, { status: 201 });
    }

    case "messages": {
      const subject = String(body.subject ?? "").trim();
      if (!subject) return NextResponse.json({ ok: false, message: "Message subject is required." }, { status: 400 });
      const message = await db.clientMessage.create({
        data: {
          clientId: client.id,
          channel: String(body.channel ?? "EMAIL") as never,
          subject,
          body: body.body ? String(body.body) : null,
          direction: String(body.direction ?? "IN"),
          fromName: body.fromName ? String(body.fromName) : actorName,
        },
      });
      await recordAudit({ clientId: client.id, entity: "MESSAGE", action: "MESSAGE_ADDED", entityId: message.id, actorId, actorName, after: { subject } });
      await touch();
      return NextResponse.json({ ok: true, id: message.id }, { status: 201 });
    }

    case "notes": {
      const content = String(body.content ?? "").trim();
      if (!content) return NextResponse.json({ ok: false, message: "Note is required." }, { status: 400 });
      const note = await db.clientNote.create({
        data: { clientId: client.id, content, authorId: actorId, authorName: actorName },
      });
      await recordAudit({ clientId: client.id, entity: "NOTE", action: "NOTE_ADDED", entityId: note.id, actorId, actorName, after: { content: content.slice(0, 80) } });
      await touch();
      return NextResponse.json({ ok: true, id: note.id }, { status: 201 });
    }
  }
}

/* ── GET /api/clients/[id]/[resource] — lightweight lists ───── */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id, resource } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ ok: false, message: "Unknown resource." }, { status: 400 });
  }

  const client = await getClientForUser(session.user.id, id);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  const rows = await listResource(client.id, resource);
  return NextResponse.json({ ok: true, rows });
}

async function listResource(clientId: string, resource: Resource) {
  switch (resource) {
    case "contacts":
      return db.contact.findMany({ where: { clientId }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });
    case "activities":
      return db.clientActivity.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 40 });
    case "requirements":
      return db.clientRequirement.findMany({ where: { clientId }, orderBy: { submittedAt: "desc" } });
    case "proposals":
      return db.clientProposal.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
    case "projects":
      return db.clientProject.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
    case "tasks":
      return db.clientTask.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 50 });
    case "payments":
      return db.clientPayment.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
    case "documents":
      return db.clientDocument.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
    case "messages":
      return db.clientMessage.findMany({ where: { clientId }, orderBy: { at: "desc" }, take: 50 });
    case "notes":
      return db.clientNote.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 50 });
  }
}
