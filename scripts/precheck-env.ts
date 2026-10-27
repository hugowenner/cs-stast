import { prisma } from "../src/server/db";

async function checkEnv() {
  const url = process.env.DATABASE_URL || "";
  console.log("--- PRÉ-CHECK DE AMBIENTE ---");
  console.log("DATABASE_URL definida:", Boolean(url));

  const safeUrl = url.replace(/:[^:@]+@/, ":****@");
  console.log("URL de conexão:", safeUrl);

  const parsed = new URL(url);
  console.log("Host:", parsed.hostname);
  console.log("Porta:", parsed.port);
  console.log("Database:", parsed.pathname.slice(1));
  console.log("Usuário:", parsed.username);

  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  const isCorrectDb = parsed.pathname.slice(1) === "cs2_stats_dev_snapshot_20260920";
  const isCorrectUser = parsed.username === "cs2stats_dev";

  console.log("É host local?", isLocal);
  console.log("É banco DEV local?", isCorrectDb);
  console.log("É usuário DEV?", isCorrectUser);

  if (!isLocal || !isCorrectDb || !isCorrectUser) {
    console.error("BLOQUEIO DE SEGURANÇA: Configuração de banco diverge do DEV local!");
    process.exit(1);
  }

  const currentDbRes: any = await prisma.$queryRawUnsafe(
    "SELECT current_database(), current_user, inet_server_addr() as server_addr, inet_server_port() as server_port;"
  );
  console.log("Validação direta PostgreSQL:", currentDbRes[0]);
}

checkEnv()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro fatal no pré-check:", err);
    process.exit(1);
  });
