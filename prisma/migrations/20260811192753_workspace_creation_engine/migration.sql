-- CreateTable
CREATE TABLE "WorkspaceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "legalName" TEXT,
    "website" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "industry" TEXT,
    "businessType" TEXT,
    "businessModel" TEXT,
    "description" TEXT,
    "services" TEXT DEFAULT '[]',
    "targetCustomers" TEXT DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspacePreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'SYSTEM',
    "defaultLanding" TEXT NOT NULL DEFAULT 'OVERVIEW',
    "timezone" TEXT,
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspacePreferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "tasks" BOOLEAN NOT NULL DEFAULT true,
    "clients" BOOLEAN NOT NULL DEFAULT true,
    "projects" BOOLEAN NOT NULL DEFAULT true,
    "proposals" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationPreferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceSetup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "leadSources" TEXT DEFAULT '[]',
    "approvalFlow" TEXT DEFAULT '[]',
    "executionMode" TEXT,
    "teamSize" TEXT,
    "roles" TEXT DEFAULT '[]',
    "workTypes" TEXT DEFAULT '[]',
    "projectDuration" TEXT,
    "clientVolume" TEXT,
    "currentTools" TEXT DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceSetup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Onboarding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "overviewComplete" BOOLEAN NOT NULL DEFAULT false,
    "workspaceSetupComplete" BOOLEAN NOT NULL DEFAULT false,
    "workspaceSetupCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Onboarding" ("createdAt", "id", "overviewComplete", "updatedAt", "userId") SELECT "createdAt", "id", "overviewComplete", "updatedAt", "userId" FROM "Onboarding";
DROP TABLE "Onboarding";
ALTER TABLE "new_Onboarding" RENAME TO "Onboarding";
CREATE UNIQUE INDEX "Onboarding_userId_key" ON "Onboarding"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceProfile_workspaceId_key" ON "WorkspaceProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_workspaceId_key" ON "BusinessProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePreferences_workspaceId_key" ON "WorkspacePreferences"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_workspaceId_key" ON "NotificationPreferences"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSetup_workspaceId_key" ON "WorkspaceSetup"("workspaceId");
