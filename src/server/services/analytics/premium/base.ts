import { communityMatchWhere } from "@/server/domain/matchClassification";

export interface PremiumAnalyticsFilter {
  playerId: string;
  seasonId?: string;
  mapId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Builds the centralized where clause for premium services, enforcing community matches only.
 */
export function buildBaseWhere(filter: PremiumAnalyticsFilter) {
  const whereClause: any = {
    match: {
      ...communityMatchWhere(),
    },
  };

  if (filter.seasonId) {
    whereClause.match.seasonId = filter.seasonId;
  }
  if (filter.mapId) {
    whereClause.match.mapId = filter.mapId;
  }
  if (filter.startDate || filter.endDate) {
    whereClause.match.playedAt = {};
    if (filter.startDate) {
      whereClause.match.playedAt.gte = filter.startDate;
    }
    if (filter.endDate) {
      whereClause.match.playedAt.lte = filter.endDate;
    }
  }

  return whereClause;
}
