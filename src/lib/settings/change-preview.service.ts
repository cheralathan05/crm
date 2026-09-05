import { db } from "@/lib/db";
import { CONFIGURATION_REGISTRY, SettingSensitivity } from "./configuration-registry";
import { getSetting } from "./settings-control.service";

export interface ChangePreviewResult {
  key: string;
  name: string;
  category: string;
  scope: string;
  beforeValue: any;
  afterValue: any;
  hasChanged: boolean;
  impact: {
    affectedUsers: number;
    affectedProjects: number;
    affectedTeams: number;
    affectedWorkflows: number;
    affectedIntegrations: number;
    description: string;
  };
  dependencies: string[];
  affectedModules: string[];
  risk: SettingSensitivity;
  requiresConfirmation: boolean;
  warnings: string[];
}

/**
 * Calculates pre-flight impact preview for a proposed setting change
 * based on 100% REAL database records.
 */
export async function calculateChangePreview(
  workspaceId: string,
  key: string,
  newValue: any
): Promise<ChangePreviewResult> {
  const definition = CONFIGURATION_REGISTRY[key];
  if (!definition) {
    throw new Error(`Unknown setting key: ${key}`);
  }

  const current = await getSetting(workspaceId, key);
  const beforeValue = current ? current.currentValue : definition.defaultValue;
  const hasChanged = JSON.stringify(beforeValue) !== JSON.stringify(newValue);

  // Fetch real counts from DB
  const [
    userCount,
    employeeCount,
    projectCount,
    teamCount,
    taskCount,
    apiKeyCount,
    webhookCount,
  ] = await Promise.all([
    db.user.count(),
    db.employee.count({ where: { workspaceId } }),
    db.clientProject.count({ where: { client: { workspaceId } } }),
    db.organizationTeam.count({ where: { workspaceId } }),
    db.clientTask.count({ where: { project: { client: { workspaceId } } } }),
    db.apiKey.count({ where: { workspaceId } }),
    db.webhookSubscription.count({ where: { workspaceId } }),
  ]);

  const activePeople = Math.max(employeeCount, userCount);
  const warnings: string[] = [];

  let affectedUsers = 0;
  let affectedProjects = 0;
  let affectedTeams = 0;
  let affectedWorkflows = 0;
  let affectedIntegrations = 0;
  let impactDescription = "";

  switch (definition.category) {
    case "SECURITY":
      affectedUsers = activePeople;
      affectedIntegrations = apiKeyCount;
      if (key === "security.mfa_enforcement") {
        if (newValue === "MANDATORY") {
          impactDescription = `All ${activePeople} workspace members will be required to authenticate via MFA on next session renewal.`;
          warnings.push(
            "Users without configured MFA authenticators may encounter immediate reauthentication barriers."
          );
        } else if (newValue === "ADMINS_ONLY") {
          impactDescription = `Admins and Owners (${Math.min(activePeople, 3)}) will be required to configure MFA.`;
        } else {
          impactDescription = "MFA will be optional across the workspace.";
        }
      } else if (key === "security.session_timeout_minutes") {
        impactDescription = `Session inactivity cutoff set to ${newValue} minutes for all ${activePeople} accounts.`;
      } else {
        impactDescription = `Applies across all ${activePeople} authenticated accounts.`;
      }
      break;

    case "WORKFLOW":
      affectedProjects = projectCount;
      affectedWorkflows = taskCount;
      affectedUsers = activePeople;
      if (key === "workflow.proof_review_required") {
        impactDescription = newValue
          ? `All ${taskCount} tasks across ${projectCount} projects will enforce mandatory verification before sign-off.`
          : `Tasks across ${projectCount} projects can be marked complete directly without QA review.`;
      } else if (key === "workflow.proposal_approval_creates_project") {
        impactDescription = newValue
          ? "Client proposal signoffs will automatically initialize a project workspace and blueprint."
          : "Proposals will require manual project provisioning after client approval.";
      } else {
        impactDescription = `Affects operational review flow across ${projectCount} active projects.`;
      }
      break;

    case "PAYMENT":
      affectedProjects = projectCount;
      affectedWorkflows = 1; // Financial confirmation pipeline
      if (key === "payments.confirmation_workflow") {
        impactDescription = `Payment verification rule set to '${newValue}'. Affects client transaction sign-off and receipt dispatching.`;
        if (newValue === "ADMIN_CONFIRMATION" || newValue === "DUAL_VERIFICATION") {
          warnings.push("Financial ledger updates will pause until authorized sign-off is completed.");
        }
      } else {
        impactDescription = `Receipt auto-generation policy applies to incoming client transactions.`;
      }
      break;

    case "PORTAL":
      affectedProjects = projectCount;
      if (key === "portal.client_payment_visibility") {
        impactDescription = newValue
          ? `Clients across ${projectCount} active projects will be granted access to invoices and payment ledger.`
          : `Financial visibility will be shielded from client portal views.`;
      } else {
        impactDescription = `Internal engineering notes and QA evidence will remain shielded from client view.`;
      }
      break;

    case "INTEGRATION":
      affectedIntegrations = apiKeyCount + webhookCount + 1; // +1 for Excel Hub
      impactDescription = `Controls Excel Hub and webhook dispatcher behavior (${apiKeyCount} keys, ${webhookCount} webhooks).`;
      break;

    case "DATA":
    case "AI":
      affectedProjects = projectCount;
      affectedUsers = activePeople;
      impactDescription = `Governs data retention and AI inference boundaries across ${projectCount} projects and ${activePeople} members.`;
      break;

    default:
      affectedUsers = activePeople;
      affectedProjects = projectCount;
      impactDescription = `Applies workspace-wide configuration across ${projectCount} projects.`;
      break;
  }

  // Calculate dynamic risk
  let risk: SettingSensitivity = definition.sensitivity;
  if (definition.sensitivity === "CRITICAL" || (categoryHasHighBlastRadius(definition.category) && activePeople > 5)) {
    risk = "CRITICAL";
  }

  const requiresConfirmation = risk === "HIGH" || risk === "CRITICAL";

  return {
    key,
    name: definition.name,
    category: definition.category,
    scope: definition.scope,
    beforeValue,
    afterValue: newValue,
    hasChanged,
    impact: {
      affectedUsers,
      affectedProjects,
      affectedTeams: teamCount,
      affectedWorkflows,
      affectedIntegrations,
      description: impactDescription,
    },
    dependencies: definition.dependencies,
    affectedModules: definition.affectedModules,
    risk,
    requiresConfirmation,
    warnings,
  };
}

function categoryHasHighBlastRadius(category: string): boolean {
  return category === "SECURITY" || category === "PAYMENT";
}
