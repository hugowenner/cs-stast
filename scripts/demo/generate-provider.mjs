#!/usr/bin/env node
/**
 * Escreve src/server/db.provider.ts para apontar para o driver Postgres (padrão) ou
 * SQLite (modo demo). Rodado automaticamente antes de `npm run dev`/`build` (sempre
 * restaura Postgres) e explicitamente por `npm run demo` (troca para SQLite).
 * Nunca editar db.provider.ts à mão — é sempre regenerado por este script.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(__dirname, "../../src/server/db.provider.ts");

const provider = process.argv[2];

const POSTGRES_CONTENT = `/**
 * GERADO por scripts/demo/generate-provider.mjs — não editar à mão.
 *
 * Indireção de uma linha: qual driver adapter + Prisma Client usar. Existe só para que
 * \`npm run demo\` (SQLite, ver docs/DEMO.md) possa trocar o provedor sem tocar em
 * \`db.ts\`. \`npm run dev\`/\`npm run build\` sempre regeneram este arquivo de volta para
 * Postgres antes de rodar (hooks \`predev\`/\`prebuild\`), então esquecer de "sair" do modo
 * demo nunca quebra o fluxo normal.
 */
export { PrismaClient } from "@/generated/prisma";
export { PrismaPg as DriverAdapter } from "@prisma/adapter-pg";

export function buildAdapterOptions() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não está definida.");
  return { connectionString };
}
`;

const SQLITE_CONTENT = `/**
 * GERADO por scripts/demo/generate-provider.mjs — não editar à mão.
 * Modo demo (SQLite) — ver docs/DEMO.md. \`npm run dev\`/\`npm run build\` normais
 * restauram a versão Postgres automaticamente antes de rodar.
 */
export { PrismaClient } from "@/generated/prisma-sqlite";
export { PrismaBetterSqlite3 as DriverAdapter } from "@prisma/adapter-better-sqlite3";

export function buildAdapterOptions() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definida.");
  return { url };
}
`;

if (provider === "sqlite") {
  writeFileSync(target, SQLITE_CONTENT);
  console.log("[demo] db.provider.ts → SQLite");
} else {
  writeFileSync(target, POSTGRES_CONTENT);
  console.log("[demo] db.provider.ts → PostgreSQL");
}
