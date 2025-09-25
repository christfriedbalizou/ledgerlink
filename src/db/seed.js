const prisma = require('./prisma');
const { Prisma } = require('@prisma/client');

async function main() {
  console.log(`[Seed] Starting database seeding...`);
  
  // We'll check if an admin user already exists.
  const adminExists = await prisma.user.findFirst({
    where: { is_admin: true },
  });

  if (adminExists) {
    console.log(`[Seed] Admin user already exists. Seeding aborted.`);
  } else {
    // Create the first user and designate them as the admin.
    const newAdminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com', // Placeholder email; this will be the first user to log in.
        is_admin: true,
      },
    });

    console.log(`[Seed] Created new admin user: ${newAdminUser.email} (ID: ${newAdminUser.id})`);
  }

  console.log(`[Seed] Database seeding finished.`);
}

// Run the main function and disconnect from the database afterward
main()
  .catch((e) => {
    console.error(`[Seed] Seeding failed with error:`);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });