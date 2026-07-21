import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";
import {
  calculateKD,
  calculateHSPercentage,
  calculateWinrate,
  calculateRatingTrend,
  evaluateMatchResult,
} from "@/server/analytics/player.analytics";

export function calculateOverview(
  careerTotals: {
    _sum: { kills: number | null; deaths: number | null; assists: number | null; headshots: number | null };
    _avg: { rating: number | null; adr: number | null; kast: number | null; impact: number | null };
    _count: { _all: number };
  },
  outcomes: any[],
  partners: any[],
  maps: any[]
): PlayerProfileDTO["overview"] {
  const totalMatches = careerTotals._count._all;
  const kills = careerTotals._sum.kills ?? 0;
  const deaths = careerTotals._sum.deaths ?? 0;
  const headshots = careerTotals._sum.headshots ?? 0;

  const kd = calculateKD(kills, deaths);
  const hsPercentage = calculateHSPercentage(headshots, kills);

  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const row of outcomes) {
    const result = evaluateMatchResult({
      team: row.team,
      scoreTeamA: row.match.scoreTeamA,
      scoreTeamB: row.match.scoreTeamB,
    });
    if (result === "win") wins++;
    else if (result === "loss") losses++;
    else ties++;
  }

  const winrate = calculateWinrate(wins, totalMatches);

  // Calcula tendência de Rating
  const ratingTrend = calculateRatingTrend(outcomes.map((o) => o.rating));

  // Últimos 10 jogos
  const last10 = outcomes.slice(-10);
  let last10Wins = 0;
  let last10Losses = 0;
  for (const row of last10) {
    const result = evaluateMatchResult({
      team: row.team,
      scoreTeamA: row.match.scoreTeamA,
      scoreTeamB: row.match.scoreTeamB,
    });
    if (result === "win") last10Wins++;
    else if (result === "loss") last10Losses++;
  }

  // Ordena os mapas pelo winrate para achar o melhor e o pior
  const sortedByWinrate = [...maps].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedByWinrate.length > 0 ? sortedByWinrate[0] : null;
  const worstMap = sortedByWinrate.length > 1 ? sortedByWinrate[sortedByWinrate.length - 1] : null;
  const favoritePartner = partners.length > 0 ? partners[0] : null;

  return {
    totalMatches,
    wins,
    losses,
    ties,
    winrate,
    ratingAvg: Math.round((careerTotals._avg.rating ?? 0) * 100) / 100,
    kd,
    adrAvg: Math.round((careerTotals._avg.adr ?? 0) * 10) / 10,
    kastAvg: Math.round((careerTotals._avg.kast ?? 0) * 10) / 10,
    hsPercentage,
    summaryCoach: {
      bestMap: bestMap ? { name: bestMap.mapName, winrate: bestMap.winrate } : null,
      worstMap: worstMap && worstMap.mapName !== bestMap?.mapName ? { name: worstMap.mapName, winrate: worstMap.winrate } : null,
      last10Winrate: last10.length > 0 ? {
        wins: last10Wins,
        losses: last10Losses,
        winrate: Math.round((last10Wins / last10.length) * 100)
      } : null,
      ratingTrend,
      favoritePartner: favoritePartner ? { nickname: favoritePartner.nickname, matches: favoritePartner.matchesTogether } : null,
    }
  };
}
