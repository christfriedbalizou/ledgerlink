-- CreateTable
CREATE TABLE "public"."User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "is_admin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Institution" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plaidInstitutionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logo" TEXT,
  "primaryColor" TEXT,
  "url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plaidItemId" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaidItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plaidItemId" TEXT NOT NULL,
  "plaidAccessToken" TEXT NOT NULL,
  "products" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User" ("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_userId_plaidInstitutionId_key" ON "public"."Institution" ("userId", "plaidInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_plaidItemId_key" ON "public"."Account" ("plaidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_plaidItemId_key" ON "public"."PlaidItem" ("plaidItemId");

-- AddForeignKey
ALTER TABLE "public"."Institution" ADD CONSTRAINT "Institution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaidItem" ADD CONSTRAINT "PlaidItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
