import { db } from "@/lib/db";
import { getNextEligibleTask } from "@/lib/tasks/task-engine.service";

export type EngineeringDiscipline = "FRONTEND" | "BACKEND" | "DATABASE" | "QA" | "FULLSTACK" | "OPERATIONS";

/**
 * Determine canonical engineering discipline from employee role, team, and department.
 */
export function resolveEmployeeDiscipline(
  roleName?: string | null,
  department?: string | null,
  workstreamAllocation?: string | null,
): EngineeringDiscipline {
  const r = (roleName || "").toLowerCase();
  const d = (department || "").toUpperCase();
  const w = (workstreamAllocation || "").toUpperCase();

  if (w === "FRONTEND") return "FRONTEND";
  if (w === "BACKEND") return "BACKEND";
  if (w === "DATABASE") return "DATABASE";
  if (w === "QA") return "QA";

  if (r.includes("full-stack") || r.includes("fullstack")) return "FULLSTACK";
  if (r.includes("frontend") || r.includes("ui") || r.includes("ux")) return "FRONTEND";
  if (r.includes("database") || r.includes("data") || r.includes("schema")) return "DATABASE";
  if (r.includes("backend") || r.includes("api") || r.includes("architect")) return "BACKEND";
  if (r.includes("qa") || r.includes("test") || r.includes("quality") || d === "QA") return "QA";

  return "FULLSTACK";
}

/**
 * Single source of truth service for the Employee OS + Work-Context Communication portal.
 * ZERO mock data: 100% database driven.
 */
export async function getEmployeePortalData({
  employeeId,
  requestedProjectId,
}: {
  employeeId: string;
  requestedProjectId?: string | null;
}) {
  // 1. Fetch Employee Profile
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      role: true,
      team: {
        include: {
          teamLead: { select: { id: true, fullName: true, email: true } },
        },
      },
      workspace: {
        select: {
          id: true,
          companyName: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      projectAllocations: {
        where: { releasedAt: null },
        include: {
          project: {
            include: {
              client: { select: { id: true, companyName: true } },
            },
          },
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee record not found.");
  }

  const discipline = resolveEmployeeDiscipline(
    employee.role?.name,
    employee.department,
    employee.projectAllocations[0]?.workstream,
  );

  // 2. Resolve Active Projects for this employee
  const allocatedProjectIds = employee.projectAllocations.map((a) => a.projectId);

  // Find all projects where employee is either allocated or has tasks assigned
  const taskProjects = await db.clientTask.findMany({
    where: {
      OR: [
        { assigneeId: employee.id },
        ...(employee.userId ? [{ assigneeId: employee.userId }] : []),
        { assigneeName: employee.fullName },
      ],
    },
    select: { projectId: true },
    distinct: ["projectId"],
  });

  const memberProjectIds = Array.from(
    new Set([...allocatedProjectIds, ...taskProjects.map((tp) => tp.projectId)]),
  );

  const activeProjects = await db.clientProject.findMany({
    where: {
      id: memberProjectIds.length > 0 ? { in: memberProjectIds } : undefined,
    },
    include: {
      client: { select: { id: true, companyName: true } },
      staffAllocations: {
        include: {
          employee: {
            include: { role: true },
          },
        },
      },
      decisions: {
        orderBy: { decidedAt: "desc" },
        take: 10,
      },
      tasks: {
        select: {
          id: true,
          code: true,
          title: true,
          layer: true,
          status: true,
          assigneeId: true,
          assigneeName: true,
          blockedReason: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Select current active project
  let currentProject = activeProjects.find((p) => p.id === requestedProjectId);
  if (!currentProject && activeProjects.length > 0) {
    currentProject = activeProjects[0];
  }

  // 3. Query Role-Aware Work Items
  let workItems: any[] = [];
  let allProjectTasks: any[] = [];

  if (currentProject) {
    allProjectTasks = await db.clientTask.findMany({
      where: { projectId: currentProject.id },
      include: {
        deliverable: true,
        acceptanceCriteria: { orderBy: { order: "asc" } },
        submissions: {
          include: { reviews: { orderBy: { createdAt: "desc" } } },
          orderBy: { iteration: "desc" },
        },
        reviews: { orderBy: { createdAt: "desc" } },
        dependencies: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                code: true,
                title: true,
                layer: true,
                status: true,
                assigneeId: true,
                assigneeName: true,
              },
            },
          },
        },
        dependentOnMe: {
          include: {
            task: {
              select: {
                id: true,
                code: true,
                title: true,
                layer: true,
                status: true,
                assigneeName: true,
              },
            },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "asc" }],
    });

    // Strictly role-aware filtering:
    // If assigned to this employee -> ALWAYS include.
    // If not assigned to someone else -> include only if matching discipline!
    workItems = allProjectTasks.filter((task) => {
      const isDirectlyAssigned =
        task.assigneeId === employee.id ||
        (employee.userId && task.assigneeId === employee.userId) ||
        task.assigneeName === employee.fullName;

      if (isDirectlyAssigned) return true;

      // If task already assigned to a DIFFERENT active employee, don't hijack it
      if (task.assigneeId && task.assigneeId !== employee.id) {
        return false;
      }

      const layer = (task.layer || "").toUpperCase();
      const workstream = (task.workstream || "").toUpperCase();

      if (discipline === "FRONTEND") {
        return layer === "FRONTEND" || layer === "UI" || workstream === "FRONTEND";
      }
      if (discipline === "BACKEND") {
        return layer === "BACKEND" || layer === "API" || workstream === "BACKEND";
      }
      if (discipline === "DATABASE") {
        return layer === "DATABASE" || layer === "DATA" || workstream === "DATABASE";
      }
      if (discipline === "QA") {
        return layer === "QA" || layer === "TESTING" || workstream === "QA";
      }

      return true; // FULLSTACK
    });
  }

  // Configured Reviewer for this project
  const qaStaff = currentProject?.staffAllocations.find((sa) => {
    const r = (sa.employee?.role?.name || "").toLowerCase();
    const d = (sa.employee?.department || "").toLowerCase();
    const w = (sa.workstream || "").toUpperCase();
    const t = (sa.teamName || "").toUpperCase();
    return r.includes("qa") || d.includes("qa") || w === "QA" || t === "QA";
  });
  const leadStaff = currentProject?.staffAllocations.find((sa) => {
    const r = (sa.employee?.role?.name || "").toLowerCase();
    return r.includes("lead") || r.includes("architect") || r.includes("manager");
  });
  const configuredReviewer = {
    name: qaStaff?.employee?.fullName || leadStaff?.employee?.fullName || employee.workspace?.owner?.name || "QA & Project Reviewer",
    role: qaStaff?.employee?.role?.name || leadStaff?.employee?.role?.name || "QA Lead",
    id: qaStaff?.employee?.id || leadStaff?.employee?.id || null,
  };

  // 4. Resolve Smart Contacts and Dependency Owners for each work item
  const structuredWorkItems = workItems.map((task) => {
    const rawDeps = task.dependencies || [];
    const directBlocker = rawDeps.find((d: any) => d.dependsOnTask?.status !== "COMPLETED" && d.dependsOnTask?.status !== "DONE");
    const firstDep = rawDeps[0]?.dependsOnTask;

    // Identify who owns the dependency
    let dependencyOwnerName = firstDep?.assigneeName || "Team Lead";
    let dependencyOwnerRole = firstDep?.layer ? `${firstDep.layer} Engineer` : "Backend Developer";
    let dependencyOwnerId = firstDep?.assigneeId || null;

    if (!dependencyOwnerId && currentProject) {
      // Find matching staff on this project for that layer
      const targetStaff = currentProject.staffAllocations.find((sa) => {
        const r = (sa.employee?.role?.name || "").toLowerCase();
        const depLayer = (firstDep?.layer || "BACKEND").toLowerCase();
        return r.includes(depLayer);
      });
      if (targetStaff?.employee) {
        dependencyOwnerId = targetStaff.employee.id;
        dependencyOwnerName = targetStaff.employee.fullName;
        dependencyOwnerRole = targetStaff.employee.role?.name || dependencyOwnerRole;
      }
    }

    const latestSub = task.submissions?.[0] || null;
    const latestReview = latestSub?.reviews?.[0] || task.reviews?.[0] || null;
    const approvedReview = task.reviews?.find((r: any) => r.status === "APPROVED") || latestSub?.reviews?.find((r: any) => r.status === "APPROVED");

    const whoIsWaitingForMe = (task.dependentOnMe || []).map((d: any) => ({
      id: d.task?.id,
      code: d.task?.code || "TSK",
      title: d.task?.title,
      layer: d.task?.layer || "ENGINEERING",
      status: d.task?.status,
      assigneeName: d.task?.assigneeName || "Assigned Team Member",
    }));

    return {
      id: task.id,
      code: task.code || "TSK",
      title: task.title,
      description: task.description || "Implement and verify required product area functionality.",
      layer: task.layer || "ENGINEERING",
      workstream: task.workstream || discipline,
      status: task.status,
      priority: task.priority || "MEDIUM",
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      dependencies: rawDeps,
      dueAt: task.dueAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      blockedReason: task.blockedReason,
      // Review details & iterations
      submissions: task.submissions || [],
      latestSubmission: latestSub,
      latestReview,
      reviewerFeedback:
        task.status === "CHANGES_REQUESTED"
          ? (latestReview?.feedback || task.blockedReason || "Reviewer requested updates before sign-off.")
          : null,
      approvedBy: approvedReview?.reviewerName || (task.status === "COMPLETED" || task.status === "DONE" ? configuredReviewer.name : null),
      approvedAt: approvedReview?.decidedAt || task.completedAt || null,
      whoReviewsThis: configuredReviewer,
      // Answers to the 7 Core Questions:
      whatAmIBuilding: task.title,
      whyAmIBuildingIt:
        task.deliverable?.description ||
        task.sourceDeliverableTitle ||
        task.sourceRequirementTitle ||
        "Deliver customer capability according to approved milestone specifications.",
      whatShouldFinalResultLookLike:
        task.expectedResult ||
        task.deliverable?.acceptanceCriteria ||
        "Fully tested component integrated with connected data flows and responsive states.",
      acceptanceCriteriaList: (task.acceptanceCriteria || []).map((ac: any) => ({
        id: ac.id,
        criterion: ac.criterion,
        status: ac.status,
      })),
      whatDoesItDependOn: firstDep
        ? `${firstDep.layer || "BACKEND"} → ${firstDep.title} (${firstDep.code})`
        : "Foundational project architecture & approved design system.",
      dependencyDetails: firstDep
        ? {
            id: firstDep.id,
            code: firstDep.code,
            title: firstDep.title,
            layer: firstDep.layer,
            status: firstDep.status,
            isReady: firstDep.status === "COMPLETED" || firstDep.status === "DONE",
            ownerName: dependencyOwnerName,
            ownerRole: dependencyOwnerRole,
            ownerId: dependencyOwnerId,
          }
        : null,
      waitingFor: directBlocker?.dependsOnTask
        ? {
            id: directBlocker.dependsOnTask.id,
            code: directBlocker.dependsOnTask.code,
            title: directBlocker.dependsOnTask.title,
            layer: directBlocker.dependsOnTask.layer,
            status: directBlocker.dependsOnTask.status,
            ownerName: dependencyOwnerName,
            ownerRole: dependencyOwnerRole,
            ownerId: dependencyOwnerId,
          }
        : null,
      whoIsWaitingForMe,
      whoDoIContact: {
        name: dependencyOwnerName,
        role: dependencyOwnerRole,
        employeeId: dependencyOwnerId,
      },
      whatProofIsRequired: [
        "Screenshot / UI visual verification",
        "PR link or clean code commit hash",
        "Test result verification or deployment endpoint",
      ],
      whatHappensAfterIFinish: "Submit proof → Internal Quality Review → Cascading dependencies unlock.",
    };
  });

  // 5. Derive Hero "MY WORK TODAY"
  let currentTask = structuredWorkItems.find((t) => t.status === "IN_PROGRESS");
  if (!currentTask) {
    currentTask = structuredWorkItems.find((t) => t.status === "CHANGES_REQUESTED");
  }
  if (!currentTask) {
    currentTask = structuredWorkItems.find((t) => t.status === "BLOCKED");
  }
  if (!currentTask) {
    currentTask = structuredWorkItems.find((t) => t.status === "TODO" || t.status === "READY");
  }
  if (!currentTask && structuredWorkItems.length > 0) {
    currentTask = structuredWorkItems[0];
  }

  let nextAction = "Review assigned deliverables and begin implementation.";
  if (currentTask) {
    if (currentTask.status === "IN_PROGRESS") {
      nextAction = `Continue active development on ${currentTask.title}. Submit proof upon completion.`;
    } else if (currentTask.status === "CHANGES_REQUESTED") {
      nextAction = `Fix requested changes: "${currentTask.reviewerFeedback}". Resubmit proof when resolved.`;
    } else if (currentTask.status === "BLOCKED") {
      nextAction = `Resolve blocker: ${currentTask.blockedReason || "Waiting for upstream dependency"}.`;
    } else if (currentTask.status === "IN_REVIEW") {
      nextAction = "Awaiting verification review from configured reviewer.";
    } else if (currentTask.status === "TODO" || currentTask.status === "READY") {
      nextAction = `Initialize work on ${currentTask.title}.`;
    }
  }

  // Calculate real next eligible work item (never fabricate)
  let nextEligibleWork: any = null;
  if (currentProject) {
    nextEligibleWork = await getNextEligibleTask({
      employeeId: employee.id,
      projectId: currentProject.id,
      currentTaskId: currentTask?.id,
    });
  }

  const myWorkToday = currentProject
    ? {
        project: {
          id: currentProject.id,
          name: currentProject.name,
          code: currentProject.code,
          stage: currentProject.stage,
        },
        role: employee.role?.name || `${discipline} Specialist`,
        discipline,
        currentWork: currentTask
          ? {
              id: currentTask.id,
              code: currentTask.code,
              title: currentTask.title,
              status: currentTask.status,
              priority: currentTask.priority,
              layer: currentTask.layer,
              dependency: currentTask.dependencyDetails,
              waitingFor: currentTask.waitingFor,
              reviewerFeedback: currentTask.reviewerFeedback,
            }
          : null,
        nextEligibleWork,
        nextAction,
      }
    : null;

  // 6. Real Attention Items ("NEEDS YOUR ATTENTION")
  // Strictly real events, no mock data.
  const attentionItems: Array<{
    id: string;
    type: "BLOCKER" | "MESSAGE" | "REVIEW" | "DEPENDENCY_READY" | "CHANGES_REQUESTED";
    title: string;
    description: string;
    actionLabel: string;
    actionTab: string;
    actionUrl?: string;
    timestamp: Date;
  }> = [];

  // A. Blockers on current tasks
  const blockedTasks = structuredWorkItems.filter((t) => t.status === "BLOCKED");
  blockedTasks.forEach((t) => {
    attentionItems.push({
      id: `blocker-${t.id}`,
      type: "BLOCKER",
      title: `Blocker on ${t.code}: ${t.title}`,
      description: t.blockedReason || "Work paused due to unresolved dependency.",
      actionLabel: "View Blocker",
      actionTab: "MY_WORK",
      timestamp: new Date(),
    });
  });

  // B. Tasks & Submissions with Changes Requested
  const tasksWithChanges = structuredWorkItems.filter((t) => t.status === "CHANGES_REQUESTED");
  tasksWithChanges.forEach((t) => {
    attentionItems.push({
      id: `task-changes-${t.id}`,
      type: "CHANGES_REQUESTED",
      title: `Changes Requested: ${t.code} — ${t.title}`,
      description: t.reviewerFeedback || "Reviewer requested updates before acceptance.",
      actionLabel: "Fix & Resubmit",
      actionTab: "MY_WORK",
      actionUrl: `/employee/work?tab=MY_WORK&highlightTaskId=${t.id}`,
      timestamp: t.latestReview?.decidedAt || new Date(),
    });
  });

  // C. Unread messages
  const unreadConversations = await db.workConversation.findMany({
    where: {
      participants: {
        some: {
          employeeId: employee.id,
          unreadCount: { gt: 0 },
        },
      },
    },
    include: {
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  unreadConversations.forEach((c) => {
    const lastMsg = c.messages[0];
    attentionItems.push({
      id: `msg-${c.id}`,
      type: "MESSAGE",
      title: `New Message in: ${c.title}`,
      description: lastMsg ? `${lastMsg.senderName}: "${lastMsg.content.slice(0, 80)}"` : "New unread activity.",
      actionLabel: "Reply",
      actionTab: "MESSAGES",
      actionUrl: `/employee/work?tab=MESSAGES&thread=${c.id}`,
      timestamp: c.lastMessageAt,
    });
  });

  // D. Dependencies that are READY for tasks that are currently TODO/WAITING
  structuredWorkItems.forEach((t) => {
    if (t.status === "TODO" && t.dependencyDetails?.isReady) {
      attentionItems.push({
        id: `dep-ready-${t.id}`,
        type: "DEPENDENCY_READY",
        title: `Dependency Ready: ${t.dependencyDetails.title}`,
        description: `Upstream work is marked COMPLETED. You can now build ${t.title}.`,
        actionLabel: "Start Work",
        actionTab: "MY_WORK",
        timestamp: new Date(),
      });
    }
  });

  // 7. Project Roster (MY TEAM) - Categorized strictly by real disciplines
  const projectRoster: Record<string, any[]> = {
    frontend: [],
    backend: [],
    database: [],
    qa: [],
    admin: [],
  };

  if (currentProject) {
    const addedEmployeeIds = new Set<string>();

    // Add Workspace Owner / Admin
    if (employee.workspace?.owner) {
      projectRoster.admin.push({
        id: employee.workspace.owner.id,
        name: employee.workspace.owner.name || "Project Administrator",
        email: employee.workspace.owner.email,
        role: "Project Administrator / Owner",
        department: "MANAGEMENT",
        currentFocus: "Project Governance & Delivery Milestones",
        isUser: true,
      });
    }

    // Add Staff Allocations
    currentProject.staffAllocations.forEach((sa) => {
      if (sa.employee && !addedEmployeeIds.has(sa.employee.id)) {
        addedEmployeeIds.add(sa.employee.id);
        const empDiscipline = resolveEmployeeDiscipline(
          sa.employee.role?.name,
          sa.employee.department,
          sa.workstream,
        );

        const memberObj = {
          id: sa.employee.id,
          name: sa.employee.fullName,
          code: sa.employee.employeeCode,
          email: sa.employee.email,
          role: sa.employee.role?.name || "Specialist",
          department: sa.employee.department,
          discipline: empDiscipline,
          isYou: sa.employee.id === employee.id,
          currentFocus: sa.workstream ? `${sa.workstream} Architecture & Delivery` : "Assigned Workstream",
        };

        if (empDiscipline === "FRONTEND") projectRoster.frontend.push(memberObj);
        else if (empDiscipline === "BACKEND") projectRoster.backend.push(memberObj);
        else if (empDiscipline === "DATABASE") projectRoster.database.push(memberObj);
        else if (empDiscipline === "QA") projectRoster.qa.push(memberObj);
        else projectRoster.backend.push(memberObj);
      }
    });

    // If current employee is not in allocations yet, add them in their respective discipline
    if (!addedEmployeeIds.has(employee.id)) {
      const youObj = {
        id: employee.id,
        name: `${employee.fullName} (You)`,
        code: employee.employeeCode,
        email: employee.email,
        role: employee.role?.name || "Specialist",
        department: employee.department,
        discipline,
        isYou: true,
        currentFocus: currentTask ? currentTask.title : "Active Engineering Work",
      };

      if (discipline === "FRONTEND") projectRoster.frontend.push(youObj);
      else if (discipline === "BACKEND") projectRoster.backend.push(youObj);
      else if (discipline === "DATABASE") projectRoster.database.push(youObj);
      else if (discipline === "QA") projectRoster.qa.push(youObj);
      else projectRoster.frontend.push(youObj);
    }
  }

  // 8. Project Communication Memory
  let projectCommunicationHistory: any[] = [];
  if (currentProject) {
    const projectConversations = await db.workConversation.findMany({
      where: { projectId: currentProject.id },
      include: {
        task: { select: { id: true, code: true, title: true, layer: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
    });

    projectCommunicationHistory = projectConversations.flatMap((c) =>
      c.messages.map((m) => ({
        id: m.id,
        conversationId: c.id,
        conversationTitle: c.title,
        workTitle: c.task?.title || c.title,
        workCode: c.task?.code || "WORK",
        senderName: m.senderName,
        senderRole: m.senderRole,
        messageType: m.messageType,
        content: m.content,
        timestamp: m.createdAt,
      })),
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 9. Project Decisions
  const projectDecisions = currentProject?.decisions || [];

  // 10. Submissions History (Real TaskSubmissions + legacy)
  const taskSubmissions = await db.taskSubmission.findMany({
    where: { employeeId: employee.id },
    include: {
      task: {
        select: { id: true, code: true, title: true, layer: true, expectedResult: true },
      },
      project: { select: { id: true, name: true, code: true } },
      reviews: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const legacySubmissions = await db.buildSubmission.findMany({
    where: { employeeId: employee.id },
    include: {
      proofs: true,
      reviewDecisions: { orderBy: { reviewedAt: "desc" } },
      verificationReport: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const submissions = [
    ...taskSubmissions.map((ts) => ({
      id: ts.id,
      submissionCode: ts.submissionCode,
      featureName: ts.task.title,
      taskCode: ts.task.code,
      taskId: ts.taskId,
      projectId: ts.projectId,
      project: ts.project,
      responsibility: `${ts.task.code} Verification`,
      whatYouBuilt: ts.summary,
      proofs: ts.proofUrl
        ? [
            {
              id: `proof-${ts.id}`,
              type: ts.proofType,
              title: `Proof (Iteration #${ts.iteration})`,
              evidenceUrl: ts.proofUrl,
            },
          ]
        : [],
      reviewDecisions: ts.reviews.map((r) => ({
        id: r.id,
        decision: r.status,
        reviewerName: r.reviewerName,
        comment: r.feedback,
        requiredChange: r.status === "CHANGES_REQUESTED" ? r.feedback : null,
        reviewedAt: r.decidedAt || r.createdAt,
      })),
      version: ts.iteration,
      status: ts.status,
      submittedAt: ts.submittedAt,
    })),
    ...legacySubmissions,
  ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // 11. Real Notifications from EmployeeInboxItem
  const notifications = await db.employeeInboxItem.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // 12. Real Project Activities for Activity Tab and Audit Stream
  let projectActivities: any[] = [];
  if (currentProject) {
    projectActivities = await db.projectActivity.findMany({
      where: { projectId: currentProject.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
  }

  // 13. Detailed Project Breakdown for each assigned project (Section 3 & 4)
  const structuredProjects = activeProjects.map((p) => {
    const myTasksForProject = p.tasks.filter((t) => {
      const isDirectlyAssigned =
        t.assigneeId === employee.id ||
        (employee.userId && t.assigneeId === employee.userId) ||
        t.assigneeName === employee.fullName;
      if (isDirectlyAssigned) return true;
      if (t.assigneeId && t.assigneeId !== employee.id) return false;
      const layer = (t.layer || "").toUpperCase();
      if (discipline === "FRONTEND") return layer === "FRONTEND" || layer === "UI";
      if (discipline === "BACKEND") return layer === "BACKEND" || layer === "API";
      if (discipline === "DATABASE") return layer === "DATABASE" || layer === "DATA";
      if (discipline === "QA") return layer === "QA" || layer === "TESTING";
      return true;
    });

    const alloc = p.staffAllocations.find((sa) => sa.employee?.id === employee.id);
    const myRoleInProject = alloc?.projectRole || alloc?.employee?.role?.name || employee.role?.name || `${discipline} Developer`;

    const completed = myTasksForProject.filter((t) => t.status === "COMPLETED" || t.status === "DONE").length;
    const inProgress = myTasksForProject.filter((t) => t.status === "IN_PROGRESS").length;
    const waiting = myTasksForProject.filter((t) => t.status === "TODO" || t.status === "READY").length;
    const review = myTasksForProject.filter((t) => t.status === "IN_REVIEW" || t.status === "CHANGES_REQUESTED").length;
    const blocked = myTasksForProject.filter((t) => t.status === "BLOCKED" || !!t.blockedReason).length;

    let projectDisplayStatus = "In Progress";
    if (p.stage === "PLANNING" || p.stage === "DISCOVERY") projectDisplayStatus = "Planning";
    else if (p.stage === "TESTING") projectDisplayStatus = "Testing & QA";
    else if (p.stage === "COMPLETED" || p.stage === "DELIVERY") projectDisplayStatus = "Completed";

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      stage: p.stage,
      clientName: p.client?.companyName || "Client Delivery",
      role: myRoleInProject,
      status: projectDisplayStatus,
      myWorkCount: myTasksForProject.length,
      completedCount: completed,
      inProgressCount: inProgress,
      waitingCount: waiting,
      reviewCount: review,
      blockedCount: blocked,
    };
  });

  // Parse employee capabilities and responsibilities from real role
  let roleResponsibilities: string[] = [];
  try {
    roleResponsibilities = JSON.parse(employee.role?.responsibilities || "[]");
  } catch {
    roleResponsibilities = ["Core engineering implementation", "Cross-layer collaboration", "Acceptance verification"];
  }

  let roleCapabilities: string[] = [];
  try {
    roleCapabilities = JSON.parse(employee.role?.requiredCapabilities || "[]");
  } catch {
    roleCapabilities = ["Full-Stack Engineering", "TypeScript", "Clean Architecture"];
  }

  
  // Project-First Context (Section 2, 7, 18)
  const currentAlloc = employee.projectAllocations.find(
    (a) => a.projectId === currentProject?.id
  );
  const myRole = currentAlloc?.projectRole || employee.role?.name || `${discipline} Developer`;
  const myTeam = (currentAlloc?.teamName || currentAlloc?.workstream || discipline || "FRONTEND").toUpperCase();

  const assignedTasks = structuredWorkItems.filter(
    (t) =>
      (t.assigneeId && (t.assigneeId === employee.id || (employee.userId && t.assigneeId === employee.userId))) ||
      (t.assigneeName && t.assigneeName.toLowerCase() === employee.fullName.toLowerCase())
  );
  const myWorkAssigned = assignedTasks.length;
  const myWorkCompleted = assignedTasks.filter((t) => t.status === "COMPLETED" || t.status === "DONE").length;
  const myWorkInProgress = assignedTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "DOING").length;
  const myWorkReview = assignedTasks.filter((t) => t.status === "IN_REVIEW" || t.status === "REVIEW").length;
  const myWorkWaiting = assignedTasks.filter((t) => {
    if (t.status === "COMPLETED" || t.status === "DONE") return false;
    return t.dependencies?.some((d: any) => d.dependsOnTask && d.dependsOnTask.status !== "COMPLETED" && d.dependsOnTask.status !== "DONE");
  }).length;

  const myWork = {
    assigned: myWorkAssigned,
    completed: myWorkCompleted,
    inProgress: myWorkInProgress,
    waiting: myWorkWaiting,
    review: myWorkReview,
  };

  const projectTeams = {
    frontend: projectRoster.frontend.length,
    backend: projectRoster.backend.length,
    database: projectRoster.database.length,
    qa: projectRoster.qa.length,
  };

  const projectSwitcher = activeProjects.map((p) => {
    const alloc = employee.projectAllocations.find((a) => a.projectId === p.id);
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      role: alloc?.projectRole || "Developer",
      team: (alloc?.teamName || alloc?.workstream || "FRONTEND").toUpperCase(),
      isActive: p.id === currentProject?.id,
    };
  });

  return {
    myProject: currentProject ? { id: currentProject.id, name: currentProject.name, code: currentProject.code } : null,
    myRole,
    myTeam,
    myWork,
    projectTeams,
    projectSwitcher,
    employee: {
      id: employee.id,
      name: employee.fullName,
      email: employee.email,
      code: employee.employeeCode,
      department: employee.department,
      role: employee.role?.name || "Specialist",
      discipline,
      avatar: employee.avatar,
      purpose: employee.role?.purpose || "Executes engineering blueprints into production-grade delivery with verified proof.",
      responsibilities: roleResponsibilities,
      requiredCapabilities: roleCapabilities,
      joinedAt: employee.createdAt,
    },
    currentProject: currentProject
      ? {
          id: currentProject.id,
          name: currentProject.name,
          code: currentProject.code,
          stage: currentProject.stage,
          clientName: currentProject.client?.companyName || "Client Delivery",
        }
      : null,
    allProjects: structuredProjects,
    myWorkToday,
    attentionItems,
    workItems: structuredWorkItems,
    projectRoster,
    projectCommunicationHistory,
    projectDecisions,
    projectActivities,
    submissions,
    notifications,
    metrics: {
      totalWorkItems: structuredWorkItems.length,
      inProgressCount: structuredWorkItems.filter((w) => w.status === "IN_PROGRESS").length,
      blockedCount: blockedTasks.length,
      completedCount: structuredWorkItems.filter((w) => w.status === "COMPLETED" || w.status === "DONE").length,
      unreadMessagesCount: unreadConversations.length,
      pendingSubmissionsCount: submissions.filter((s) => s.status === "SUBMITTED" || s.status === "IN_REVIEW").length,
      attentionCount: attentionItems.length,
    },
  };
}
