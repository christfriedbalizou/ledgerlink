-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "mask" VARCHAR(8),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "officialName" TEXT,
ADD COLUMN     "subtype" TEXT,
ADD COLUMN     "type" TEXT;
