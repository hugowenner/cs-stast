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
import { isCommunityMatch } from "@/server/domain/matchClassification";
import {
  evaluateMatchAchievements,
  type PlayerMatchAchievementInput,
} from "@/server/domain/achievements";
import { grantAchievements } from "@/server/services/achievement.service";
import { maybeEnqueueDemoAnalysis } from "@/server/services/sync-job.service";
import { getEloKFactor } from "@/server/services/configuration.service";
import { ensureCurrentSeason } from "@/server/services/season.service";
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
  /**
   * Quando true, suprime o disparo de maybeEnqueueDemoAnalysis.
   * Usar quando o chamador é o próprio Worker (via /api/internal/ingest/match) —
   * a demo já foi processada, re-enfileirar é redundante e polui os logs.
   */
  skipEnqueue?: boolean;
}

export async function ingestMatchSync(
  input: SyncMatchInput,
  options: IngestMatchOptions = {},
): Promise<IngestMatchResult> {
  const existing = await matchRepo.findMatchByGamersClubId(input.matchId);
  if (existing) {
    if (!options.skipEnqueue) {
      // Partida já existe — tenta enfileirar análise em background se ainda não foi processada.
      // Fire-and-forget: não bloqueia a resposta do sync.
      // Prioriza a URL completa vinda do payload (extensão já resolveu via demoDownload)
      // sobre o que pode estar salvo no banco como apenas filename.
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
    const activeSeason = await ensureCurrentSeason();
    if (!activeSeason || !activeSeason.id) {
      throw new Error("Não foi possível determinar uma temporada ativa válida para esta partida.");
    }

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

    // Classificação SOLO x COMUNIDADE (ver domain/matchClassification.ts) — calculada
    // uma única vez aqui, na ingestão, e persistida em Match.trackedPlayersCount.
    // Roda depois do linkTrackedPlayer acima para já enxergar vínculos recém-criados.
    const trackedPlayersCount = await playerRepo.countActiveTrackedPlayersAmong(
      players.map((p) => p.id),
    );

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

      // Calcular decomposição de multikills baseando-se em killsDetail, se presente, ou usar os valores pré-calculados mapeados da GC
      let doubleKills: number | null = p.doubleKills ?? null;
      let tripleKills: number | null = p.tripleKills ?? null;
      let quadKills: number | null = p.quadKills ?? null;
      let aces: number | null = p.aces ?? null;

      if (p.killsDetail && p.killsDetail.length > 0) {
        const killsByRound = new Map<number, number>();
        for (const kill of p.killsDetail) {
          killsByRound.set(kill.roundNumber, (killsByRound.get(kill.roundNumber) ?? 0) + 1);
        }
        
        doubleKills = 0;
        tripleKills = 0;
        quadKills = 0;
        aces = 0;

        for (const count of killsByRound.values()) {
          if (count === 2) doubleKills++;
          else if (count === 3) tripleKills++;
          else if (count === 4) quadKills++;
          else if (count >= 5) aces++;
        }
      }

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
        doubleKills,
        tripleKills,
        quadKills,
        aces,
      };
    });

    // kills_detail é opcional na origem — quando presente, habilita eventos de KILL/ACE/
    // multi-kill (agrupados por round) e alimenta o RivalryEngine. Sem ele, a partida ainda
    // é sincronizada normalmente, só sem esses extras (ver docs/COMPANION.md).
    const events: CreateMatchEventInput[] = [];
    const killEvents: { killerId: string; victimId: string }[] = [];
    const acePlayers = new Set<string>();
    const multiKill4Players = new Set<string>();
    const multiKill3Players = new Set<string>();

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
          events.push({ playerId: killer.id, type: "ACE" as EventType, roundNumber });
        } else if (kills.length === 4) {
          multiKill4Players.add(killer.id);
          events.push({ playerId: killer.id, type: "MULTI_KILL_4" as EventType, roundNumber });
        } else if (kills.length === 3) {
          multiKill3Players.add(killer.id);
          events.push({ playerId: killer.id, type: "MULTI_KILL_3" as EventType, roundNumber });
        }
      }
    }

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
      events,
      demoUrl: input.demoUrl ?? null,
      roundsJson: input.roundsJson !== undefined ? (input.roundsJson as any) : undefined,
    });

    // Rivalidade é estatística coletiva (correlaciona 2 jogadores) — nenhuma estatística
    // coletiva pode nascer de uma partida SOLO (ver domain/matchClassification.ts).
    // Sem esta guarda, uma partida SOLO ainda geraria deltas entre o único jogador
    // monitorado e cada um dos outros participantes; se algum deles fosse monitorado
    // depois, a "rivalidade" apareceria retroativamente, mesmo tendo nascido de uma
    // partida que nunca teve 2 jogadores monitorados de fato.
    if (isCommunityMatch(trackedPlayersCount)) {
      const rivalryDeltas = calculateRivalryDeltas(
        eloInputs.map((e) => ({ playerId: e.playerId, team: e.team })),
        killEvents,
      );
      for (const delta of rivalryDeltas) {
        await rivalryRepo.applyRivalryDelta(delta.playerAId, delta.playerBId, delta);
      }
    }

    const careerTotalsByPlayerId = new Map<
      string,
      Awaited<ReturnType<typeof statsRepo.getPlayerCareerTotals>>
    >();
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

    // Enfileira análise da demo no Worker em background — fire-and-forget.
    // Suprimido quando chamado pelo Worker (skipEnqueue=true): demo já foi processada.
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
