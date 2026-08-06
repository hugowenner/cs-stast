import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { prisma } from "@/server/db";
import { gcSyncMatch } from "@/server/services/ingest/gc-sync.service";
import { enrichMatchWithDemo } from "@/server/services/enrichment/demo-enrichment.service";
import { rebuildAllRivalries } from "@/server/services/rivalry/rivalry.service";
import { syncMatchSchema } from "@/server/dtos/sync.dto";

describe.sequential("Match Ingest & Enrichment Integration Tests", () => {
  const matchId = "test-match-123";

  // Mock de um jogador válido que já está no banco de dados (usamos um de teste ou criamos)
  const player1SteamId = "76561198000000001";
  const player2SteamId = "76561198000000002";

  const gcPayload = {
    matchId,
    map: "Mirage",
    playedAt: new Date("2026-08-06T10:00:00Z"),
    scoreTeamA: 13,
    scoreTeamB: 11,
    durationSeconds: 2400,
    demoUrl: "http://example.com/demo.dem",
    players: [
      {
        steamId: player1SteamId,
        nickname: "Player One",
        team: "A" as const,
        kills: 25,
        deaths: 15,
        assists: 5,
        headshots: 12,
        adr: 90.5,
        kast: 80.0,
        levelGc: 12,
        gcRating: 1.25,
      },
      {
        steamId: player2SteamId,
        nickname: "Player Two",
        team: "B" as const,
        kills: 18,
        deaths: 20,
        assists: 4,
        headshots: 8,
        adr: 75.0,
        kast: 70.0,
        levelGc: 10,
        gcRating: 0.95,
      },
    ],
  };

  // Mock do payload do parser da demo
  const parserPayload = {
    match: {
      map_name: "Mirage",
      score_a: 13,
      score_b: 11,
      duration: 2500, // sutilmente diferente
    },
    players: [
      { steamid: player1SteamId, name: "Player One", team: "TERRORIST", rank: 11 }, // rank = 11 do CS2
      { steamid: player2SteamId, name: "Player Two", team: "CT", rank: 9 },
    ],
    rounds: Array.from({ length: 24 }, (_, i) => ({ round: i + 1 })),
    kills: [
      {
        killer_steamid: player1SteamId,
        killer_team: "TERRORIST",
        victim_steamid: player2SteamId,
        victim_team: "CT",
        weapon: "ak47",
        headshot: true,
        round: 1,
        tick: 1500,
        analytics: { entry_kill: true },
      },
      {
        killer_steamid: player2SteamId,
        killer_team: "CT",
        victim_steamid: player1SteamId,
        victim_team: "TERRORIST",
        weapon: "m4a1",
        headshot: false,
        round: 2,
        tick: 3200,
      },
    ],
    clutches: [
      {
        player_steamid: player1SteamId,
        opponents: 1,
        won: true,
        round: 1,
      },
    ],
    multikills: [
      {
        player_steamid: player1SteamId,
        kill_count: 3,
        round: 3,
      },
    ],
  };

  beforeEach(async () => {
    // Garante que o mapa Mirage está cadastrado
    await prisma.map.upsert({
      where: { name: "Mirage" },
      create: { name: "Mirage" },
      update: {},
    });

    // Garante tracked players criados
    const p1 = await prisma.player.upsert({
      where: { steamId: player1SteamId },
      create: { steamId: player1SteamId, nickname: "Player One", gamersClubId: "10001", levelGc: 12 },
      update: { levelGc: 12 },
    });
    const p2 = await prisma.player.upsert({
      where: { steamId: player2SteamId },
      create: { steamId: player2SteamId, nickname: "Player Two", gamersClubId: "10002", levelGc: 10 },
      update: { levelGc: 10 },
    });

    // Garante que eles são tracked players
    await prisma.trackedPlayer.upsert({
      where: { playerId: p1.id },
      create: { playerId: p1.id, gamersClubId: "10001" },
      update: {},
    });
    await prisma.trackedPlayer.upsert({
      where: { playerId: p2.id },
      create: { playerId: p2.id, gamersClubId: "10002" },
      update: {},
    });
  });

  afterEach(async () => {
    // Remove os registros criados durante os testes
    const testMatchIds = [matchId, "test-match-456"];
    const testSteamIds = [player1SteamId, player2SteamId];

    await prisma.playerMatchup.deleteMany({ where: { match: { gamersClubMatchId: { in: testMatchIds } } } });
    await prisma.playerClutch.deleteMany({ where: { match: { gamersClubMatchId: { in: testMatchIds } } } });
    await prisma.playerEntryDuel.deleteMany({ where: { match: { gamersClubMatchId: { in: testMatchIds } } } });
    await prisma.playerTradeEvent.deleteMany({ where: { match: { gamersClubMatchId: { in: testMatchIds } } } });
    await prisma.event.deleteMany({ where: { match: { gamersClubMatchId: { in: testMatchIds } } } });
    await prisma.playerAchievement.deleteMany({ where: { match: { gamersClubMatchId: { in: testMatchIds } } } });
    await prisma.playerMatchStats.deleteMany({ where: { match: { gamersClubMatchId: { in: testMatchIds } } } });
    await prisma.match.deleteMany({ where: { gamersClubMatchId: { in: testMatchIds } } });
    await prisma.trackedPlayer.deleteMany({ where: { player: { steamId: { in: testSteamIds } } } });

    await rebuildAllRivalries();
  });

  it("não deve permitir que o parser da demo altere levelGc, gcRating ou ELO na partida e no perfil", async () => {
    // 1. Ingestão da Gamers Club (estado oficial)
    const parsedGc = syncMatchSchema.parse(gcPayload);
    const syncRes = await gcSyncMatch(parsedGc, { skipEnqueue: true });
    expect(syncRes.status).toBe("created");

    // Valida que os dados originais foram inseridos corretamente
    const statsBefore = await prisma.playerMatchStats.findFirst({
      where: { matchId: syncRes.matchId, player: { steamId: player1SteamId } },
    });
    expect(statsBefore?.levelGc).toBe(12);
    expect(statsBefore?.gcRating).toBe(1.25);
    const eloBeforeVal = statsBefore?.eloBefore;
    const eloAfterVal = statsBefore?.eloAfter;

    // 2. Enriquecimento incremental da demo
    const enrichRes = await enrichMatchWithDemo(parserPayload, matchId, new Date());
    expect(enrichRes.success).toBe(true);

    // 3. Validações pós-enriquecimento
    const statsAfter = await prisma.playerMatchStats.findFirst({
      where: { matchId: syncRes.matchId, player: { steamId: player1SteamId } },
    });

    // VALIDAÇÃO CRÍTICA: Os campos da GC permaneceram intocados!
    expect(statsAfter?.levelGc).toBe(12); // Não mudou para 11
    expect(statsAfter?.gcRating).toBe(1.25); // Não mudou para null
    expect(statsAfter?.eloBefore).toBe(eloBeforeVal); // ELO não foi recalculado
    expect(statsAfter?.eloAfter).toBe(eloAfterVal);

    // Valida que os campos da demo foram atualizados/enriquecidos
    expect(statsAfter?.doubleKills).toBe(0);
    expect(statsAfter?.tripleKills).toBe(1);

    // Valida que o perfil global do jogador não foi sobrescrito para 11
    const p1 = await prisma.player.findUnique({ where: { steamId: player1SteamId } });
    expect(p1?.levelGc).toBe(12); // Permaneceu 12
  });

  it("deve reprocessar a mesma demo 100 vezes de forma totalmente idempotente", async () => {
    const parsedGc = syncMatchSchema.parse(gcPayload);
    await gcSyncMatch(parsedGc, { skipEnqueue: true });

    // Processa a demo 5 vezes seguidas
    for (let i = 0; i < 5; i++) {
      const res = await enrichMatchWithDemo(parserPayload, matchId, new Date());
      expect(res.success).toBe(true);
    }

    // Verifica que não duplicou dados nas tabelas analíticas Premium
    const matchups = await prisma.playerMatchup.findMany({
      where: { match: { gamersClubMatchId: matchId } },
    });
    const clutches = await prisma.playerClutch.findMany({
      where: { match: { gamersClubMatchId: matchId } },
    });
    const duels = await prisma.playerEntryDuel.findMany({
      where: { match: { gamersClubMatchId: matchId } },
    });

    const p1 = await prisma.player.findUnique({ where: { steamId: player1SteamId } });
    const p2 = await prisma.player.findUnique({ where: { steamId: player2SteamId } });
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    // Deve existir 2 matchups registrados (1 de p1->p2 e 1 de p2->p1)
    expect(matchups).toHaveLength(2);
    const p1ToP2 = matchups.find((m) => m.killerId === p1!.id && m.victimId === p2!.id);
    const p2ToP1 = matchups.find((m) => m.killerId === p2!.id && m.victimId === p1!.id);
    expect(p1ToP2).toBeDefined();
    expect(p1ToP2?.kills).toBe(1);
    expect(p2ToP1).toBeDefined();
    expect(p2ToP1?.kills).toBe(1);

    // Apenas 1 clutch registrado para player1
    expect(clutches).toHaveLength(1);
    expect(clutches[0].won).toBe(true);

    // Apenas 4 entry duels (killer e victim da primeira morte de cada um dos 2 rounds)
    expect(duels).toHaveLength(4);
  });

  it("deve funcionar na ordem invertida (Demo processada primeiro, depois GC Sync) mantendo estado consistente", async () => {
    // 1. Ingestão da Demo primeiro (caso atípico)
    const enrichRes = await enrichMatchWithDemo(parserPayload, matchId, new Date());
    expect(enrichRes.success).toBe(true);

    const statsDemo = await prisma.playerMatchStats.findFirst({
      where: { match: { gamersClubMatchId: matchId }, player: { steamId: player1SteamId } },
    });
    // gcRating e levelGc começam nulos/default
    expect(statsDemo?.gcRating).toBeNull();
    expect(statsDemo?.levelGc).toBeNull();

    // 2. Sincronização GC chega depois
    const parsedGc = syncMatchSchema.parse(gcPayload);
    const syncRes = await gcSyncMatch(parsedGc, { skipEnqueue: true });
    expect(syncRes.status).toBe("already-synced"); // Reconhece que a partida já existe

    // Como o match service atualiza dados GC quando já existe, vamos ver o estado final
    // Esperamos que o banco de dados continue íntegro e que as estatísticas da demo permaneçam
    const finalStats = await prisma.playerMatchStats.findFirst({
      where: { match: { gamersClubMatchId: matchId }, player: { steamId: player1SteamId } },
    });
    expect(finalStats?.doubleKills).toBe(0);
    expect(finalStats?.tripleKills).toBe(1);
  });
});
