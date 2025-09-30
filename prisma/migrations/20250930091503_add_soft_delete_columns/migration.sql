-- AlterTable
ALTER TABLE "Account"
ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Institution"
ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "PlaidItem"
ADD COLUMN "deletedAt" DATETIME;
