import { PrismaClient } from "@/generated/prisma";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada no ambiente.");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Conectando ao PostgreSQL Neon...");

  // 1. Validar leitura de registros existentes
  console.log("\n--- Validação 1: Partidas antigas possuem valores padrão? ---");
  const oldMatches = await prisma.match.findMany({ take: 5 });
  console.log(`Lidas ${oldMatches.length} partidas antigas.`);
  for (const m of oldMatches) {
    console.log(`Match ID: ${m.id} | demoUrl: ${m.demoUrl} (Esperado: null/string)`);
    if (m.demoUrl !== null && typeof m.demoUrl !== "string") {
      throw new Error(`Match ${m.id} possui demoUrl inválido: ${m.demoUrl}`);
    }
  }

  const oldStats = await prisma.playerMatchStats.findMany({ take: 5 });
  console.log(`Lidos ${oldStats.length} registros de estatísticas antigos.`);
  for (const s of oldStats) {
    console.log(`Stats ID: ${s.id} | clutchesWon: ${s.clutchesWon} | flashAssists: ${s.flashAssists} (Esperado: 0/number)`);
    if (typeof s.clutchesWon !== "number" || typeof s.flashAssists !== "number") {
      throw new Error(`Stats ${s.id} possui clutchesWon/flashAssists inválidos.`);
    }
  }

  // 2. Criar registro temporário e validar escrita/leitura
  console.log("\n--- Validação 2: Gravação e leitura de novos campos ---");
  
  let session = await prisma.session.findFirst();
  if (!session) {
    session = await prisma.session.create({
      data: { name: "Sessão de Teste Migration", date: new Date() },
    });
  }

  let map = await prisma.map.findFirst();
  if (!map) {
    map = await prisma.map.create({ data: { name: "de_dust2_test" } });
  }

  const player = await prisma.player.findFirst();
  if (!player) {
    console.log("Nenhum Player encontrado no banco. Pulando gravação de stats.");
    return;
  }

  const tempMatchId = "temp-match-validation-id";
  
  await prisma.playerMatchStats.deleteMany({ where: { matchId: tempMatchId } });
  await prisma.match.deleteMany({ where: { id: tempMatchId } });

  console.log("Criando Match temporário com demoUrl...");
  const createdMatch = await prisma.match.create({
    data: {
      id: tempMatchId,
      sessionId: session.id,
      mapId: map.id,
      playedAt: new Date(),
      scoreTeamA: 16,
      scoreTeamB: 14,
      durationSeconds: 2400,
      demoUrl: "https://gamersclub.com.br/lobby/match/12345/downloadDemo",
    },
  });
  console.log("Match criado com demoUrl:", createdMatch.demoUrl);

  console.log("Criando PlayerMatchStats com clutchesWon e flashAssists...");
  const createdStats = await prisma.playerMatchStats.create({
    data: {
      matchId: tempMatchId,
      playerId: player.id,
      team: "A",
      kills: 20,
      deaths: 15,
      assists: 5,
      headshots: 10,
      adr: 85.5,
      rating: 1.25,
      kast: 75.0,
      impact: 1.30,
      entryKills: 3,
      entryDeaths: 1,
      tradeKills: 2,
      eloBefore: 1500,
      eloAfter: 1515,
      clutchesWon: 4,
      flashAssists: 3,
    },
  });
  console.log(`Stats criado: clutchesWon=${createdStats.clutchesWon}, flashAssists=${createdStats.flashAssists}`);

  const readMatch = await prisma.match.findUnique({ where: { id: tempMatchId } });
  if (readMatch?.demoUrl !== "https://gamersclub.com.br/lobby/match/12345/downloadDemo") {
    throw new Error("Falha na leitura do campo demoUrl.");
  }

  const readStats = await prisma.playerMatchStats.findUnique({
    where: { matchId_playerId: { matchId: tempMatchId, playerId: player.id } },
  });
  if (readStats?.clutchesWon !== 4 || readStats?.flashAssists !== 3) {
    throw new Error("Falha na leitura dos campos clutchesWon / flashAssists.");
  }

  console.log("\nEscrita e Leitura validadas com sucesso!");

  await prisma.playerMatchStats.delete({
    where: { matchId_playerId: { matchId: tempMatchId, playerId: player.id } },
  });
  await prisma.match.delete({ where: { id: tempMatchId } });
  console.log("Registros temporários removidos do PostgreSQL.");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Erro na validação da migration:", err);
  process.exitCode = 1;
});
