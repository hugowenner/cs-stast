import { normalizeParserMatch } from "@/server/adapters/parser/normalize";
import * as matchPayloadRepo from "@/server/repositories/matchPayload.repository";
import * as matchRepo from "@/server/repositories/match.repository";
import * as rivalryRepo from "@/server/repositories/rivalry.repository";
import { calculateRivalryDeltas } from "@/server/domain/rivalry";
import { isCommunityMatch } from "@/server/domain/matchClassification";
import { extractPremiumEvents } from "@/server/services/premium-events.normalizer";
import type { EventType } from "@/generated/prisma";

type KillDetail = NonNullable<
  ReturnType<typeof normalizeParserMatch>["players"][number]["killsDetail"]
>[number];

export async function processPayload(id: string): Promise<{ success: boolean; error?: string }> {
  const locked = await matchPayloadRepo.lockPayloadForProcessing(id);
  if (!locked) {
    return { success: false, error: "Payload já está sendo processado ou não está pendente." };
  }

  const payloadRecord = await matchPayloadRepo.findPayloadById(id);
  if (!payloadRecord) {
    await matchPayloadRepo.markPayloadFailed(id, "Payload não localizado no banco de dados.");
    return { success: false, error: "Payload não localizado." };
  }

  try {
    // Premium só enriquece — nunca cria partidas. A partida Community deve existir primeiro.
    const existingMatch = await matchRepo.findMatchWithPlayersByGamersClubId(
      payloadRecord.sourceMatchId,
    );
    if (!existingMatch) {
      const error = `Partida Community '${payloadRecord.sourceMatchId}' não localizada. O Premium só pode enriquecer partidas já sincronizadas pela Gamers Club.`;
      await matchPayloadRepo.markPayloadFailed(id, error);
      return { success: false, error };
    }

    // Mapa steamId → { id, team } construído a partir da partida Community existente.
    // Fonte autoritativa para identificação de jogadores: sempre a ingestão GC.
    const playerBySteamId = new Map<string, { id: string; team: "A" | "B" }>();
    for (const stat of existingMatch.playerStats) {
      playerBySteamId.set(stat.player.steamId, {
        id: stat.playerId,
        team: stat.team as "A" | "B",
      });
    }

    const parsed = normalizeParserMatch(
      payloadRecord.payload,
      payloadRecord.sourceMatchId,
      payloadRecord.createdAt,
    );

    // Campos Premium por jogador (campos cuja fonte autoritativa é o parser, não a GC API).
    // Não inclui: kills, deaths, assists, adr, kast, rating, impact, eloBefore, eloAfter.
    const playerPremiumStats = parsed.players
      .map((p) => {
        const player = playerBySteamId.get(p.steamId);
        if (!player) return null;
        return {
          playerId: player.id,
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
          doubleKills: p.doubleKills ?? null,
          tripleKills: p.tripleKills ?? null,
          quadKills: p.quadKills ?? null,
          aces: p.aces ?? null,
          damage: p.damage ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Eventos de kill/ace/multikill derivados do killsDetail do parser.
    const events: matchRepo.CreateMatchEventInput[] = [];
    const killEvents: { killerId: string; victimId: string }[] = [];

    for (const p of parsed.players) {
      if (!p.killsDetail || p.killsDetail.length === 0) continue;
      const killer = playerBySteamId.get(p.steamId);
      if (!killer) continue;

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
          events.push({ playerId: killer.id, type: "ACE" as EventType, roundNumber });
        } else if (kills.length === 4) {
          events.push({ playerId: killer.id, type: "MULTI_KILL_4" as EventType, roundNumber });
        } else if (kills.length === 3) {
          events.push({ playerId: killer.id, type: "MULTI_KILL_3" as EventType, roundNumber });
        }
      }
    }

    const premiumEvents = extractPremiumEvents(
      payloadRecord.payload,
      existingMatch.id,
      playerBySteamId,
      existingMatch.trackedPlayersCount,
    );

    // Aplica o enriquecimento atomicamente.
    // scoreTeamA, scoreTeamB, mapId, playedAt, seasonId, gamersClubMatchId,
    // trackedPlayersCount, rating, impact, eloBefore e eloAfter nunca são tocados.
    await matchRepo.enrichMatchWithPremium({
      matchId: existingMatch.id,
      durationSeconds: parsed.durationSeconds > 0 ? parsed.durationSeconds : undefined,
      roundsJson: parsed.roundsJson !== undefined ? (parsed.roundsJson as any) : undefined,
      playerPremiumStats,
      events,
      ...premiumEvents,
    });

    // Rivalidade de kills: passa players=[] para não re-incrementar matchesTogether/matchesAgainst
    // (esses contadores já foram aplicados pela ingestão Community).
    if (isCommunityMatch(existingMatch.trackedPlayersCount) && killEvents.length > 0) {
      const killDeltas = calculateRivalryDeltas([], killEvents);
      for (const delta of killDeltas) {
        await rivalryRepo.applyRivalryDelta(delta.playerAId, delta.playerBId, delta, null);
        await rivalryRepo.applyRivalryDelta(
          delta.playerAId,
          delta.playerBId,
          delta,
          existingMatch.seasonId,
        );
      }
    }

    await matchPayloadRepo.markPayloadProcessed(id);
    return { success: true };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await matchPayloadRepo.markPayloadFailed(id, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Busca o próximo payload pendente e o processa.
 */
export async function processNextPendingPayload(): Promise<{
  processed: boolean;
  success?: boolean;
  error?: string;
}> {
  const pending = await matchPayloadRepo.findNextPendingPayload();
  if (!pending) {
    return { processed: false };
  }

  const result = await processPayload(pending.id);
  return { processed: true, ...result };
}
