/*
  Warnings:

  - Added the required column `updatedAt` to the `ClientProposal` table without a default value. This is not possible if the table is not empty.

*/
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClientProposal" ("amount", "clientId", "createdAt", "currency", "id", "sentAt", "status", "title", "validUntil", "viewedAt") SELECT "amount", "clientId", "createdAt", "currency", "id", "sentAt", "status", "title", "validUntil", "viewedAt" FROM "ClientProposal";
DROP TABLE "ClientProposal";
ALTER TABLE "new_ClientProposal" RENAME TO "ClientProposal";
CREATE INDEX "ClientProposal_clientId_status_idx" ON "ClientProposal"("clientId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
