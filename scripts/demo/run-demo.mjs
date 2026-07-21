#!/usr/bin/env node
/**
 * `npm run demo` — sobe uma aplicação completa e funcional em segundos, sem Docker:
 * SQLite local (prisma/dev.db) em vez de Postgres, catálogo de achievements/mapas
 * semeado, uma partida de exemplo sincronizada através do pipeline real (adapter →
 * Zod → Services → engines), e o Dashboard aberto em http://localhost:3210.
 *
 * `npm run empty-demo` faz o mesmo setup (banco, schema, catálogo de achievements/
 * mapas) mas SEM a partida de exemplo — pra testar com partidas reais da extensão
 * a partir de um banco zerado (0 partidas, 0 jogadores), sem precisar identificar e
 * remover a partida demo depois.
 *
 * Não é o banco de produção (ver docs/DEMO.md para as diferenças) — é só para
 * desenvolvimento/demonstração rápida sem depender do Docker Desktop.
 *
 * Antes de subir o Next, confirma que a porta está livre (Next 16 não faz fallback
 * automático de porta — falha com EADDRINUSE) e, se não estiver, aborta com uma
 * mensagem indicando quem está ocupando a porta em vez de deixar o Next crashar
 * depois de já ter anunciado sucesso.
 */
import { spawnSync, spawn, execSync } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const PORT = 3210;
const empty = process.argv.includes("--empty");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const dbPath = join(root, "prisma", "dev.db");

const env = {
  ...process.env,
  DATABASE_URL: `file:${dbPath}`,
};

function run(command, args, label) {
  console.log(`\n[demo] ${label}...`);
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`[demo] falhou: ${label}`);
    process.exit(result.status ?? 1);
  }
}

function checkPortFree(port) {
  // Sem host explícito: o Node escuta no wildcard IPv6 (::) com dual-stack quando
  // disponível, igual ao bind que o próprio Next.js faz — testar só "0.0.0.0" (IPv4)
  // deixa passar um processo que já ocupa "::", como aconteceu na prática.
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(port);
  });
}

/** Melhor esforço, só para uma mensagem de erro mais útil — nunca decide se a porta está livre. */
function describePortOwner(port) {
  if (process.platform !== "win32") return null;
  try {
    const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const listening = netstatOutput
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .find((parts) => parts[3] === "LISTENING");
    const pid = listening?.[4];
    if (!pid) return null;

    const taskOutput = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: "utf8" });
    const processName = taskOutput.split(",")[0]?.replace(/"/g, "") || null;
    return { pid, processName };
  } catch {
    return null;
  }
}

async function ensurePortFree(port) {
  const free = await checkPortFree(port);
  if (free) return;

  const owner = describePortOwner(port);
  console.error(`\n[demo] Erro: a porta ${port} já está em uso.\n`);
  if (owner) {
    console.error(`  PID: ${owner.pid}`);
    console.error(`  Processo: ${owner.processName ?? "(desconhecido)"}\n`);
  }
  console.error("Finalize esse processo antes de rodar `npm run demo`.");
  if (process.platform === "win32") {
    console.error(`Windows: taskkill /PID ${owner?.pid ?? "<pid>"} /F\n`);
  } else {
    console.error("");
  }
  process.exit(1);
}

if (!existsSync(join(root, "prisma"))) mkdirSync(join(root, "prisma"));

run(
  "node",
  ["scripts/demo/generate-provider.mjs", "sqlite"],
  "apontando db.provider.ts para SQLite",
);
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
run("npx", ["tsx", "prisma/seed.ts"], "semeando catálogo de achievements e mapas");
if (empty) {
  console.log(
    "\n[demo] --empty: pulando a partida de exemplo — banco fica com 0 partidas, 0 jogadores.",
  );
} else {
  run("npx", ["tsx", "scripts/demo/seed-match.ts"], "sincronizando partida de exemplo");
}

await ensurePortFree(PORT);

console.log(`\n[demo] porta ${PORT} livre — iniciando servidor em http://localhost:${PORT}\n`);
console.log(
  "[demo] Ctrl+C para parar. `npm run reset-demo` apaga o banco de demo e volta para Postgres.\n",
);

const dev = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
});
dev.on("exit", (code) => process.exit(code ?? 0));
