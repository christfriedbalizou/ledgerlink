// Import the Prisma Client
const { PrismaClient } = require('@prisma/client');

// This file creates a singleton instance of the Prisma client,
// preventing multiple instances from being created, which can cause issues.

// The PrismaClient is a low-level client for interacting with your database.
// It provides a type-safe and auto-generated API for your database models.
const prisma = new PrismaClient({
    // Enable logging for database queries in development environment
    log: [
      {
        emit: 'event',
        level: 'query',
      },
    ],
  });

// Log every database query
prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Params: ${e.params}`);
  console.log(`Duration: ${e.duration}ms`);
});

module.exports = prisma;