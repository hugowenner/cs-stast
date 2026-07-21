import { getPlayerDetail } from "./player.service";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import * as achievementRepo from "@/server/repositories/achievement.repository";
import * as playerAchievementRepo from "@/server/repositories/playerAchievement.repository";
import {
  processH2HMatches,
  calculateCompatibility,
  RuleBasedInsightProvider,
} from "@/server/analytics/comparison.analytics";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";

export async function getPlayerComparison(
  playerAId: string,
  playerBId: string
): Promise<PlayerComparisonDTO | null> {
  // Obter detalhes de perfil individual e estatísticas em paralelo
  const [
    detailA,
    detailB,
    outcomesA,
    outcomesB,
    achA,
    achB,
    catalog,
    totalsA,
    totalsB,
  ] = await Promise.all([
    getPlayerDetail(playerAId),
    getPlayerDetail(playerBId),
    statsRepo.getPlayerMatchOutcomes(playerAId),
    statsRepo.getPlayerMatchOutcomes(playerBId),
    playerAchievementRepo.listPlayerAchievements(playerAId),
    playerAchievementRepo.listPlayerAchievements(playerBId),
    achievementRepo.listAchievementCatalog(),
    statsRepo.getPlayerCareerTotals(playerAId),
    statsRepo.getPlayerCareerTotals(playerBId),
  ]);

  if (!detailA || !detailB) {
    return null;
  }

  // 1. Processar dados H2H (Juntos e Contra)
  const h2h = processH2HMatches(playerAId, playerBId, outcomesA, outcomesB);

  // 2. Processar DTOs dos Jogadores
  const playerADTO = {
    id: detailA.player.id,
    nickname: detailA.player.nickname,
    avatarUrl: detailA.player.avatarUrl,
    gamersClubId: detailA.player.gamersClubId,
    metrics: {
      rating: detailA.overview.ratingAvg,
      adr: detailA.overview.adrAvg,
      kast: detailA.overview.kastAvg,
      hsPercentage: detailA.overview.hsPercentage,
      kd: detailA.overview.kd,
      impact: Math.round((totalsA._avg.impact ?? 1.0) * 100) / 100,
      winrate: detailA.overview.winrate,
    },
    bestMap: detailA.overview.summaryCoach.bestMap,
    worstMap: detailA.overview.summaryCoach.worstMap,
  };

  const playerBDTO = {
    id: detailB.player.id,
    nickname: detailB.player.nickname,
    avatarUrl: detailB.player.avatarUrl,
    gamersClubId: detailB.player.gamersClubId,
    metrics: {
      rating: detailB.overview.ratingAvg,
      adr: detailB.overview.adrAvg,
      kast: detailB.overview.kastAvg,
      hsPercentage: detailB.overview.hsPercentage,
      kd: detailB.overview.kd,
      impact: Math.round((totalsB._avg.impact ?? 1.0) * 100) / 100,
      winrate: detailB.overview.winrate,
    },
    bestMap: detailB.overview.summaryCoach.bestMap,
    worstMap: detailB.overview.summaryCoach.worstMap,
  };

  const players = [playerADTO, playerBDTO];

  // 3. Compatibilidade (Sinergia)
  const compatibility = calculateCompatibility(
    h2h,
    detailA.overview.ratingAvg,
    detailB.overview.ratingAvg
  );

  // 4. Linha do tempo combinada
  const allMatchIds = new Set<string>();
  outcomesA.forEach((o) => allMatchIds.add(o.match.id));
  outcomesB.forEach((o) => allMatchIds.add(o.match.id));

  const matchesMap = new Map<string, Date>();
  outcomesA.forEach((o) => matchesMap.set(o.match.id, o.match.playedAt));
  outcomesB.forEach((o) => matchesMap.set(o.match.id, o.match.playedAt));

  const ratingAMap = new Map(outcomesA.map((o) => [o.match.id, o.rating]));
  const ratingBMap = new Map(outcomesB.map((o) => [o.match.id, o.rating]));
  const eloAMap = new Map(outcomesA.map((o) => [o.match.id, o.eloAfter]));
  const eloBMap = new Map(outcomesB.map((o) => [o.match.id, o.eloAfter]));

  const timeline = Array.from(allMatchIds)
    .map((matchId) => ({
      playedAt: matchesMap.get(matchId)!,
      matchId,
      metrics: {
        [playerAId]: {
          rating: ratingAMap.get(matchId) ?? null,
          elo: eloAMap.get(matchId) ?? null,
        },
        [playerBId]: {
          rating: ratingBMap.get(matchId) ?? null,
          elo: eloBMap.get(matchId) ?? null,
        },
      },
    }))
    .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  // 5. Estatísticas por Mapas
  const mapNames = new Set<string>();
  detailA.maps.forEach((m) => mapNames.add(m.mapName));
  detailB.maps.forEach((m) => mapNames.add(m.mapName));

  const mapsAMap = new Map(detailA.maps.map((m) => [m.mapName, m]));
  const mapsBMap = new Map(detailB.maps.map((m) => [m.mapName, m]));

  const maps = Array.from(mapNames).map((mapName) => {
    const mapA = mapsAMap.get(mapName);
    const mapB = mapsBMap.get(mapName);
    return {
      mapName,
      winrates: {
        [playerAId]: mapA ? mapA.winrate : 0,
        [playerBId]: mapB ? mapB.winrate : 0,
      },
      appearances: {
        [playerAId]: mapA ? mapA.appearances : 0,
        [playerBId]: mapB ? mapB.appearances : 0,
      },
    };
  });

  // 6. Conquistas comparadas
  const achSetA = new Set(achA.map((a) => a.achievement.code));
  const achSetB = new Set(achB.map((a) => a.achievement.code));

  const achievements = catalog.map((c) => ({
    code: c.code,
    name: c.name,
    earnedBy: {
      [playerAId]: achSetA.has(c.code),
      [playerBId]: achSetB.has(c.code),
    },
  }));

  // 7. Geração de Insights
  const insightsProvider = new RuleBasedInsightProvider();
  const outcomesMap = {
    [playerAId]: outcomesA,
    [playerBId]: outcomesB,
  };
  const insights = insightsProvider.getInsights(players, h2h, outcomesMap);

  return {
    players,
    compatibility,
    h2h,
    timeline,
    maps,
    achievements,
    insights,
  };
}
