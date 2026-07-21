/**
 * GERADO por scripts/demo/generate-provider.mjs — não editar à mão.
 * Modo demo (SQLite) — ver docs/DEMO.md. `npm run dev`/`npm run build` normais
 * restauram a versão Postgres automaticamente antes de rodar.
 */
export { PrismaClient } from "@/generated/prisma-sqlite";
export { PrismaBetterSqlite3 as DriverAdapter } from "@prisma/adapter-better-sqlite3";

export function buildAdapterOptions() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definida.");
  return { url };
}
