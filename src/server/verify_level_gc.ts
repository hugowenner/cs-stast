import { prisma } from "@/server/db";
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import { ingestMatchSync } from "@/server/services/match.service";
import matchReal from "@/server/adapters/gamersclub/fixtures/match-real-27483022.json";

async function run() {
  console.log("=== INICIANDO VERIFICAÇÃO INTEGRADA DE LEVEL GC ===");

  // 1. Limpar banco para isolar o teste
  await prisma.playerMatchStats.deleteMany({});
  await prisma.playerAchievement.deleteMany({});
  await prisma.rivalry.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.trackedPlayer.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.match.deleteMany({});

  // 2. Criar jogador "Costa" e marcá-lo como ativo/tracked
  const steamIdCosta = "76561198806269620";
  const gcIdCosta = "757573";
  const player = await prisma.player.create({
    data: {
      steamId: steamIdCosta,
      nickname: "Costa",
      gamersClubId: gcIdCosta,
    },
  });

  await prisma.trackedPlayer.create({
    data: {
      playerId: player.id,
      gamersClubId: gcIdCosta,
      active: true,
    },
  });

  console.log(`Jogador Costa cadastrado (ID: ${player.id}, GC ID: ${gcIdCosta})`);

  // 3. Normalizar e Ingerir partida real da Gamers Club (Data da partida: 2026-07-20T19:22:00.000Z)
  console.log("\n-> Ingerindo partida real (LVL 14)...");
  const normalized = normalizeGamersClubMatch(matchReal);
  const result = await ingestMatchSync(normalized, {
    rawPayload: matchReal,
    source: "verification-real-match",
  });
  console.log(`Partida ingerida com sucesso: ${result.matchId}`);

  // 4. Verificar se PlayerMatchStats possui levelGc = 14 e se Player foi atualizado
  const stats1 = await prisma.playerMatchStats.findFirst({
    where: { playerId: player.id },
  });
  const playerState1 = await prisma.player.findUnique({
    where: { id: player.id },
  });

  console.log(`Stats Level GC: ${stats1?.levelGc} (Esperado: 14)`);
  console.log(`Player Level GC atual: ${playerState1?.levelGc} (Esperado: 14)`);

  if (stats1?.levelGc !== 14 || playerState1?.levelGc !== 14) {
    throw new Error("Falha no teste: Level GC 14 não foi persistido corretamente.");
  }

  // 5. Ingerir uma partida antiga (ex: jogada em 2026-07-15) com LVL 10.
  // Não deve atualizar o Player.levelGc porque a partida é mais antiga.
  console.log("\n-> Ingerindo partida antiga (LVL 10, data 2026-07-15)...");
  const oldMatchPayload = {
    ...normalized,
    matchId: "old_match_123",
    playedAt: new Date("2026-07-15T12:00:00Z"),
    players: normalized.players.map(p => 
      p.steamId === steamIdCosta ? { ...p, levelGc: 10 } : p
    ),
  };

  const oldResult = await ingestMatchSync(oldMatchPayload, {
    rawPayload: {},
    source: "verification-old-match",
  });
  console.log(`Partida antiga ingerida: ${oldResult.matchId}`);

  const statsOld = await prisma.playerMatchStats.findFirst({
    where: { matchId: oldResult.matchId, playerId: player.id },
  });
  const playerState2 = await prisma.player.findUnique({
    where: { id: player.id },
  });

  console.log(`Stats Antiga Level GC: ${statsOld?.levelGc} (Esperado: 10)`);
  console.log(`Player Level GC atual: ${playerState2?.levelGc} (Esperado: 14)`);

  if (statsOld?.levelGc !== 10 || playerState2?.levelGc !== 14) {
    throw new Error("Falha no teste: Partida antiga sobrescreveu o level mais recente!");
  }

  // 6. Ingerir uma partida mais recente (ex: jogada em 2026-07-25) com LVL 15.
  // Deve atualizar o Player.levelGc porque é a mais recente.
  console.log("\n-> Ingerindo partida recente (LVL 15, data 2026-07-25)...");
  const newMatchPayload = {
    ...normalized,
    matchId: "new_match_456",
    playedAt: new Date("2026-07-25T12:00:00Z"),
    players: normalized.players.map(p => 
      p.steamId === steamIdCosta ? { ...p, levelGc: 15 } : p
    ),
  };

  const newResult = await ingestMatchSync(newMatchPayload, {
    rawPayload: {},
    source: "verification-new-match",
  });
  console.log(`Partida recente ingerida: ${newResult.matchId}`);

  const statsNew = await prisma.playerMatchStats.findFirst({
    where: { matchId: newResult.matchId, playerId: player.id },
  });
  const playerState3 = await prisma.player.findUnique({
    where: { id: player.id },
  });

  console.log(`Stats Recente Level GC: ${statsNew?.levelGc} (Esperado: 15)`);
  console.log(`Player Level GC atual: ${playerState3?.levelGc} (Esperado: 15)`);

  if (statsNew?.levelGc !== 15 || playerState3?.levelGc !== 15) {
    throw new Error("Falha no teste: Partida recente não atualizou o level no perfil do Player.");
  }

  console.log("\n=== ✅ TODOS OS TESTES DE LEVEL GC PASSARAM COM SUCESSO! ===");
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
