#!/usr/bin/env node
/**
 * Unified migrate script for multi-provider setup.
 * Chooses schema based on DATABASE_PROVIDER (sqlite|postgresql).
 * If no migrations exist yet for that provider, creates an initial one via `prisma migrate dev`.
 * Otherwise runs `prisma migrate deploy`.
 *
 * If ALL_PROVIDERS=1, iterates all schemas sequentially.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const schemaMap = {
  sqlite: "prisma/sqlite/schema.prisma",
  postgresql: "prisma/postgres/schema.prisma",
};

function migrateSingle(provider) {
  const schemaPath = schemaMap[provider];
  if (!schemaPath || !existsSync(schemaPath)) {
    console.error(`[db-migrate] Missing schema for provider: ${provider}`);
    process.exit(1);
  }
  if (provider === "sqlite" && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./ledgerlink.db";
    console.log("[db-migrate] Using default SQLite DATABASE_URL=file:./ledgerlink.db");
  }
  if (provider === "postgresql" && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "postgresql://postgres:postgres@localhost:5432/ledgerlink";
    console.log(
      "[db-migrate] Using default Postgres DATABASE_URL=postgresql://postgres:***@localhost:5432/ledgerlink",
    );
  }
  const migrationsDir = schemaPath.replace("schema.prisma", "migrations");
  let hasMigrations = false;
  if (existsSync(migrationsDir)) {
    const entries = readdirSync(migrationsDir).filter((f) => !f.startsWith("."));
    hasMigrations = entries.length > 0;
  }
  try {
    if (!hasMigrations) {
      console.log(
        `[db-migrate] No migrations for ${provider}. Creating initial migration...`,
      );
      execSync(
        `npx prisma migrate dev --name init --schema ${schemaPath} --skip-generate`,
        { stdio: "inherit" },
      );
    } else {
      console.log(`[db-migrate] Applying existing migrations for ${provider}...`);
      execSync(`npx prisma migrate deploy --schema ${schemaPath}`, {
        stdio: "inherit",
      });
    }
    console.log(`[db-migrate] Generating Prisma Client (${provider})...`);
    execSync(`npx prisma generate --schema ${schemaPath}`, { stdio: "inherit" });
    console.log(`[db-migrate] ${provider} done.`);
  } catch (e) {
    console.error(`[db-migrate] Migration failed for ${provider}:`, e.message || e);
    process.exit(1);
  }
}

if (process.env.ALL_PROVIDERS) {
  migrateSingle("sqlite");
  migrateSingle("postgresql");
} else {
  const provider = (process.env.DATABASE_PROVIDER || "sqlite").toLowerCase();
  migrateSingle(provider);
}
