import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { logger } from "../src/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const provider = process.env.DATABASE_PROVIDER || "sqlite";
let url = process.env.DATABASE_URL;
if (!url) {
  url = `file:./ledgerlink.db`;
}

const schema = [
  "// This file is auto-generated. Do not edit directly.",
  "datasource db {",
  `  provider = "${provider}"`,
  `  url      = env("DATABASE_URL")`,
  "}",
  "",
  "// ...existing model definitions will be appended below...",
  "",
].join("\n");

const templatePath = join(__dirname, "../prisma/schema.template.prisma");
const outputPath = join(__dirname, "../prisma/schema.prisma");

const template = readFileSync(templatePath, "utf-8");
const output = schema + template;
writeFileSync(outputPath, output);
logger.info(`Generated schema.prisma with provider: ${provider}`);
