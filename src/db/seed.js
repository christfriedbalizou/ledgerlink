import { encryptToken } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";

import prisma from "./prisma.js";

async function main() {
  logger.info(`[Seed] Starting database seeding...`);
  await prisma.account.deleteMany();
  await prisma.plaidItem.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();

  const _admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      is_admin: true,
      active: true,
    },
  });
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      is_admin: false,
      active: true,
    },
  });

  const fakeAccessToken1 = encryptToken("access-sandbox-1");
  const fakeAccessToken2 = encryptToken("access-sandbox-2");

  // Create institutions
  const inst1 = await prisma.institution.create({
    data: {
      userId: user.id,
      plaidInstitutionId: "ins_1",
      name: "Test Bank 1",
    },
  });
  const inst2 = await prisma.institution.create({
    data: {
      userId: user.id,
      plaidInstitutionId: "ins_2",
      name: "Test Bank 2",
    },
  });

  const plaidItem1 = await prisma.plaidItem.create({
    data: {
      userId: user.id,
      plaidItemId: "item-1",
      plaidAccessToken: fakeAccessToken1,
      products: "transactions",
      institutionId: inst1.id,
    },
  });
  const plaidItem2 = await prisma.plaidItem.create({
    data: {
      userId: user.id,
      plaidItemId: "item-2",
      plaidAccessToken: fakeAccessToken2,
      products: "auth",
      institutionId: inst2.id,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      plaidItemId: plaidItem1.plaidItemId,
      institutionId: inst1.id,
    },
  });
  await prisma.account.create({
    data: {
      userId: user.id,
      plaidItemId: plaidItem2.plaidItemId,
      institutionId: inst2.id,
    },
  });

  logger.info(
    `[Seed] Created admin, user, 2 institutions, 2 Plaid items and linked accounts for user@example.com`,
  );
  logger.info(`[Seed] Database seeding finished.`);
}

main()
  .catch((e) => {
    logger.error(`[Seed] Seeding failed with error:`);
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
