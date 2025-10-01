/*
Warnings:

- A unique constraint covering the columns `[plaidAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Account_plaidItemId_key";

-- AlterTable
ALTER TABLE "public"."Account"
ADD COLUMN "balanceAvailable" DOUBLE PRECISION,
ADD COLUMN "balanceCurrent" DOUBLE PRECISION,
ADD COLUMN "balanceIsoCurrency" TEXT,
ADD COLUMN "plaidAccountId" TEXT,
ALTER COLUMN "mask"
SET
  DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_plaidAccountId_key" ON "public"."Account" ("plaidAccountId");
