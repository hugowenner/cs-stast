#!/usr/bin/env node
/**
 * `npm run demo:snapshot` — prepara o SQLite local exatamente como `npm run demo`
 * (gera provider, gera schema.sqlite.prisma, cria prisma/dev.db, gera o Prisma Client
 * SQLite), mas em vez de semear um catálogo fixo + partida fake, importa dados REAIS
 * do Neon (Postgres) via scripts/demo/snapshot-from-neon.ts.
 *
 * Não substitui `npm run demo` nem `npm run empty-demo` — é um fluxo separado.
 * Diferença chave em relação a `npm run demo`: este comando NÃO roda prisma/seed.ts
 * (que semearia um catálogo de mapas fixo e uma lista fixa de TrackedPlayer por cima
 * dos dados reais) e não sobe o servidor Next — só monta o snapshot e sai. Para ver o
 * resultado, rode o Next apontando pro dev.db (instruções impressas no final).
 *
 * Só lê do Neon (Postgres) — nunca escreve nele. Só escreve no SQLite local
 * (prisma/dev.db), que é sempre apagado e recriado do zero antes de cada snapshot
 * (mesmo arquivo que `npm run reset-demo` já apaga — nunca é o Neon).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const dbPath = join(root, "prisma", "dev.db");

// Env usado só para os passos que operam sobre o SQLite (db push / generate) — nunca
// para o passo de leitura do Neon, que precisa da DATABASE_URL real (Postgres) vinda
// do .env / do ambiente, capturada acima por "dotenv/config" antes de qualquer override.
const sqliteEnv = {
  ...process.env,
  DATABASE_URL: `file:${dbPath}`,
};

function run(command, args, label, { env } = {}) {
  console.log(`\n[snapshot] ${label}...`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: env ?? sqliteEnv,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`[snapshot] falhou: ${label}`);
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(join(root, "prisma"))) mkdirSync(join(root, "prisma"));

// Passo 0 — sempre começa de um dev.db limpo. Só afeta o arquivo local de demo (o
// mesmo que `npm run reset-demo` apaga); nunca toca no Neon.
for (const target of [dbPath, `${dbPath}-journal`]) {
  if (existsSync(target)) {
    rmSync(target, { force: true });
    console.log(`[snapshot] removido banco de demo antigo: ${target}`);
  }
}

// Passos 1-4 — preparar o SQLite, igual ao `npm run demo` (sem seed, sem partida fake).
run("node", ["scripts/demo/generate-sqlite-schema.mjs"], "gerando prisma/schema.sqlite.prisma");
run(
  "npx",
  ["prisma", "db", "push", "--schema", "prisma/schema.sqlite.prisma", "--accept-data-loss"],
  "criando prisma/dev.db",
);
run(
  "npx",
  ["prisma", "generate", "--schema", "prisma/schema.sqlite.prisma"],
  "gerando Prisma Client (SQLite)",
);

// Passo 6 — snapshot-from-neon.ts removido (Neon encerrado).
// O snapshot do SQLite deve ser gerado a partir do PostgreSQL VPS via seed manual.
console.log("[snapshot] ATENCAO: snapshot-from-neon.ts foi removido (Neon encerrado).");
console.log("[snapshot] Popule o SQLite manualmente ou adapte este script para o PostgreSQL VPS.");

console.log("\n[snapshot] pronto.");
console.log(
  "[snapshot] Para visualizar: DATABASE_URL=file:" +
    dbPath +
    " npx next dev -p 3210  (ou `set` no Windows)",
);
console.log(
  "[snapshot] `npm run reset-demo` apaga este snapshot e restaura o wiring de Postgres.",
);
