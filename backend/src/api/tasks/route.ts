import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextTaskCode, detectDuplicateTasks, ALL_WORKSTREAMS } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/* ── GET /api/tasks — Filter and fetch tasks ─────────────────── */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });
  const workspaceId = user?.workspace?.id;
  if (!workspaceId) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || undefined;
  const clientId = searchParams.get("clientId") || undefined;
  const workstream = searchParams.get("workstream") || undefined;
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const assignee = searchParams.get("assignee") || undefined;
  const view = searchParams.get("view") || "all";
  const search = searchParams.get("search") || undefined;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const whereClause: any = {
    client: { workspaceId },
    ...(projectId ? { projectId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(workstream ? { workstream } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(assignee ? { assigneeName: assignee } : {}),
  };

  // View specific filters
  if (view === "my") {
    whereClause.OR = [
      { assigneeId: session.user.id },
      { assigneeName: session.user.name || "None" },
    ];
  } else if (view === "today") {
    whereClause.dueAt = { gte: todayStart, lte: todayEnd };
    whereClause.status = { notIn: ["COMPLETED", "DONE", "CLIENT_APPROVED", "CANCELLED"] };
  } else if (view === "upcoming") {
    whereClause.dueAt = { gt: todayEnd };
    whereClause.status = { notIn: ["COMPLETED", "DONE", "CLIENT_APPROVED", "CANCELLED"] };
  } else if (view === "overdue") {
    whereClause.dueAt = { lt: now };
    whereClause.status = { notIn: ["COMPLETED", "DONE", "CLIENT_APPROVED", "CANCELLED"] };
  } else if (view === "blocked") {
    whereClause.status = "BLOCKED";
  } else if (view === "in-review") {
    whereClause.status = { in: ["IN_REVIEW", "CHANGES_REQUESTED", "READY_FOR_CLIENT", "CLIENT_REVIEW"] };
  } else if (view === "completed") {
    whereClause.status = { in: ["COMPLETED", "DONE", "CLIENT_APPROVED"] };
  }

  // Search keyword across task title, code, description, project, client, employee, source
  if (search && search.trim()) {
    const term = search.trim();
    whereClause.AND = [
      {
        OR: [
          { title: { contains: term } },
          { code: { contains: term } },
          { description: { contains: term } },
          { assigneeName: { contains: term } },
          { workstream: { contains: term } },
          { project: { name: { contains: term } } },
          { client: { companyName: { contains: term } } },
          { sourceRequirementTitle: { contains: term } },
          { sourceDeliverableTitle: { contains: term } },
        ],
      },
    ];
  }

  const tasks = await db.clientTask.findMany({
    where: whereClause,
    include: {
      client: { select: { id: true, companyName: true } },
      project: { select: { id: true, name: true, code: true, stage: true, health: true } },
      milestone: { select: { id: true, title: true, phase: true } },
      deliverable: { select: { id: true, title: true, category: true, status: true } },
      subtasks: { orderBy: { order: "asc" } },
      acceptanceCriteria: { orderBy: { order: "asc" } },
      dependencies: {
        include: {
          dependsOnTask: { select: { id: true, code: true, title: true, status: true, assigneeName: true } },
        },
      },
      dependentOnMe: {
        include: {
          task: { select: { id: true, code: true, title: true, status: true } },
        },
      },
      _count: {
        select: {
          comments: true,
          attachments: true,
          reviews: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, tasks });
}

/* ── POST /api/tasks — Create manual task with duplicate protection ─ */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const workspace = await db.workspace.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { title, projectId, clientId, milestoneId, deliverableId, workstream, priority, status, assigneeName, assigneeId, teamRole, dueAt, description, expectedResult, clientVisibility, acceptanceCriteria, subtasks } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ ok: false, message: "Task title is required." }, { status: 400 });
  }

  // Resolve client & project
  let targetClientId = clientId;
  let targetProject: any = null;
  if (projectId) {
    targetProject = await db.clientProject.findFirst({
      where: { id: projectId, client: { workspaceId: workspace.id } },
      include: { client: true, proposal: true },
    });
    if (!targetProject) {
      return NextResponse.json({ ok: false, message: "Project not found in workspace." }, { status: 404 });
    }
    targetClientId = targetProject.clientId;
  } else if (clientId) {
    const client = await db.client.findFirst({
      where: { id: clientId, workspaceId: workspace.id },
    });
    if (!client) {
      return NextResponse.json({ ok: false, message: "Client not found in workspace." }, { status: 404 });
    }
  } else {
    // Pick first active client in workspace if none passed
    const client = await db.client.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    });
    if (!client) {
      return NextResponse.json({ ok: false, message: "No active clients exist. Create a client first." }, { status: 400 });
    }
    targetClientId = client.id;
  }

  // Duplicate Check if requested
  if (body.checkDuplicates) {
    const duplicates = await detectDuplicateTasks(workspace.id, title, projectId);
    if (duplicates.length > 0 && !body.forceCreate) {
      return NextResponse.json({
        ok: false,
        duplicateFound: true,
        duplicates,
        message: `Similar task already exists: "${duplicates[0].title}" (${duplicates[0].code || "Task"}).`,
      });
    }
  }

  const code = await nextTaskCode(workspace.id);

  // Deliverable lookup for source reference
  let deliverableTitle: string | null = null;
  if (deliverableId) {
    const deliv = await db.projectDeliverable.findUnique({ where: { id: deliverableId } });
    deliverableTitle = deliv?.title || null;
  }

  const task = await db.clientTask.create({
    data: {
      code,
      clientId: targetClientId,
      projectId: targetProject?.id || null,
      milestoneId: milestoneId || null,
      deliverableId: deliverableId || null,
      title: title.trim(),
      description: description?.trim() || null,
      expectedResult: expectedResult?.trim() || null,
      workstream: workstream || "FRONTEND",
      priority: priority || "MEDIUM",
      status: status || "TODO",
      clientVisibility: clientVisibility || "INTERNAL",
      teamRole: teamRole || null,
      assigneeName: assigneeName || null,
      assigneeId: assigneeId || null,
      dueAt: dueAt ? new Date(dueAt) : null,
      sourceType: "MANUAL",
      sourceProposalId: targetProject?.proposalId || null,
      sourceDeliverableTitle: deliverableTitle,
      sourceSection: "Direct Task Creation",
    },
  });

  // Create Subtasks if provided
  if (Array.isArray(subtasks) && subtasks.length > 0) {
    await Promise.all(
      subtasks.map((st: string | { title: string; completed?: boolean }, idx: number) => {
        const stTitle = typeof st === "string" ? st : st.title;
        const isDone = typeof st === "object" ? !!st.completed : false;
        return db.subTask.create({
          data: {
            taskId: task.id,
            title: stTitle,
            completed: isDone,
            order: idx + 1,
          },
        });
      }),
    );
  }

  // Create Acceptance Criteria if provided
  if (Array.isArray(acceptanceCriteria) && acceptanceCriteria.length > 0) {
    await Promise.all(
      acceptanceCriteria.map((crit: string | { criterion: string; status?: any }, idx: number) => {
        const critText = typeof crit === "string" ? crit : crit.criterion;
        const cStatus = typeof crit === "object" && crit.status ? crit.status : "NOT_STARTED";
        return db.taskAcceptanceCriterion.create({
          data: {
            taskId: task.id,
            criterion: critText,
            status: cStatus,
            order: idx + 1,
          },
        });
      }),
    );
  }

  // Initial Task Activity
  await db.taskActivity.create({
    data: {
      taskId: task.id,
      type: "TASK_CREATED",
      title: `Task ${task.code} Created`,
      detail: task.assigneeName ? `Assigned to ${task.assigneeName} (${task.priority} Priority)` : "Unassigned",
      actorName: session.user.name ?? "Team Member",
    },
  });

  if (targetProject) {
    await db.projectActivity.create({
      data: {
        projectId: targetProject.id,
        type: "TASK_CREATED",
        title: `Task Added: "${task.title}" (${task.code})`,
        detail: task.assigneeName ? `Assigned to ${task.assigneeName}` : "Unassigned",
        actorName: session.user.name ?? "Team Member",
      },
    });
  }

  return NextResponse.json({ ok: true, task });
}
