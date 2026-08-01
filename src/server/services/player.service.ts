import * as playerRepo from "@/server/repositories/player.repository";
import * as statsRepo from "@/server/repositories/playerMatchStats.repository";
import * as achievementRepo from "@/server/repositories/playerAchievement.repository";
import * as rivalryRepo from "@/server/repositories/rivalry.repository";
import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";
import { prisma } from "@/server/db";
import { parsePlayerInput } from "@/lib/admin/parser";
import { getPlayerSummaries, syncPlayerSteamProfile } from "./steam-profile.service";

import { calculateOverview } from "./player/metrics.service";
import { calculateMapStats } from "./player/maps.service";
import { calculateTimeline } from "./player/timeline.service";
import { calculatePartners } from "./player/partners.service";

export function listPlayers(params: { skip?: number; take?: number }) {
  return playerRepo.listPlayers(params);
}

export function listPlayersWithBasicStats() {
  return playerRepo.listPlayersWithBasicStats();
}

export function upsertPlayer(data: {
  steamId: string;
  nickname: string;
  avatarUrl?: string | null;
  gamersClubId?: string | null;
}) {
  return playerRepo.upsertPlayerBySteamId(data);
}

export async function getPlayerDetail(id: string, seasonId?: string): Promise<PlayerProfileDTO | null> {
  const player = await playerRepo.findPlayerById(id);
  if (!player) return null;

  const targetSeasonId = seasonId === "all" ? undefined : seasonId;
  const targetRivalrySeasonId = seasonId === "all" || !seasonId ? null : seasonId;

  const [totals, outcomes, achievements, rivalries, recentStats] = await Promise.all([
    statsRepo.getPlayerCareerTotals(id, targetSeasonId),
    statsRepo.getPlayerMatchOutcomes(id, targetSeasonId),
    achievementRepo.listPlayerAchievements(id, targetSeasonId),
    rivalryRepo.listRivalriesForPlayer(id, targetRivalrySeasonId),
    statsRepo.listStatsForPlayer(id, 10, targetSeasonId),
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
    hsPercentage: stat.kills > 0 ? Math.round((stat.headshots / stat.kills) * 1000) / 10 : 0,
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

export function getPlayersAdminSummary() {
  return playerRepo.getPlayersAdminSummary();
}

export function listPlayersForAdmin(params: {
  search?: string;
  filter?: string;
  skip?: number;
  take?: number;
}) {
  return playerRepo.listPlayersForAdmin(params);
}

export async function addPlayerForAdmin(input: string, gcIdInput?: string) {
  const parsed = await parsePlayerInput(input);
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  let steamId = parsed.steamId;
  let gamersClubId = parsed.gamersClubId || gcIdInput || null;

  // If we only have GC ID, check if they exist in player DB
  if (!steamId && gamersClubId) {
    const existing = await prisma.player.findFirst({
      where: { gamersClubId },
    });
    if (existing) {
      steamId = existing.steamId;
    } else {
      throw new Error(
        "Este jogador da Gamers Club é novo no sistema. Forneça o Steam ID ou a URL do perfil Steam para cadastrá-lo."
      );
    }
  }

  if (!steamId) {
    throw new Error("Não foi possível determinar o Steam ID.");
  }

  // Check if already tracked and active
  const existingPlayer = await prisma.player.findUnique({
    where: { steamId },
    include: { trackedPlayer: true },
  });

  if (existingPlayer?.trackedPlayer?.active) {
    throw new Error(`O jogador '${existingPlayer.nickname}' já está sendo monitorado.`);
  }

  // Fetch Steam profile to get nickname and avatar
  let nickname = existingPlayer?.nickname || "Jogador Novo";
  let avatarUrl = existingPlayer?.avatarUrl || null;
  let steamNickname = existingPlayer?.steamNickname || null;

  try {
    const summaries = await getPlayerSummaries([steamId]);
    const s = summaries[0];
    if (s) {
      nickname = s.personaname;
      avatarUrl = s.avatarfull;
      steamNickname = s.personaname;
    }
  } catch (err) {
    console.error("Steam Profile Fetch failed during add:", err);
    if (!existingPlayer) {
      throw new Error("Não foi possível obter os dados do jogador na API da Steam.");
    }
  }

  // Ensure gamersClubId is set if resolved, or get from existing
  const finalGcId = gamersClubId || existingPlayer?.gamersClubId || null;
  if (!finalGcId) {
    throw new Error(
      "A gamersClubId é obrigatória para monitorar partidas deste jogador. Forneça o ID da Gamers Club ou a URL do perfil."
    );
  }

  // Create or Update Player
  const player = await prisma.player.upsert({
    where: { steamId },
    create: {
      steamId,
      nickname,
      avatarUrl,
      gamersClubId: finalGcId,
      steamNickname,
      steamAvatarSmall: avatarUrl,
      steamAvatarMedium: avatarUrl,
      steamAvatarFull: avatarUrl,
      steamLastSync: new Date(),
    },
    update: {
      gamersClubId: finalGcId,
    },
  });

  // Link or Upsert TrackedPlayer
  await prisma.trackedPlayer.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      gamersClubId: finalGcId,
      active: true,
      nickname: player.nickname,
    },
    update: {
      active: true,
      gamersClubId: finalGcId,
    },
  });

  return player;
}

export async function updatePlayerForAdmin(
  id: string,
  data: { nickname: string; gamersClubId?: string | null; active: boolean }
) {
  const player = await prisma.player.findUnique({
    where: { id },
  });
  if (!player) {
    throw new Error("Jogador não encontrado.");
  }

  const finalGcId = data.gamersClubId || player.gamersClubId || null;
  if (!finalGcId) {
    throw new Error("A Gamers Club ID é obrigatória para monitorar o jogador.");
  }

  // Update Player
  const updatedPlayer = await prisma.player.update({
    where: { id },
    data: {
      nickname: data.nickname,
      gamersClubId: finalGcId,
    },
  });

  // Update TrackedPlayer
  await prisma.trackedPlayer.upsert({
    where: { playerId: id },
    create: {
      playerId: id,
      gamersClubId: finalGcId,
      active: data.active,
      nickname: data.nickname,
    },
    update: {
      active: data.active,
      nickname: data.nickname,
      gamersClubId: finalGcId,
    },
  });

  return updatedPlayer;
}

export async function deletePlayerForAdmin(id: string, mode: "untrack" | "full") {
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          matchStats: true,
        },
      },
    },
  });

  if (!player) {
    throw new Error("Jogador não encontrado.");
  }

  if (mode === "full") {
    // If has matches, cannot delete completely
    if (player._count.matchStats > 0) {
      throw new Error(
        "Este jogador possui histórico de partidas registradas. Seus dados não podem ser removidos do banco para não corromper o histórico do grupo. Remova-o apenas do monitoramento."
      );
    }

    // Safely delete all relations (achievements, rivalries, events, etc.) and then the player
    await prisma.$transaction([
      prisma.trackedPlayer.deleteMany({ where: { playerId: id } }),
      prisma.playerAchievement.deleteMany({ where: { playerId: id } }),
      prisma.event.deleteMany({ where: { playerId: id } }),
      prisma.event.deleteMany({ where: { victimId: id } }),
      prisma.rivalry.deleteMany({
        where: {
          OR: [{ playerAId: id }, { playerBId: id }],
        },
      }),
      prisma.player.delete({ where: { id } }),
    ]);
  } else {
    // Mode is untrack: just delete from trackedPlayer table
    await prisma.trackedPlayer.deleteMany({
      where: { playerId: id },
    });
  }

  return { success: true };
}

export async function syncPlayerForAdmin(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
  });
  if (!player) {
    throw new Error("Jogador não encontrado.");
  }

  // Call the existing Steam sync pipeline
  const result = await syncPlayerSteamProfile(player.steamId);
  if (result === "failed") {
    throw new Error("Falha na API da Steam ao buscar o perfil do jogador.");
  }

  return { success: true };
}
