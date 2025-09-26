import prisma from "./prisma.js";
import { encryptToken } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";

async function main() {
  logger.info(`[Seed] Starting database seeding...`);
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      is_admin: true,
    },
  });
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      is_admin: false,
    },
  });
  const fakeAccessToken1 = encryptToken("access-sandbox-1");
  const fakeAccessToken2 = encryptToken("access-sandbox-2");
  await prisma.account.create({
    data: {
      userId: user.id,
      plaidItemId: "item-1",
      plaidAccessToken: fakeAccessToken1,
      institutionName: "Test Bank 1",
      institutionId: "ins_1",
    },
  });
  await prisma.account.create({
    data: {
      userId: user.id,
      plaidItemId: "item-2",
      plaidAccessToken: fakeAccessToken2,
      institutionName: "Test Bank 2",
      institutionId: "ins_2",
    },
  });
  logger.info(
    `[Seed] Created admin and user with 2 linked accounts for user@example.com`,
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
