#!/usr/bin/env node
/**
 * Dynamic migration generator for multi-provider support.
 *
 * Goal: Allow distributing the project without provider-specific SQL migrations.
 * When an end user selects a provider (sqlite, postgresql, etc.) this script can
 * synthesize an initial migration tailored to that provider using `prisma migrate diff`.
 *
 * Behavior:
 * 1. Ensures `prisma/schema.prisma` is (re)generated via existing template workflow.
 * 2. If `prisma/migrations` already contains migrations and PRISMA_FORCE_BASELINE is not set, it exits.
 * 3. Otherwise it creates a timestamped init migration folder and populates migration.sql
 *    with the output of `prisma migrate diff --from-empty --to-schema-datamodel`.
 *
 * Usage:
 *    DATABASE_PROVIDER=postgresql DATABASE_URL=postgres://... PRISMA_DYNAMIC=1 node scripts/generate-dynamic-migration.js
 * or integrate into a package.json script:
 *    "db:dynamic": "PRISMA_DYNAMIC=1 node scripts/generate-dynamic-migration.js && prisma migrate deploy && prisma generate"
 *
 * Environment Flags:
 *  PRISMA_DYNAMIC (truthy)        : Enables dynamic generation (otherwise no-op)
 *  PRISMA_FORCE_BASELINE=1        : Regenerates even if migrations exist (CAUTION)
 *  DATABASE_PROVIDER              : Provider (sqlite, postgresql, mysql, etc.) already used by generate-schema.js
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prismaDir = join(__dirname, "../prisma");
const migrationsDir = join(prismaDir, "migrations");

const dynamicEnabled =
  !!process.env.PRISMA_DYNAMIC || !!process.env.PRISMA_FORCE_BASELINE;
if (!dynamicEnabled) {
  console.log(
    "[dynamic-migrate] PRISMA_DYNAMIC not set; skipping dynamic migration generation.",
  );
  process.exit(0);
}

if (!existsSync(migrationsDir)) {
  mkdirSync(migrationsDir, { recursive: true });
}

const existing = readdirSync(migrationsDir).filter((f) => !f.startsWith("."));
if (existing.length > 0 && !process.env.PRISMA_FORCE_BASELINE) {
  console.log(
    "[dynamic-migrate] Migrations already present; skipping (set PRISMA_FORCE_BASELINE=1 to override).",
  );
  process.exit(0);
}

const provider = process.env.DATABASE_PROVIDER || "sqlite";
console.log(
  `[dynamic-migrate] Generating baseline migration for provider: ${provider}`,
);

// Ensure schema.prisma is in place (calls existing script)
try {
  execSync("node scripts/generate-schema.js", { stdio: "inherit" });
} catch (e) {
  console.error("[dynamic-migrate] Failed generating schema.prisma", e.message || e);
  process.exit(1);
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14); // yyyymmddHHMMSS
const migName = `${timestamp}_init_${provider}`;
const targetFolder = join(migrationsDir, migName);
mkdirSync(targetFolder, { recursive: true });
const outFile = join(targetFolder, "migration.sql");

try {
  const diffCmd =
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script";
  const sql = execSync(diffCmd, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const header = `-- Dynamic baseline migration\n-- Provider: ${provider}\n-- Generated: ${new Date().toISOString()}\n\n`;
  writeFileSync(outFile, header + sql);
  console.log(`[dynamic-migrate] Baseline migration created at ${outFile}`);
} catch (e) {
  console.error("[dynamic-migrate] Failed to generate diff migration:", e.message || e);
  process.exit(1);
}

console.log("[dynamic-migrate] Done. Apply with: npx prisma migrate deploy");
