import { db } from "@/lib/db";

export interface RootCauseNode {
  id: string;
  label: string;
  nodeType: "PROJECT" | "DELIVERABLE" | "TASK" | "BLOCKER" | "DEPENDENCY" | "GATE";
  status: "BLOCKED" | "IN_PROGRESS" | "TODO" | "IN_REVIEW" | "DONE";
  ownerName?: string;
  layer?: string;
  reason?: string;
  isRootCause: boolean;
  entityId: string;
  entityType: string;
}

export interface RootCauseEdge {
  id: string;
  from: string;
  to: string;
  relationType: "BLOCKS" | "BLOCKED_BY" | "DEPENDS_ON" | "CONTAINS";
  label?: string;
}

export interface RootCauseGraphData {
  targetId: string;
  targetTitle: string;
  hasCausalChain: boolean;
  rootCauseSummary: string;
  nodes: RootCauseNode[];
  edges: RootCauseEdge[];
}

/**
 * Builds a deterministic, audit-traceable Root Cause Graph by traversing real
 * database relationships: TaskDependency, ProjectBlocker, and Task execution status.
 */
export async function getRootCauseGraph(
  projectId: string,
  taskId?: string,
): Promise<RootCauseGraphData> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      projectBlockers: { where: { status: "ACTIVE" } },
      tasks: {
        include: {
          dependencies: { include: { dependsOnTask: true } },
          dependentOnMe: { include: { task: true } },
          blockers: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (!project) {
    return {
      targetId: projectId,
      targetTitle: "Project Not Found",
      hasCausalChain: false,
      rootCauseSummary: "No project record exists for this identifier.",
      nodes: [],
      edges: [],
    };
  }

  const nodes: RootCauseNode[] = [];
  const edges: RootCauseEdge[] = [];
  const visitedNodeIds = new Set<string>();

  // 1. Add Project Node
  const projectNodeId = `node-prj-${project.id}`;
  nodes.push({
    id: projectNodeId,
    label: `Project: ${project.code || project.name}`,
    nodeType: "PROJECT",
    status: project.health === "BLOCKED" ? "BLOCKED" : "IN_PROGRESS",
    ownerName: "Project Lead",
    isRootCause: false,
    entityId: project.id,
    entityType: "PROJECT",
  });
  visitedNodeIds.add(projectNodeId);

  // Focus on specific blocked task, or search for blocked tasks in project
  const focusTasks = taskId
    ? project.tasks.filter((t) => t.id === taskId)
    : project.tasks.filter((t) => t.status === "BLOCKED" || t.blockers.length > 0);

  if (focusTasks.length === 0) {
    return {
      targetId: projectId,
      targetTitle: project.name,
      hasCausalChain: false,
      rootCauseSummary: "No active blocked tasks or root blockers detected in this project.",
      nodes,
      edges,
    };
  }

  let rootCauseExplanation = "";

  for (const t of focusTasks) {
    const taskNodeId = `node-task-${t.id}`;
    if (!visitedNodeIds.has(taskNodeId)) {
      nodes.push({
        id: taskNodeId,
        label: `${t.code || "Task"}: ${t.title}`,
        nodeType: "TASK",
        status: t.status as any,
        ownerName: t.assigneeName || "Unassigned",
        layer: t.layer || t.workstream || "Engineering",
        reason: t.blockers[0]?.reason || "Waiting on prerequisites",
        isRootCause: false,
        entityId: t.id,
        entityType: "TASK",
      });
      visitedNodeIds.add(taskNodeId);

      // Edge from Project to Blocked Task
      edges.push({
        id: `edge-${projectNodeId}-${taskNodeId}`,
        from: projectNodeId,
        to: taskNodeId,
        relationType: "CONTAINS",
        label: "Impacts",
      });
    }

    // Traverse upstream dependencies
    for (const dep of t.dependencies) {
      const upstream = dep.dependsOnTask;
      const upstreamNodeId = `node-task-${upstream.id}`;

      if (!visitedNodeIds.has(upstreamNodeId)) {
        nodes.push({
          id: upstreamNodeId,
          label: `${upstream.code || "Prereq"}: ${upstream.title}`,
          nodeType: "TASK",
          status: upstream.status as any,
          ownerName: upstream.assigneeName || "Engineer",
          layer: upstream.layer || "Prerequisite",
          isRootCause: upstream.status !== "DONE",
          entityId: upstream.id,
          entityType: "TASK",
        });
        visitedNodeIds.add(upstreamNodeId);
      }

      edges.push({
        id: `edge-${taskNodeId}-${upstreamNodeId}`,
        from: taskNodeId,
        to: upstreamNodeId,
        relationType: "BLOCKED_BY",
        label: "Depends On",
      });

      // Check if upstream task has active blocker
      const upstreamBlocker = project.tasks
        .find((tsk) => tsk.id === upstream.id)
        ?.blockers[0];

      if (upstreamBlocker) {
        const blockerNodeId = `node-blk-${upstreamBlocker.id}`;
        if (!visitedNodeIds.has(blockerNodeId)) {
          nodes.push({
            id: blockerNodeId,
            label: `Blocker: ${upstreamBlocker.reason}`,
            nodeType: "BLOCKER",
            status: "BLOCKED",
            ownerName: upstreamBlocker.ownerName || upstreamBlocker.ownerRole,
            reason: upstreamBlocker.reason,
            isRootCause: true,
            entityId: upstreamBlocker.id,
            entityType: "BLOCKER",
          });
          visitedNodeIds.add(blockerNodeId);

          edges.push({
            id: `edge-${upstreamNodeId}-${blockerNodeId}`,
            from: upstreamNodeId,
            to: blockerNodeId,
            relationType: "BLOCKED_BY",
            label: "Halted by",
          });

          rootCauseExplanation = `Root Cause: ${upstreamBlocker.reason} (Owned by ${upstreamBlocker.ownerName || upstreamBlocker.ownerRole}). Stalls ${upstream.code || upstream.title}, blocking ${t.code || t.title}.`;
        }
      } else if (!rootCauseExplanation) {
        rootCauseExplanation = `Root Cause: ${upstream.code || upstream.title} (${upstream.status}) must be completed before ${t.code || t.title} can proceed.`;
      }
    }
  }

  // Mark the ultimate origin node as isRootCause: true
  const rootNode = nodes.find((n) => n.isRootCause) || nodes[nodes.length - 1];
  if (rootNode) rootNode.isRootCause = true;

  return {
    targetId: projectId,
    targetTitle: project.name,
    hasCausalChain: edges.length > 0,
    rootCauseSummary:
      rootCauseExplanation ||
      `Root Cause: Prerequisite dependencies for ${focusTasks[0].code || "Task"} must be resolved.`,
    nodes,
    edges,
  };
}
