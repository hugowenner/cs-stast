import { prisma } from "@/server/db";
import { buildBaseWhere, type PremiumAnalyticsFilter } from "./base";

export interface PremiumEntryDTO {
  entryKills: number;
  entryDeaths: number;
  successRate: number; // overall
  ct: {
    entryKills: number;
    entryDeaths: number;
    successRate: number;
  };
  tr: {
    entryKills: number;
    entryDeaths: number;
    successRate: number;
  };
  firstDeathImpact: {
    lostRoundsAfterDeath: number;
    wonRoundsAfterDeath: number;
    totalFirstDeaths: number;
    lossRateAfterDeath: number; // e.g. 72%
  };
}

function calculateSuccessRate(kills: number, deaths: number): number {
  const total = kills + deaths;
  return total > 0 ? Math.round((kills / total) * 100) : 0;
}

function getWinnerSide(winnerTeam: string | null): "A" | "B" | null {
  if (!winnerTeam) return null;
  const t = winnerTeam.toUpperCase();
  if (t === "T" || t === "TERRORIST") return "A";
  if (t === "CT" || t === "COUNTER_TERRORIST") return "B";
  return null;
}

export async function getPlayerEntryStats(
  filter: PremiumAnalyticsFilter
): Promise<PremiumEntryDTO> {
  const baseWhere = buildBaseWhere(filter);

  // 1. Fetch all entry duels for the player
  const duels = await prisma.playerEntryDuel.findMany({
    where: {
      playerId: filter.playerId,
      ...baseWhere,
    },
    include: {
      match: {
        select: {
          id: true,
          roundsJson: true,
        },
      },
    },
  });

  // Entry stats counters
  let entryKills = 0;
  let entryDeaths = 0;
  let ctKills = 0;
  let ctDeaths = 0;
  let trKills = 0;
  let trDeaths = 0;

  // First death impact counters
  let lostRoundsAfterDeath = 0;
  let wonRoundsAfterDeath = 0;
  let totalFirstDeaths = 0;

  for (const ed of duels) {
    const isKiller = ed.isKiller;
    const isCT = ed.side === "B"; // "B" is CT, "A" is Terrorist

    if (isKiller) {
      entryKills++;
      if (isCT) ctKills++;
      else trKills++;
    } else {
      entryDeaths++;
      if (isCT) ctDeaths++;
      else trDeaths++;

      // First Death Impact check
      totalFirstDeaths++;
      const rounds = ed.match.roundsJson as any[] | null;
      if (rounds && Array.isArray(rounds)) {
        // Find round by number
        const roundData = rounds.find((r) => r && r.number === ed.roundNumber);
        if (roundData && roundData.winner_team) {
          const winnerSide = getWinnerSide(roundData.winner_team);
          if (winnerSide) {
            // Player team is ed.side. If winner is ed.side, player team won.
            if (winnerSide === ed.side) {
              wonRoundsAfterDeath++;
            } else {
              lostRoundsAfterDeath++;
            }
          }
        }
      }
    }
  }

  const successRate = calculateSuccessRate(entryKills, entryDeaths);
  const ctSuccessRate = calculateSuccessRate(ctKills, ctDeaths);
  const trSuccessRate = calculateSuccessRate(trKills, trDeaths);
  const lossRateAfterDeath =
    totalFirstDeaths > 0
      ? Math.round((lostRoundsAfterDeath / totalFirstDeaths) * 100)
      : 0;

  return {
    entryKills,
    entryDeaths,
    successRate,
    ct: {
      entryKills: ctKills,
      entryDeaths: ctDeaths,
      successRate: ctSuccessRate,
    },
    tr: {
      entryKills: trKills,
      entryDeaths: trDeaths,
      successRate: trSuccessRate,
    },
    firstDeathImpact: {
      lostRoundsAfterDeath,
      wonRoundsAfterDeath,
      totalFirstDeaths,
      lossRateAfterDeath,
    },
  };
}
