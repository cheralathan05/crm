import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { askOllamaJson, isOllamaAvailable, OLLAMA_MODEL } from "@/lib/ai/ollama/ollama.client";
import { computeProjectEngineeringReadiness } from "@/lib/engineering/readiness";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/assistant ─────────────────────────
   AI Assistant grounded strictly in real project database records.
   Answers:
   - What should I work on next?
   - Why does this task/table exist?
   - What is blocking this deliverable?
   - Technical summary & risk analysis.
──────────────────────────────────────────────────────────────── */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const userQuery = body.query?.trim();
  if (!userQuery) {
    return NextResponse.json({ ok: false, message: "Query string is required." }, { status: 400 });
  }

  // 1. Fetch real project state
  const project = await db.clientProject.findUnique({
    where: { id },
    include: {
      client: true,
      proposal: true,
      team: true,
      changeRequests: { orderBy: { createdAt: "desc" } },
      milestones: { orderBy: { order: "asc" } },
      deliverables: { include: { tasks: true } },
      tasks: { orderBy: { createdAt: "asc" } },
      blueprints: {
        where: { status: "APPROVED" },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          databaseEntities: true,
          backendApis: true,
          frontendCapabilities: true,
          testSpecifications: true,
          dependencies: true,
        },
      },
      clarifications: true,
      drifts: true,
    },
  });

  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  const readiness = await computeProjectEngineeringReadiness(id);
  const bp = project.blueprints[0];

  // 2. Prepare Grounded Context
  const contextSummary = {
    projectName: project.name,
    projectCode: project.code,
    client: project.client.companyName,
    stage: project.stage,
    health: project.health,
    budget: `${project.currency} ${(project.budget || 0).toLocaleString()}`,
    manager: project.managerName || "Unassigned",
    teamRoster: project.team.map((m) => `${m.name} (${m.role}, ${m.allocation}% allocation)`),
    milestones: project.milestones.map((m) => `${m.title} [Status: ${m.status}, Invoicing: ${m.invoiceStatus}]`),
    deliverables: project.deliverables.map((d) => `${d.title} [Status: ${d.status}]`),
    changeRequests: project.changeRequests.map((cr) => `${cr.title} [Status: ${cr.status}, Timeline: +${cr.impactTimelineDays}d]`),
    overallReadiness: readiness.overallState,
    primaryBlocker: readiness.primaryBlockerText,
    databaseEntities: bp?.databaseEntities.map((d) => `${d.name} (${d.purpose})`) || [],
    backendApis: bp?.backendApis.map((b) => `${b.method} ${b.path} (REQ: ${b.requirementId})`) || [],
    frontendCaps: bp?.frontendCapabilities.map((f) => `${f.name} (Route: ${f.route || "N/A"})`) || [],
    totalTasks: project.tasks.length,
    completedTasks: project.tasks.filter((t) => t.status === "DONE").length,
    blockedTasks: project.tasks.filter((t) => t.status === "BLOCKED").map((t) => `${t.title} [${t.blockedReason || "Blocked"}]`),
    activeDrifts: project.drifts.map((d) => `${d.category}: ${d.difference}`),
  };

  const isUp = await isOllamaAvailable();
  if (isUp) {
    const aiRes = await askOllamaJson({
      systemPrompt: `You are the Business OS Principal Project Intelligence Assistant.
Answer the user's technical and operational questions ONLY using the REAL project database context provided below.
Never guess or fabricate entities, tasks, or metrics. If information is not in the context, state it clearly.
Format your answer with concise, executive engineering clarity using markdown headers and bullets.`,
      userPrompt: `PROJECT CONTEXT:
${JSON.stringify(contextSummary, null, 2)}

USER QUESTION:
${userQuery}

Return JSON with format: { "answer": "string with markdown", "relevantEntities": ["string"], "nextRecommendedAction": "string" }`,
      model: OLLAMA_MODEL,
    });

    if (aiRes.ok && aiRes.content) {
      try {
        const parsed = JSON.parse(aiRes.content);
        return NextResponse.json({
          ok: true,
          answer: parsed.answer,
          relevantEntities: parsed.relevantEntities || [],
          nextRecommendedAction: parsed.nextRecommendedAction || null,
          source: "OLLAMA",
        });
      } catch {}
    }
  }

  // Deterministic grounded response fallback
  let answer = "";
  if (userQuery.toLowerCase().includes("next") || userQuery.toLowerCase().includes("work")) {
    const readyTask = project.tasks.find((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
    answer = readyTask
      ? `### Next Recommended Task\n\n**${readyTask.code || "Task"}: ${readyTask.title}**\n- **Layer**: ${readyTask.layer || readyTask.workstream}\n- **Requirement**: ${readyTask.sourceRequirementId || "Core Scope"}\n- **Expected Result**: ${readyTask.expectedResult || "Standard fulfillment"}`
      : `### Project Work State\n\nAll currently assigned tasks are complete or no pending tasks are in TODO. Check Deliverables for client review status.`;
  } else if (userQuery.toLowerCase().includes("block") || userQuery.toLowerCase().includes("ready")) {
    answer = readiness.primaryBlockerText
      ? `### Active Blockers\n\n- ${readiness.primaryBlockerText}\n- Database Status: **${readiness.layers.database.status}**\n- Backend Status: **${readiness.layers.backend.status}**\n- Frontend Status: **${readiness.layers.frontend.status}**`
      : `### Engineering Readiness\n\n✓ **NO ACTIVE BLOCKERS**. System is operational across all engineering layers.`;
  } else {
    answer = `### Technical Architecture Overview\n\n- **Project**: ${project.name} (${project.stage})\n- **Blueprint**: ${bp ? `v${bp.version} [${bp.status}]` : "Draft / Pending generation"}\n- **Entities**: ${contextSummary.databaseEntities.length} database tables\n- **APIs**: ${contextSummary.backendApis.length} endpoints\n- **Execution Progress**: ${contextSummary.completedTasks}/${contextSummary.totalTasks} tasks completed.`;
  }

  return NextResponse.json({
    ok: true,
    answer,
    relevantEntities: contextSummary.databaseEntities.slice(0, 3),
    nextRecommendedAction: readiness.primaryBlockerText ? "Resolve active blockers" : "Proceed with next unblocked work item",
    source: "DETERMINISTIC_QUERY",
  });
}
