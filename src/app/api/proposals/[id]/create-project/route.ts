import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProposalForUser } from "@/lib/proposal";
import { recordAudit } from "@/lib/clients";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/proposals/[id]/create-project ───────────────────
   Converts an approved proposal into an active Business OS project.
   Seeds tasks from the proposal's approved deliverables & features.
   Updates client lifecycle stage to PROJECT. */

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  // Parse deliverables from the document
  let deliverables: { title: string; priority: string; description?: string }[] = [];
  try {
    const doc = JSON.parse(proposal.document || "{}");
    if (Array.isArray(doc.sections)) {
      for (const section of doc.sections) {
        if (Array.isArray(section.blocks)) {
          for (const block of section.blocks) {
            if (block.type === "deliverable" && block.name) {
              deliverables.push({
                title: block.name,
                priority: "HIGH",
                description: block.description || block.acceptance || "",
              });
            } else if (block.type === "feature_card" && block.title) {
              deliverables.push({
                title: block.title,
                priority: block.priority ? block.priority.toUpperCase() : "MEDIUM",
                description: block.purpose || block.businessNeed || "",
              });
            } else if (block.type === "timeline" && Array.isArray(block.phases)) {
              for (const p of block.phases) {
                if (p.title) {
                  deliverables.push({
                    title: `Phase: ${p.title}`,
                    priority: "MEDIUM",
                    description: p.description || "",
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch {
    /* fallback to default task */
  }

  if (deliverables.length === 0) {
    deliverables = [
      { title: "Project Kickoff & Requirements Baseline", priority: "HIGH", description: "Initial kickoff meeting and stakeholder alignment." },
      { title: "Solution Architecture & Design", priority: "MEDIUM", description: "Core platform design and architectural sign-off." },
      { title: "Core Platform Implementation", priority: "HIGH", description: "Development of agreed capabilities." },
      { title: "Quality Assurance & User Acceptance Testing", priority: "HIGH", description: "Verification against acceptance criteria." },
      { title: "Final Delivery & Handover", priority: "HIGH", description: "Deployment and operational handover." },
    ];
  }

  try {
    // 1. Create the project
    const project = await db.clientProject.create({
      data: {
        clientId: proposal.clientId,
        name: proposal.title || "Client Project",
        stage: "PLANNING",
        health: "ON_TRACK",
        progress: 0,
        startedAt: new Date(),
      },
    });

    // 2. Create tasks attached to the project
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
    await Promise.all(
      deliverables.slice(0, 15).map((d) => {
        const priority = validPriorities.includes(d.priority as any) ? (d.priority as any) : "MEDIUM";
        return db.clientTask.create({
          data: {
            clientId: proposal.clientId,
            projectId: project.id,
            title: d.title,
            priority,
            status: "TODO",
          },
        });
      }),
    );

    // 3. Update client stage to PROJECT
    await db.client.update({
      where: { id: proposal.clientId },
      data: { stage: "PROJECT" },
    });

    // 4. Record audit event
    await recordAudit({
      clientId: proposal.clientId,
      entity: "PROJECT",
      action: "PROJECT_CREATED",
      entityId: project.id,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
      after: { projectId: project.id, proposalId: proposal.id, tasksCount: deliverables.length },
    });

    return NextResponse.json({
      ok: true,
      project: { id: project.id, name: project.name, stage: project.stage },
      message: `Project created with ${deliverables.length} initial tasks.`,
    });
  } catch (err) {
    console.error("[proposal:create-project] failed", err);
    return NextResponse.json({ ok: false, message: "Could not create project from proposal." }, { status: 500 });
  }
}
