-- CreateTable
CREATE TABLE "RequirementUpdateProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "currentValue" TEXT,
    "proposedValue" TEXT,
    "impact" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdByName" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementUpdateProposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementUpdateProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementUpdateProposal_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementUpdateProposal_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RequirementQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementConflict_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementConflict_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementConflict_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RequirementQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "featureId" TEXT,
    "section" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "question" TEXT NOT NULL,
    "clientQuestion" TEXT,
    "internalNote" TEXT,
    "currentUnderstanding" TEXT,
    "whyWeAsk" TEXT,
    "helpText" TEXT,
    "answerType" TEXT NOT NULL DEFAULT 'LONG_TEXT',
    "options" TEXT NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isBlocking" BOOLEAN NOT NULL DEFAULT false,
    "impact" TEXT NOT NULL DEFAULT '{}',
    "qualityScore" INTEGER,
    "qualityFlags" TEXT NOT NULL DEFAULT '[]',
    "dependsOnQuestionId" TEXT,
    "dependsOnAnswer" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "editHistory" TEXT NOT NULL DEFAULT '[]',
    "generatedAt" DATETIME,
    "generatedById" TEXT,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "reviewedAt" DATETIME,
    "resolvedAt" DATETIME,
    "recipientContactId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "openedAt" DATETIME,
    "respondedAt" DATETIME,
    "response" TEXT,
    "answerData" TEXT,
    "respondedByName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME,
    "tokenRevokedAt" DATETIME,
    "tokenRevokedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequirementQuestion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementQuestion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementQuestion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementQuestion_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "RequirementFeature" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RequirementQuestion" ("clientId", "createdAt", "createdById", "createdByName", "deliveredAt", "id", "internalNote", "openedAt", "question", "recipientContactId", "recipientEmail", "recipientName", "requirementId", "respondedAt", "respondedByName", "response", "section", "sentAt", "status", "tokenExpiresAt", "tokenHash", "tokenRevokedAt", "tokenRevokedReason", "updatedAt", "workspaceId") SELECT "clientId", "createdAt", "createdById", "createdByName", "deliveredAt", "id", "internalNote", "openedAt", "question", "recipientContactId", "recipientEmail", "recipientName", "requirementId", "respondedAt", "respondedByName", "response", "section", "sentAt", "status", "tokenExpiresAt", "tokenHash", "tokenRevokedAt", "tokenRevokedReason", "updatedAt", "workspaceId" FROM "RequirementQuestion";
DROP TABLE "RequirementQuestion";
ALTER TABLE "new_RequirementQuestion" RENAME TO "RequirementQuestion";
CREATE UNIQUE INDEX "RequirementQuestion_tokenHash_key" ON "RequirementQuestion"("tokenHash");
CREATE INDEX "RequirementQuestion_workspaceId_status_idx" ON "RequirementQuestion"("workspaceId", "status");
CREATE INDEX "RequirementQuestion_requirementId_status_idx" ON "RequirementQuestion"("requirementId", "status");
CREATE INDEX "RequirementQuestion_clientId_createdAt_idx" ON "RequirementQuestion"("clientId", "createdAt");
CREATE INDEX "RequirementQuestion_featureId_idx" ON "RequirementQuestion"("featureId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RequirementUpdateProposal_requirementId_status_idx" ON "RequirementUpdateProposal"("requirementId", "status");

-- CreateIndex
CREATE INDEX "RequirementConflict_requirementId_status_idx" ON "RequirementConflict"("requirementId", "status");
