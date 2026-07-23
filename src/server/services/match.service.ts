import { prisma } from "@/server/db";
import type { SyncMatchInput } from "@/server/dtos/sync.dto";
import * as playerRepo from "@/server/repositories/player.repository";
import * as mapRepo from "@/server/repositories/map.repository";
import * as sessionRepo from "@/server/repositories/session.repository";
import * as matchRepo from "@/server/repositories/match.repository";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import * as rivalryRepo from "@/server/repositories/rivalry.repository";
import * as importRepo from "@/server/repositories/import.repository";
import { calculateRating } from "@/server/domain/rating";
import { calculateEloUpdates, DEFAULT_ELO } from "@/server/domain/elo";
import { calculateRivalryDeltas } from "@/server/domain/rivalry";
import {
  evaluateMatchAchievements,
  type PlayerMatchAchievementInput,
} from "@/server/domain/achievements";
import { grantAchievements } from "@/server/services/achievement.service";
import { getEloKFactor } from "@/server/services/configuration.service";
import type {
  CreateMatchEventInput,
  CreateMatchPlayerStatInput,
} from "@/server/repositories/match.repository";
import type { EventType, MatchTeam, Prisma } from "@/generated/prisma";

export interface IngestMatchResult {
  status: "created" | "already-synced";
  matchId: string;
}

import { formatMatchSummary } from "./match/summary.service";
import { formatMatchTeams } from "./match/players.service";
import { calculateMatchHighlights } from "./match/awards.service";
import type { MatchDetailsDTO } from "@/server/dtos/matchDetails.dto";

export async function getMatchDetail(id: string): Promise<MatchDetailsDTO | null> {
  const match = await matchRepo.findMatchDetailsById(id);
  if (!match) return null;

  const summary = formatMatchSummary(match);
  const teams = formatMatchTeams(match);

  // Reúne todos os jogadores de ambos os times para calcular recordistas/awards
  const allFormattedPlayers = [...teams[0].players, ...teams[1].players];
  const highlights = calculateMatchHighlights(allFormattedPlayers);

  // Mapeia eventos para a timeline
  const timeline = match.events.map((event: any) => ({
    id: event.id,
    type: event.type,
    roundNumber: event.roundNumber,
    playerNickname: event.player.nickname,
    victimNickname: event.victim?.nickname ?? null,
  }));

  return {
    match: summary,
    teams,
    highlights,
    timeline,
  };
}

export function listRecentMatches(take?: number) {
  return matchRepo.listRecentMatches(take);
}

type KillDetail = NonNullable<SyncMatchInput["players"][number]["killsDetail"]>[number];

/**
 * Orquestra a ingestão completa de uma partida sincronizada pela extensão GC Companion:
 * upsert de jogadores/mapa/sessão, cálculo de rating/impact e ELO, persistência atômica,
 * atualização de rivalidades e concessão de conquistas. Idempotente por gamersClubMatchId.
 */
export interface IngestMatchOptions {
  /** Payload bruto do provedor de origem, guardado no Import para reprocessamento/depuração. */
  rawPayload?: unknown;
  source?: string;
}

export async function ingestMatchSync(
  input: SyncMatchInput,
  options: IngestMatchOptions = {},
): Promise<IngestMatchResult> {
  const existing = await matchRepo.findMatchByGamersClubId(input.matchId);
  if (existing) {
    return { status: "already-synced", matchId: existing.id };
  }

  const importLog = await importRepo.createImportLog(options.source ?? "gc-companion", {
    rawPayload: options.rawPayload as Prisma.InputJsonValue | undefined,
  });

  try {
    const map = await mapRepo.upsertMapByName(input.map);
    const session = await sessionRepo.findOrCreateSessionForDate(input.playedAt);

    const players = await Promise.all(
      input.players.map((p) =>
        playerRepo.upsertPlayerBySteamId({
          steamId: p.steamId,
          nickname: p.nickname,
          avatarUrl: p.avatarUrl ?? null,
          gamersClubId: p.gamersClubId ?? null,
        }),
      ),
    );

    // Vincula o player_id na tabela tracked_players se o jogador for monitorado
    for (const player of players) {
      if (player.gamersClubId) {
        await playerRepo.linkTrackedPlayer(player.gamersClubId, player.id);
      }
    }

    const playerBySteamId = new Map(players.map((p) => [p.steamId, p]));

    // Aproximação: total de rounds da partida = soma do placar (ignora nuances de overtime).
    const roundsPlayed = Math.max(input.scoreTeamA + input.scoreTeamB, 1);

    const eloBeforeRows = await statsRepo.getLatestEloForPlayers(players.map((p) => p.id));
    const eloBeforeByPlayerId = new Map(eloBeforeRows.map((r) => [r.playerId, r.eloAfter]));

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
        }),
      );
    }

    const kFactor = await getEloKFactor();
    const eloInputs = input.players.map((p) => {
      const player = playerBySteamId.get(p.steamId)!;
      return {
        playerId: player.id,
        team: p.team as MatchTeam as "A" | "B",
        eloBefore: eloBeforeByPlayerId.get(player.id) ?? DEFAULT_ELO,
        rating: ratingByPlayerId.get(player.id)!.rating,
      };
    });
    const eloResults = calculateEloUpdates(
      eloInputs,
      { scoreTeamA: input.scoreTeamA, scoreTeamB: input.scoreTeamB },
      kFactor,
    );
    const eloByPlayerId = new Map(eloResults.map((r) => [r.playerId, r]));

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
      };
    });

    // kills_detail é opcional na origem — quando presente, habilita eventos de KILL/ACE/
    // multi-kill (agrupados por round) e alimenta o RivalryEngine. Sem ele, a partida ainda
    // é sincronizada normalmente, só sem esses extras (ver docs/COMPANION.md).
    const events: CreateMatchEventInput[] = [];
    const killEvents: { killerId: string; victimId: string }[] = [];
    const acePlayers = new Set<string>();
    const fiveKPlayers = new Set<string>();

    for (const p of input.players) {
      if (!p.killsDetail || p.killsDetail.length === 0) continue;
      const killer = playerBySteamId.get(p.steamId)!;

      const killsByRound = new Map<number, KillDetail[]>();
      for (const kill of p.killsDetail) {
        const list = killsByRound.get(kill.roundNumber) ?? [];
        list.push(kill);
        killsByRound.set(kill.roundNumber, list);
      }

      for (const [roundNumber, kills] of killsByRound) {
        for (const kill of kills) {
          const victim = playerBySteamId.get(kill.victimSteamId);
          if (!victim) continue;
          killEvents.push({ killerId: killer.id, victimId: victim.id });
          events.push({
            playerId: killer.id,
            victimId: victim.id,
            type: "KILL" as EventType,
            roundNumber,
          });
        }

        if (kills.length >= 5) {
          acePlayers.add(killer.id);
          fiveKPlayers.add(killer.id);
          events.push({ playerId: killer.id, type: "ACE" as EventType, roundNumber });
        } else if (kills.length === 4) {
          events.push({ playerId: killer.id, type: "MULTI_KILL_4" as EventType, roundNumber });
        } else if (kills.length === 3) {
          events.push({ playerId: killer.id, type: "MULTI_KILL_3" as EventType, roundNumber });
        }
      }
    }

    const match = await matchRepo.createMatchWithStats({
      sessionId: session.id,
      mapId: map.id,
      gamersClubMatchId: input.matchId,
      playedAt: input.playedAt,
      scoreTeamA: input.scoreTeamA,
      scoreTeamB: input.scoreTeamB,
      durationSeconds: input.durationSeconds,
      playerStats,
      events,
    });

    const rivalryDeltas = calculateRivalryDeltas(
      eloInputs.map((e) => ({ playerId: e.playerId, team: e.team })),
      killEvents,
    );
    for (const delta of rivalryDeltas) {
      await rivalryRepo.applyRivalryDelta(delta.playerAId, delta.playerBId, delta);
    }

    const careerTotalsByPlayerId = new Map<
      string,
      Awaited<ReturnType<typeof statsRepo.getPlayerCareerTotals>>
    >();
    for (const player of players) {
      careerTotalsByPlayerId.set(player.id, await statsRepo.getPlayerCareerTotals(player.id));
    }

    const achievementInputs: PlayerMatchAchievementInput[] = input.players.map((p) => {
      const player = playerBySteamId.get(p.steamId)!;
      const career = careerTotalsByPlayerId.get(player.id)!;
      return {
        playerId: player.id,
        entryKills: p.entryKills,
        headshots: p.headshots,
        clutchWinsByTier: {
          1: p.clutches?.["1v1"]?.wins ?? 0,
          2: p.clutches?.["1v2"]?.wins ?? 0,
          3: p.clutches?.["1v3"]?.wins ?? 0,
          4: p.clutches?.["1v4"]?.wins ?? 0,
          5: p.clutches?.["1v5"]?.wins ?? 0,
        },
        hadAce: acePlayers.has(player.id),
        hadFiveK: fiveKPlayers.has(player.id),
        careerMatchesPlayed: career._count._all,
        careerKills: career._sum.kills ?? 0,
        careerHeadshots: career._sum.headshots ?? 0,
      };
    });

    const grants = evaluateMatchAchievements(match.id, achievementInputs);
    await grantAchievements(grants);

    // Atualiza Player.levelGc se este for o jogo mais recente do jogador na timeline.
    // Isolado em try/catch próprio: uma falha aqui não deve reverter a ingestão da partida.
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
    } catch {
      // Não-crítico: a partida já foi importada com sucesso.
    }

    await importRepo.completeImportLog(importLog.id, { status: "SUCCESS", matchesImported: 1 });

    return { status: "created", matchId: match.id };
  } catch (error) {
    await importRepo.completeImportLog(importLog.id, {
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
    });
    throw error;
  }
}
