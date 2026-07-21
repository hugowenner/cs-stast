#!/usr/bin/env node
/** `npm run reset-demo` — apaga o banco de demo (SQLite) e restaura o wiring de Postgres. */
import { rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

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

spawnSync("node", ["scripts/demo/generate-provider.mjs", "postgres"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
console.log("[reset-demo] pronto — de volta ao Postgres.");
