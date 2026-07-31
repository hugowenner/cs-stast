import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumClutchTierDTO {
  tier: "1v1" | "1v2" | "1v3" | "1v4" | "1v5";
  attempts: number;
  wins: number;
  successRate: number;
  sampleSize: number;
}

export interface PremiumClutchSummaryDTO {
  overall: PremiumClutchTierDTO[];
  byMap: Record<string, PremiumClutchTierDTO[]>;
  bySeason: Record<string, PremiumClutchTierDTO[]>;
}

function aggregateClutches(list: any[]): PremiumClutchTierDTO[] {
  const tiers: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
  return tiers.map((opponents) => {
    const tierClutches = list.filter((c) => c.opponents === opponents);
    const attempts = tierClutches.length;
    const wins = tierClutches.filter((c) => c.won === true).length;
    const successRate = attempts > 0 ? Math.round((wins / attempts) * 100) : 0;
    return {
      tier: `1v${opponents}` as const,
      attempts,
      wins,
      successRate,
      sampleSize: attempts,
    };
  });
}

export async function getPlayerClutchStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumClutchSummaryDTO> {
  const clutches = await prisma.playerClutch.findMany({
    where: {
      playerId: filter.playerId,
      ...buildBaseWhere(filter),
    },
    include: {
      match: {
        select: {
          map: { select: { name: true } },
          season: { select: { id: true, name: true } },
        },
      },
    },
  });

  const overall = aggregateClutches(clutches);

  // Group by Map
  const mapGroups: Record<string, any[]> = {};
  for (const c of clutches) {
    const mapName = c.match.map.name;
    if (!mapGroups[mapName]) {
      mapGroups[mapName] = [];
    }
    mapGroups[mapName].push(c);
  }

  const byMap: Record<string, PremiumClutchTierDTO[]> = {};
  for (const [mapName, list] of Object.entries(mapGroups)) {
    byMap[mapName] = aggregateClutches(list);
  }

  // Group by Season
  const seasonGroups: Record<string, any[]> = {};
  for (const c of clutches) {
    const seasonName = c.match.season?.name ?? "Unknown Season";
    if (!seasonGroups[seasonName]) {
      seasonGroups[seasonName] = [];
    }
    seasonGroups[seasonName].push(c);
  }

  const bySeason: Record<string, PremiumClutchTierDTO[]> = {};
  for (const [seasonName, list] of Object.entries(seasonGroups)) {
    bySeason[seasonName] = aggregateClutches(list);
  }

  return {
    overall,
    byMap,
    bySeason,
  };
}
