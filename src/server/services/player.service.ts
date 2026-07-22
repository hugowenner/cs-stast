import * as playerRepo from "@/server/repositories/player.repository";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import * as achievementRepo from "@/server/repositories/playerAchievement.repository";
import * as rivalryRepo from "@/server/repositories/rivalry.repository";
import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";

import { calculateOverview } from "./player/metrics.service";
import { calculateMapStats } from "./player/maps.service";
import { calculateTimeline } from "./player/timeline.service";
import { calculatePartners } from "./player/partners.service";

export function listPlayers(params: { skip?: number; take?: number }) {
  return playerRepo.listPlayers(params);
}

export function upsertPlayer(data: {
  steamId: string;
  nickname: string;
  avatarUrl?: string | null;
  gamersClubId?: string | null;
}) {
  return playerRepo.upsertPlayerBySteamId(data);
}

export async function getPlayerDetail(id: string): Promise<PlayerProfileDTO | null> {
  const player = await playerRepo.findPlayerById(id);
  if (!player) return null;

  const [totals, outcomes, achievements, rivalries, recentStats] = await Promise.all([
    statsRepo.getPlayerCareerTotals(id),
    statsRepo.getPlayerMatchOutcomes(id),
    achievementRepo.listPlayerAchievements(id),
    rivalryRepo.listRivalriesForPlayer(id),
    statsRepo.listStatsForPlayer(id, 10),
  ]);

  const maps = calculateMapStats(outcomes);
  const partners = calculatePartners(id, rivalries);
  const timeline = calculateTimeline(outcomes);
  const overview = calculateOverview(totals, outcomes, partners, maps);

  const recentMatches = recentStats.map(stat => ({
    id: stat.match.id,
    playedAt: stat.match.playedAt,
    mapName: stat.match.map.name,
    kills: stat.kills,
    deaths: stat.deaths,
    assists: stat.assists,
    rating: Math.round(stat.rating * 100) / 100,
  }));

  return {
    player: {
      id: player.id,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      gamersClubId: player.gamersClubId,
      levelGc: player.levelGc,
    },
    overview,
    maps,
    timeline,
    achievements: achievements.map(a => ({
      id: a.id,
      achievement: {
        code: a.achievement.code,
        name: a.achievement.name,
        description: a.achievement.description,
        iconUrl: a.achievement.iconUrl,
        tier: a.achievement.tier,
      },
      earnedAt: a.earnedAt,
    })),
    partners,
    recentMatches,
  };
}

export function getPlayerMatches(id: string, take?: number) {
  return statsRepo.listStatsForPlayer(id, take);
}

export function getPlayerAchievements(id: string) {
  return achievementRepo.listPlayerAchievements(id);
}

export function getPlayerRivalries(id: string) {
  return rivalryRepo.listRivalriesForPlayer(id);
}
