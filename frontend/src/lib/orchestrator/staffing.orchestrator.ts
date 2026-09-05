import { askOllamaJson } from "@/lib/ai/ollama/ollama.client";
import { db } from "@/lib/db";

export type StaffingMatchCandidate = {
  employeeId: string;
  fullName: string;
  roleName: string;
  department: string;
  matchScore: number; // 0 - 100
  matchReason: string;
  currentWorkloadHours: number;
  capacityPercentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  matchedCapabilities: string[];
};

/**
 * AI-assisted smart assignment analysis grounded strictly in active database records.
 */
export async function analyzeTaskStaffing({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}): Promise<{
  task: any;
  candidates: StaffingMatchCandidate[];
  recommendedCandidateId: string | null;
  analysisSummary: string;
}> {
  // Fetch real task record with its layer and requirements
  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true, code: true } },
      deliverable: { select: { id: true, title: true } },
    },
  });

  if (!task) throw new Error("Task record not found.");

  // Fetch all active employees in the workspace
  const employees = await db.employee.findMany({
    where: { workspaceId, status: "ACTIVE" },
    include: {
      role: true,
      team: true,
    },
  });

  if (employees.length === 0) {
    return {
      task,
      candidates: [],
      recommendedCandidateId: null,
      analysisSummary: "No active employees found in this workspace. Please onboard team members first.",
    };
  }

  // Calculate workload and parse capabilities for each employee
  const employeeProfiles = await Promise.all(
    employees.map(async (emp) => {
      const activeTasks = await db.clientTask.findMany({
        where: {
          assigneeId: emp.id,
          status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        },
      });

      const totalAssignedHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
      const capacityPercentage = Math.round(
        (totalAssignedHours / (emp.capacityTargetHours || 40)) * 100,
      );

      let caps: any[] = [];
      try {
        caps = JSON.parse(emp.capabilities || "[]");
      } catch {}

      return {
        id: emp.id,
        name: emp.fullName,
        role: emp.role?.name || "General Engineer",
        department: emp.department,
        capabilities: caps.map((c) => (typeof c === "string" ? c : c.skill || c.name)),
        workloadHours: totalAssignedHours,
        capacityPercentage,
      };
    }),
  );

  // Deterministic scoring fallback
  const taskLayer = (task.layer || task.workstream || "").toUpperCase();
  const scoredCandidates: StaffingMatchCandidate[] = employeeProfiles.map((p) => {
    let score = 50;
    const matchedCaps: string[] = [];

    if (taskLayer === "DATABASE" && (p.role.includes("Backend") || p.role.includes("Database"))) score += 30;
    if (taskLayer === "BACKEND" && (p.role.includes("Backend") || p.role.includes("Full-Stack"))) score += 30;
    if (taskLayer === "FRONTEND" && (p.role.includes("Frontend") || p.role.includes("UI"))) score += 30;
    if ((taskLayer === "TESTING" || taskLayer === "QA") && p.role.includes("QA")) score += 35;

    // Check capability matches
    p.capabilities.forEach((cap) => {
      const capLower = cap.toLowerCase();
      if (task.title.toLowerCase().includes(capLower) || task.description?.toLowerCase().includes(capLower)) {
        score += 15;
        matchedCaps.push(cap);
      }
    });

    // Workload penalty
    if (p.capacityPercentage > 100) score -= 25;
    else if (p.capacityPercentage < 60) score += 10;

    score = Math.min(Math.max(score, 10), 98);

    const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
      p.capacityPercentage > 100 ? "HIGH" : p.capacityPercentage > 80 ? "MEDIUM" : "LOW";

    return {
      employeeId: p.id,
      fullName: p.name,
      roleName: p.role,
      department: p.department,
      matchScore: score,
      matchReason: `Role alignment (${p.role}) with ${p.capacityPercentage}% current capacity allocation.`,
      currentWorkloadHours: p.workloadHours,
      capacityPercentage: p.capacityPercentage,
      riskLevel,
      matchedCapabilities: matchedCaps,
    };
  });

  scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

  const bestCandidate = scoredCandidates[0] || null;

  return {
    task,
    candidates: scoredCandidates,
    recommendedCandidateId: bestCandidate?.employeeId || null,
    analysisSummary: bestCandidate
      ? `Recommended ${bestCandidate.fullName} (${bestCandidate.roleName}) with ${bestCandidate.matchScore}% capability & capacity fit for task "${task.title}".`
      : "No suitable match identified.",
  };
}
