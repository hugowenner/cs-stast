import "dotenv/config";
import { prisma } from "@/server/db";
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import type { GamersClubMatchPayload } from "@/server/adapters/gamersclub/types";
import { calculateRating } from "@/server/domain/rating";
import { calculateEloForMatch } from "@/server/services/elo/elo.service";
import { rebuildAllRivalries } from "@/server/services/rivalry/rivalry.service";
import { ensureCurrentSeason } from "@/server/services/season.service";
import * as sessionRepo from "@/server/repositories/session.repository";
import type { MatchTeam } from "@/generated/prisma";

async function main() {
  console.log("[Repair] Iniciando reparação de dados corrompidos da Gamers Club...");

  // 1. Busca todos os logs de importação da Gamers Club bem-sucedidos
  const imports = await prisma.import.findMany({
    where: {
      source: { in: ["gamersclub", "gc-companion"] },
      status: "SUCCESS",
      rawPayload: { not: null },
    },
    orderBy: { startedAt: "asc" }, // Processa cronologicamente
  });

  console.log(`[Repair] Encontrados ${imports.length} logs de importação bem-sucedidos.`);

  let repairedCount = 0;

  for (const imp of imports) {
    const raw = imp.rawPayload as any;
    if (!raw.id && !raw.matchId) {
      console.warn(`[Repair] Import Log ${imp.id} não possui id de partida no rawPayload. Pulando.`);
      continue;
    }

    try {
      const normalized = normalizeGamersClubMatch(raw as GamersClubMatchPayload);
      const match = await prisma.match.findUnique({
        where: { gamersClubMatchId: normalized.matchId },
        include: { playerStats: true },
      });

      if (!match) {
        console.log(`[Repair] Partida GC ${normalized.matchId} não encontrada no banco. Pulando.`);
        continue;
      }

      console.log(`[Repair] Analisando partida ${normalized.matchId} (DB ID: ${match.id})...`);
      let matchUpdated = false;

      // 1. Corrige data/temporada/sessão se houver divergência
      const targetPlayedAtStr = normalized.playedAt.toISOString();
      const currentPlayedAtStr = match.playedAt.toISOString();

      if (targetPlayedAtStr !== currentPlayedAtStr) {
        console.log(`  -> Corrigindo data da partida: ${currentPlayedAtStr} -> ${targetPlayedAtStr}`);
        const session = await sessionRepo.findOrCreateSessionForDate(normalized.playedAt);
        const activeSeason = await ensureCurrentSeason(normalized.playedAt);
        if (activeSeason) {
          await prisma.match.update({
            where: { id: match.id },
            data: {
              playedAt: normalized.playedAt,
              sessionId: session.id,
              seasonId: activeSeason.id,
            },
          });
          match.playedAt = normalized.playedAt; // Atualiza em memória para consistência
          matchUpdated = true;
        }
      }

      // 2. Resolve players
      const playerSteamIds = normalized.players.map((p) => p.steamId);
      const dbPlayers = await prisma.player.findMany({
        where: { steamId: { in: playerSteamIds } },
      });
      const playerBySteamId = new Map(dbPlayers.map((p) => [p.steamId, p]));

      // 2. Calcula ratings e ELO oficiais
      const roundsPlayed = Math.max(normalized.scoreTeamA + normalized.scoreTeamB, 1);
      const ratingByPlayerId = new Map<string, { rating: number; impact: number }>();
      for (const p of normalized.players) {
        const player = playerBySteamId.get(p.steamId);
        if (!player) continue;
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

      const eloInputs = normalized.players
        .map((p) => {
          const player = playerBySteamId.get(p.steamId);
          if (!player) return null;
          return {
            playerId: player.id,
            team: p.team as MatchTeam,
            rating: ratingByPlayerId.get(player.id)!.rating,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const eloResults = await calculateEloForMatch(eloInputs, {
        scoreTeamA: normalized.scoreTeamA,
        scoreTeamB: normalized.scoreTeamB,
      });
      const eloByPlayerId = new Map(eloResults.map((r) => [r.playerId, r]));

      // 3. Atualiza as estatísticas individuais no banco se houver inconsistências
      for (const p of normalized.players) {
        const player = playerBySteamId.get(p.steamId);
        if (!player) continue;

        const currentStat = match.playerStats.find((s) => s.playerId === player.id);
        if (!currentStat) continue;

        const targetLevelGc = p.levelGc ?? null;
        const targetGcRating = p.gcRating ?? null;
        const elo = eloByPlayerId.get(player.id);
        const targetEloBefore = elo?.eloBefore ?? 1000;
        const targetEloAfter = elo?.eloAfter ?? 1000;

        // Verifica se há alguma divergência/corrupção (ex: campos nulos ou ELO errado devido ao parser)
        if (
          currentStat.levelGc !== targetLevelGc ||
          currentStat.gcRating !== targetGcRating ||
          currentStat.eloBefore !== targetEloBefore ||
          currentStat.eloAfter !== targetEloAfter
        ) {
          console.log(
            `  -> Atualizando PlayerStats do jogador ${player.nickname} (${player.steamId}): ` +
              `LevelGC: ${currentStat.levelGc} -> ${targetLevelGc}, ` +
              `gcRating: ${currentStat.gcRating} -> ${targetGcRating}, ` +
              `ELO: ${currentStat.eloBefore}/${currentStat.eloAfter} -> ${targetEloBefore}/${targetEloAfter}`
          );

          await prisma.playerMatchStats.update({
            where: {
              matchId_playerId: { matchId: match.id, playerId: player.id },
            },
            data: {
              levelGc: targetLevelGc,
              gcRating: targetGcRating,
              eloBefore: targetEloBefore,
              eloAfter: targetEloAfter,
            },
          });
          matchUpdated = true;
        }
      }

      // 4. Garante o levelGc correto do perfil global do jogador
      for (const p of normalized.players) {
        if (p.levelGc === undefined || p.levelGc === null) continue;
        const player = playerBySteamId.get(p.steamId);
        if (!player) continue;

        // Encontra a partida mais recente do jogador
        const latestMatchStats = await prisma.playerMatchStats.findFirst({
          where: { playerId: player.id },
          include: { match: true },
          orderBy: { match: { playedAt: "desc" } },
        });

        // Se esta partida atual for a mais recente do jogador, atualiza seu perfil com o levelGc correto da GC
        if (latestMatchStats && latestMatchStats.matchId === match.id) {
          if (player.levelGc !== p.levelGc) {
            console.log(`  -> Atualizando LevelGC global do jogador ${player.nickname}: ${player.levelGc} -> ${p.levelGc}`);
            await prisma.player.update({
              where: { id: player.id },
              data: { levelGc: p.levelGc },
            });
          }
        }
      }

      if (matchUpdated) {
        repairedCount++;
      }
    } catch (err) {
      console.error(`[Repair] Falha ao processar import ${imp.id} / partida:`, err);
    }
  }

  console.log(`[Repair] Reparação de dados concluída. ${repairedCount} partidas foram corrigidas.`);

  // 5. Reconstrói todas as rivalidades
  console.log("[Repair] Reconstruindo todas as rivalidades...");
  await rebuildAllRivalries();
  console.log("[Repair] Rivalidades reconstruídas com sucesso.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
