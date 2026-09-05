-- CreateTable
CREATE TABLE "ProposalVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "document" TEXT NOT NULL DEFAULT '{}',
    "pdfPath" TEXT,
    "pdfPages" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'FINALIZED',
    "changeRequestIds" TEXT NOT NULL DEFAULT '[]',
    "basedOnVersion" INTEGER,
    "createdById" TEXT,
    "createdByName" TEXT,
    "finalizedAt" DATETIME,
    "sentAt" DATETIME,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ClientProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalVersion" INTEGER NOT NULL DEFAULT 1,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'INITIAL',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "sentAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalDelivery_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ClientProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "firstViewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "pdfOpened" BOOLEAN NOT NULL DEFAULT false,
    "pdfViewedAt" DATETIME,
    CONSTRAINT "ProposalView_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ClientProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalVersion" INTEGER NOT NULL DEFAULT 1,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalMethod" TEXT NOT NULL DEFAULT 'SECURE_LINK',
    "clientName" TEXT,
    CONSTRAINT "ProposalApproval_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ClientProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalVersion" INTEGER NOT NULL DEFAULT 1,
    "reference" TEXT NOT NULL DEFAULT '',
    "reasons" TEXT NOT NULL DEFAULT '[]',
    "sections" TEXT NOT NULL DEFAULT '[]',
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "adminResponse" TEXT,
    "submittedByName" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProposalChangeRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ClientProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalChangeRequestItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "changeRequestId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "field" TEXT,
    "currentValue" TEXT,
    "requestedValue" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminResponse" TEXT,
    CONSTRAINT "ProposalChangeRequestItem_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ProposalChangeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalRejection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalVersion" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "clientName" TEXT,
    "rejectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalRejection_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ClientProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "requirementRequestId" TEXT,
    "reference" TEXT,
    "title" TEXT NOT NULL,
    "amount" REAL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "document" TEXT NOT NULL DEFAULT '{}',
    "pdfPath" TEXT,
    "pdfPages" INTEGER DEFAULT 0,
    "finalizedAt" DATETIME,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "validUntil" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tokenHash" TEXT,
    "tokenExpiresAt" DATETIME,
    "tokenRevokedAt" DATETIME,
    "tokenRevokedReason" TEXT,
    "sentTo" TEXT,
    "sentToName" TEXT,
    "firstViewedAt" DATETIME,
    "lastViewedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedAt" DATETIME,
    "rejectedReason" TEXT,
    "rejectedDetails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClientProposal" ("amount", "clientId", "createdAt", "currency", "document", "finalizedAt", "id", "pdfPages", "pdfPath", "reference", "requirementRequestId", "sentAt", "status", "title", "updatedAt", "validUntil", "viewedAt") SELECT "amount", "clientId", "createdAt", "currency", "document", "finalizedAt", "id", "pdfPages", "pdfPath", "reference", "requirementRequestId", "sentAt", "status", "title", "updatedAt", "validUntil", "viewedAt" FROM "ClientProposal";
DROP TABLE "ClientProposal";
ALTER TABLE "new_ClientProposal" RENAME TO "ClientProposal";
CREATE UNIQUE INDEX "ClientProposal_tokenHash_key" ON "ClientProposal"("tokenHash");
CREATE INDEX "ClientProposal_clientId_status_idx" ON "ClientProposal"("clientId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProposalVersion_proposalId_status_idx" ON "ProposalVersion"("proposalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVersion_proposalId_version_key" ON "ProposalVersion"("proposalId", "version");

-- CreateIndex
CREATE INDEX "ProposalDelivery_proposalId_createdAt_idx" ON "ProposalDelivery"("proposalId", "createdAt");

-- CreateIndex
CREATE INDEX "ProposalDelivery_workspaceId_createdAt_idx" ON "ProposalDelivery"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ProposalView_proposalId_idx" ON "ProposalView"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalApproval_proposalId_idx" ON "ProposalApproval"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalChangeRequest_proposalId_status_idx" ON "ProposalChangeRequest"("proposalId", "status");

-- CreateIndex
CREATE INDEX "ProposalChangeRequestItem_changeRequestId_idx" ON "ProposalChangeRequestItem"("changeRequestId");

-- CreateIndex
CREATE INDEX "ProposalRejection_proposalId_idx" ON "ProposalRejection"("proposalId");
