#!/usr/bin/env node
/** `npm run reset-demo` — apaga os artefatos do banco de demo (SQLite). */
import { rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

const targets = [
  join(root, "prisma", "dev.db"),
  join(root, "prisma", "dev.db-journal"),
  join(root, "prisma", "schema.sqlite.prisma"),
  join(root, "src", "generated", "prisma-sqlite"),
];

for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`[reset-demo] removido: ${target}`);
  }
}

console.log("[reset-demo] pronto — de volta ao Postgres.");
