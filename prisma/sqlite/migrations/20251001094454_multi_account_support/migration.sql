/*
  Warnings:

  - A unique constraint covering the columns `[plaidAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Account_plaidItemId_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "balanceAvailable" REAL;
ALTER TABLE "Account" ADD COLUMN "balanceCurrent" REAL;
ALTER TABLE "Account" ADD COLUMN "balanceIsoCurrency" TEXT;
ALTER TABLE "Account" ADD COLUMN "plaidAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_plaidAccountId_key" ON "Account"("plaidAccountId");
