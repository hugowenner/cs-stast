import { prisma } from "@/server/db";
import { normalizeParserMatch } from "@/server/adapters/parser/normalize";
import { parserMatchSchema } from "@/server/dtos/parser.dto";
import * as playerRepo from "@/server/repositories/player.repository";
import * as matchRepo from "@/server/repositories/match.repository";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import { calculateRating } from "@/server/domain/rating";
import { extractPremiumEvents } from "@/server/services/premium-events.normalizer";
import { rebuildRivalriesForPlayers } from "@/server/services/rivalry/rivalry.service";
import { evaluateMatchAchievements, type PlayerMatchAchievementInput } from "@/server/domain/achievements";
import { grantAchievements } from "@/server/services/achievement.service";
import type { MatchTeam, Prisma } from "@/generated/prisma";

export async function enrichMatchWithDemo(
  payload: any,
  sourceMatchId: string,
  createdAt: Date
): Promise<{ success: boolean; error?: string }> {
  // 1. Normaliza e valida estritamente usando o DTO de contrato
  const rawNormalized = normalizeParserMatch(payload, sourceMatchId, createdAt);
  const validation = parserMatchSchema.safeParse(rawNormalized);
  if (!validation.success) {
    throw new Error(`Contrato de demo violado: ${validation.error.message}`);
  }
  const input = validation.data;

  // 2. Busca ou cria a partida correspondente no banco
  let match = await matchRepo.findMatchByGamersClubId(sourceMatchId);
  const map = await prisma.map.findUnique({
    where: { name: input.map }
  });
  if (!map) {
    throw new Error(`Mapa '${input.map}' não está semeado no banco.`);
  }

  // 3. Upsert de jogadores que estão na demo
  const players = await Promise.all(
    input.players.map((p) =>
      playerRepo.upsertPlayerBySteamId({
        steamId: p.steamId,
        nickname: p.nickname,
      })
    )
  );

  // Vincula tracked_players
  for (const player of players) {
    if (player.gamersClubId) {
      await playerRepo.linkTrackedPlayer(player.gamersClubId, player.id);
    }
  }

  const playerBySteamId = new Map(players.map((p) => [p.steamId, p]));
  const trackedPlayersCount = await playerRepo.countActiveTrackedPlayersAmong(
    players.map((p) => p.id)
  );

  const roundsPlayed = Math.max(input.scoreTeamA + input.scoreTeamB, 1);

  if (!match) {
    // Caso de borda: Demo processada antes do sync da extensão GC
    // Criamos a partida básica com os dados da demo
    const session = await prisma.session.findFirst({
      where: {
        date: {
          gte: new Date(input.playedAt.setHours(0, 0, 0, 0)),
          lt: new Date(input.playedAt.setHours(23, 59, 59, 999)),
        }
      }
    }) ?? await prisma.session.create({
      data: { name: `Lobby Demo ${input.playedAt.toLocaleDateString()}`, date: input.playedAt }
    });

    const activeSeason = await prisma.season.findFirst({
      where: {
        startDate: { lte: input.playedAt },
        endDate: { gte: input.playedAt }
      }
    });
    if (!activeSeason) {
      throw new Error("Temporada ativa não encontrada para a data desta demo.");
    }

    const playerStatsInput = input.players.map((p) => {
      const dbPlayer = playerBySteamId.get(p.steamId)!;
      const statsRating = calculateRating({
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        kast: p.kast,
        adr: p.adr,
        roundsPlayed,
      });

      return {
        playerId: dbPlayer.id,
        team: p.team as MatchTeam,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        headshots: p.headshots,
        adr: p.adr,
        rating: statsRating.rating,
        kast: p.kast,
        impact: statsRating.impact,
        entryKills: p.entryKills,
        entryDeaths: p.entryDeaths,
        tradeKills: p.tradeKills,
        clutch1v1Attempts: p.clutches?.["1v1"]?.attempts ?? 0,
        clutch1v1Wins: p.clutches?.["1v1"]?.wins ?? 0,
        clutch1v2Attempts: p.clutches?.["1v2"]?.attempts ?? 0,
        clutch1v2Wins: p.clutches?.["1v2"]?.wins ?? 0,
        clutch1v3Attempts: p.clutches?.["1v3"]?.attempts ?? 0,
        clutch1v3Wins: p.clutches?.["1v3"]?.wins ?? 0,
        clutch1v4Attempts: p.clutches?.["1v4"]?.attempts ?? 0,
        clutch1v4Wins: p.clutches?.["1v4"]?.wins ?? 0,
        clutch1v5Attempts: p.clutches?.["1v5"]?.attempts ?? 0,
        clutch1v5Wins: p.clutches?.["1v5"]?.wins ?? 0,
        eloBefore: 1000,
        eloAfter: 1000,
        clutchesWon: p.clutchesWon ?? 0,
        flashAssists: p.flashAssists ?? 0,
        damage: p.damage ?? null,
        doubleKills: p.doubleKills ?? null,
        tripleKills: p.tripleKills ?? null,
        quadKills: p.quadKills ?? null,
        aces: p.aces ?? null,
      };
    });

    match = await matchRepo.createMatchWithStats({
      sessionId: session.id,
      mapId: map.id,
      seasonId: activeSeason.id,
      gamersClubMatchId: sourceMatchId,
      playedAt: input.playedAt,
      scoreTeamA: input.scoreTeamA,
      scoreTeamB: input.scoreTeamB,
      durationSeconds: input.durationSeconds,
      trackedPlayersCount,
      playerStats: playerStatsInput,
      events: [],
      demoUrl: input.demoUrl ?? null,
      roundsJson: input.roundsJson !== undefined ? (input.roundsJson as any) : undefined,
    });
  } else {
    // Fluxo Padrão: Enriquecimento Incremental Não-Destrutivo (GC Sync já existe)
    // Atualiza metadados do Match
    await matchRepo.updateMatchMetadata(match.id, {
      durationSeconds: input.durationSeconds,
      demoUrl: input.demoUrl ?? match.demoUrl,
      roundsJson: input.roundsJson !== undefined ? (input.roundsJson as any) : undefined,
    });

    // Atualiza apenas os campos autorizados da demo no PlayerMatchStats
    for (const p of input.players) {
      const dbPlayer = playerBySteamId.get(p.steamId)!;
      const statsRating = calculateRating({
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        kast: p.kast,
        adr: p.adr,
        roundsPlayed,
      });

      const updateData = {
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        headshots: p.headshots,
        adr: p.adr,
        rating: statsRating.rating,
        kast: p.kast,
        impact: statsRating.impact,
        entryKills: p.entryKills,
        entryDeaths: p.entryDeaths,
        tradeKills: p.tradeKills,
        clutchesWon: p.clutchesWon ?? 0,
        flashAssists: p.flashAssists ?? 0,
        damage: p.damage ?? null,
        doubleKills: p.doubleKills ?? null,
        tripleKills: p.tripleKills ?? null,
        quadKills: p.quadKills ?? null,
        aces: p.aces ?? null,
        clutch1v1Attempts: p.clutches?.["1v1"]?.attempts ?? 0,
        clutch1v1Wins: p.clutches?.["1v1"]?.wins ?? 0,
        clutch1v2Attempts: p.clutches?.["1v2"]?.attempts ?? 0,
        clutch1v2Wins: p.clutches?.["1v2"]?.wins ?? 0,
        clutch1v3Attempts: p.clutches?.["1v3"]?.attempts ?? 0,
        clutch1v3Wins: p.clutches?.["1v3"]?.wins ?? 0,
        clutch1v4Attempts: p.clutches?.["1v4"]?.attempts ?? 0,
        clutch1v4Wins: p.clutches?.["1v4"]?.wins ?? 0,
        clutch1v5Attempts: p.clutches?.["1v5"]?.attempts ?? 0,
        clutch1v5Wins: p.clutches?.["1v5"]?.wins ?? 0,
      };

      await statsRepo.enrichPlayerStatsFromDemo(match.id, dbPlayer.id, updateData);
    }
  }

  // 4. Isolamento Completo das Estatísticas Premium
  // Apaga dados antigos do módulo Premium para esta partida
  await prisma.$transaction([
    prisma.playerMatchup.deleteMany({ where: { matchId: match.id } }),
    prisma.playerClutch.deleteMany({ where: { matchId: match.id } }),
    prisma.playerEntryDuel.deleteMany({ where: { matchId: match.id } }),
    prisma.playerTradeEvent.deleteMany({ where: { matchId: match.id } }),
    prisma.event.deleteMany({ where: { matchId: match.id } }),
  ]);

  // Extrai novos eventos do payload bruto e insere de forma isolada
  const playerMapForPremium = new Map<string, { id: string; team: "A" | "B" }>();
  for (const p of input.players) {
    const dbPlayer = playerBySteamId.get(p.steamId);
    if (dbPlayer) {
      playerMapForPremium.set(p.steamId, {
        id: dbPlayer.id,
        team: p.team as "A" | "B",
      });
    }
  }

  const premium = extractPremiumEvents(
    payload,
    match.id,
    playerMapForPremium,
    trackedPlayersCount
  );

  // Insere em lote no banco
  await prisma.$transaction(async (tx) => {
    if (premium.matchups.length > 0) {
      await tx.playerMatchup.createMany({ data: premium.matchups });
    }
    if (premium.clutches.length > 0) {
      await tx.playerClutch.createMany({ data: premium.clutches });
    }
    if (premium.entryDuels.length > 0) {
      await tx.playerEntryDuel.createMany({ data: premium.entryDuels });
    }
    if (premium.trades.length > 0) {
      await tx.playerTradeEvent.createMany({ data: premium.trades });
    }
  });

  // Timeline events (KILL/ACE/etc.) baseados em killsDetail
  const timelineEvents: Prisma.EventCreateManyInput[] = [];
  const acePlayers = new Set<string>();
  const multiKill4Players = new Set<string>();
  const multiKill3Players = new Set<string>();

  for (const p of input.players) {
    if (!p.killsDetail || p.killsDetail.length === 0) continue;
    const killer = playerBySteamId.get(p.steamId)!;

    const killsByRound = new Map<number, typeof p.killsDetail>();
    for (const kill of p.killsDetail) {
      const list = killsByRound.get(kill.roundNumber) ?? [];
      list.push(kill);
      killsByRound.set(kill.roundNumber, list);
    }

    for (const [roundNumber, kills] of killsByRound) {
      for (const kill of kills) {
        const victim = playerBySteamId.get(kill.victimSteamId);
        if (!victim) continue;
        timelineEvents.push({
          matchId: match.id,
          playerId: killer.id,
          victimId: victim.id,
          type: "KILL",
          roundNumber,
        });
      }

      if (kills.length >= 5) {
        acePlayers.add(killer.id);
        timelineEvents.push({ matchId: match.id, playerId: killer.id, type: "ACE", roundNumber });
      } else if (kills.length === 4) {
        multiKill4Players.add(killer.id);
        timelineEvents.push({ matchId: match.id, playerId: killer.id, type: "MULTI_KILL_4", roundNumber });
      } else if (kills.length === 3) {
        multiKill3Players.add(killer.id);
        timelineEvents.push({ matchId: match.id, playerId: killer.id, type: "MULTI_KILL_3", roundNumber });
      }
    }
  }

  if (timelineEvents.length > 0) {
    await prisma.event.createMany({ data: timelineEvents });
  }

  // 5. Rebuild de Rivalidades como projeção (Agregado Reconstruível Direcionado)
  await rebuildRivalriesForPlayers(Array.from(playerBySteamId.values()).map((p) => p.id));

  // 6. Re-avaliação e concessão de conquistas da partida
  await prisma.playerAchievement.deleteMany({
    where: { matchId: match.id }
  });

  const careerTotalsByPlayerId = new Map<string, Awaited<ReturnType<typeof statsRepo.getPlayerCareerTotals>>>();
  for (const player of players) {
    careerTotalsByPlayerId.set(player.id, await statsRepo.getPlayerCareerTotals(player.id));
  }

  const totalRounds = input.scoreTeamA + input.scoreTeamB;
  const ratingByPlayerId = new Map<string, { rating: number; impact: number }>();
  for (const p of input.players) {
    const player = playerBySteamId.get(p.steamId)!;
    ratingByPlayerId.set(
      player.id,
      calculateRating({
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        kast: p.kast,
        adr: p.adr,
        roundsPlayed,
      })
    );
  }

  const achievementInputs: PlayerMatchAchievementInput[] = input.players.map((p) => {
    const player = playerBySteamId.get(p.steamId)!;
    const career = careerTotalsByPlayerId.get(player.id)!;
    const rating = ratingByPlayerId.get(player.id)!;
    const scoreSelf = p.team === "A" ? input.scoreTeamA : input.scoreTeamB;
    const scoreOpp = p.team === "A" ? input.scoreTeamB : input.scoreTeamA;

    const careerClutchWins =
      (career._sum.clutch1v1Wins ?? 0) +
      (career._sum.clutch1v2Wins ?? 0) +
      (career._sum.clutch1v3Wins ?? 0) +
      (career._sum.clutch1v4Wins ?? 0) +
      (career._sum.clutch1v5Wins ?? 0);

    return {
      playerId: player.id,
      entryKills: p.entryKills,
      entryDeaths: p.entryDeaths,
      tradeKills: p.tradeKills,
      headshots: p.headshots,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      adr: p.adr,
      rating: rating.rating,
      impact: rating.impact,
      kast: p.kast,
      totalRounds,
      wonMatch: scoreSelf > scoreOpp,
      clutchWinsByTier: {
        1: p.clutches?.["1v1"]?.wins ?? 0,
        2: p.clutches?.["1v2"]?.wins ?? 0,
        3: p.clutches?.["1v3"]?.wins ?? 0,
        4: p.clutches?.["1v4"]?.wins ?? 0,
        5: p.clutches?.["1v5"]?.wins ?? 0,
      },
      hadAce: acePlayers.has(player.id),
      hadMultiKill3: multiKill3Players.has(player.id),
      hadMultiKill4: multiKill4Players.has(player.id),
      careerMatchesPlayed: career._count._all,
      careerKills: career._sum.kills ?? 0,
      careerHeadshots: career._sum.headshots ?? 0,
      careerEntryKills: career._sum.entryKills ?? 0,
      careerClutchWins,
      careerAssists: career._sum.assists ?? 0,
      careerAvgRating: career._avg.rating ?? 0,
    };
  });

  const grants = evaluateMatchAchievements(match.id, achievementInputs);
  await grantAchievements(grants);

  return { success: true };
}
