import { db } from "@/lib/db";
import { CONFIGURATION_REGISTRY } from "./configuration-registry";

export interface SimulationResult {
  simulationId: string;
  scenario: string;
  key: string;
  proposedValue: any;
  simulatedAt: string;
  isSafe: boolean;
  affectedUsersCount: number;
  affectedRecordsCount: number;
  affectedWorkflowsCount: number;
  blockedActionsCount: number;
  dependentIntegrationsCount: number;
  impactDetails: {
    affectedEntities: string[];
    blockedActions: string[];
    policyImplications: string[];
    consequences: string[];
    rollbackFeasibility: "INSTANT" | "MODERATE" | "HIGH_EFFORT";
  };
}

/**
 * Executes a read-only, non-destructive policy simulation
 * against actual database entities.
 */
export async function simulateConfigurationChange(
  workspaceId: string,
  key: string,
  proposedValue: any
): Promise<SimulationResult> {
  const definition = CONFIGURATION_REGISTRY[key];
  if (!definition) {
    throw new Error(`Setting ${key} not recognized.`);
  }

  const [
    employees,
    projects,
    tasks,
    apiKeys,
    webhooks,
    teams,
  ] = await Promise.all([
    db.employee.findMany({
      where: { workspaceId },
      include: { role: true, team: true },
      take: 50,
    }),
    db.clientProject.findMany({
      where: { client: { workspaceId } },
      include: { client: true },
      take: 20,
    }),
    db.clientTask.findMany({
      where: { project: { client: { workspaceId } } },
      select: { id: true, title: true, status: true },
      take: 100,
    }),
    db.apiKey.findMany({ where: { workspaceId } }),
    db.webhookSubscription.findMany({ where: { workspaceId } }),
    db.organizationTeam.findMany({ where: { workspaceId } }),
  ]);

  let affectedUsersCount = 0;
  let affectedRecordsCount = 0;
  let affectedWorkflowsCount = 0;
  let blockedActionsCount = 0;
  let dependentIntegrationsCount = 0;
  let isSafe = true;

  const affectedEntities: string[] = [];
  const blockedActions: string[] = [];
  const policyImplications: string[] = [];
  const consequences: string[] = [];
  let rollbackFeasibility: "INSTANT" | "MODERATE" | "HIGH_EFFORT" = "INSTANT";

  if (key === "security.mfa_enforcement") {
    if (proposedValue === "MANDATORY") {
      affectedUsersCount = employees.length;
      affectedRecordsCount = employees.length;
      blockedActionsCount = employees.filter((e) => e.status !== "ACTIVE").length;
      isSafe = employees.length <= 10;
      rollbackFeasibility = "INSTANT";

      affectedEntities.push(
        ...employees.slice(0, 5).map((e) => `User Account: ${e.fullName} (${e.email})`)
      );
      if (employees.length > 5) {
        affectedEntities.push(`...and ${employees.length - 5} more team members`);
      }

      blockedActions.push(
        "Direct single-factor password logins will be rejected at the auth gate",
        "Sessions without verified TOTP authenticator will be prompted to enroll immediately",
        "Automated scripts relying on plain credentials without API keys will be rejected"
      );

      policyImplications.push(
        "Guarantees compliance with SOC2 Type II MFA mandates across all workspace scopes",
        "Enforces single-use recovery code generation for emergency lockout mitigation"
      );

      consequences.push(
        `All ${employees.length} team members must scan an authenticator QR code upon their next login`,
        "Admins will need an out-of-band recovery channel if an engineer loses access"
      );
    } else if (proposedValue === "ADMINS_ONLY") {
      const admins = employees.filter(
        (e) => e.role?.name?.toLowerCase().includes("admin") || e.role?.name?.toLowerCase().includes("lead")
      );
      affectedUsersCount = admins.length || 1;
      affectedRecordsCount = affectedUsersCount;
      affectedEntities.push(`Owner & Admins: ${admins.map((a) => a.fullName).join(", ") || "Owner account"}`);
      blockedActions.push("Admins without MFA will be blocked from Settings and Billing");
      policyImplications.push("Balances high security for privilege accounts with low friction for engineers");
    }
  } else if (key === "workflow.proof_review_required") {
    affectedWorkflowsCount = tasks.length;
    affectedRecordsCount = tasks.length;
    affectedUsersCount = employees.length;
    rollbackFeasibility = "INSTANT";

    if (proposedValue === true) {
      const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
      blockedActionsCount = inProgressTasks.length;

      affectedEntities.push(
        ...projects.map((p) => `Project: ${p.name} (${tasks.length} active workstreams)`)
      );

      blockedActions.push(
        "Tasks cannot transition directly from 'IN_PROGRESS' to 'COMPLETED'",
        "Completion requires an uploaded code commit, PR, test run, or artifact screenshot",
        "Direct client signoff cannot occur until internal QA or Admin verifies proof"
      );

      policyImplications.push(
        "Enforces zero unverified work submissions across all active deliverables",
        "Protects client deliverables from premature completion claims"
      );

      consequences.push(
        `Increases review throughput demand on QA and Leads for ${inProgressTasks.length} pending tasks`
      );
    } else {
      isSafe = false;
      blockedActions.push("None — QA verification gate is bypassed");
      consequences.push(
        "WARNING: Engineers will be able to mark tasks complete without proof artifacts."
      );
    }
  } else if (key === "payments.confirmation_workflow") {
    affectedRecordsCount = projects.length;
    affectedWorkflowsCount = 1;
    dependentIntegrationsCount = 2; // Excel + Receipts
    rollbackFeasibility = "INSTANT";

    if (proposedValue === "ADMIN_CONFIRMATION" || proposedValue === "DUAL_VERIFICATION") {
      blockedActions.push(
        "Inbound webhook events will mark transactions 'PENDING_CONFIRMATION' instead of 'CONFIRMED'",
        "Receipts will NOT be automatically released to client portal until confirmed",
        "Excel revenue sync will flag line items as unconfirmed until admin stamp"
      );
      policyImplications.push(
        "Prevents unverified bank wire or credit balance anomalies from entering financial reports"
      );
      consequences.push(
        "Requires designated Billing Admin or Owner to click Confirm on each payment"
      );
    }
  } else if (key === "portal.client_payment_visibility") {
    affectedRecordsCount = projects.length;
    affectedUsersCount = projects.length;
    rollbackFeasibility = "INSTANT";

    if (proposedValue === false) {
      blockedActions.push(
        "Clients visiting portal will see no 'Invoices' or 'Payments' tab",
        "Direct payment request links will present access restricted screen"
      );
      consequences.push(
        "Clients must receive manual billing statements via email rather than self-service portal"
      );
    } else {
      consequences.push(
        "Clients will have 24/7 visibility into invoice breakdown and payment history"
      );
    }
  } else if (key === "integrations.excel_sync_policy") {
    affectedRecordsCount = tasks.length + projects.length;
    dependentIntegrationsCount = 1;
    rollbackFeasibility = "MODERATE";

    if (proposedValue === "DISABLED") {
      blockedActions.push("Excel Data Hub automatic sync triggers will be silenced");
      consequences.push("Changes made in spreadsheets will no longer update Business OS tasks");
    } else {
      consequences.push(
        `Sync policy '${proposedValue}' will apply across ${projects.length} project sheets`
      );
    }
  } else {
    affectedUsersCount = employees.length;
    affectedRecordsCount = projects.length;
    consequences.push(`Applies configuration update to '${key}'.`);
  }

  return {
    simulationId: `sim_${Date.now()}`,
    scenario: `What happens if ${definition.name} becomes '${JSON.stringify(proposedValue)}'?`,
    key,
    proposedValue,
    simulatedAt: new Date().toISOString(),
    isSafe,
    affectedUsersCount,
    affectedRecordsCount,
    affectedWorkflowsCount,
    blockedActionsCount,
    dependentIntegrationsCount,
    impactDetails: {
      affectedEntities,
      blockedActions,
      policyImplications,
      consequences,
      rollbackFeasibility,
    },
  };
}
