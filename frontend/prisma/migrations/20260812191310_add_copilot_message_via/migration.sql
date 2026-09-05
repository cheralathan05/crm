-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientCopilotMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "via" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientCopilotMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientCopilotMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClientCopilotMessage" ("clientId", "content", "createdAt", "id", "role", "userId", "workspaceId") SELECT "clientId", "content", "createdAt", "id", "role", "userId", "workspaceId" FROM "ClientCopilotMessage";
DROP TABLE "ClientCopilotMessage";
ALTER TABLE "new_ClientCopilotMessage" RENAME TO "ClientCopilotMessage";
CREATE INDEX "ClientCopilotMessage_clientId_userId_createdAt_idx" ON "ClientCopilotMessage"("clientId", "userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
