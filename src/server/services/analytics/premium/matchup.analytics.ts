import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumMatchupDTO {
  opponentId: string;
  opponentNickname: string;
  opponentAvatarUrl: string | null;
  killsAgainst: number; // How many times the player killed the opponent
  deathsAgainst: number; // How many times the opponent killed the player
  advantage: number; // killsAgainst - deathsAgainst
  totalDuels: number; // killsAgainst + deathsAgainst
  weapons: Record<string, number>; // Merged weapons used
  maps: Record<string, { kills: number; deaths: number }>;
}

export interface PremiumMatchupSummaryDTO {
  carrascos: PremiumMatchupDTO[]; // Opponents who killed the player the most, sorted by deathsAgainst desc
  fregueses: PremiumMatchupDTO[]; // Opponents whom the player killed the most, sorted by killsAgainst desc
  allConfrontos: PremiumMatchupDTO[];
}

export async function getPlayerMatchupStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumMatchupSummaryDTO> {
  const baseWhere = buildBaseWhere(filter);

  // 1. Fetch matchups where the player was the killer (kills against others)
  const killsMade = await prisma.playerMatchup.findMany({
    where: {
      killerId: filter.playerId,
      ...baseWhere,
    },
    include: {
      victim: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      match: {
        select: {
          map: { select: { name: true } },
        },
      },
    },
  });

  // 2. Fetch matchups where the player was the victim (deaths against others)
  const deathsSuffered = await prisma.playerMatchup.findMany({
    where: {
      victimId: filter.playerId,
      ...baseWhere,
    },
    include: {
      killer: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      match: {
        select: {
          map: { select: { name: true } },
        },
      },
    },
  });

  const opponentsMap = new Map<string, PremiumMatchupDTO>();

  function getOrInitOpponent(id: string, nickname: string, avatarUrl: string | null): PremiumMatchupDTO {
    let opp = opponentsMap.get(id);
    if (!opp) {
      opp = {
        opponentId: id,
        opponentNickname: nickname,
        opponentAvatarUrl: avatarUrl,
        killsAgainst: 0,
        deathsAgainst: 0,
        advantage: 0,
        totalDuels: 0,
        weapons: {},
        maps: {},
      };
      opponentsMap.set(id, opp);
    }
    return opp;
  }

  // Populate kills made
  for (const m of killsMade) {
    if (!m.victim) continue;
    const opp = getOrInitOpponent(m.victim.id, m.victim.nickname, m.victim.avatarUrl);
    opp.killsAgainst += m.kills;
    opp.totalDuels += m.kills;

    // Merge weapons
    const w = (m.weapons as Record<string, number> | null) ?? {};
    for (const [weapon, count] of Object.entries(w)) {
      opp.weapons[weapon] = (opp.weapons[weapon] || 0) + count;
    }

    // Merge maps
    const mapName = m.match.map.name;
    if (!opp.maps[mapName]) {
      opp.maps[mapName] = { kills: 0, deaths: 0 };
    }
    opp.maps[mapName].kills += m.kills;
  }

  // Populate deaths suffered
  for (const m of deathsSuffered) {
    if (!m.killer) continue;
    const opp = getOrInitOpponent(m.killer.id, m.killer.nickname, m.killer.avatarUrl);
    opp.deathsAgainst += m.kills;
    opp.totalDuels += m.kills;

    // Merge weapons
    const w = (m.weapons as Record<string, number> | null) ?? {};
    for (const [weapon, count] of Object.entries(w)) {
      opp.weapons[weapon] = (opp.weapons[weapon] || 0) + count;
    }

    // Merge maps
    const mapName = m.match.map.name;
    if (!opp.maps[mapName]) {
      opp.maps[mapName] = { kills: 0, deaths: 0 };
    }
    opp.maps[mapName].deaths += m.kills;
  }

  // Compute advantages for all opponents
  const allConfrontos = Array.from(opponentsMap.values()).map((opp) => {
    opp.advantage = opp.killsAgainst - opp.deathsAgainst;
    return opp;
  });

  // Carrascos: sorted by deathsAgainst desc (most deaths suffered)
  const carrascos = [...allConfrontos]
    .filter((opp) => opp.deathsAgainst > 0)
    .sort((a, b) => b.deathsAgainst - a.deathsAgainst);

  // Fregueses: sorted by killsAgainst desc (most kills made)
  const fregueses = [...allConfrontos]
    .filter((opp) => opp.killsAgainst > 0)
    .sort((a, b) => b.killsAgainst - a.killsAgainst);

  return {
    carrascos,
    fregueses,
    allConfrontos,
  };
}
