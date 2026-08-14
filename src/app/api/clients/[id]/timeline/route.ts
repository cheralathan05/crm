import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientForUser } from "@/lib/clients";
import { formatRelative } from "@/lib/clients";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const client = await getClientForUser(session.user.id, id);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") ?? "all";

  // The timeline is built from real business events across the client's records.
  const [activities, requirements, proposals, projects, tasks, messages, payments, documents, notes, audit] =
    await Promise.all([
      db.clientActivity.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" }, take: 60 }),
      db.clientRequirement.findMany({ where: { clientId: id }, select: { id: true, title: true, status: true, submittedAt: true, approvedAt: true }, orderBy: { submittedAt: "desc" } }),
      db.clientProposal.findMany({ where: { clientId: id }, select: { id: true, title: true, status: true, sentAt: true, viewedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
      db.clientProject.findMany({ where: { clientId: id }, select: { id: true, name: true, stage: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
      db.clientTask.findMany({ where: { clientId: id }, select: { id: true, title: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 40 }),
      db.clientMessage.findMany({ where: { clientId: id }, select: { id: true, channel: true, subject: true, direction: true, at: true }, orderBy: { at: "desc" }, take: 40 }),
      db.clientPayment.findMany({ where: { clientId: id }, select: { id: true, label: true, amount: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 40 }),
      db.clientDocument.findMany({ where: { clientId: id }, select: { id: true, name: true, category: true, uploadedByName: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 40 }),
      db.clientNote.findMany({ where: { clientId: id }, select: { id: true, content: true, authorName: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.clientAuditEvent.findMany({ where: { clientId: id }, select: { id: true, entity: true, action: true, actorName: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 60 }),
    ]);

  type Event = {
    id: string;
    at: Date;
    label: string;
    group: string;
    actor: string;
    kind: "activity" | "requirement" | "proposal" | "project" | "task" | "message" | "payment" | "document" | "system" | "client";
  };

  const events: Event[] = [];

  for (const a of activities) {
    events.push({ id: `a-${a.id}`, at: a.createdAt, label: a.title, group: "Activity", actor: a.actorName ?? "System", kind: "activity" });
  }
  for (const r of requirements) {
    const at = r.approvedAt ?? r.submittedAt;
    events.push({ id: `r-${r.id}`, at, label: r.status === "APPROVED" ? `Requirement approved — ${r.title}` : `Requirement submitted — ${r.title}`, group: "Requirements", actor: "Client", kind: "requirement" });
  }
  for (const p of proposals) {
    if (p.sentAt) events.push({ id: `p-sent-${p.id}`, at: p.sentAt, label: `Proposal sent — ${p.title}`, group: "Proposals", actor: "You", kind: "proposal" });
    if (p.viewedAt) events.push({ id: `p-view-${p.id}`, at: p.viewedAt, label: `Proposal viewed — ${p.title}`, group: "Proposals", actor: "Client", kind: "proposal" });
    if (!p.sentAt && !p.viewedAt) events.push({ id: `p-${p.id}`, at: p.createdAt, label: `Proposal created — ${p.title}`, group: "Proposals", actor: "You", kind: "proposal" });
  }
  for (const pr of projects) {
    events.push({ id: `pr-${pr.id}`, at: pr.createdAt, label: `Project created — ${pr.name}`, group: "Projects", actor: "You", kind: "project" });
  }
  for (const t of tasks) {
    events.push({ id: `t-${t.id}`, at: t.createdAt, label: t.status === "DONE" ? `Task completed — ${t.title}` : `Task created — ${t.title}`, group: "Tasks", actor: "You", kind: "task" });
  }
  for (const m of messages) {
    // Inbound messages come from the client — they power the "Client" filter.
    const fromClient = m.direction === "IN";
    events.push({
      id: `m-${m.id}`,
      at: m.at,
      label: `${m.subject}`,
      group: "Messages",
      actor: fromClient ? "Client" : m.channel,
      kind: fromClient ? "client" : "message",
    });
  }
  for (const pay of payments) {
    events.push({ id: `pay-${pay.id}`, at: pay.createdAt, label: `Payment ${pay.status.toLowerCase()} — ₹${pay.amount.toLocaleString("en-IN")}${pay.label ? ` (${pay.label})` : ""}`, group: "Payments", actor: "You", kind: "payment" });
  }
  for (const d of documents) {
    events.push({ id: `d-${d.id}`, at: d.createdAt, label: `Document uploaded — ${d.name}`, group: "Documents", actor: d.uploadedByName ?? "You", kind: "document" });
  }
  for (const n of notes) {
    events.push({ id: `n-${n.id}`, at: n.createdAt, label: `Note — ${n.content.slice(0, 70)}${n.content.length > 70 ? "…" : ""}`, group: "Notes", actor: n.authorName ?? "You", kind: "system" });
  }
  for (const au of audit) {
    events.push({ id: `aud-${au.id}`, at: au.createdAt, label: `${au.action.replace(/_/g, " ").toLowerCase()} (${au.entity.toLowerCase()})`, group: "System", actor: au.actorName ?? "System", kind: "system" });
  }

  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  const filtered = filter === "all" ? events : events.filter((e) => e.kind === filter);

  return NextResponse.json({
    ok: true,
    filter,
    events: filtered.slice(0, 80).map((e) => ({
      id: e.id,
      label: e.label,
      group: e.group,
      actor: e.actor,
      kind: e.kind,
      atLabel: formatRelative(e.at),
    })),
  });
}
