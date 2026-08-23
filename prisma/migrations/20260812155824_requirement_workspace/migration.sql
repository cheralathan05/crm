-- CreateTable
CREATE TABLE "RequirementRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectType" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME,
    "tokenRevokedAt" DATETIME,
    "tokenRevokedReason" TEXT,
    "sentTo" TEXT,
    "sentAt" DATETIME,
    "lastOpenedAt" DATETIME,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "currentSection" TEXT NOT NULL DEFAULT 'business',
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "readiness" INTEGER NOT NULL DEFAULT 0,
    "responderName" TEXT,
    "responderRole" TEXT,
    "responderEmail" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequirementRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequirementAnswer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementFeature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'SHOULD_HAVE',
    "users" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL DEFAULT '',
    "config" TEXT NOT NULL DEFAULT '{}',
    "acceptanceCriteria" TEXT NOT NULL DEFAULT '[]',
    "dependencies" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequirementFeature_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'ADMIN',
    "authorName" TEXT NOT NULL,
    "section" TEXT,
    "message" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "submittedByName" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" TEXT NOT NULL DEFAULT '{}',
    "changes" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "RequirementRevision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RequirementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RequirementRequest_tokenHash_key" ON "RequirementRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "RequirementRequest_workspaceId_status_idx" ON "RequirementRequest"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "RequirementRequest_clientId_idx" ON "RequirementRequest"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementAnswer_requestId_section_key" ON "RequirementAnswer"("requestId", "section");

-- CreateIndex
CREATE INDEX "RequirementFeature_requestId_idx" ON "RequirementFeature"("requestId");

-- CreateIndex
CREATE INDEX "RequirementAttachment_requestId_idx" ON "RequirementAttachment"("requestId");

-- CreateIndex
CREATE INDEX "RequirementComment_requestId_createdAt_idx" ON "RequirementComment"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementRevision_requestId_revision_key" ON "RequirementRevision"("requestId", "revision");

-- CreateIndex
CREATE INDEX "RequirementEvent_requestId_createdAt_idx" ON "RequirementEvent"("requestId", "createdAt");
