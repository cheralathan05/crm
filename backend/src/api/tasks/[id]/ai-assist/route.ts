import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTaskWorkDNA } from "@/lib/tasks";
import { askOllamaJson, askOllamaText, isOllamaAvailable, OLLAMA_MODEL } from "@/lib/ai/ollama/ollama.client";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/tasks/[id]/ai-assist — Check Ollama status ──────── */
export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const isOnline = await isOllamaAvailable();
  return NextResponse.json({
    ok: true,
    isOnline,
    model: OLLAMA_MODEL,
  });
}

/* ── POST /api/tasks/[id]/ai-assist — Real AI Task Assistance ─── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const workDNA = await getTaskWorkDNA(id);

  if (!workDNA) {
    return NextResponse.json({ ok: false, message: "Task not found in database." }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const { action = "EXPLAIN_WORK", prompt, autoApplySubtasks = false } = body;

  const isUp = await isOllamaAvailable();
  if (!isUp) {
    return NextResponse.json({
      ok: false,
      isOllamaOffline: true,
      message: "Local Ollama AI engine is currently offline. Please start Ollama locally (e.g. `ollama run qwen3:8b`).",
    }, { status: 503 });
  }

  // Real Database Context Grounding
  const taskContext = {
    taskId: workDNA.task.id,
    taskCode: workDNA.task.code,
    taskTitle: workDNA.task.title,
    taskDescription: workDNA.task.description,
    expectedResult: workDNA.task.expectedResult,
    status: workDNA.task.status,
    priority: workDNA.task.priority,
    workstream: workDNA.workstream.label,
    projectName: workDNA.project.name,
    projectStage: workDNA.project.stage,
    projectHealth: workDNA.project.health,
    clientName: workDNA.client.companyName,
    deliverableTitle: workDNA.deliverable?.title || "General Deliverable",
    requirementTitle: workDNA.requirement?.title || "System Architecture",
    acceptanceCriteria: workDNA.acceptanceCriteria.map((c) => ({
      criterion: c.criterion,
      status: c.status,
    })),
    existingSubtasks: workDNA.subtasks.map((s) => ({
      title: s.title,
      completed: s.completed,
    })),
    upstreamBlockers: workDNA.dependencies.upstream.map((u) => ({
      title: u.title,
      status: u.status,
    })),
    downstreamUnlocks: workDNA.dependencies.downstream.map((d) => ({
      title: d.title,
      status: d.status,
    })),
    assigneeName: workDNA.task.assigneeName || "Unassigned",
  };

  const systemBase = `You are the Business OS AI Engineering Copilot.
You are assisting an engineer working on task "${taskContext.taskTitle}" for project "${taskContext.projectName}".

STRICT FACTUAL GROUNDING:
1. Base all your responses strictly on the real database context provided.
2. NEVER invent non-existent APIs, fake project requirements, or mock URLs.
3. Be direct, professional, concise, and focused on actionable implementation.

REAL TASK CONTEXT:
${JSON.stringify(taskContext, null, 2)}`;

  // 1. SUGGEST SUBTASKS ACTION
  if (action === "SUGGEST_SUBTASKS") {
    const userPrompt = `Generate a concise list of 3 to 6 practical, concrete implementation steps required to complete this task and satisfy its acceptance criteria.
Respond ONLY with a JSON object matching this schema:
{
  "suggestedSteps": [
    { "title": "step description" }
  ],
  "reasoning": "brief explanation of why these steps satisfy the task requirements"
}`;

    const result = await askOllamaJson({
      systemPrompt: systemBase,
      userPrompt,
      temperature: 0.2,
      timeoutMs: 45000,
    });

    if (!result.ok || !result.content) {
      return NextResponse.json({
        ok: false,
        message: result.error || "Ollama failed to generate subtasks.",
      }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(result.content);
      const steps = Array.isArray(parsed.suggestedSteps) ? parsed.suggestedSteps : [];

      // If requested to auto-apply to DB
      if (autoApplySubtasks && steps.length > 0) {
        const actorName = session.user.name ?? "AI Copilot";
        const currentCount = await db.subTask.count({ where: { taskId: id } });

        for (let i = 0; i < steps.length; i++) {
          if (steps[i].title?.trim()) {
            await db.subTask.create({
              data: {
                taskId: id,
                title: steps[i].title.trim(),
                completed: false,
                order: currentCount + i + 1,
              },
            });
          }
        }

        await db.taskActivity.create({
          data: {
            taskId: id,
            type: "AI_SUBTASKS_GENERATED",
            title: `AI Copilot generated ${steps.length} implementation steps`,
            detail: `Grounded in task acceptance criteria`,
            actorName,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        suggestedSteps: steps,
        reasoning: parsed.reasoning || "Generated from task criteria.",
        appliedToDb: autoApplySubtasks,
      });
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid JSON response from AI model." }, { status: 500 });
    }
  }

  // 2. EXPLAIN WORK & ARCHITECTURE
  if (action === "EXPLAIN_WORK") {
    const userPrompt = `Provide a clear, 3-point implementation guide for this task:
1. Technical Objective (what needs to be built)
2. Implementation Steps (how to build it cleanly)
3. Definition of Done (what to verify before submitting evidence)
Keep it punchy, technical, and directly applicable.`;

    const result = await askOllamaText({
      systemPrompt: systemBase,
      userPrompt,
      temperature: 0.2,
      timeoutMs: 45000,
    });

    if (!result.ok || !result.content) {
      return NextResponse.json({
        ok: false,
        message: result.error || "Ollama failed to generate explanation.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      content: result.content,
      modelUsed: result.modelUsed,
    });
  }

  // 3. FREE-FORM QUESTION ANSWERING
  if (action === "ASK_QUESTION") {
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ ok: false, message: "Question prompt is required." }, { status: 400 });
    }

    const userPrompt = `The employee asks: "${prompt.trim()}".
Answer their question accurately using only the real database context.`;

    const result = await askOllamaText({
      systemPrompt: systemBase,
      userPrompt,
      temperature: 0.2,
      timeoutMs: 45000,
    });

    if (!result.ok || !result.content) {
      return NextResponse.json({
        ok: false,
        message: result.error || "Ollama failed to answer question.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      content: result.content,
      modelUsed: result.modelUsed,
    });
  }

  return NextResponse.json({ ok: false, message: "Unsupported action." }, { status: 400 });
}
