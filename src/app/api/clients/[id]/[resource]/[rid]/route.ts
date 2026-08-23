import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientForUser, recordAudit, computeStage } from "@/lib/clients";

export const dynamic = "force-dynamic";

const RESOURCES = [
  "requirements", "proposals", "projects", "tasks", "payments",
] as const;

type Resource = (typeof RESOURCES)[number];

type Ctx = { params: Promise<{ id: string; resource: string; rid: string }> };

/* ── PATCH /api/clients/[id]/[resource]/[rid] — status transitions ──
   Review a requirement, send a proposal, move a project stage, change a
   task state, collect a payment. Every transition is audited and the
   client's stored lifecycle stage is kept in sync. */

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id, resource, rid } = await params;
  if (!(RESOURCES as readonly string[]).includes(resource)) {
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
  const status = body.status ? String(body.status) : undefined;

  /* Helper: keep the client's stored lifecycle stage truthful. */
  const syncStage = async () => {
    const [anyRequirements, approvedRequirements, anyProposals, approvedProposals, projects, completed] =
      await Promise.all([
        db.clientRequirement.count({ where: { clientId: client.id } }),
        db.clientRequirement.count({ where: { clientId: client.id, status: "APPROVED" } }),
        db.clientProposal.count({ where: { clientId: client.id } }),
        db.clientProposal.count({ where: { clientId: client.id, status: "APPROVED" } }),
        db.clientProject.count({ where: { clientId: client.id } }),
        db.clientProject.count({ where: { clientId: client.id, stage: "COMPLETED" } }),
      ]);
    const stage = computeStage({
      status: client.status,
      hasRequirements: anyRequirements > 0,
      hasApprovedRequirement: approvedRequirements > 0,
      hasProposal: anyProposals > 0,
      hasApprovedProposal: approvedProposals > 0,
      hasProject: projects > 0,
      projectCompleted: completed > 0,
    });
    if (stage !== client.stage) {
      await db.client.update({ where: { id: client.id }, data: { stage: stage as never, lastActivityAt: new Date() } });
    }
  };

  // AuditEntity is singular (REQUIREMENT, PROPOSAL, …) while the route
  // resource is plural — map explicitly so the enum value is always valid.
  const ENTITY: Record<Resource, string> = {
    requirements: "REQUIREMENT",
    proposals: "PROPOSAL",
    projects: "PROJECT",
    tasks: "TASK",
    payments: "PAYMENT",
  };

  // `before` always records the real previous status — never the target.
  const audit = (action: string, entityId: string, beforeStatus: string, after: unknown) =>
    recordAudit({
      clientId: client.id,
      entity: ENTITY[resource as Resource] as never,
      action,
      entityId,
      actorId,
      actorName,
      before: { status: beforeStatus },
      after,
    });

  switch (resource as Resource) {
    case "requirements": {
      const existing = await db.clientRequirement.findFirst({ where: { id: rid, clientId: client.id } });
      if (!existing) return NextResponse.json({ ok: false, message: "Requirement not found." }, { status: 404 });
      if (!status || !["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"].includes(status)) {
        return NextResponse.json({ ok: false, message: "Invalid requirement status." }, { status: 400 });
      }
      const updated = await db.clientRequirement.update({
        where: { id: rid },
        data: {
          status: status as never,
          reviewerId: actorId,
          reviewerName: actorName,
          approvedAt: status === "APPROVED" ? new Date() : existing.approvedAt,
        },
      });
      await audit("STATUS_CHANGED", rid, existing.status, { title: existing.title, status });
      await syncStage();
      await db.client.update({ where: { id: client.id }, data: { lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    case "proposals": {
      const existing = await db.clientProposal.findFirst({ where: { id: rid, clientId: client.id } });
      if (!existing) return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
      if (!status || !["DRAFT", "SENT", "VIEWED", "APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(status)) {
        return NextResponse.json({ ok: false, message: "Invalid proposal status." }, { status: 400 });
      }
      const updated = await db.clientProposal.update({
        where: { id: rid },
        data: {
          status: status as never,
          sentAt: status === "SENT" ? new Date() : existing.sentAt,
          viewedAt: status === "VIEWED" && !existing.viewedAt ? new Date() : existing.viewedAt,
        },
      });
      await audit(
        status === "SENT" ? "PROPOSAL_SENT" : status === "APPROVED" ? "PROPOSAL_APPROVED" : "STATUS_CHANGED",
        rid,
        existing.status,
        { title: existing.title, status },
      );
      await syncStage();
      await db.client.update({ where: { id: client.id }, data: { lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    case "projects": {
      const existing = await db.clientProject.findFirst({ where: { id: rid, clientId: client.id } });
      if (!existing) return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
      const data: Record<string, unknown> = {};
      if (status) {
        if (!["PLANNING", "DISCOVERY", "DESIGN", "DEVELOPMENT", "TESTING", "DELIVERY", "COMPLETED"].includes(status)) {
          return NextResponse.json({ ok: false, message: "Invalid project stage." }, { status: 400 });
        }
        data.stage = status;
        if (status === "COMPLETED") {
          data.completedAt = new Date();
          data.progress = 100;
        }
      }
      if (body.health !== undefined && ["ON_TRACK", "AT_RISK", "BLOCKED"].includes(String(body.health))) {
        data.health = String(body.health);
      }
      if (body.progress !== undefined) {
        data.progress = Math.min(100, Math.max(0, Number(body.progress)));
      }
      const updated = await db.clientProject.update({ where: { id: rid }, data });
      await audit("STATUS_CHANGED", rid, existing.stage, { name: existing.name, ...data });
      await syncStage();
      await db.client.update({ where: { id: client.id }, data: { lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, stage: updated.stage, health: updated.health, progress: updated.progress });
    }

    case "tasks": {
      const existing = await db.clientTask.findFirst({ where: { id: rid, clientId: client.id } });
      if (!existing) return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
      const data: Record<string, unknown> = {};
      if (status) {
        if (!["TODO", "IN_PROGRESS", "BLOCKED", "DONE"].includes(status)) {
          return NextResponse.json({ ok: false, message: "Invalid task status." }, { status: 400 });
        }
        data.status = status;
        data.completedAt = status === "DONE" ? new Date() : null;
      }
      if (body.priority !== undefined && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(String(body.priority))) {
        data.priority = String(body.priority);
      }
      const updated = await db.clientTask.update({ where: { id: rid }, data });
      await audit("STATUS_CHANGED", rid, existing.status, { title: existing.title, ...data });
      await db.client.update({ where: { id: client.id }, data: { lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    case "payments": {
      const existing = await db.clientPayment.findFirst({ where: { id: rid, clientId: client.id } });
      if (!existing) return NextResponse.json({ ok: false, message: "Payment not found." }, { status: 404 });
      if (!status || !["PENDING", "PAID", "OVERDUE", "CANCELLED"].includes(status)) {
        return NextResponse.json({ ok: false, message: "Invalid payment status." }, { status: 400 });
      }
      const updated = await db.clientPayment.update({
        where: { id: rid },
        data: {
          status: status as never,
          paidAt: status === "PAID" ? new Date() : existing.paidAt,
        },
      });
      await audit("PAYMENT_UPDATED", rid, existing.status, { amount: existing.amount, status });
      await db.client.update({ where: { id: client.id }, data: { lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, status: updated.status, paidAt: updated.paidAt });
    }
  }
}
