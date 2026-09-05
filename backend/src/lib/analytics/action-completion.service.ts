import { db } from "@/lib/db";
import { generateReceiptPdf } from "@/lib/payments/receipt-pdf.service";

export interface ActionExecutionResult {
  ok: boolean;
  message: string;
  updatedEntityId: string;
  entityType: string;
  unlockedItemsCount?: number;
  changesSummary: string;
}

/**
 * Action Completion Loop (Rules 05 & 06):
 * Executes authentic database mutations directly from the Command Center,
 * unlocks downstream dependencies, generates auditable documentation,
 * and causes resolved attention items to disappear automatically on next query.
 */
export async function executeCommandCenterAction(params: {
  actionType: string;
  payload: any;
  actorId?: string;
  actorName?: string;
}): Promise<ActionExecutionResult> {
  const actor = params.actorName || "Admin";
  const now = new Date();

  // ────────────────────────────────────────────────────────────────
  // 01. ACTION: CONFIRM_PAYMENT
  // ────────────────────────────────────────────────────────────────
  if (params.actionType === "CONFIRM_PAYMENT" && params.payload?.paymentId) {
    const payment = await db.paymentRequest.findUnique({
      where: { id: params.payload.paymentId },
      include: {
        client: true,
        project: true,
        submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      },
    });

    if (!payment) {
      return {
        ok: false,
        message: "Payment request not found.",
        updatedEntityId: params.payload.paymentId,
        entityType: "PAYMENT_REQUEST",
        changesSummary: "Failed: record not found",
      };
    }

    // 1. Update PaymentRequest to CONFIRMED
    await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
      },
    });

    // 2. Generate Receipt Record & PDF
    const receiptNum = `REC-${now.getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    let pdfPath: string | null = null;
    try {
      const pdfRes = await generateReceiptPdf({
        receiptNumber: receiptNum,
        transactionNumber: payment.submissions[0]?.transactionRef || `TXN-${receiptNum}`,
        paymentDate: payment.submissions[0]?.submittedAt || now,
        confirmedAt: now,
        confirmedByName: actor,
        clientName: payment.client.companyName,
        clientEmail: payment.client.email,
        projectName: payment.project?.name,
        projectCode: payment.project?.code,
        reason: payment.title,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.submissions[0]?.paymentMethod || "Bank Transfer",
        reference: payment.reference,
      });
      pdfPath = pdfRes.storagePath;
    } catch (e) {
      console.warn("Receipt PDF generation fallback:", e);
    }

    // Create PaymentReceipt in DB
    const receipt = await db.paymentReceipt.create({
      data: {
        receiptNumber: receiptNum,
        transactionId: payment.submissions[0]?.id || payment.id,
        clientId: payment.clientId,
        projectId: payment.projectId,
        requestId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentDate: payment.submissions[0]?.submittedAt || now,
        paymentMethod: payment.submissions[0]?.paymentMethod || "Bank Transfer",
        reference: payment.reference,
        confirmedByName: actor,
        confirmedAt: now,
        pdfPath,
        status: "ISSUED",
      },
    });

    // 3. Register as BusinessDocument
    await db.businessDocument.create({
      data: {
        title: `Payment Receipt — ${receiptNum}`,
        reference: receiptNum,
        fileName: `${receiptNum}.pdf`,
        category: "PAYMENT_RECEIPT",
        status: "APPROVED",
        healthState: "READY",
        storagePath: pdfPath || `receipts/${receiptNum}.pdf`,
        mimeType: "application/pdf",
        fileSize: 2400,
        version: 1,
        sourceType: "PAYMENT_RECEIPT",
        sourceId: receipt.id,
        clientId: payment.clientId,
        projectId: payment.projectId,
        summary: `Official confirmed payment receipt for ${payment.title} (${payment.currency} ${payment.amount.toLocaleString()})`,
        createdByName: actor,
      },
    });

    // 4. Log Audit Activity
    await db.financialAuditLog.create({
      data: {
        requestId: payment.id,
        actorName: actor,
        action: "CONFIRMED",
        entityType: "PAYMENT_REQUEST",
        entityId: payment.id,
        beforeState: JSON.stringify({ status: payment.status }),
        afterState: JSON.stringify({ status: "CONFIRMED", receiptNumber: receiptNum }),
        reason: `Payment verified by ${actor}. Official receipt ${receiptNum} issued.`,
      },
    });

    if (payment.projectId) {
      await db.projectActivity.create({
        data: {
          projectId: payment.projectId,
          type: "PAYMENT_CONFIRMED",
          title: `Payment Confirmed: ${payment.currency} ${payment.amount.toLocaleString()}`,
          detail: `Payment for "${payment.title}" confirmed by ${actor}. Receipt ${receiptNum} issued.`,
          actorName: actor,
        },
      });
    }

    return {
      ok: true,
      message: `Payment of ${payment.currency} ${payment.amount.toLocaleString()} confirmed. Receipt ${receiptNum} issued.`,
      updatedEntityId: payment.id,
      entityType: "PAYMENT_REQUEST",
      changesSummary: `Status changed to CONFIRMED • Receipt ${receiptNum} generated • Document registered`,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 02. ACTION: APPROVE_TASK_REVIEW
  // ────────────────────────────────────────────────────────────────
  if (params.actionType === "APPROVE_TASK_REVIEW" && params.payload?.taskId) {
    const task = await db.clientTask.findUnique({
      where: { id: params.payload.taskId },
      include: {
        project: true,
        dependentOnMe: { include: { task: true } },
      },
    });

    if (!task) {
      return {
        ok: false,
        message: "Task not found.",
        updatedEntityId: params.payload.taskId,
        entityType: "TASK",
        changesSummary: "Failed: record not found",
      };
    }

    // 1. Mark task DONE
    await db.clientTask.update({
      where: { id: task.id },
      data: {
        status: "DONE",
        completedAt: now,
      },
    });

    // 2. Unlock downstream dependencies
    let unlockedCount = 0;
    for (const dep of task.dependentOnMe) {
      // Check if all other prerequisites for this downstream task are DONE
      const otherPrereqs = await db.taskDependency.findMany({
        where: {
          taskId: dep.taskId,
          dependsOnTaskId: { not: task.id },
        },
        include: { dependsOnTask: true },
      });

      const allMet = otherPrereqs.every(
        (p) =>
          p.dependsOnTask.status === "DONE" ||
          p.dependsOnTask.status === "COMPLETED" ||
          p.dependsOnTask.status === "CLIENT_APPROVED",
      );

      if (allMet && dep.task.status === "BLOCKED") {
        await db.clientTask.update({
          where: { id: dep.taskId },
          data: { status: "READY" },
        });
        unlockedCount++;
      }
    }

    // 3. Record Project Activity
    if (task.projectId) {
      await db.projectActivity.create({
        data: {
          projectId: task.projectId,
          type: "TASK_APPROVED",
          title: `Work Approved: ${task.code || "Task"}`,
          detail: `Verification approved by ${actor}. ${unlockedCount > 0 ? `Unlocked ${unlockedCount} downstream dependent tasks.` : ""}`,
          actorName: actor,
        },
      });
    }

    // 4. Record Employee Contribution if assigned
    if (task.assigneeId && task.projectId) {
      const emp = await db.employee.findFirst({
        where: { OR: [{ id: task.assigneeId }, { userId: task.assigneeId }] },
      });
      if (emp) {
        await db.employeeContribution.create({
          data: {
            employeeId: emp.id,
            projectId: task.projectId,
            type: "REVIEW_APPROVED",
            title: `Work Approved: ${task.title}`,
            detail: `Code and acceptance criteria verified for ${task.code || "Task"}.`,
            impactText:
              unlockedCount > 0
                ? `Unlocked ${unlockedCount} downstream tasks.`
                : "Deliverable verified on schedule.",
            occurredAt: now,
          },
        });
      }
    }

    return {
      ok: true,
      message: `Task ${task.code || task.title} verified and marked DONE.`,
      updatedEntityId: task.id,
      entityType: "TASK",
      unlockedItemsCount: unlockedCount,
      changesSummary: `Status changed to DONE • ${unlockedCount} downstream tasks unlocked to READY`,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 03. ACTION: RESOLVE_BLOCKER
  // ────────────────────────────────────────────────────────────────
  if (params.actionType === "RESOLVE_BLOCKER" && params.payload?.taskId) {
    const task = await db.clientTask.findUnique({
      where: { id: params.payload.taskId },
      include: { blockers: { where: { status: "ACTIVE" } }, project: true },
    });

    if (!task) {
      return {
        ok: false,
        message: "Task not found.",
        updatedEntityId: params.payload.taskId,
        entityType: "TASK",
        changesSummary: "Failed: record not found",
      };
    }

    // Resolve all active blockers on this task
    await db.projectBlocker.updateMany({
      where: { taskId: task.id, status: "ACTIVE" },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        expectedAction: `Resolved by ${actor}`,
      },
    });

    // Unblock the task to IN_PROGRESS or READY
    await db.clientTask.update({
      where: { id: task.id },
      data: { status: task.startedAt ? "IN_PROGRESS" : "READY" },
    });

    if (task.projectId) {
      await db.projectActivity.create({
        data: {
          projectId: task.projectId,
          type: "BLOCKER_RESOLVED",
          title: `Blocker Cleared: ${task.code || "Task"}`,
          detail: `Blockage resolved by ${actor}. Task moved to active queue.`,
          actorName: actor,
        },
      });
    }

    return {
      ok: true,
      message: `Blocker on ${task.code || task.title} cleared. Work resumed.`,
      updatedEntityId: task.id,
      entityType: "TASK",
      changesSummary: "Blocker marked RESOLVED • Task status restored to active",
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 04. ACTION: APPROVE_SCOPE_DRIFT
  // ────────────────────────────────────────────────────────────────
  if (params.actionType === "APPROVE_SCOPE_DRIFT" && params.payload?.taskId) {
    const task = await db.clientTask.findUnique({
      where: { id: params.payload.taskId },
      include: { project: true },
    });

    if (!task) {
      return {
        ok: false,
        message: "Task not found.",
        updatedEntityId: params.payload.taskId,
        entityType: "TASK",
        changesSummary: "Failed: record not found",
      };
    }

    await db.clientTask.update({
      where: { id: task.id },
      data: {
        isInvalidWork: false,
        invalidReason: null,
      },
    });

    if (task.projectId) {
      await db.projectActivity.create({
        data: {
          projectId: task.projectId,
          type: "SCOPE_APPROVED",
          title: `Scope Variation Approved: ${task.code || "Task"}`,
          detail: `Work item "${task.title}" formally ratified by ${actor} into approved project baseline.`,
          actorName: actor,
        },
      });
    }

    return {
      ok: true,
      message: `Scope variation for ${task.code || task.title} approved into project scope.`,
      updatedEntityId: task.id,
      entityType: "TASK",
      changesSummary: "Work ratified into approved scope baseline",
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 05. ACTION: RESOLVE_RISK
  // ────────────────────────────────────────────────────────────────
  if (params.actionType === "RESOLVE_RISK" && params.payload?.riskId) {
    const risk = await db.businessRisk.findUnique({
      where: { id: params.payload.riskId },
    });

    if (!risk) {
      return {
        ok: false,
        message: "Risk not found.",
        updatedEntityId: params.payload.riskId,
        entityType: "BUSINESS_RISK",
        changesSummary: "Failed: record not found",
      };
    }

    await db.businessRisk.update({
      where: { id: risk.id },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        resolutionNotes: `Mitigated and resolved by ${actor}.`,
      },
    });

    return {
      ok: true,
      message: `Risk "${risk.title}" resolved.`,
      updatedEntityId: risk.id,
      entityType: "BUSINESS_RISK",
      changesSummary: "Risk status transitioned to RESOLVED",
    };
  }

  return {
    ok: false,
    message: `Unknown or unhandled action type: ${params.actionType}`,
    updatedEntityId: "",
    entityType: "UNKNOWN",
    changesSummary: "No changes executed",
  };
}
