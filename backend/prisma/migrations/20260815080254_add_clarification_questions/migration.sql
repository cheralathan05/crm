-- CreateTable
CREATE TABLE "RequirementQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "internalNote" TEXT,
    "recipientContactId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY_TO_SEND',
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "openedAt" DATETIME,
    "respondedAt" DATETIME,
    "response" TEXT,
    "respondedByName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME,
    "tokenRevokedAt" DATETIME,
    "tokenRevokedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequirementQuestion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementQuestion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementQuestion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'INITIAL',
    "recipient" TEXT NOT NULL,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENDING',
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "openedAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionDelivery_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RequirementQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RequirementQuestion_tokenHash_key" ON "RequirementQuestion"("tokenHash");

-- CreateIndex
CREATE INDEX "RequirementQuestion_workspaceId_status_idx" ON "RequirementQuestion"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "RequirementQuestion_requirementId_status_idx" ON "RequirementQuestion"("requirementId", "status");

-- CreateIndex
CREATE INDEX "RequirementQuestion_clientId_createdAt_idx" ON "RequirementQuestion"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionDelivery_questionId_createdAt_idx" ON "QuestionDelivery"("questionId", "createdAt");
