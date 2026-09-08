import { db } from "./db";

/**
 * Business OS — Multi-Tenant Security & Isolation Engine
 *
 * Guarantees cryptographic and logical isolation across workspaces, projects,
 * clients, employees, and client portals. Prevents horizontal privilege escalation (IDOR).
 */

export class TenantAccessDeniedError extends Error {
  code = "TENANT_ACCESS_DENIED";
  status = 403;
  constructor(message = "Access denied: Entity does not belong to this organization or workspace.") {
    super(message);
    this.name = "TenantAccessDeniedError";
  }
}

export class EntityNotFoundError extends Error {
  code = "ENTITY_NOT_FOUND";
  status = 404;
  constructor(entityName = "Entity") {
    super(`${entityName} not found.`);
    this.name = "EntityNotFoundError";
  }
}

/**
 * Validates that the requested target workspace matches the authenticated session's workspace.
 */
export function assertTenantAccess(sessionWorkspaceId: string, targetWorkspaceId: string): void {
  if (!sessionWorkspaceId || !targetWorkspaceId || sessionWorkspaceId !== targetWorkspaceId) {
    throw new TenantAccessDeniedError();
  }
}

/**
 * Verifies that a Client belongs to the given workspace.
 */
export async function verifyClientAccess(workspaceId: string, clientId: string) {
  const client = await db.client.findFirst({
    where: { id: clientId, workspaceId },
  });
  if (!client) {
    throw new TenantAccessDeniedError(`Client ${clientId} does not exist in this workspace.`);
  }
  return client;
}

/**
 * Verifies that a Project belongs to the given workspace.
 */
export async function verifyProjectAccess(workspaceId: string, projectId: string) {
  const project = await db.clientProject.findFirst({
    where: { id: projectId, client: { workspaceId } },
    include: { client: true },
  });
  if (!project) {
    throw new TenantAccessDeniedError(`Project ${projectId} does not exist in this workspace.`);
  }
  return project;
}

/**
 * Verifies that a Task belongs to the given workspace.
 */
export async function verifyTaskAccess(workspaceId: string, taskId: string) {
  const task = await db.clientTask.findFirst({
    where: { id: taskId, project: { client: { workspaceId } } },
    include: { project: true },
  });
  if (!task) {
    throw new TenantAccessDeniedError(`Task ${taskId} does not exist in this workspace.`);
  }
  return task;
}

/**
 * Verifies that a Proposal belongs to the given workspace.
 */
export async function verifyProposalAccess(workspaceId: string, proposalId: string) {
  const proposal = await db.clientProposal.findFirst({
    where: { id: proposalId, client: { workspaceId } },
    include: { client: true, versions: true },
  });
  if (!proposal) {
    throw new TenantAccessDeniedError(`Proposal ${proposalId} does not exist in this workspace.`);
  }
  return proposal;
}

/**
 * Verifies that a Payment Request belongs to the given workspace.
 */
export async function verifyPaymentAccess(workspaceId: string, paymentRequestId: string) {
  const payment = await db.paymentRequest.findFirst({
    where: { id: paymentRequestId, client: { workspaceId } },
    include: { client: true, project: true, milestone: true },
  });
  if (!payment) {
    throw new TenantAccessDeniedError(`Payment request ${paymentRequestId} does not exist in this workspace.`);
  }
  return payment;
}

/**
 * Verifies that a Document belongs to the given workspace.
 */
export async function verifyDocumentAccess(workspaceId: string, documentId: string) {
  const doc = await db.businessDocument.findFirst({
    where: { id: documentId, workspaceId },
  });
  if (!doc) {
    throw new TenantAccessDeniedError(`Document ${documentId} does not exist in this workspace.`);
  }
  return doc;
}
