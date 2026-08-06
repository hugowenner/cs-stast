import { prisma } from "@/server/db";
import type { SyncMatchInput } from "@/server/dtos/sync.dto";
import * as playerRepo from "@/server/repositories/player.repository";
import * as mapRepo from "@/server/repositories/map.repository";
import * as sessionRepo from "@/server/repositories/session.repository";
import * as matchRepo from "@/server/repositories/match.repository";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import * as importRepo from "@/server/repositories/import.repository";
import { calculateRating } from "@/server/domain/rating";
import { calculateEloForMatch } from "@/server/services/elo/elo.service";
import { evaluateMatchAchievements, type PlayerMatchAchievementInput } from "@/server/domain/achievements";
import { grantAchievements } from "@/server/services/achievement.service";
import { maybeEnqueueDemoAnalysis } from "@/server/services/sync-job.service";
import { ensureCurrentSeason } from "@/server/services/season.service";
import { rebuildRivalriesForPlayers } from "@/server/services/rivalry/rivalry.service";
import type { MatchTeam, Prisma } from "@/generated/prisma";
import type { CreateMatchEventInput, CreateMatchPlayerStatInput } from "@/server/repositories/match.repository";

export interface IngestMatchResult {
  status: "created" | "already-synced";
  matchId: string;
}

export interface GcSyncOptions {
  rawPayload?: unknown;
  source?: string;
  skipEnqueue?: boolean;
}

export async function gcSyncMatch(
  input: SyncMatchInput,
  options: GcSyncOptions = {}
): Promise<IngestMatchResult> {
  const existing = await matchRepo.findMatchByGamersClubId(input.matchId);
  if (existing) {
    // Ordem Invertida: Se a partida já existe (criada pela demo parser), ela não tem gcRating ou levelGc.
    // Atualiza a partida e seus stats com os dados oficiais da GC.
    await enrichExistingMatchWithGC(existing.id, input);

    if (!options.skipEnqueue) {
      maybeEnqueueDemoAnalysis({
        sourceMatchId: input.matchId,
        downloadUrl: input.demoUrl ?? existing.demoUrl,
      }).catch(() => {});
    }
    return { status: "already-synced", matchId: existing.id };
  }

  const importLog = await importRepo.createImportLog(options.source ?? "gc-companion", {
    rawPayload: options.rawPayload as Prisma.InputJsonValue | undefined,
  });

  try {
    const map = await mapRepo.upsertMapByName(input.map);
    const session = await sessionRepo.findOrCreateSessionForDate(input.playedAt);
    const activeSeason = await ensureCurrentSeason(input.playedAt);
    if (!activeSeason || !activeSeason.id) {
      throw new Error("Não foi possível determinar uma temporada ativa válida para esta partida.");
    }

    // Upsert dos jogadores
    const players = await Promise.all(
      input.players.map((p) =>
        playerRepo.upsertPlayerBySteamId({
          steamId: p.steamId,
          nickname: p.nickname,
          avatarUrl: p.avatarUrl ?? null,
          gamersClubId: p.gamersClubId ?? null,
        }),
      )
    );

    // Vincula o player_id na tabela tracked_players se o jogador for monitorado
    for (const player of players) {
      if (player.gamersClubId) {
        await playerRepo.linkTrackedPlayer(player.gamersClubId, player.id);
      }
    }

    const trackedPlayersCount = await playerRepo.countActiveTrackedPlayersAmong(
      players.map((p) => p.id)
    );

    const playerBySteamId = new Map(players.map((p) => [p.steamId, p]));
    const roundsPlayed = Math.max(input.scoreTeamA + input.scoreTeamB, 1);

    // Calcula ratings em memória para o cálculo de ELO
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

    // Calcula ELO usando o serviço isolado
    const eloInputs = input.players.map((p) => {
      const player = playerBySteamId.get(p.steamId)!;
      return {
        playerId: player.id,
        team: p.team as MatchTeam,
        rating: ratingByPlayerId.get(player.id)!.rating,
      };
    });
    const eloResults = await calculateEloForMatch(eloInputs, {
      scoreTeamA: input.scoreTeamA,
      scoreTeamB: input.scoreTeamB,
    });
    const eloByPlayerId = new Map(eloResults.map((r) => [r.playerId, r]));

    // Prepara estatísticas dos jogadores
    const playerStats: CreateMatchPlayerStatInput[] = input.players.map((p) => {
      const player = playerBySteamId.get(p.steamId)!;
      const rating = ratingByPlayerId.get(player.id)!;
      const elo = eloByPlayerId.get(player.id)!;

      return {
        playerId: player.id,
        team: p.team as MatchTeam,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        headshots: p.headshots,
        adr: p.adr,
        rating: rating.rating,
        kast: p.kast,
        impact: rating.impact,
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
        eloBefore: elo.eloBefore,
        eloAfter: elo.eloAfter,
        levelGc: p.levelGc ?? null,
        clutchesWon: p.clutchesWon ?? 0,
        flashAssists: p.flashAssists ?? 0,
        damage: p.damage ?? null,
        gcRating: p.gcRating ?? null,
        doubleKills: p.doubleKills ?? null,
        tripleKills: p.tripleKills ?? null,
        quadKills: p.quadKills ?? null,
        aces: p.aces ?? null,
      };
    });

    const match = await matchRepo.createMatchWithStats({
      sessionId: session.id,
      mapId: map.id,
      seasonId: activeSeason.id,
      gamersClubMatchId: input.matchId,
      playedAt: input.playedAt,
      scoreTeamA: input.scoreTeamA,
      scoreTeamB: input.scoreTeamB,
      durationSeconds: input.durationSeconds,
      trackedPlayersCount,
      playerStats,
      events: [], // Ingestão da GC não possui eventos kill-by-kill
      demoUrl: input.demoUrl ?? null,
      roundsJson: input.roundsJson !== undefined ? (input.roundsJson as any) : undefined,
    });

    // Recontrói as rivalidades a partir da nova partida (projeção idempotente direcionada)
    await rebuildRivalriesForPlayers(players.map((p) => p.id));

    // Avalia conquistas do jogo
    const careerTotalsByPlayerId = new Map<string, Awaited<ReturnType<typeof statsRepo.getPlayerCareerTotals>>>();
    for (const player of players) {
      careerTotalsByPlayerId.set(player.id, await statsRepo.getPlayerCareerTotals(player.id));
    }

    const totalRounds = input.scoreTeamA + input.scoreTeamB;
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
        hadAce: false,
        hadMultiKill3: false,
        hadMultiKill4: false,
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

    // ATUALIZAÇÃO DO PROFILE GC LEVEL (Apenas origem GAMERS_CLUB)
    // Esse bloco roda isolado e NUNCA é executado pelo parser de demos.
    try {
      for (const p of input.players) {
        if (p.levelGc === undefined || p.levelGc === null) continue;
        const player = playerBySteamId.get(p.steamId)!;
        const newerMatchCount = await prisma.playerMatchStats.count({
          where: { playerId: player.id, match: { playedAt: { gt: input.playedAt } } },
        });
        if (newerMatchCount === 0) {
          await prisma.player.update({ where: { id: player.id }, data: { levelGc: p.levelGc } });
        }
      }
    } catch (err) {
      console.error("[GC Sync] Erro ao atualizar levelGc de perfil:", err);
    }

    await importRepo.completeImportLog(importLog.id, { status: "SUCCESS", matchesImported: 1 });

    if (!options.skipEnqueue) {
      maybeEnqueueDemoAnalysis({ sourceMatchId: input.matchId, downloadUrl: input.demoUrl }).catch(() => {});
    }

    return { status: "created", matchId: match.id };
  } catch (error) {
    await importRepo.completeImportLog(importLog.id, {
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
    });
    throw error;
  }
}

async function enrichExistingMatchWithGC(matchId: string, input: SyncMatchInput) {
  // 0. Atualiza playedAt, sessionId e seasonId da partida com os dados oficiais da GC
  const session = await sessionRepo.findOrCreateSessionForDate(input.playedAt);
  const activeSeason = await ensureCurrentSeason(input.playedAt);
  if (!activeSeason || !activeSeason.id) {
    throw new Error("Não foi possível determinar uma temporada ativa válida para esta partida.");
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      playedAt: input.playedAt,
      sessionId: session.id,
      seasonId: activeSeason.id,
      scoreTeamA: input.scoreTeamA,
      scoreTeamB: input.scoreTeamB,
    },
  });

  // 1. Resolve players
  const players = await Promise.all(
    input.players.map((p) =>
      playerRepo.upsertPlayerBySteamId({
        steamId: p.steamId,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl ?? null,
        gamersClubId: p.gamersClubId ?? null,
      })
    )
  );
  const playerBySteamId = new Map(players.map((p) => [p.steamId, p]));

  // 2. Calcula ratings e ELO
  const roundsPlayed = Math.max(input.scoreTeamA + input.scoreTeamB, 1);
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

  const eloInputs = input.players.map((p) => {
    const player = playerBySteamId.get(p.steamId)!;
    return {
      playerId: player.id,
      team: p.team as MatchTeam,
      rating: ratingByPlayerId.get(player.id)!.rating,
    };
  });
  const eloResults = await calculateEloForMatch(eloInputs, {
    scoreTeamA: input.scoreTeamA,
    scoreTeamB: input.scoreTeamB,
  });
  const eloByPlayerId = new Map(eloResults.map((r) => [r.playerId, r]));

  // 3. Atualiza as estatísticas individuais no banco
  for (const p of input.players) {
    const player = playerBySteamId.get(p.steamId)!;
    const elo = eloByPlayerId.get(player.id)!;
    
    // Atualiza gcRating, levelGc e ELOs que vêm da GC (não sobrescreve estatísticas do parser!)
    await prisma.playerMatchStats.upsert({
      where: {
        matchId_playerId: { matchId, playerId: player.id },
      },
      create: {
        matchId,
        playerId: player.id,
        team: p.team as MatchTeam,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        headshots: p.headshots,
        adr: p.adr,
        rating: ratingByPlayerId.get(player.id)!.rating,
        kast: p.kast,
        impact: ratingByPlayerId.get(player.id)!.impact,
        gcRating: p.gcRating ?? null,
        levelGc: p.levelGc ?? null,
        eloBefore: elo.eloBefore,
        eloAfter: elo.eloAfter,
        entryKills: 0,
        entryDeaths: 0,
        tradeKills: 0,
      },
      update: {
        team: p.team as MatchTeam,
        gcRating: p.gcRating ?? null,
        levelGc: p.levelGc ?? null,
        eloBefore: elo.eloBefore,
        eloAfter: elo.eloAfter,
      },
    });
  }

  // 4. Atualiza Player.levelGc (profile level)
  for (const p of input.players) {
    if (p.levelGc === undefined || p.levelGc === null) continue;
    const player = playerBySteamId.get(p.steamId)!;
    const newerMatchCount = await prisma.playerMatchStats.count({
      where: { playerId: player.id, match: { playedAt: { gt: input.playedAt } } },
    });
    if (newerMatchCount === 0) {
      await prisma.player.update({ where: { id: player.id }, data: { levelGc: p.levelGc } });
    }
  }

  // 5. Recontrói rivalidades para estes jogadores
  await rebuildRivalriesForPlayers(players.map((p) => p.id));
}
