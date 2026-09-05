import { askOllamaText, isOllamaAvailable } from "@/lib/ai/ollama/ollama.client";
import { getEmployeeActivationContext } from "./employee-activation.service";

export type CopilotResponse = {
  ok: boolean;
  answer: string;
  sourceContext?: string[];
  suggestedActions?: Array<{ label: string; actionType: string; targetId?: string }>;
  offlineFallback?: boolean;
};

/**
 * AI Onboarding Copilot grounded strictly in authorized employee database records.
 * ZERO hallucination / ZERO invented tasks or projects.
 */
export async function queryEmployeeCopilot(params: {
  employeeId: string;
  question: string;
}): Promise<CopilotResponse> {
  const context = await getEmployeeActivationContext(params.employeeId);
  if (!context) {
    return {
      ok: false,
      answer: "I am unable to retrieve your authorized employee record.",
    };
  }

  // Build high-fidelity factual context
  const facts = {
    employeeName: context.identity.fullName,
    employeeCode: context.identity.employeeCode,
    email: context.identity.email,
    department: context.identity.department,
    roleTitle: context.role.name,
    rolePurpose: context.role.purpose,
    primaryResponsibility: context.role.primaryResponsibility,
    secondaryResponsibilities: context.role.secondaryResponsibilities,
    teamName: context.team.name,
    teamLead: context.team.lead?.name || "None designated",
    managerName: context.manager.name,
    managerRole: context.manager.role,
    readinessScore: context.readiness.score,
    readinessStatus: context.readiness.status,
    activeBlockers: context.readiness.blockers.map((b) => b.title),
    assignedProjects: context.projects.map((p) => ({
      name: p.name,
      code: p.code,
      client: p.clientName,
      workstream: p.workstream,
      role: p.projectRole,
      whyYouAreHere: p.whyYouAreHere,
    })),
    assignedTasks: context.tasks.map((t) => ({
      code: t.code,
      title: t.title,
      status: t.status,
      priority: t.priority,
      project: t.projectName,
      dueAt: t.dueAt,
    })),
    nextBestAction: context.nextBestAction
      ? {
          title: context.nextBestAction.title,
          code: context.nextBestAction.taskCode,
          project: context.nextBestAction.projectName,
          priority: context.nextBestAction.priority,
          whyItMatters: context.nextBestAction.whyItMatters,
        }
      : "No active tasks currently assigned.",
    policies: context.policies.map((p) => ({
      code: p.policyCode,
      title: p.title,
      isRequired: p.isRequired,
      isAcknowledged: p.isAcknowledged,
    })),
    tools: context.tools.map((t) => ({
      key: t.toolKey,
      name: t.toolName,
      status: t.status,
    })),
    canDo: context.permissions.can,
    cannotDo: context.permissions.cannot,
  };

  const systemPrompt = `You are the Business OS Employee Onboarding Copilot.
You are assisting employee ${facts.employeeName} (${facts.roleTitle}) who has recently joined ${context.organization.name}.

STRICT ACCURACY RULES:
1. You MUST answer questions using ONLY the authorized factual database context below.
2. NEVER invent, assume, or hallucinate tasks, projects, deadlines, policies, people, or permissions.
3. If the user asks about something that is not in the context, explicitly state:
   "I can't find that information in your authorized workspace data."
4. Be clear, professional, concise, and helpful.
5. Emphasize what the employee's next priority is based on their real data.

FACTUAL DATABASE CONTEXT:
${JSON.stringify(facts, null, 2)}`;

  const isUp = await isOllamaAvailable();
  if (!isUp) {
    // Deterministic fallback response when Ollama is offline
    const qLower = params.question.toLowerCase();
    let fallbackAnswer = `Here is what is configured in your Business OS record:\n\n• **Role**: ${facts.roleTitle}\n• **Primary Responsibility**: ${facts.primaryResponsibility}\n• **Manager**: ${facts.managerName} (${facts.managerRole})\n• **Team**: ${facts.teamName}`;

    if (qLower.includes("task") || qLower.includes("work") || qLower.includes("first")) {
      if (context.nextBestAction) {
        fallbackAnswer = `Your next highest priority action is **${context.nextBestAction.taskCode}: ${context.nextBestAction.title}** (${context.nextBestAction.priority} priority) in project **${context.nextBestAction.projectName}**.\n\n*Why it matters*: ${context.nextBestAction.whyItMatters}`;
      } else {
        fallbackAnswer = "You currently have no tasks assigned. Your manager will assign your first sprint backlog.";
      }
    } else if (qLower.includes("project")) {
      if (facts.assignedProjects.length > 0) {
        fallbackAnswer = `You are currently allocated to **${facts.assignedProjects.length} project(s)**:\n` +
          facts.assignedProjects.map((p) => `• **${p.name}** (${p.code}) — ${p.whyYouAreHere}`).join("\n");
      } else {
        fallbackAnswer = "You have not been assigned to any client projects yet.";
      }
    } else if (qLower.includes("policy") || qLower.includes("document")) {
      const pendingPolicies = facts.policies.filter((p) => p.isRequired && !p.isAcknowledged);
      if (pendingPolicies.length > 0) {
        fallbackAnswer = `You have **${pendingPolicies.length} required policy acknowledgement(s) pending**:\n` +
          pendingPolicies.map((p) => `• ${p.title} (${p.code})`).join("\n") +
          `\nPlease review and acknowledge them in the Documents & Policies tab.`;
      } else {
        fallbackAnswer = "All required compliance policies have been acknowledged.";
      }
    } else if (qLower.includes("permission") || qLower.includes("access")) {
      fallbackAnswer = `**Your Authorized Capabilities**:\n` +
        facts.canDo.slice(0, 4).map((c) => `✓ ${c}`).join("\n") +
        `\n\n**Restrictions**:\n` +
        facts.cannotDo.slice(0, 3).map((c) => `✕ ${c}`).join("\n");
    }

    return {
      ok: true,
      answer: fallbackAnswer,
      offlineFallback: true,
    };
  }

  const result = await askOllamaText({
    systemPrompt,
    userPrompt: params.question,
    temperature: 0.1,
  });

  if (result.ok && result.content) {
    return {
      ok: true,
      answer: result.content,
      sourceContext: [
        `Role: ${facts.roleTitle}`,
        `Team: ${facts.teamName}`,
        `Assigned Tasks: ${facts.assignedTasks.length}`,
        `Assigned Projects: ${facts.assignedProjects.length}`,
      ],
    };
  }

  // Graceful fallback to verified structured record if Ollama error occurred
  const qLower = params.question.toLowerCase();
  let fallbackAnswer = `**Verified Business OS Record**:\n\n• **Role**: ${facts.roleTitle}\n• **Primary Responsibility**: ${facts.primaryResponsibility}\n• **Manager**: ${facts.managerName} (${facts.managerRole})\n• **Team**: ${facts.teamName}`;

  if (qLower.includes("task") || qLower.includes("work") || qLower.includes("first") || qLower.includes("action")) {
    if (context.nextBestAction) {
      fallbackAnswer = `Your next highest priority action is **${context.nextBestAction.taskCode}: ${context.nextBestAction.title}** (${context.nextBestAction.priority} priority) in project **${context.nextBestAction.projectName}**.\n\n*Why it matters*: ${context.nextBestAction.whyItMatters}`;
    } else {
      fallbackAnswer = "You currently have no tasks assigned. Your manager will assign your first sprint backlog.";
    }
  }

  return {
    ok: true,
    answer: fallbackAnswer,
    offlineFallback: true,
  };
}
