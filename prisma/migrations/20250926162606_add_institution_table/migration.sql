/*
  Warnings:

  - You are about to drop the column `institutionName` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `institutionName` on the `PlaidItem` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plaidInstitutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Institution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Account_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("createdAt", "id", "institutionId", "plaidItemId", "updatedAt", "userId") SELECT "createdAt", "id", "institutionId", "plaidItemId", "updatedAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_plaidItemId_key" ON "Account"("plaidItemId");
CREATE TABLE "new_PlaidItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidAccessToken" TEXT NOT NULL,
    "products" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaidItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlaidItem" ("createdAt", "id", "institutionId", "plaidAccessToken", "plaidItemId", "products", "updatedAt", "userId") SELECT "createdAt", "id", "institutionId", "plaidAccessToken", "plaidItemId", "products", "updatedAt", "userId" FROM "PlaidItem";
DROP TABLE "PlaidItem";
ALTER TABLE "new_PlaidItem" RENAME TO "PlaidItem";
CREATE UNIQUE INDEX "PlaidItem_plaidItemId_key" ON "PlaidItem"("plaidItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Institution_userId_plaidInstitutionId_key" ON "Institution"("userId", "plaidInstitutionId");
