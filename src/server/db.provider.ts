/**
 * GERADO por scripts/demo/generate-provider.mjs — não editar à mão.
 *
 * Indireção de uma linha: qual driver adapter + Prisma Client usar. Existe só para que
 * `npm run demo` (SQLite, ver docs/DEMO.md) possa trocar o provedor sem tocar em
 * `db.ts`. `npm run dev`/`npm run build` sempre regeneram este arquivo de volta para
 * Postgres antes de rodar (hooks `predev`/`prebuild`), então esquecer de "sair" do modo
 * demo nunca quebra o fluxo normal.
 */
export { PrismaClient } from "@/generated/prisma";
export { PrismaPg as DriverAdapter } from "@prisma/adapter-pg";

export function buildAdapterOptions() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não está definida.");
  return { connectionString };
}
