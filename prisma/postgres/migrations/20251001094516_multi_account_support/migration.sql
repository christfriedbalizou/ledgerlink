/*
  Warnings:

  - You are about to drop the column `is_admin` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[plaidAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `plaidItemId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "is_admin",
ADD COLUMN     "balanceAvailable" DOUBLE PRECISION,
ADD COLUMN     "balanceCurrent" DOUBLE PRECISION,
ADD COLUMN     "balanceIsoCurrency" TEXT,
ADD COLUMN     "mask" VARCHAR(8),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "officialName" TEXT,
ADD COLUMN     "plaidAccountId" TEXT,
ADD COLUMN     "plaidItemId" TEXT NOT NULL,
ADD COLUMN     "subtype" TEXT,
ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_plaidAccountId_key" ON "public"."User"("plaidAccountId");
